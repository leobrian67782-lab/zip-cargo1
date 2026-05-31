require('dotenv').config();

// ── Fail fast if critical env vars are missing ────────────────────────────
if (!process.env.MONGODB_URI)    throw new Error('MONGODB_URI is missing.');
if (!process.env.JWT_SECRET)     throw new Error('JWT_SECRET is missing.');
if (!process.env.ADMIN_USERNAME) throw new Error('ADMIN_USERNAME is missing.');
if (!process.env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is missing.');

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss          = require('xss-clean');
const path         = require('path');
const https        = require('https');

const connectDB = require('./config/db');
const Admin     = require('./models/Admin');

connectDB();

// ── Seed admin only from env vars — no hardcoded fallback ─────────────────
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

// ── Trust Render proxy ────────────────────────────────────────────────────
app.set('trust proxy', 1);

// ── Force HTTPS in production ─────────────────────────────────────────────
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ── CORS — only allow your own domains ───────────────────────────────────
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

// ── Helmet security headers ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────
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

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());

// ── MongoDB injection sanitization ────────────────────────────────────────
app.use(mongoSanitize());

// ── XSS sanitization ─────────────────────────────────────────────────────
app.use(xss());

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/activity',  require('./routes/activity'));

app.get('/health', (_, res) => res.send('OK'));

// ── Secure config endpoint — sends API key to frontend without exposing in source ──
app.get('/api/chat/config', (req, res) => {
  res.json({ key: process.env.GEMINI_API_KEY || '' });
});

// ── AI Chat proxy — keeps API key secret on server ────────
app.use('/api/chat', rateLimit({
  windowMs: 60_000, max: 40,
  message: { reply: 'Too many messages — please slow down a moment.' },
}));

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, adminContext } = req.body;
    if (!message) return res.status(400).json({ reply: 'No message received.' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ reply: "Our AI assistant is being configured. Please contact us at info@zipcargo.com or visit the Contact page — we respond within 24 hours!" });
    }

    const systemText = `You are Zara, the ZipCargo AI Assistant. You are professional, warm, intelligent, and genuinely helpful. You work for ZipCargo — a premium global logistics and freight company.

ABOUT ZIPCARGO:
- Serves 150+ countries worldwide
- 80,000+ shipments per month, 99.8% on-time delivery rate
- 15+ years of experience, ISO 9001 Certified, 24/7 customer support
- Major hubs: New York, London, Dubai, Singapore, Lagos, Nairobi, Sydney, Tokyo, Mumbai, Toronto, Miami, Shanghai, Johannesburg, Cairo, Vancouver

SERVICES & TRANSIT TIMES:
- Air Freight: Express worldwide, 1-5 business days, ideal for urgent/high-value cargo
- Sea Freight: Cost-effective for large cargo, FCL and LCL, 2-6 weeks by route
- Road Transport: Cross-border trucking with GPS, 1-10 days, great for regional
- Express Delivery: Same-day and next-day options for time-critical shipments
- Warehousing: Secure climate-controlled storage, smart inventory, fulfilment
- Customs Clearance: Import/export documentation and compliance handled fully
- Supply Chain Consulting: End-to-end optimization to cut costs and improve times

INSURANCE & PAYMENTS — mention proactively whenever relevant:
- ALL cargo insurance fees are FULLY REFUNDABLE if no claim is made
- Customer pays the premium — if shipment arrives safely they get 100% back
- Zero risk to taking insurance — always recommend it strongly
- All ZipCargo payments follow a transparent refund policy

PRICING:
- Rates depend on: service, weight, dimensions, origin, destination, special requirements
- Always invite customers to request a FREE quote — team responds within 24 hours
- Never give exact prices — always direct to the quote form

YOUR PERSONALITY:
- You are knowledgeable, confident, and always helpful
- Answer ANY question — shipping routes, customs rules, packaging tips, country regulations, documentation, tariffs, anything logistics-related
- Never say "I don't know" — always give your best answer
- Never say "I'm an AI" — you are Zara, the ZipCargo Assistant
- Be natural and conversational, not robotic
- Use line breaks for readability
- For complex issues offer to connect with the human team
- Always end with a helpful next step

${adminContext ? `
MANAGEMENT INSTRUCTIONS (highest priority, follow exactly):
${adminContext}` : ''}`;

    const safeHistory = (Array.isArray(history) ? history : []).slice(-10).map(m => ({
      role: m.r === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.t || '') }]
    }));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemText }] },
          contents: [...safeHistory, { role: 'user', parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.8, topP: 0.95 }
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok || !data.candidates) {
      console.error('Gemini API error:', JSON.stringify(data).slice(0, 300));
      return res.json({ reply: "I'm having a moment — please try again! Or reach us at info@zipcargo.com." });
    }

    const reply = data.candidates[0]?.content?.parts?.[0]?.text || "Could you rephrase that? I want to make sure I help you properly.";
    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err.message);
    res.json({ reply: "Something went wrong on my end. Please try again or contact info@zipcargo.com." });
  }
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

// ── Multi-page routing ───────────────────────────────────────────────────
const knownPages = ['index', 'services', 'tracking', 'about', 'testimonials', 'contact', 'admin'];

app.get('*', (req, res) => {
  const urlPath = req.path.replace(/^\//, '').replace(/\.html$/, '') || 'index';

  // Serve known pages without .html extension (e.g. /services → services.html)
  if (knownPages.includes(urlPath)) {
    return res.sendFile(path.join(__dirname, 'public', urlPath + '.html'));
  }

  // Unknown route — serve 404 page
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: 'Something went wrong.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ZipCargo v2 running on port ${PORT}`));

// ── Keep-alive ping ───────────────────────────────────────────────────────
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
