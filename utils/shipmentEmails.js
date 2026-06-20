// ── HTML email templates for shipment notifications ────────────────────

const SITE_URL = process.env.SITE_URL || 'https://zipcargo-app.onrender.com';

function trackingUrl(tracking) {
  return `${SITE_URL}/tracking.html?tracking=${encodeURIComponent(tracking)}`;
}

const statusColors = {
  'Pending':           { bg: '#fff3cd', fg: '#856404' },
  'In Transit':        { bg: '#cce5ff', fg: '#004085' },
  'Out for Delivery':  { bg: '#d4edda', fg: '#155724' },
  'Delivered':         { bg: '#d4edda', fg: '#155724' },
  'On Hold':           { bg: '#f8d7da', fg: '#721c24' },
};

function wrapper({ headerSubtitle, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body bgcolor="#f3f4f6" style="margin:0;padding:20px;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:24px 28px;">
    <div style="color:#ffffff;font-size:20px;font-weight:800;">&#9889; ZipCargo</div>
    <div style="color:#aac4e0;font-size:12px;margin-top:4px;">${headerSubtitle}</div>
  </div>
  ${bodyHtml}
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:16px 28px;text-align:center;">
    <div style="color:#aac4e0;font-size:11px;">ZipCargo Logistics &#8212; Ship Smarter. Deliver Faster.</div>
  </div>
</div>
</body>
</html>`;
}

// ── Email sent when a NEW shipment is created ──────────────────────────
function shipmentCreatedEmail(s) {
  const url = trackingUrl(s.tracking);
  const body = `
  <div style="padding:28px;">
    <p style="color:#0d1f35;font-size:15px;">Dear <strong>${s.rName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.8;">
      A new shipment has been created for you with <strong>ZipCargo Logistics</strong>. Here are your shipment details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;margin-top:16px;background:#f9f8f5;border-radius:8px;">
      <tr><td style="padding:14px 16px;color:#64748b;width:130px;">Tracking Number</td><td style="padding:14px 16px;color:#0d1f35;font-weight:800;font-size:15px;">${s.tracking}</td></tr>
      <tr><td style="padding:0 16px 14px;color:#64748b;">Origin</td><td style="padding:0 16px 14px;color:#0d1f35;font-weight:700;">${s.origin}</td></tr>
      <tr><td style="padding:0 16px 14px;color:#64748b;">Destination</td><td style="padding:0 16px 14px;color:#0d1f35;font-weight:700;">${s.dest}</td></tr>
      <tr><td style="padding:0 16px 14px;color:#64748b;">Service</td><td style="padding:0 16px 14px;color:#0d1f35;">${s.service}</td></tr>
      ${s.eta ? `<tr><td style="padding:0 16px 14px;color:#64748b;">Est. Delivery</td><td style="padding:0 16px 14px;color:#0d1f35;">${s.eta}</td></tr>` : ''}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td align="center">
        <a href="${url}" style="background:#e8820c;color:#ffffff;padding:13px 30px;border-radius:50px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block;">
          Track Your Shipment &#8594;
        </a>
      </td></tr>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin-top:20px;text-align:center;">
      Or visit: <a href="${url}" style="color:#e8820c;">${url}</a>
    </p>
  </div>`;
  return wrapper({ headerSubtitle: 'Your shipment has been created', bodyHtml: body });
}

// ── Email sent when shipment STATUS is updated ─────────────────────────
function shipmentStatusUpdateEmail(s) {
  const url = trackingUrl(s.tracking);
  const colors = statusColors[s.status] || statusColors['Pending'];
  const body = `
  <div style="padding:28px;">
    <p style="color:#0d1f35;font-size:15px;">Dear <strong>${s.rName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.8;">
      There's an update on your shipment <strong>${s.tracking}</strong>.
    </p>
    <div style="text-align:center;margin:20px 0;">
      <span style="background:${colors.bg};color:${colors.fg};padding:8px 20px;border-radius:30px;font-weight:700;font-size:13px;">${s.status}</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;background:#f9f8f5;border-radius:8px;">
      <tr><td style="padding:14px 16px;color:#64748b;width:130px;">Current Location</td><td style="padding:14px 16px;color:#0d1f35;font-weight:700;">${s.location || s.origin}</td></tr>
      <tr><td style="padding:0 16px 14px;color:#64748b;">Origin</td><td style="padding:0 16px 14px;color:#0d1f35;">${s.origin}</td></tr>
      <tr><td style="padding:0 16px 14px;color:#64748b;">Destination</td><td style="padding:0 16px 14px;color:#0d1f35;">${s.dest}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td align="center">
        <a href="${url}" style="background:#e8820c;color:#ffffff;padding:13px 30px;border-radius:50px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block;">
          View Full Tracking &#8594;
        </a>
      </td></tr>
    </table>
  </div>`;
  return wrapper({ headerSubtitle: 'Shipment status update', bodyHtml: body });
}

module.exports = { shipmentCreatedEmail, shipmentStatusUpdateEmail, trackingUrl };
