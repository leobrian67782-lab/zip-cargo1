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

// ── Test email config ─────────────────────────────────────────────────────
app.get('/api/email/test', async (req, res) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey) {
    return res.json({ ok: false, error: 'Missing BREVO_API_KEY env var' });
  }
  try {
    // Test by calling Brevo account info endpoint
    const r = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey, 'accept': 'application/json' }
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Brevo API error');
    res.json({ ok: true, message: 'Brevo API connected!', email: d.email, plan: d.plan?.[0]?.type });
  } catch(err) {
    res.json({ ok: false, error: err.message });
  }
});

// ── Shipment notification email ──────────────────────────────────────────
app.post('/api/email/shipment', async (req, res) => {
  try {
    const { shipment } = req.body;
    if (!shipment || !shipment.rEmail) {
      return res.status(400).json({ error: 'Missing shipment data or recipient email.' });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return res.json({ reply: 'Email service not configured.' });
    }

    const siteUrl    = (req.body.settings && req.body.settings.website) || process.env.SITE_URL || 'https://zipcargo-app.onrender.com';
    const siteEmail  = (req.body.settings && req.body.settings.email)   || process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com';
    const sitePhone  = (req.body.settings && req.body.settings.phone)   || '';
    const displayUrl = siteUrl.replace(/^https?:\/\//, '');
    const receiptNo  = 'ZCR-' + new Date().getFullYear() + '-' + (shipment.tracking||'').replace('ZC-','').replace(/-/g,'').slice(-6);
    const issueDate  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const statusColors = { 'Delivered':'#16a34a','In Transit':'#2563eb','Pending':'#d97706','On Hold':'#dc2626','Out for Delivery':'#7c3aed' };
    const statusColor = statusColors[shipment.status] || '#64748b';

    const stages = ['Order Placed','In Transit','Out for Delivery','Delivered'];
    const stageIdx = { 'Pending':0,'In Transit':1,'Out for Delivery':2,'Delivered':3,'On Hold':0 };
    const curStage = stageIdx[shipment.status] ?? 0;

    const progressBar = stages.map((s, i) => {
      const active = i <= curStage;
      const current = i === curStage;
      const circle = current
        ? `<div style="width:28px;height:28px;border-radius:50%;background:#e8820c;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;box-shadow:0 0 0 4px rgba(232,130,12,0.2)"><div style="width:10px;height:10px;border-radius:50%;background:white;"></div></div>`
        : active
          ? `<div style="width:20px;height:20px;border-radius:50%;background:#e8820c;margin:4px auto 10px;"></div>`
          : `<div style="width:20px;height:20px;border-radius:50%;background:#e2e8f0;margin:4px auto 10px;"></div>`;
      return `<td style="text-align:center;vertical-align:top;padding:0 4px;">
        ${circle}
        <div style="font-size:10px;color:${current?'#e8820c':active?'#0d1f35':'#94a3b8'};font-weight:${current?'700':'400'};line-height:1.3;">${s}</div>
      </td>`;
    }).join('<td style="padding-top:10px;"><div style="height:2px;background:#e2e8f0;margin-top:4px;"></div></td>');

    const row = (label, value) => value
      ? `<tr><td style="padding:7px 0;color:#94a3b8;font-size:12px;width:45%;">${label}</td><td style="padding:7px 0;color:#0d1f35;font-size:12px;font-weight:700;">${value}</td></tr>`
      : '';

    const emailHtml = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<style>
  :root { color-scheme: light only; }
  * { -webkit-text-size-adjust: 100%; }
  body { margin:0!important; padding:0!important; background:#f3f4f6!important; }
  .dark-bg { background:#0d1f35!important; }
  .cost-bg { background:#0d1f35!important; }
  @media (prefers-color-scheme: dark) {
    body { background:#f3f4f6!important; color:#000000!important; }
    .email-wrapper { background:#f3f4f6!important; }
    .white-card { background:#ffffff!important; color:#0d1f35!important; }
    .dark-bg { background:#0d1f35!important; }
    .cost-bg { background:#0d1f35!important; }
    .dark-text { color:#0d1f35!important; }
    .gray-text { color:#64748b!important; }
    .orange-text { color:#e8820c!important; }
  }
</style>
</head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;" class="email-wrapper">
<div style="max-width:580px;margin:0 auto;">

  <!-- Orange top bar -->
  <div style="height:4px;background:#e8820c;border-radius:4px 4px 0 0;"></div>

  <!-- Header -->
  <div class="dark-bg" style="background:#0d1f35;padding:24px 28px;">
    <table width="100%"><tr>
      <td>
        <table><tr>
          <td><div style="background:#e8820c;width:36px;height:36px;border-radius:8px;text-align:center;line-height:36px;font-size:18px;font-weight:800;color:white;">Z</div></td>
          <td style="padding-left:10px;">
            <div style="color:white;font-size:18px;font-weight:800;">ZipCargo</div>
            <div style="color:#aac4e0;font-size:11px;">Global Logistics Solutions</div>
          </td>
        </tr></table>
      </td>
      <td style="text-align:right;">
        <div style="color:#e8820c;font-size:9px;font-weight:700;letter-spacing:1px;">O F F I C I A L &nbsp; R E C E I P T</div>
        <div style="color:#7a9ab8;font-size:10px;margin-top:2px;">Receipt No: ${receiptNo}</div>
        <div style="color:white;font-size:16px;font-weight:800;margin-top:2px;">${shipment.tracking}</div>
        <div style="color:#7a9ab8;font-size:10px;margin-top:2px;">Issued: ${issueDate}</div>
      </td>
    </tr></table>
    <div style="margin-top:14px;">
      <span style="background:${statusColor};color:white;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;">${shipment.status||'Pending'}</span>
    </div>
  </div>

  <!-- Route -->
  <div class="white-card" style="background:#ffffff;padding:16px 28px;border-top:1px solid #e5e7eb;">
    <table width="100%"><tr>
      <td style="width:42%;">
        <div style="color:#94a3b8;font-size:9px;font-weight:700;letter-spacing:.5px;">ORIGIN</div>
        <div style="color:#0d1f35;font-size:14px;font-weight:800;margin-top:3px;">${shipment.origin||'-'}</div>
      </td>
      <td style="text-align:center;color:#e8820c;font-size:18px;font-weight:800;">&gt;&gt;</td>
      <td style="width:42%;text-align:right;">
        <div style="color:#94a3b8;font-size:9px;font-weight:700;letter-spacing:.5px;">DESTINATION</div>
        <div style="color:#0d1f35;font-size:14px;font-weight:800;margin-top:3px;">${shipment.dest||'-'}</div>
      </td>
    </tr></table>
  </div>

  <!-- Progress -->
  <div class="white-card" style="background:#ffffff;padding:16px 28px;border-top:1px solid #f1f5f9;">
    <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:14px;">SHIPMENT PROGRESS</div>
    <table width="100%" cellspacing="0" cellpadding="0"><tr>${progressBar}</tr></table>
  </div>

  <!-- Sender / Recipient -->
  <div class="white-card" style="background:#ffffff;padding:16px 28px;border-top:1px solid #f1f5f9;">
    <table width="100%"><tr>
      <td style="width:48%;vertical-align:top;padding-right:12px;border-right:1px solid #f1f5f9;">
        <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:8px;">SENDER</div>
        <table width="100%">
          ${row('Name', shipment.sName)}
          ${row('Phone', shipment.sPhone)}
          ${row('Email', shipment.sEmail)}
        </table>
      </td>
      <td style="width:4%;"></td>
      <td style="width:48%;vertical-align:top;padding-left:12px;">
        <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:8px;">RECIPIENT</div>
        <table width="100%">
          ${row('Name', shipment.rName)}
          ${row('Phone', shipment.rPhone)}
          ${row('Email', shipment.rEmail)}
          ${shipment.deliveryAddress ? row('Delivery Address', shipment.deliveryAddress) : ''}
        </table>
      </td>
    </tr></table>
  </div>

  <!-- Package / Delivery -->
  <div class="white-card" style="background:#ffffff;padding:16px 28px;border-top:1px solid #f1f5f9;">
    <table width="100%"><tr>
      <td style="width:48%;vertical-align:top;padding-right:12px;border-right:1px solid #f1f5f9;">
        <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:8px;">PACKAGE</div>
        <table width="100%">
          ${row('Service', shipment.service)}
          ${row('Weight', shipment.weight ? shipment.weight+' kg' : null)}
          ${row('Declared Value', shipment.value ? '$'+shipment.value : null)}
          ${row('Description', shipment.description)}
        </table>
      </td>
      <td style="width:4%;"></td>
      <td style="width:48%;vertical-align:top;padding-left:12px;">
        <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:8px;">DELIVERY</div>
        <table width="100%">
          ${row('Est. Delivery', shipment.eta)}
          ${row('Current Location', shipment.location)}
          ${row('Status', shipment.status)}
          ${row('Date Issued', issueDate)}
        </table>
      </td>
    </tr></table>
  </div>

  <!-- Cost banner -->
  <div class="cost-bg" style="background:#0d1f35;padding:16px 28px;">
    <table width="100%"><tr>
      <td>
        <div style="color:#aac4e0;font-size:10px;font-weight:700;">TOTAL SHIPPING COST</div>
        <div style="color:#7a9ab8;font-size:9px;margin-top:2px;">Inclusive of all applicable fees</div>
      </td>
      <td style="text-align:right;">
        <div style="color:#e8820c;font-size:24px;font-weight:800;">${shipment.cost ? '$'+parseFloat(shipment.cost).toFixed(2) : (shipment.value ? '$'+parseFloat(shipment.value).toFixed(2) : 'TBD')}</div>
      </td>
    </tr></table>
  </div>

  <!-- Track button -->
  <div class="white-card" style="background:#ffffff;padding:20px 28px;border-top:1px solid #f1f5f9;text-align:center;">
    <div style="color:#0d1f35;font-size:13px;margin-bottom:14px;">
      To track your shipment visit our website and enter tracking number: <strong>${shipment.tracking}</strong>
    </div>
    <a href="${siteUrl}/tracking.html?id=${shipment.tracking}" style="background:#e8820c;color:white;padding:12px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
      Track Your Shipment →
    </a>
    <div style="margin-top:10px;color:#94a3b8;font-size:11px;">${displayUrl}</div>
  </div>

  <!-- Message -->
  <div class="white-card" style="background:#f8fafc;padding:20px 28px;border-top:1px solid #f1f5f9;border-radius:0 0 8px 8px;">
    <p style="color:#0d1f35;font-size:13px;line-height:1.7;margin:0 0 12px;">
      Please reply to this email with any questions or concerns regarding your package.
      We recommend checking your email regularly for updates on your shipment.
    </p>
    <p style="color:#0d1f35;font-size:13px;margin:0;">
      Thank you for choosing <strong>ZipCargo</strong>.<br/>
      <span style="color:#94a3b8;">Best regards,</span><br/>
      <strong>ZipCargo Logistics Team</strong><br/>
      <a href="mailto:${siteEmail}" style="color:#e8820c;">${siteEmail}</a>
      ${sitePhone ? ' &nbsp;|&nbsp; ' + sitePhone : ''}
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px;color:#94a3b8;font-size:10px;">
    ZipCargo Logistics — Delivering trust, one shipment at a time<br/>
    <span style="color:#cbd5e1;">This is an official ZipCargo document. Please keep for your records.</span>
  </div>

</div>
</body></html>`;

    // Send via Brevo API
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ZipCargo Logistics', email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        to: [{ email: shipment.rEmail, name: shipment.rName }],
        replyTo: { email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        subject: `Your ZipCargo Shipment — ${shipment.tracking}`,
        htmlContent: emailHtml,
      }),
    });

    const brevoData = await brevoRes.json();
    if (!brevoRes.ok) {
      console.error('Brevo error:', JSON.stringify(brevoData));
      throw new Error(brevoData.message || 'Brevo API error');
    }

    res.json({ success: true, message: 'Shipment notification sent.' });

  } catch (err) {
    console.error('Shipment email error:', err.message);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

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
