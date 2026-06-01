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

// ── Shipment notification email with professional PDF ────────────────────
app.post('/api/email/shipment', async (req, res) => {
  try {
    const { shipment } = req.body;
    if (!shipment || !shipment.rEmail) {
      return res.status(400).json({ error: 'Missing shipment data or recipient email.' });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return res.json({ error: 'Email service not configured.' });

    // Clean siteUrl — always use the correct URL
    const rawUrl = (req.body.settings && req.body.settings.website) || process.env.SITE_URL || 'https://zipcargo-app.onrender.com';
    // Strip ALL protocol prefixes then add https:// once
    const cleanedUrl = rawUrl.replace(/^(https?:\/\/)+/, '').replace(/\/$/, '');
    const siteUrl = 'https://' + cleanedUrl;
    const siteEmail = (req.body.settings && req.body.settings.email)   || process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com';
    const sitePhone = (req.body.settings && req.body.settings.phone)   || '';
    const displayUrl = siteUrl.replace(/^https?:\/\//, '');
    const receiptNo  = 'ZCR-' + new Date().getFullYear() + '-' + (shipment.tracking||'').replace('ZC-','').replace(/-/g,'').slice(-6);
    const issueDate  = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

    // ── Build PDF ──────────────────────────────────────────────────────────
    const PDFDocument = require('pdfkit');
    const QRCode = require('qrcode');

    const qrBuffer = await QRCode.toBuffer(siteUrl + '/tracking.html?id=' + shipment.tracking, {
      width: 90, margin: 1, color: { dark: '#0d1f35', light: '#ffffff' }
    });

    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595, pad = 36, cW = W - pad * 2;

      // White background
      doc.rect(0, 0, W, 842).fill('#ffffff');

      // ── HEADER ──
      // Orange top border
      doc.rect(pad, 24, cW, 3).fill('#e8820c');

      // Dark header card
      doc.roundedRect(pad, 27, cW, 88, 8).fill('#0d1f35');

      // Logo box
      doc.roundedRect(pad + 14, 42, 32, 32, 6).fill('#e8820c');
      doc.fill('white').fontSize(14).font('Helvetica-Bold').text('ZC', pad + 18, 50, { lineBreak: false });

      // Company name
      doc.fill('white').fontSize(16).font('Helvetica-Bold').text('ZipCargo', pad + 54, 43);
      doc.fill('#aac4e0').fontSize(9).font('Helvetica').text('Global Logistics Solutions', pad + 54, 63);

      // Receipt info (right side)
      doc.fill('#e8820c').fontSize(7).font('Helvetica-Bold')
         .text('O F F I C I A L  R E C E I P T', 0, 38, { align: 'right', width: W - pad - 16 });
      doc.fill('#7a9ab8').fontSize(8).font('Helvetica')
         .text('Receipt No: ' + receiptNo, 0, 52, { align: 'right', width: W - pad - 16 });
      doc.fill('white').fontSize(14).font('Helvetica-Bold')
         .text(shipment.tracking, 0, 65, { align: 'right', width: W - pad - 16 });
      doc.fill('#7a9ab8').fontSize(8).font('Helvetica')
         .text('Issued: ' + issueDate, 0, 83, { align: 'right', width: W - pad - 16 });

      // Status pill
      const sColors = { 'Delivered':'#16a34a','In Transit':'#2563eb','Pending':'#f59e0b','On Hold':'#ef4444','Out for Delivery':'#8b5cf6' };
      doc.roundedRect(pad + 14, 87, 68, 18, 9).fill(sColors[shipment.status] || '#64748b');
      doc.fill('white').fontSize(8).font('Helvetica-Bold')
         .text(shipment.status || 'Pending', pad + 14, 93, { width: 68, align: 'center' });

      // ── ROUTE ──
      let y = 128;
      doc.roundedRect(pad, y, cW, 48, 6).fill('#f8fafc').stroke('#e2e8f0');
      doc.fill('#94a3b8').fontSize(8).font('Helvetica').text('ORIGIN', pad + 14, y + 10);
      doc.fill('#0d1f35').fontSize(12).font('Helvetica-Bold').text(String(shipment.origin||'-'), pad + 14, y + 22);
      doc.fill('#94a3b8').fontSize(8).text('DESTINATION', 0, y + 10, { align: 'right', width: W - pad - 14 });
      doc.fill('#0d1f35').fontSize(12).font('Helvetica-Bold').text(String(shipment.dest||'-'), 0, y + 22, { align: 'right', width: W - pad - 14 });
      // Arrow
      doc.moveTo(W/2 - 18, y + 28).lineTo(W/2 + 2, y + 28).stroke('#e8820c');
      doc.moveTo(W/2 - 2, y + 22).lineTo(W/2 + 10, y + 28).lineTo(W/2 - 2, y + 34).fill('#e8820c');

      // ── PROGRESS ──
      y += 58;
      doc.roundedRect(pad, y, cW, 58, 6).fill('white').stroke('#e2e8f0');
      doc.fill('#64748b').fontSize(8).font('Helvetica-Bold').text('SHIPMENT PROGRESS', pad + 14, y + 10);

      const stages = ['Order Placed', 'In Transit', 'Out for Delivery', 'Delivered'];
      const sIdx = { 'Pending':0,'In Transit':1,'Out for Delivery':2,'Delivered':3,'On Hold':0 };
      const cur = sIdx[shipment.status] ?? 0;
      const sw = cW / stages.length;

      // Draw connecting line first
      doc.moveTo(pad + sw/2, y + 34).lineTo(pad + cW - sw/2, y + 34).stroke('#e2e8f0');

      stages.forEach((st, i) => {
        const sx = pad + sw * i + sw / 2;
        const active = i <= cur;
        const current = i === cur;

        // Active line segment
        if (i < cur) {
          doc.moveTo(sx, y + 34).lineTo(pad + sw * (i+1) + sw/2, y + 34)
             .lineWidth(3).stroke('#e8820c');
        }

        // Circle
        if (current) {
          doc.circle(sx, y + 34, 10).fill('#e8820c');
          doc.circle(sx, y + 34, 5).fill('white');
        } else if (active) {
          doc.circle(sx, y + 34, 7).fill('#e8820c');
        } else {
          doc.circle(sx, y + 34, 7).fill('#e2e8f0');
        }

        // Label
        doc.fill(current ? '#e8820c' : active ? '#0d1f35' : '#94a3b8')
           .fontSize(6.5).font(current ? 'Helvetica-Bold' : 'Helvetica')
           .text(st, sx - sw/2 + 4, y + 46, { width: sw - 8, align: 'center' });
      });

      // ── SENDER / RECIPIENT ──
      y += 66;
      doc.roundedRect(pad, y, cW, 72, 6).fill('white').stroke('#e2e8f0');

      // Left: Sender
      doc.fill('#94a3b8').fontSize(8).font('Helvetica-Bold').text('SENDER', pad + 14, y + 10);
      doc.moveTo(pad + 14, y + 22).lineTo(pad + cW/2 - 8, y + 22).lineWidth(0.5).stroke('#f1f5f9');
      [['Name', shipment.sName], ['Phone', shipment.sPhone], ['Email', shipment.sEmail]]
        .forEach(([l, v], i) => {
          if (!v) return;
          doc.fill('#94a3b8').fontSize(7).font('Helvetica').text(l, pad + 14, y + 28 + i * 15);
          doc.fill('#0d1f35').fontSize(8).font('Helvetica-Bold').text(String(v).substring(0,26), pad + 50, y + 28 + i * 15);
        });

      // Divider
      doc.moveTo(pad + cW/2, y + 8).lineTo(pad + cW/2, y + 64).lineWidth(0.5).stroke('#f1f5f9');

      // Right: Recipient
      const rx = pad + cW/2 + 10;
      doc.fill('#94a3b8').fontSize(8).font('Helvetica-Bold').text('RECIPIENT', rx, y + 10);
      doc.moveTo(rx, y + 22).lineTo(pad + cW - 8, y + 22).lineWidth(0.5).stroke('#f1f5f9');
      [['Name', shipment.rName], ['Phone', shipment.rPhone], ['Email', shipment.rEmail]]
        .forEach(([l, v], i) => {
          if (!v) return;
          doc.fill('#94a3b8').fontSize(7).font('Helvetica').text(l, rx, y + 28 + i * 15);
          doc.fill('#0d1f35').fontSize(8).font('Helvetica-Bold').text(String(v).substring(0,26), rx + 50, y + 28 + i * 15);
        });

      // ── PACKAGE / DELIVERY ──
      y += 80;
      const hasDeliveryAddr = !!(shipment.deliveryAddress && String(shipment.deliveryAddress).trim());
      const cardH = hasDeliveryAddr ? 106 : 84;
      doc.roundedRect(pad, y, cW, cardH, 6).fill('white').stroke('#e2e8f0');

      // Left: Package
      doc.fill('#94a3b8').fontSize(8).font('Helvetica-Bold').text('PACKAGE', pad + 14, y + 10);
      doc.moveTo(pad + 14, y + 22).lineTo(pad + cW/2 - 8, y + 22).lineWidth(0.5).stroke('#f1f5f9');
      [['Service', shipment.service], ['Weight', shipment.weight ? shipment.weight+' kg' : null],
       ['Declared Value', shipment.value ? '$'+shipment.value : null], ['Description', shipment.description]]
        .forEach(([l, v], i) => {
          if (!v) return;
          doc.fill('#94a3b8').fontSize(7).font('Helvetica').text(l, pad + 14, y + 28 + i * 15);
          doc.fill('#0d1f35').fontSize(8).font('Helvetica-Bold').text(String(v).substring(0,20), pad + 72, y + 28 + i * 15);
        });

      // Divider
      doc.moveTo(pad + cW/2, y + 8).lineTo(pad + cW/2, y + cardH - 8).lineWidth(0.5).stroke('#f1f5f9');

      // Right: Delivery
      doc.fill('#94a3b8').fontSize(8).font('Helvetica-Bold').text('DELIVERY', rx, y + 10);
      doc.moveTo(rx, y + 22).lineTo(pad + cW - 8, y + 22).lineWidth(0.5).stroke('#f1f5f9');
      const delRows = [];
      if (hasDeliveryAddr) delRows.push(['Delivery Addr.', String(shipment.deliveryAddress).trim()]);
      delRows.push(['Est. Delivery', shipment.eta]);
      delRows.push(['Current Location', shipment.location]);
      delRows.push(['Status', shipment.status]);
      delRows.push(['Date Issued', issueDate]);

      delRows.slice(0, 5).forEach(([l, v], i) => {
        if (!v) return;
        doc.fill('#94a3b8').fontSize(7).font('Helvetica').text(l, rx, y + 28 + i * 14);
        const valStr = String(v).substring(0, 45);
        doc.fill('#0d1f35').fontSize(7.5).font('Helvetica-Bold')
           .text(valStr, rx + 72, y + 28 + i * 14, { width: cW/2 - 84, lineBreak: false });
      });

      // ── COST BANNER ──
      y += cardH + 8;
      doc.roundedRect(pad, y, cW, 38, 6).fill('#0d1f35');
      doc.fill('#aac4e0').fontSize(8).font('Helvetica').text('TOTAL SHIPPING COST', pad + 14, y + 10);
      doc.fill('#64748b').fontSize(7).text('Inclusive of all applicable fees', pad + 14, y + 23);
      const cost = shipment.cost ? '$' + parseFloat(shipment.cost).toFixed(2) : (shipment.value ? '$' + parseFloat(shipment.value).toFixed(2) : 'TBD');
      doc.fill('#e8820c').fontSize(20).font('Helvetica-Bold').text(cost, 0, y + 8, { align: 'right', width: W - pad - 16 });

      // ── FOOTER ──
      y += 46;
      doc.roundedRect(pad, y, cW, 62, 6).fill('white').stroke('#e2e8f0');

      // Logo
      doc.roundedRect(pad + 12, y + 16, 26, 26, 5).fill('#0d1f35');
      doc.fill('#e8820c').fontSize(11).font('Helvetica-Bold').text('ZC', pad + 16, y + 22, { lineBreak: false });
      doc.fill('#0d1f35').fontSize(11).font('Helvetica-Bold').text('ZipCargo Logistics', pad + 46, y + 15);
      doc.fill('#94a3b8').fontSize(8).font('Helvetica').text('Ship Smarter. Deliver Faster.', pad + 46, y + 29);
      doc.fill('#94a3b8').fontSize(7).text('Please retain for your records', pad + 46, y + 43);
      doc.fill('#94a3b8').fontSize(6.5).text(shipment.tracking + '  •  ' + receiptNo, pad + 46, y + 53);

      // QR code
      doc.image(qrBuffer, W - pad - 62, y + 5, { width: 52, height: 52 });
      doc.fill('#94a3b8').fontSize(6).text('Scan to track', W - pad - 62, y + 58, { width: 52, align: 'center' });

      // Bottom border
      doc.rect(pad, y + 62, cW, 3).fill('#e8820c');

      doc.end();
    });

    // ── Send email with PDF ────────────────────────────────────────────────
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'ZipCargo Logistics', email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        to: [{ email: shipment.rEmail, name: shipment.rName }],
        replyTo: { email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        subject: `Your ZipCargo Shipment — ${shipment.tracking}`,
        trackingSettings: {
          clickTracking: { enabled: false },
          openTracking: { enabled: false },
        },
        htmlContent: `<p>Dear ${shipment.rName},</p>
<p>Warm regards from the team at ZipCargo!</p>
<p>We are pleased to inform you that a package has been successfully registered in your name.</p>
<p><strong>Tracking Number: ${shipment.tracking}</strong></p>
<p>To verify the details and track the status of your shipment, kindly visit our website at:</p>
<p>${siteUrl}/tracking.html</p>
<p>And enter your tracking number: <strong>${shipment.tracking}</strong></p>
<p>Please reply to this email with any questions or concerns regarding your package. We recommend checking your email regularly for updates on the whereabouts and details of your shipment.</p>
<p>Thank you for choosing ZipCargo.</p>
<p>Best regards,<br/>ZipCargo Logistics Team<br/>${siteEmail}</p>`,
        attachment: [{
          name: `ZipCargo-Receipt-${shipment.tracking}.pdf`,
          content: pdfBuffer.toString('base64'),
        }],
      }),
    });

    const brevoData = await brevoRes.json();
    if (!brevoRes.ok) throw new Error(brevoData.message || 'Brevo error');
    res.json({ success: true });

  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: err.message });
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
