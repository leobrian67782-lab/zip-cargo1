const nodemailer = require('nodemailer');

// Create transporter lazily so missing env vars don't crash the server on startup
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

const FROM = () => `"ZipCargo Logistics" <${process.env.SMTP_USER || 'noreply@zipcargo.com'}>`;
const SITE = () => process.env.SITE_URL || 'https://zipcargo-app.onrender.com';

// ── Send any email — silently skips if SMTP not configured ────────────────
async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipped: ${subject} → ${to}`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM(), to, subject, html });
    console.log(`[mailer] Sent: ${subject} → ${to}`);
  } catch (err) {
    console.error(`[mailer] Failed: ${err.message}`);
  }
}

// ── Admin: new inquiry notification ──────────────────────────────────────
async function notifyAdminNewInquiry(inquiry) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;
  await sendMail({
    to:      adminEmail,
    subject: `📬 New Inquiry from ${inquiry.name} — ZipCargo`,
    html: `
      <div style="font-family:'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:24px;">
        <div style="background:#0d1f35;border-radius:12px 12px 0 0;padding:24px 28px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:1.5rem;font-weight:900;color:white;">⚡ ZipCargo</span>
          <span style="color:#4a6a88;font-size:.85rem;">Admin Alert</span>
        </div>
        <div style="background:white;border-radius:0 0 12px 12px;padding:28px;">
          <h2 style="color:#0d1f35;margin:0 0 16px;">New Inquiry Received</h2>
          <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
            <tr><td style="padding:8px 0;color:#64748b;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;color:#0d1f35;">${inquiry.name}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;color:#0d1f35;"><a href="mailto:${inquiry.email}" style="color:#e8820c;">${inquiry.email}</a></td></tr>
            ${inquiry.company ? `<tr><td style="padding:8px 0;color:#64748b;">Company</td><td style="padding:8px 0;color:#0d1f35;">${inquiry.company}</td></tr>` : ''}
            ${inquiry.service ? `<tr><td style="padding:8px 0;color:#64748b;">Service</td><td style="padding:8px 0;color:#0d1f35;">${inquiry.service}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#64748b;vertical-align:top;">Message</td><td style="padding:8px 0;color:#374151;line-height:1.6;">${inquiry.message}</td></tr>
          </table>
          <div style="margin-top:24px;">
            <a href="${SITE()}/#contact" style="background:#e8820c;color:white;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.85rem;">View in Admin Panel →</a>
          </div>
        </div>
        <p style="color:#94a3b8;font-size:.75rem;text-align:center;margin-top:16px;">ZipCargo Logistics · Automated notification</p>
      </div>`,
  });
}

// ── Recipient: shipment status update ────────────────────────────────────
async function notifyRecipientStatusUpdate(shipment) {
  if (!shipment.rEmail) return;

  const statusConfig = {
    'Pending':          { emoji: '📦', color: '#f59e0b', msg: 'Your shipment has been registered and is pending dispatch.' },
    'In Transit':       { emoji: '✈️',  color: '#0ea5e9', msg: 'Great news — your shipment is now in transit and on its way!' },
    'Out for Delivery': { emoji: '🚚', color: '#22c55e', msg: 'Your shipment is out for delivery today. Please be available to receive it.' },
    'Delivered':        { emoji: '✅', color: '#10b981', msg: 'Your shipment has been delivered successfully. Thank you for choosing ZipCargo!' },
    'On Hold':          { emoji: '⏸️',  color: '#ef4444', msg: 'Your shipment has been placed on hold. Please contact our support team for assistance.' },
  };
  const cfg = statusConfig[shipment.status] || statusConfig['Pending'];

  await sendMail({
    to:      shipment.rEmail,
    subject: `${cfg.emoji} Shipment Update: ${shipment.tracking} is now ${shipment.status}`,
    html: `
      <div style="font-family:'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:24px;">
        <div style="background:#0d1f35;border-radius:12px 12px 0 0;padding:24px 28px;">
          <span style="font-size:1.5rem;font-weight:900;color:white;">⚡ ZipCargo</span>
        </div>
        <div style="background:white;border-radius:0 0 12px 12px;padding:28px;">
          <div style="background:${cfg.color}18;border-left:4px solid ${cfg.color};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <div style="font-size:1.1rem;font-weight:700;color:#0d1f35;">${cfg.emoji} ${shipment.status}</div>
            <div style="color:#374151;margin-top:6px;line-height:1.6;">${cfg.msg}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
            <tr><td style="padding:8px 0;color:#64748b;width:140px;">Tracking Number</td><td style="padding:8px 0;font-weight:700;color:#0d1f35;font-family:monospace;letter-spacing:1px;">${shipment.tracking}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Recipient</td><td style="padding:8px 0;color:#0d1f35;">${shipment.rName}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Route</td><td style="padding:8px 0;color:#0d1f35;">${shipment.origin} → ${shipment.dest}</td></tr>
            ${shipment.location ? `<tr><td style="padding:8px 0;color:#64748b;">Current Location</td><td style="padding:8px 0;color:#0d1f35;">${shipment.location}</td></tr>` : ''}
            ${shipment.eta ? `<tr><td style="padding:8px 0;color:#64748b;">Est. Delivery</td><td style="padding:8px 0;color:#0d1f35;">${shipment.eta}</td></tr>` : ''}
          </table>
          <div style="margin-top:24px;">
            <a href="${SITE()}/#tracking?t=${shipment.tracking}" style="background:#0d1f35;color:white;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.85rem;">Track Your Shipment →</a>
          </div>
        </div>
        <p style="color:#94a3b8;font-size:.75rem;text-align:center;margin-top:16px;">ZipCargo Logistics · You received this because you are the recipient of shipment ${shipment.tracking}</p>
      </div>`,
  });
}

module.exports = { sendMail, notifyAdminNewInquiry, notifyRecipientStatusUpdate };
