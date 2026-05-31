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
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return res.json({ 
      ok: false, 
      error: 'Missing env vars', 
      GMAIL_USER: !!gmailUser, 
      GMAIL_APP_PASSWORD: !!gmailPass 
    });
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass }
    });
    await transporter.verify();
    res.json({ ok: true, message: 'Gmail connection verified!', user: gmailUser });
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

    const nodemailer = require('nodemailer');
    const PDFDocument = require('pdfkit');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Generate PDF receipt
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── PDF Header ──
      doc.rect(0, 0, 612, 120).fill('#0d1f35');
      doc.fill('white').fontSize(28).font('Helvetica-Bold').text('⚡ ZipCargo', 50, 35);
      doc.fontSize(11).font('Helvetica').text('Global Logistics Solutions', 50, 70);
      doc.fontSize(10).text('zipcargo99@gmail.com', 50, 88);

      doc.fill('#e8820c').fontSize(18).font('Helvetica-Bold')
        .text('SHIPMENT RECEIPT', 350, 45, { align: 'right', width: 212 });
      doc.fill('white').fontSize(10).font('Helvetica')
        .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 350, 72, { align: 'right', width: 212 });

      // ── Tracking Number Box ──
      doc.moveDown(4);
      doc.rect(50, 140, 512, 50).fill('#e8f4ff').stroke('#0d1f35');
      doc.fill('#0d1f35').fontSize(11).font('Helvetica').text('TRACKING NUMBER', 60, 150);
      doc.fill('#e8820c').fontSize(16).font('Helvetica-Bold').text(shipment.tracking, 60, 165);

      // ── Status Badge ──
      const statusColors = { 'Delivered':'#16a34a','In Transit':'#2563eb','Pending':'#d97706','On Hold':'#dc2626','Out for Delivery':'#7c3aed' };
      const sc = statusColors[shipment.status] || '#64748b';
      doc.roundedRect(370, 148, 150, 34, 5).fill(sc);
      doc.fill('white').fontSize(12).font('Helvetica-Bold')
        .text(shipment.status || 'Pending', 370, 158, { width: 150, align: 'center' });

      // ── Section: Shipment Details ──
      let y = 215;
      const drawSection = (title, fields) => {
        doc.rect(50, y, 512, 28).fill('#0d1f35');
        doc.fill('white').fontSize(11).font('Helvetica-Bold').text(title, 60, y + 8);
        y += 35;
        fields.forEach(([label, value]) => {
          if (!value) return;
          doc.rect(50, y, 512, 24).fill(y % 48 === 0 ? '#f8fafc' : 'white').stroke('#e2e8f0');
          doc.fill('#64748b').fontSize(9).font('Helvetica').text(label, 60, y + 7);
          doc.fill('#0d1f35').fontSize(10).font('Helvetica-Bold').text(String(value), 200, y + 7, { width: 350 });
          y += 24;
        });
        y += 10;
      };

      drawSection('SHIPMENT DETAILS', [
        ['Service Type', shipment.service],
        ['Current Status', shipment.status],
        ['Current Location', shipment.location || 'Processing'],
        ['Estimated Delivery', shipment.eta || 'TBD'],
        ['Weight', shipment.weight ? shipment.weight + ' kg' : null],
        ['Declared Value', shipment.value ? '$' + shipment.value : null],
        ['Description', shipment.description],
      ]);

      drawSection('SENDER INFORMATION', [
        ['Name', shipment.sName],
        ['Phone', shipment.sPhone],
        ['Email', shipment.sEmail],
        ['Origin', shipment.origin],
      ]);

      drawSection('RECIPIENT INFORMATION', [
        ['Name', shipment.rName],
        ['Phone', shipment.rPhone],
        ['Email', shipment.rEmail],
        ['Destination', shipment.dest],
      ]);

      // ── Notes ──
      if (shipment.notes) {
        doc.rect(50, y, 512, 28).fill('#0d1f35');
        doc.fill('white').fontSize(11).font('Helvetica-Bold').text('NOTES', 60, y + 8);
        y += 35;
        doc.fill('#1e293b').fontSize(10).font('Helvetica').text(shipment.notes, 60, y, { width: 492 });
        y += 30;
      }

      // ── Tracking Instructions ──
      y += 10;
      doc.rect(50, y, 512, 55).fill('#fff7ed').stroke('#e8820c');
      doc.fill('#e8820c').fontSize(10).font('Helvetica-Bold').text('TRACK YOUR SHIPMENT', 60, y + 10);
      doc.fill('#0d1f35').fontSize(9).font('Helvetica')
        .text('Visit our website and enter your tracking number to see real-time updates:', 60, y + 24)
        .text('https://zipcargo-app.onrender.com/tracking.html', 60, y + 37, { link: 'https://zipcargo-app.onrender.com/tracking.html' });

      // ── Footer ──
      doc.rect(0, 780, 612, 62).fill('#0d1f35');
      doc.fill('white').fontSize(9).font('Helvetica')
        .text('ZipCargo Logistics — Delivering trust, one shipment at a time', 50, 795, { align: 'center', width: 512 })
        .text('zipcargo99@gmail.com  |  zipcargo-app.onrender.com  |  Available 24/7', 50, 812, { align: 'center', width: 512 });
      doc.fill('#e8820c').fontSize(8).text('This is an official ZipCargo document. Please keep for your records.', 50, 828, { align: 'center', width: 512 });

      doc.end();
    });

    // ── Email content ──
    const siteUrl = process.env.SITE_URL || 'https://zipcargo-app.onrender.com';
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

    await transporter.sendMail({
      from: `"ZipCargo Logistics" <${process.env.GMAIL_USER}>`,
      to: shipment.rEmail,
      subject: `Your ZipCargo Shipment — ${shipment.tracking}`,
      html: emailHtml,
      replyTo: process.env.GMAIL_USER,
      attachments: [{
        filename: `ZipCargo-Receipt-${shipment.tracking}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

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
