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

// ── Shipment status update email ──────────────────────────────────────────
app.post('/api/email/status-update', async (req, res) => {
  try {
    const { shipment, settings } = req.body;
    if (!shipment || !shipment.rEmail) {
      return res.status(400).json({ error: 'Missing data.' });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return res.json({ error: 'Email not configured.' });

    const siteEmail = (settings && settings.email) || process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com';

    const statusEmoji = {
      'Pending':          '⏳',
      'In Transit':       '✈️',
      'Out for Delivery': '🚚',
      'Delivered':        '✅',
      'On Hold':          '⚠️',
    }[shipment.status] || '📦';

    const statusMessages = {
      'Pending':          'Your shipment has been received and is being prepared.',
      'In Transit':       'Great news! Your shipment is now on its way.',
      'Out for Delivery': 'Your shipment is out for delivery today!',
      'Delivered':        'Your shipment has been delivered successfully. Thank you for choosing ZipCargo!',
      'On Hold':          'Your shipment is currently on hold. Please contact us for more information.',
    };

    const statusMsg = statusMessages[shipment.status] || 'Your shipment status has been updated.';

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;}</style>
</head>
<body bgcolor="#f3f4f6" style="margin:0;padding:20px;background:#f3f4f6;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">

  <!-- Header -->
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:24px 28px;">
    <div style="color:#e8820c;font-size:20px;font-weight:800;font-family:Helvetica,Arial,sans-serif;">&#9889; ZipCargo</div>
    <div style="color:#aac4e0;font-size:12px;font-family:Helvetica,Arial,sans-serif;">Shipment Status Update</div>
  </div>

  <!-- Body -->
  <div style="padding:28px;background:#ffffff;">
    <p style="color:#0d1f35;font-size:15px;font-family:Helvetica,Arial,sans-serif;">Dear <strong>${shipment.rName}</strong>,</p>

    <!-- Status Banner -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td bgcolor="#f0f7ff" style="background:#f0f7ff;border-left:4px solid #e8820c;border-radius:0 8px 8px 0;padding:16px 20px;">
          <div style="font-size:22px;margin-bottom:6px;">${statusEmoji}</div>
          <div style="color:#0d1f35;font-size:16px;font-weight:800;font-family:Helvetica,Arial,sans-serif;">${shipment.status}</div>
          <div style="color:#64748b;font-size:13px;margin-top:4px;font-family:Helvetica,Arial,sans-serif;">${statusMsg}</div>
        </td>
      </tr>
    </table>

    <!-- Tracking Number -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-align:center;">
          <div style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:1px;font-family:Helvetica,Arial,sans-serif;">TRACKING NUMBER</div>
          <div style="color:#e8820c;font-size:20px;font-weight:800;margin-top:4px;font-family:Helvetica,Arial,sans-serif;">${shipment.tracking}</div>
        </td>
      </tr>
    </table>

    <!-- Details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:13px;font-family:Helvetica,Arial,sans-serif;">
      ${shipment.location ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Current Location</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.location}</td></tr>` : ''}
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">From</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.origin}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">To</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.dest}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Est. Delivery</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.eta || 'TBD'}</td></tr>
    </table>

    <!-- Track Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td align="center">
          <a href="https://zipcargo-app.onrender.com/tracking.html?id=${shipment.tracking}"
             style="background:#e8820c;color:#ffffff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;font-family:Helvetica,Arial,sans-serif;">
            Track Your Shipment &#8594;
          </a>
        </td>
      </tr>
    </table>

    <p style="color:#1e293b;font-size:13px;line-height:1.7;font-family:Helvetica,Arial,sans-serif;">
      Please reply to this email with any questions or concerns.<br/>
      Thank you for choosing <strong>ZipCargo</strong>.
    </p>
    <p style="color:#1e293b;font-size:13px;font-family:Helvetica,Arial,sans-serif;">
      Best regards,<br/>
      <strong>ZipCargo Logistics Team</strong><br/>
      <a href="mailto:${siteEmail}" style="color:#e8820c;">${siteEmail}</a>
    </p>
  </div>

  <!-- Footer -->
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:16px 28px;text-align:center;">
    <div style="color:#aac4e0;font-size:11px;font-family:Helvetica,Arial,sans-serif;">ZipCargo Logistics &#8212; Delivering trust, one shipment at a time</div>
  </div>
</div>
</body>
</html>`;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'ZipCargo Logistics', email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        to: [{ email: shipment.rEmail, name: shipment.rName }],
        replyTo: { email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        subject: `Shipment Update: ${shipment.status} — ${shipment.tracking}`,
        htmlContent: emailHtml,
        trackingSettings: { clickTracking: { enabled: false }, openTracking: { enabled: false } },
      }),
    });

    const data = await brevoRes.json();
    if (!brevoRes.ok) throw new Error(data.message || 'Brevo error');
    res.json({ success: true });

  } catch (err) {
    console.error('Status update email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ── Crate Invoice email with PDF ─────────────────────────────────────────
app.post('/api/email/crate-invoice', async (req, res) => {
  try {
    const { shipment, option, prices, settings } = req.body;
    if (!shipment || !shipment.rEmail || !option) {
      return res.status(400).json({ error: 'Missing data.' });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return res.json({ error: 'Email not configured.' });

    const siteEmail = (settings && settings.email) || process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com';
    const rentPrice = (prices && prices.rent) || 200;
    const buyPrice  = (prices && prices.buy)  || 250;
    const refundPct = (prices && prices.refund) || 98;
    const isRent    = option === 'rent';
    const price     = isRent ? rentPrice : buyPrice;
    const invoiceNo = 'ZCI-' + Date.now().toString().slice(-8);
    const issueDate = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

    // ── Generate PDF Invoice ──
    const PDFDocument = require('pdfkit');
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595, pad = 36, cW = W - pad * 2;

      // White background
      doc.rect(0, 0, W, 842).fill('#ffffff');

      // Orange top bar
      doc.rect(pad, 24, cW, 3).fill('#e8820c');

      // Header
      doc.roundedRect(pad, 27, cW, 88, 8).fill('#0d1f35');
      doc.roundedRect(pad + 14, 42, 32, 32, 6).fill('#e8820c');
      doc.fill('white').fontSize(13).font('Helvetica-Bold').text('ZC', pad + 18, 50);
      doc.fill('white').fontSize(16).font('Helvetica-Bold').text('ZipCargo', pad + 54, 43);
      doc.fill('#aac4e0').fontSize(9).font('Helvetica').text('Global Logistics Solutions', pad + 54, 63);
      doc.fill('#e8820c').fontSize(7).font('Helvetica-Bold')
         .text('C R A T E  I N V O I C E', 0, 38, { align: 'right', width: W - pad - 16 });
      doc.fill('#7a9ab8').fontSize(8).font('Helvetica')
         .text('Invoice No: ' + invoiceNo, 0, 52, { align: 'right', width: W - pad - 16 });
      doc.fill('white').fontSize(11).font('Helvetica-Bold')
         .text(shipment.tracking, 0, 65, { align: 'right', width: W - pad - 16 });
      doc.fill('#7a9ab8').fontSize(8)
         .text('Issued: ' + issueDate, 0, 81, { align: 'right', width: W - pad - 16 });

      // Option badge
      const badgeColor = isRent ? '#2563eb' : '#16a34a';
      const badgeText  = isRent ? 'RENTAL' : 'PURCHASE';
      doc.roundedRect(pad + 14, 87, 70, 18, 9).fill(badgeColor);
      doc.fill('white').fontSize(8).font('Helvetica-Bold')
         .text(badgeText, pad + 14, 93, { width: 70, align: 'center' });

      // Client info card
      let y = 130;
      doc.roundedRect(pad, y, cW, 56, 6).fill('#f8fafc').stroke('#e2e8f0');
      doc.fill('#94a3b8').fontSize(8).font('Helvetica-Bold').text('BILL TO', pad + 14, y + 10);
      doc.fill('#0d1f35').fontSize(11).font('Helvetica-Bold').text(shipment.rName, pad + 14, y + 24);
      doc.fill('#64748b').fontSize(9).font('Helvetica').text(shipment.rEmail, pad + 14, y + 38);
      if (shipment.rPhone) doc.fill('#64748b').fontSize(9).text(shipment.rPhone, pad + 14, y + 50);

      doc.fill('#94a3b8').fontSize(8).font('Helvetica-Bold').text('SHIPMENT REF', 0, y + 10, { align: 'right', width: W - pad - 16 });
      doc.fill('#0d1f35').fontSize(11).font('Helvetica-Bold').text(shipment.tracking, 0, y + 24, { align: 'right', width: W - pad - 16 });
      doc.fill('#64748b').fontSize(9).font('Helvetica').text(shipment.origin + ' → ' + shipment.dest, 0, y + 38, { align: 'right', width: W - pad - 16 });

      // Invoice table header
      y += 66;
      doc.roundedRect(pad, y, cW, 28, 4).fill('#0d1f35');
      doc.fill('white').fontSize(9).font('Helvetica-Bold').text('DESCRIPTION', pad + 14, y + 9);
      doc.fill('white').fontSize(9).text('QTY', 0, y + 9, { align: 'center', width: W });
      doc.fill('white').fontSize(9).text('AMOUNT', 0, y + 9, { align: 'right', width: W - pad - 14 });

      // Invoice row
      y += 28;
      doc.rect(pad, y, cW, 40).fill('white').stroke('#e2e8f0');
      const itemDesc = isRent
        ? `Air-Conditioned Crate Rental — ${shipment.description || 'Animal'} Transport`
        : `Air-Conditioned Crate Purchase — ${shipment.description || 'Animal'} Transport`;
      doc.fill('#0d1f35').fontSize(10).font('Helvetica-Bold').text(itemDesc, pad + 14, y + 8, { width: cW - 100 });
      doc.fill('#64748b').fontSize(9).font('Helvetica').text('1 unit', pad + 14, y + 24, { width: cW - 100 });
      doc.fill('#0d1f35').fontSize(14).font('Helvetica-Bold')
         .text('$' + price + '.00', 0, y + 14, { align: 'right', width: W - pad - 14 });

      // Refund policy row
      y += 40;
      doc.rect(pad, y, cW, 28).fill(isRent ? '#eff6ff' : '#f0fdf4').stroke('#e2e8f0');
      const policyText = isRent
        ? `Refund Policy: ${refundPct}% refunded upon delivery and crate return`
        : 'Refund Policy: No refund — crate becomes your property upon delivery';
      doc.fill(isRent ? '#1d4ed8' : '#15803d').fontSize(9).font('Helvetica-Bold')
         .text(policyText, pad + 14, y + 9, { width: cW - 28 });

      // Total
      y += 36;
      doc.roundedRect(pad, y, cW, 44, 6).fill('#0d1f35');
      doc.fill('#aac4e0').fontSize(9).font('Helvetica').text('TOTAL AMOUNT DUE', pad + 14, y + 12);
      doc.fill('#64748b').fontSize(8).text('Inclusive of all applicable fees', pad + 14, y + 26);
      doc.fill('#e8820c').fontSize(22).font('Helvetica-Bold')
         .text('$' + price + '.00', 0, y + 10, { align: 'right', width: W - pad - 14 });

      // STAMP
      y += 54;
      const stampColor = isRent ? '#1d4ed8' : '#15803d';
      const stampText1 = isRent ? 'RENTAL' : 'PURCHASE';
      const stampText2 = isRent ? refundPct + '% REFUNDABLE' : 'NO REFUND';

      // Draw stamp circle
      const stampX = W - pad - 90, stampY = y;
      doc.circle(stampX, stampY + 40, 55).lineWidth(3).stroke(stampColor);
      doc.circle(stampX, stampY + 40, 48).lineWidth(1).stroke(stampColor);
      doc.fill(stampColor).fontSize(11).font('Helvetica-Bold')
         .text(stampText1, stampX - 35, stampY + 28, { width: 70, align: 'center' });
      doc.fill(stampColor).fontSize(9).font('Helvetica-Bold')
         .text(stampText2, stampX - 35, stampY + 44, { width: 70, align: 'center' });
      doc.fill(stampColor).fontSize(7).font('Helvetica')
         .text('ZIPCARGO', stampX - 35, stampY + 58, { width: 70, align: 'center' });

      // Terms
      doc.fill('#64748b').fontSize(8).font('Helvetica')
         .text('Terms & Conditions:', pad + 14, y + 8);
      const terms = isRent
        ? `1. Payment of $${rentPrice} is required before shipment proceeds.
2. Upon successful delivery and return of the crate, ${refundPct}% ($${Math.round(rentPrice * refundPct / 100)}) will be refunded.
3. The crate must be returned in its original condition.
4. ZipCargo reserves the right to withhold the remaining ${100-refundPct}% as a handling fee.`
        : `1. Payment of $${buyPrice} is required before shipment proceeds.
2. The crate becomes your permanent property upon delivery.
3. No refund will be issued for purchased crates.
4. The crate will be delivered alongside your ${shipment.description || 'animal'}.`;
      doc.fill('#64748b').fontSize(8).font('Helvetica')
         .text(terms, pad + 14, y + 22, { width: cW - 120, lineBreak: true });

      // Signature line
      y += 130;
      doc.moveTo(pad + 14, y).lineTo(pad + 160, y).lineWidth(1).stroke('#0d1f35');
      doc.fill('#0d1f35').fontSize(8).font('Helvetica-Bold').text('Authorized by ZipCargo Logistics', pad + 14, y + 5);
      doc.fill('#64748b').fontSize(7).font('Helvetica').text(siteEmail, pad + 14, y + 18);

      // Footer
      y += 34;
      doc.roundedRect(pad, y, cW, 44, 6).fill('white').stroke('#e2e8f0');
      doc.roundedRect(pad + 12, y + 8, 26, 26, 5).fill('#0d1f35');
      doc.fill('#e8820c').fontSize(11).font('Helvetica-Bold').text('ZC', pad + 16, y + 15);
      doc.fill('#0d1f35').fontSize(10).font('Helvetica-Bold').text('ZipCargo Logistics', pad + 46, y + 10);
      doc.fill('#94a3b8').fontSize(8).font('Helvetica').text('Ship Smarter. Deliver Faster.', pad + 46, y + 24);
      doc.fill('#94a3b8').fontSize(7).text(invoiceNo + '  •  ' + issueDate, 0, y + 30, { align: 'right', width: W - pad - 14 });
      doc.rect(pad, y + 44, cW, 3).fill('#e8820c');

      doc.end();
    });

    // ── Email ──
    const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="color-scheme" content="light only"/>
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;}</style>
</head>
<body bgcolor="#f3f4f6" style="margin:0;padding:20px;background:#f3f4f6;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:24px 28px;">
    <div style="color:#e8820c;font-size:20px;font-weight:800;">&#9889; ZipCargo</div>
    <div style="color:#aac4e0;font-size:12px;">Global Logistics Solutions</div>
  </div>
  <div style="padding:28px;background:#ffffff;">
    <p style="color:#0d1f35;font-size:15px;">Dear <strong>${shipment.rName}</strong>,</p>
    <p style="color:#1e293b;font-size:14px;line-height:1.8;">
      We have your <strong>${shipment.description || 'animal'}</strong> available in our custody for transportation to you.
      However, our terms of service require animals to be transported in the most comfortable conditions possible in order to meet our standards.
    </p>
    <p style="color:#1e293b;font-size:14px;line-height:1.8;">
      You are hereby required to get a medium-sized electric air-conditioned crate for your <strong>${shipment.description || 'animal'}</strong> to be transported in.
    </p>
    <p style="color:#0d1f35;font-size:14px;font-weight:700;">As for the electric crate, two options are available:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:12px;background:#eff6ff;border-radius:8px 0 0 8px;border:1px solid #bfdbfe;width:48%;">
          <div style="color:#1d4ed8;font-weight:800;font-size:13px;">Renting: $${rentPrice}</div>
          <div style="color:#1e40af;font-size:12px;margin-top:4px;">${refundPct}% refunded upon delivery and crate return</div>
        </td>
        <td style="width:4%;"></td>
        <td style="padding:12px;background:#f0fdf4;border-radius:0 8px 8px 0;border:1px solid #bbf7d0;width:48%;">
          <div style="color:#15803d;font-weight:800;font-size:13px;">Purchasing: $${buyPrice}</div>
          <div style="color:#166534;font-size:12px;margin-top:4px;">Crate remains your property — no refund</div>
        </td>
      </tr>
    </table>
    <p style="color:#1e293b;font-size:14px;line-height:1.8;">
      Please respond to this email with your choice <strong>(renting or purchasing)</strong> and we will send you payment instructions.
    </p>
    <p style="color:#1e293b;font-size:14px;line-height:1.8;">
      Thank you for your understanding.
    </p>
    <p style="color:#1e293b;font-size:14px;">
      Best regards,<br/>
      <strong>ZipCargo Logistics Team</strong><br/>
      <a href="mailto:${siteEmail}" style="color:#e8820c;">${siteEmail}</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9;padding-top:12px;margin-top:16px;">
      Your official crate invoice is attached to this email for your records.
    </p>
  </div>
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:16px 28px;text-align:center;">
    <div style="color:#aac4e0;font-size:11px;">ZipCargo Logistics &#8212; Delivering trust, one shipment at a time</div>
  </div>
</div>
</body></html>`;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept':'application/json','api-key':apiKey,'content-type':'application/json' },
      body: JSON.stringify({
        sender: { name: 'ZipCargo Logistics', email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        to: [{ email: shipment.rEmail, name: shipment.rName }],
        replyTo: { email: process.env.BREVO_SENDER_EMAIL || 'zipcargo99@gmail.com' },
        subject: `Crate Requirement Notice — ${shipment.tracking}`,
        htmlContent: emailHtml,
        trackingSettings: { clickTracking: { enabled: false }, openTracking: { enabled: false } },
        attachment: [{
          name: `ZipCargo-Crate-Invoice-${shipment.tracking}.pdf`,
          content: pdfBuffer.toString('base64'),
        }],
      }),
    });

    const data = await brevoRes.json();
    if (!brevoRes.ok) throw new Error(data.message || 'Brevo error');
    res.json({ success: true });

  } catch(err) {
    console.error('Crate invoice error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
        htmlContent: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<style>
  body { margin:0; padding:0; background:#f3f4f6; font-family:Helvetica,Arial,sans-serif; }
  a { color:#e8820c; }
</style>
</head>
<body bgcolor="#f3f4f6" style="margin:0;padding:20px;background:#f3f4f6;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">

  <!-- Header -->
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:24px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:#e8820c;font-size:20px;font-weight:800;font-family:Helvetica,Arial,sans-serif;">&#9889; ZipCargo</div>
        <div style="color:#aac4e0;font-size:12px;font-family:Helvetica,Arial,sans-serif;">Global Logistics Solutions</div>
      </td>
    </tr></table>
  </div>

  <!-- Body -->
  <div style="padding:28px;background:#ffffff;">
    <p style="color:#0d1f35;font-size:15px;font-family:Helvetica,Arial,sans-serif;">Dear <strong>${shipment.rName}</strong>,</p>
    <p style="color:#1e293b;font-size:14px;line-height:1.7;font-family:Helvetica,Arial,sans-serif;">
      Warm regards from the team at <strong>ZipCargo!</strong><br/>
      We are pleased to inform you that a package has been successfully registered in your name.
    </p>

    <!-- Tracking Number Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td bgcolor="#f0f7ff" style="background:#f0f7ff;border:2px solid #0d1f35;border-radius:10px;padding:16px;text-align:center;">
          <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;font-family:Helvetica,Arial,sans-serif;">TRACKING NUMBER</div>
          <div style="color:#e8820c;font-size:24px;font-weight:800;letter-spacing:2px;margin-top:6px;font-family:Helvetica,Arial,sans-serif;">${shipment.tracking}</div>
        </td>
      </tr>
    </table>

    <p style="color:#1e293b;font-size:14px;line-height:1.7;font-family:Helvetica,Arial,sans-serif;">
      To verify the details and track the status of your shipment, kindly visit our website at:
    </p>

    <!-- Track Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td align="center">
          <a href="https://zipcargo-app.onrender.com/tracking.html?id=${shipment.tracking}"
             style="background:#e8820c;color:#ffffff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;font-family:Helvetica,Arial,sans-serif;">
            Track Your Shipment &#8594;
          </a>
        </td>
      </tr>
    </table>

    <p style="color:#64748b;font-size:12px;text-align:center;font-family:Helvetica,Arial,sans-serif;">
      Or visit: https://zipcargo-app.onrender.com/tracking.html<br/>
      and enter your tracking number: <strong>${shipment.tracking}</strong>
    </p>

    <!-- Shipment Summary -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;">
      <tr><td style="padding:14px 16px;background:#f8fafc;border-radius:8px 8px 0 0;">
        <div style="color:#0d1f35;font-size:12px;font-weight:700;letter-spacing:.5px;font-family:Helvetica,Arial,sans-serif;">SHIPMENT SUMMARY</div>
      </td></tr>
      <tr><td style="padding:0 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;font-family:Helvetica,Arial,sans-serif;">
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Status</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.status||'Pending'}</td></tr>
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Service</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.service}</td></tr>
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">From</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.origin}</td></tr>
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">To</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.dest}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Est. Delivery</td><td style="padding:8px 0;color:#0d1f35;font-weight:700;">${shipment.eta||'TBD'}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="color:#1e293b;font-size:13px;line-height:1.7;font-family:Helvetica,Arial,sans-serif;">
      Please reply to this email with any questions or concerns regarding your package.
      We recommend checking your email regularly for updates on the whereabouts and details of your shipment.
    </p>
    <p style="color:#1e293b;font-size:14px;font-family:Helvetica,Arial,sans-serif;">
      Thank you for choosing <strong>ZipCargo</strong>.<br/>
      Best regards,<br/>
      <strong>ZipCargo Logistics Team</strong><br/>
      <a href="mailto:${siteEmail}" style="color:#e8820c;">${siteEmail}</a>
    </p>
  </div>

  <!-- Footer -->
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:16px 28px;text-align:center;">
    <div style="color:#aac4e0;font-size:11px;font-family:Helvetica,Arial,sans-serif;">ZipCargo Logistics &#8212; Delivering trust, one shipment at a time</div>
    <div style="color:#4a6a88;font-size:10px;margin-top:4px;font-family:Helvetica,Arial,sans-serif;">This is an official ZipCargo document. Please keep for your records.</div>
  </div>

</div>
</body>
</html>`,
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
