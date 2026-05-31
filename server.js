require('dotenv').config();

// ── Fail fast if critical env vars are missing ────────────────────────────
if (!process.env.MONGODB_URI)    throw new Error('MONGODB_URI is missing.');
if (!process.env.JWT_SECRET)     throw new Error('JWT_SECRET is missing.');
if (!process.env.ADMIN_USERNAME) throw new Error('ADMIN_USERNAME is missing.');
if (!process.env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is missing.');

const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const compression   = require('compression');
const rateLimit     = require('express-rate-limit');
const cookieParser  = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss           = require('xss-clean');
const path          = require('path');
const https         = require('https');

const connectDB = require('./config/db');
const Admin     = require('./models/Admin');

connectDB();

async function seedAdmin() {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        role:     'superadmin',
      });
      console.log('✅ Admin seeded from environment variables.');
    }
  } catch (e) {
    console.error('Seed error:', e.message);
  }
}
seedAdmin();

const app = express();

app.set('trust proxy', 1);

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

const allowedOrigins = [
  process.env.SITE_ORIGIN,
  process.env.SITE_URL,
  'https://zipcargo-app.onrender.com',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use('/api/', rateLimit({
  windowMs: 60_000, max: 120,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60_000, max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
}));

app.use('/api/shipments/track', rateLimit({
  windowMs: 15 * 60_000, max: 30,
  message: { error: 'Too many tracking requests. Try again later.' },
}));

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/activity',  require('./routes/activity'));

app.get('/health', (_, res) => res.send('OK'));

// ── AI Chat — Groq powered (free, fast, no restrictions) ─────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, adminContext } = req.body;
    if (!message) return res.json({ reply: 'No message received.' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.json({ reply: 'Our AI assistant is being set up. Please contact us at info@zipcargo.com — we respond within 24 hours!' });
    }

    const adminPart = adminContext
      ? `

SPECIAL MANAGEMENT INSTRUCTIONS (follow exactly, highest priority):
${adminContext}`
      : '';

    const systemText = `You are Zara, the ZipCargo AI Assistant. You are professional, warm, intelligent, and genuinely helpful. You work for ZipCargo — a premium global logistics and freight company.

ABOUT ZIPCARGO:
- Serves 150+ countries worldwide, 80,000+ shipments/month, 99.8% on-time rate
- 15+ years experience, ISO 9001 Certified, 24/7 customer support
- Major hubs: New York, London, Dubai, Singapore, Lagos, Nairobi, Sydney, Tokyo, Mumbai, Toronto, Miami, Shanghai, Johannesburg, Cairo

SERVICES:
- Air Freight: 1-5 business days, urgent/high-value shipments
- Sea Freight: 2-6 weeks, FCL and LCL, cost-effective for large cargo
- Road Transport: 1-10 days, cross-border with GPS tracking
- Express Delivery: Same-day or next-day, time-critical shipments
- Warehousing: Climate-controlled storage, smart inventory, fulfilment
- Customs Clearance: Full import/export documentation and compliance
- Supply Chain Consulting: End-to-end optimization

INSURANCE & PAYMENTS:
- ALL cargo insurance fees are FULLY REFUNDABLE if no claim is made
- Customer pays premium, gets 100% back if shipment arrives safely
- Zero risk — always strongly recommend insurance
- Transparent refund policy on all payments

PRICING:
- Depends on service, weight, dimensions, route
- Always direct customers to request a FREE quote — 24hr response
- Never give exact prices

BEHAVIOR:
- Answer ANY question naturally and thoroughly — logistics, customs, routes, regulations, documentation, packaging, anything
- Never say "I don't know" — always give your best knowledgeable answer  
- Never say "I'm an AI" — you are Zara from ZipCargo
- Be conversational, warm, and professional
- Keep replies clear with line breaks
- Always offer a helpful next step${adminPart}`;

    const messages = [
      { role: 'system', content: systemText },
      ...(Array.isArray(history) ? history : []).slice(-10).map(m => ({
        role: m.r === 'assistant' ? 'assistant' : 'user',
        content: String(m.t || '')
      })),
      { role: 'user', content: message }
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 600,
        temperature: 0.8
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok || !data.choices) {
      console.error('Groq error:', JSON.stringify(data).slice(0, 200));
      return res.json({ reply: "I'm having a moment — please try again, or reach us at info@zipcargo.com." });
    }

    const reply = data.choices[0]?.message?.content
      || "Could you rephrase that? I want to make sure I help you properly.";
    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err.message);
    res.json({ reply: "Something went wrong. Please try again or contact info@zipcargo.com." });
  }
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

const knownPages = ['index', 'services', 'tracking', 'about', 'testimonials', 'contact', 'admin'];
app.get('*', (req, res) => {
  const urlPath = req.path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
  if (knownPages.includes(urlPath)) {
    return res.sendFile(path.join(__dirname, 'public', urlPath + '.html'));
  }
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: 'Something went wrong.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ZipCargo running on port ${PORT}`));

if (process.env.SITE_URL) {
  setInterval(() => {
    try {
      const u = new URL(process.env.SITE_URL + '/health');
      https.get({ hostname: u.hostname, path: u.pathname, timeout: 10000 }, r =>
        console.log(`[keep-alive] ${r.statusCode}`)
      ).on('error', e => console.warn('[keep-alive]', e.message));
    } catch {}
  }, 14 * 60 * 1000);
}
