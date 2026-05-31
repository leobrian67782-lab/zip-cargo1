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

// ── Shipment notification email with PDF receipt ──────────────────────────
app.post('/api/email/shipment', async (req, res) => {
  try {
    const { shipment } = req.body;
    if (!shipment || !shipment.rEmail) {
      return res.status(400).json({ error: 'Missing shipment data or recipient email.' });
    }

    const PDFDocument = require('pdfkit');

    // Get site settings passed from admin
    const siteUrl    = (req.body.settings && req.body.settings.website) || process.env.SITE_URL || 'https://zipcargo-app.onrender.com';
    const siteEmail  = (req.body.settings && req.body.settings.email)   || process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com';
    const sitePhone  = (req.body.settings && req.body.settings.phone)   || '';

    // Clean URL for display
    const displayUrl = siteUrl.replace(/^https?:\/\//, '');

    // Generate PDF receipt — single page A4
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595, H = 842;
      const pad = 40;

      // ── Header ──
      doc.rect(0, 0, W, 90).fill('#0d1f35');
      doc.fill('#e8820c').fontSize(22).font('Helvetica-Bold').text('ZipCargo', pad, 20);
      doc.fill('white').fontSize(9).font('Helvetica').text('Global Logistics Solutions', pad, 48);
      doc.fill('#7a9ab8').fontSize(8).text(siteEmail, pad, 63);
      doc.fill('white').fontSize(14).font('Helvetica-Bold')
         .text('SHIPMENT RECEIPT', 0, 22, { align: 'right', width: W - pad });
      doc.fill('#aac4e0').fontSize(8).font('Helvetica')
         .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 0, 44, { align: 'right', width: W - pad });

      // ── Tracking + Status row ──
      doc.rect(pad, 105, W - pad*2, 44).fill('#f0f7ff').stroke('#c5daf5');
      doc.fill('#64748b').fontSize(8).font('Helvetica').text('TRACKING NUMBER', pad + 10, 113);
      doc.fill('#e8820c').fontSize(17).font('Helvetica-Bold').text(shipment.tracking, pad + 10, 124);

      const statusColors = { 'Delivered':'#16a34a','In Transit':'#2563eb','Pending':'#d97706','On Hold':'#dc2626','Out for Delivery':'#7c3aed' };
      const sc = statusColors[shipment.status] || '#64748b';
      doc.roundedRect(W - pad - 100, 112, 100, 28, 4).fill(sc);
      doc.fill('white').fontSize(9).font('Helvetica-Bold')
         .text(shipment.status || 'Pending', W - pad - 100, 122, { width: 100, align: 'center' });

      // ── Two column layout ──
      let y = 165;
      const col1x = pad, col2x = W/2 + 5, colW = W/2 - pad - 5;

      const sectionHeader = (title, x, w, yy) => {
        doc.rect(x, yy, w, 20).fill('#0d1f35');
        doc.fill('white').fontSize(8).font('Helvetica-Bold').text(title, x + 8, yy + 6);
        return yy + 20;
      };

      const row = (label, value, x, w, yy, shade) => {
        if (!value) return yy;
        doc.rect(x, yy, w, 18).fill(shade ? '#f8fafc' : 'white').stroke('#e8edf2');
        doc.fill('#94a3b8').fontSize(7).font('Helvetica').text(label, x + 6, yy + 5);
        doc.fill('#0d1f35').fontSize(8).font('Helvetica-Bold')
           .text(String(value).substring(0, 35), x + 6, yy + 12, { width: w - 12 });
        return yy + 18;
      };

      // LEFT: Shipment Details
      let ly = sectionHeader('SHIPMENT DETAILS', col1x, colW, y);
      let shade = false;
      const shipFields = [
        ['Service', shipment.service],
        ['Origin', shipment.origin],
        ['Destination', shipment.dest],
        ['Est. Delivery', shipment.eta || 'TBD'],
        ['Current Location', shipment.location || 'Processing'],
        ['Weight', shipment.weight ? shipment.weight + ' kg' : null],
        ['Declared Value', shipment.value ? '$' + shipment.value : null],
        ['Description', shipment.description],
      ];
      shipFields.forEach(([l,v]) => { ly = row(l, v, col1x, colW, ly, shade); shade = !shade; });

      // RIGHT: Sender + Recipient
      let ry = sectionHeader('SENDER', col2x, colW, y);
      shade = false;
      [['Name',shipment.sName],['Phone',shipment.sPhone],['Email',shipment.sEmail],['From',shipment.origin]]
        .forEach(([l,v]) => { ry = row(l, v, col2x, colW, ry, shade); shade=!shade; });

      ry += 6;
      ry = sectionHeader('RECIPIENT', col2x, colW, ry);
      shade = false;
      [['Name',shipment.rName],['Phone',shipment.rPhone],['Email',shipment.rEmail],['To',shipment.dest]]
        .forEach(([l,v]) => { ry = row(l, v, col2x, colW, ry, shade); shade=!shade; });

      // ── Notes (if any) ──
      const bottomY = Math.max(ly, ry) + 14;
      let ny = bottomY;
      if (shipment.notes) {
        ny = sectionHeader('NOTES', pad, W - pad*2, bottomY);
        doc.rect(pad, ny, W - pad*2, 28).fill('#fffbeb').stroke('#fde68a');
        doc.fill('#92400e').fontSize(8).font('Helvetica')
           .text(shipment.notes, pad + 8, ny + 8, { width: W - pad*2 - 16 });
        ny += 34;
      }

      // ── Track box ──
      const trackY = ny + 6;
      doc.rect(pad, trackY, W - pad*2, 42).fill('#fff7ed').stroke('#e8820c');
      doc.fill('#e8820c').fontSize(9).font('Helvetica-Bold').text('TRACK YOUR SHIPMENT', pad + 10, trackY + 8);
      doc.fill('#0d1f35').fontSize(8).font('Helvetica')
         .text(`Visit ${displayUrl} and enter your tracking number: ${shipment.tracking}`, pad + 10, trackY + 22, { width: W - pad*2 - 20 });

      // ── Footer — anchored to bottom ──
      const footerY = H - 52;
      doc.rect(0, footerY, W, 52).fill('#0d1f35');
      doc.fill('white').fontSize(8).font('Helvetica-Bold')
         .text('ZipCargo Logistics — Delivering trust, one shipment at a time', 0, footerY + 10, { align: 'center', width: W });
      const footerLine2 = [siteEmail, displayUrl, sitePhone].filter(Boolean).join('  |  ');
      doc.fill('#aac4e0').fontSize(7).font('Helvetica')
         .text(footerLine2, 0, footerY + 26, { align: 'center', width: W });
      doc.fill('#e8820c').fontSize(7)
         .text('This is an official ZipCargo document. Please keep for your records.', 0, footerY + 40, { align: 'center', width: W });

      doc.end();
    });

    // ── Email content ──
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f2f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d1f35,#1a3a5c);padding:32px 40px;">
      <div style="color:#e8820c;font-size:28px;font-weight:800;margin-bottom:4px;">⚡ ZipCargo</div>
      <div style="color:#aac4e0;font-size:13px;">Global Logistics Solutions</div>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px;">
      <p style="color:#0d1f35;font-size:16px;margin:0 0 20px;">Dear <strong>${shipment.rName}</strong>,</p>
      <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Warm regards from the team at <strong>ZipCargo!</strong><br/>
        We are pleased to inform you that a package has been successfully registered in your name.
      </p>

      <!-- Tracking Number Box -->
      <div style="background:#e8f4ff;border:2px solid #0d1f35;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:center;">
        <div style="color:#64748b;font-size:12px;font-weight:600;letter-spacing:1px;margin-bottom:8px;">TRACKING NUMBER</div>
        <div style="color:#e8820c;font-size:28px;font-weight:800;letter-spacing:2px;">${shipment.tracking}</div>
      </div>

      <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0 0 20px;">
        To verify the details and track the status of your shipment, kindly visit our website at:
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${siteUrl}/tracking.html" style="background:#e8820c;color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
          Track Your Shipment →
        </a>
      </div>

      <p style="color:#64748b;font-size:13px;text-align:center;margin:8px 0 28px;">
        Or visit: <a href="${siteUrl}/tracking.html" style="color:#e8820c;">${siteUrl}/tracking.html</a><br/>
        and enter your tracking number: <strong>${shipment.tracking}</strong>
      </p>

      <!-- Shipment Summary -->
      <div style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin:24px 0;border:1px solid #e2e8f0;">
        <div style="color:#0d1f35;font-size:13px;font-weight:700;letter-spacing:.5px;margin-bottom:14px;">SHIPMENT SUMMARY</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Status</td>
            <td style="padding:8px 0;color:#0d1f35;font-weight:600;">${shipment.status || 'Pending'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">Service</td>
            <td style="padding:8px 0;color:#0d1f35;font-weight:600;">${shipment.service}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">From</td>
            <td style="padding:8px 0;color:#0d1f35;font-weight:600;">${shipment.origin}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 0;color:#64748b;">To</td>
            <td style="padding:8px 0;color:#0d1f35;font-weight:600;">${shipment.dest}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;">Est. Delivery</td>
            <td style="padding:8px 0;color:#0d1f35;font-weight:600;">${shipment.eta || 'TBD'}</td>
          </tr>
        </table>
      </div>

      <p style="color:#1e293b;font-size:14px;line-height:1.7;margin:0 0 12px;">
        Please reply to this email with any questions or concerns regarding your package.
        We recommend checking your email regularly for updates on the whereabouts and details of your shipment.
      </p>

      <p style="color:#1e293b;font-size:14px;margin:0;">
        Thank you for choosing <strong>ZipCargo</strong>.
      </p>

      <p style="color:#1e293b;font-size:14px;margin:16px 0 0;">
        Best regards,<br/>
        <strong>ZipCargo Logistics Team</strong><br/>
        <a href="mailto:zipcargo99@gmail.com" style="color:#e8820c;">zipcargo99@gmail.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#0d1f35;padding:20px 40px;text-align:center;">
      <div style="color:#aac4e0;font-size:11px;">ZipCargo Logistics — Delivering trust, one shipment at a time</div>
      <div style="color:#4a6a88;font-size:10px;margin-top:4px;">This is an official ZipCargo document. Please keep for your records.</div>
    </div>
  </div>
</body>
</html>`;

    // Send via Brevo API (HTTP — no port blocking)
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ZipCargo Logistics', email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        to: [{ email: shipment.rEmail, name: shipment.rName }],
        replyTo: { email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        subject: `Your ZipCargo Shipment — ${shipment.tracking}`,
        htmlContent: emailHtml,
        attachment: [{
          name: `ZipCargo-Receipt-${shipment.tracking}.pdf`,
          content: pdfBuffer.toString('base64'),
        }],
      }),
    });

    const brevoData = await brevoRes.json();
    if (!brevoRes.ok) {
      console.error('Brevo API error:', JSON.stringify(brevoData));
      throw new Error(brevoData.message || 'Brevo API error');
    }

    res.json({ success: true, message: 'Shipment notification sent successfully.' });

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
