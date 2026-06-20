const express    = require('express');
const { body, validationResult } = require('express-validator');
const Inquiry    = require('../models/Inquiry');
const { protect }= require('../middleware/auth');
const log        = require('../middleware/activityLogger');

const router = express.Router();

// ── Helper: send contact notification via Brevo ───────────────────────────
async function sendContactEmail({ name, email, company, service, message }) {
  const apiKey     = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.CONTACT_EMAIL || 'info@zipcargo.com';
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || senderEmail;

  if (!apiKey) {
    console.warn('BREVO_API_KEY not set — skipping contact email notification.');
    return;
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body bgcolor="#f3f4f6" style="margin:0;padding:20px;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:24px 28px;">
    <img src="https://zipcargo-app.onrender.com/logo-light.png" alt="ZipCargo" style="height:36px;display:block;"/>
    <div style="color:#aac4e0;font-size:12px;">New Contact Form Inquiry</div>
  </div>
  <div style="padding:28px;">
    <p style="color:#0d1f35;font-size:15px;">You have a new message from the ZipCargo contact form.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 0;color:#64748b;width:120px;">Name</td>
        <td style="padding:10px 0;color:#0d1f35;font-weight:700;">${name}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 0;color:#64748b;">Email</td>
        <td style="padding:10px 0;color:#e8820c;"><a href="mailto:${email}" style="color:#e8820c;">${email}</a></td>
      </tr>
      ${company ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748b;">Company</td><td style="padding:10px 0;color:#0d1f35;">${company}</td></tr>` : ''}
      ${service ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748b;">Service</td><td style="padding:10px 0;color:#0d1f35;">${service}</td></tr>` : ''}
      <tr>
        <td style="padding:10px 0;color:#64748b;vertical-align:top;">Message</td>
        <td style="padding:10px 0;color:#0d1f35;line-height:1.7;">${message.replace(/\n/g, '<br/>')}</td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td align="center">
        <a href="mailto:${email}?subject=Re: Your ZipCargo Inquiry"
           style="background:#e8820c;color:#ffffff;padding:13px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block;">
          Reply to ${name} &#8594;
        </a>
      </td></tr>
    </table>
  </div>
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:16px 28px;text-align:center;">
    <div style="color:#aac4e0;font-size:11px;">ZipCargo Logistics &#8212; Admin Notification</div>
  </div>
</div>
</body>
</html>`;

  const autoReplyHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body bgcolor="#f3f4f6" style="margin:0;padding:20px;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:24px 28px;">
    <img src="https://zipcargo-app.onrender.com/logo-light.png" alt="ZipCargo" style="height:36px;display:block;"/>
    <div style="color:#aac4e0;font-size:12px;">We received your message</div>
  </div>
  <div style="padding:28px;">
    <p style="color:#0d1f35;font-size:15px;">Dear <strong>${name}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.8;">
      Thank you for reaching out to ZipCargo! We have received your inquiry and a member of our team will get back to you within <strong>24 hours</strong>.
    </p>
    ${service ? `<p style="color:#475569;font-size:14px;line-height:1.8;">You enquired about: <strong>${service}</strong></p>` : ''}
    <p style="color:#475569;font-size:14px;line-height:1.8;">
      In the meantime, you can track any existing shipments on our
      <a href="https://zipcargo-app.onrender.com/tracking.html" style="color:#e8820c;">tracking page</a>.
    </p>
    <p style="color:#1e293b;font-size:13px;margin-top:24px;">
      Best regards,<br/>
      <strong>ZipCargo Logistics Team</strong><br/>
      <a href="mailto:${senderEmail}" style="color:#e8820c;">${senderEmail}</a>
    </p>
  </div>
  <div bgcolor="#0d1f35" style="background:#0d1f35;padding:16px 28px;text-align:center;">
    <div style="color:#aac4e0;font-size:11px;">ZipCargo Logistics &#8212; Delivering trust, one shipment at a time</div>
  </div>
</div>
</body>
</html>`;

  // Notification to admin
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender:   { name: 'ZipCargo Contact Form', email: senderEmail },
      to:       [{ email: notifyEmail, name: 'ZipCargo Admin' }],
      replyTo:  { email: email, name: name },
      subject:  `New Inquiry from ${name}${service ? ' — ' + service : ''}`,
      htmlContent,
      trackingSettings: { clickTracking: { enabled: false }, openTracking: { enabled: false } },
    }),
  });

  // Auto-reply to customer
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender:   { name: 'ZipCargo Logistics', email: senderEmail },
      to:       [{ email: email, name: name }],
      replyTo:  { email: notifyEmail, name: 'ZipCargo Support' },
      subject:  'We received your message — ZipCargo',
      htmlContent: autoReplyHtml,
      trackingSettings: { clickTracking: { enabled: false }, openTracking: { enabled: false } },
    }),
  });
}

// ── POST /api/inquiries — save to DB + send emails ────────────────────────
router.post('/',
  body('name').notEmpty().trim().escape().withMessage('Name required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('message').notEmpty().trim().escape().withMessage('Message required.'),
  body('company').optional().trim().escape().isLength({ max: 200 }),
  body('service').optional().trim().escape().isLength({ max: 100 }),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const { name, email, message } = req.body;
      const company = req.body.company || '';
      const service = req.body.service || '';

      const inq = await Inquiry.create({ name, email, company, service, message });

      // Send emails in background — don't block the response
      sendContactEmail({ name, email, company, service, message }).catch(err =>
        console.error('Contact email error:', err.message)
      );

      // Push a notification immediately — accurate and instant, no polling needed
      const Notification = require('../models/Notification');
      Notification.push(
        'inquiry',
        `New inquiry from ${name}`.slice(0, 200),
        service ? `Regarding: ${service}` : message.slice(0, 80),
        'section:inquiries'
      ).catch(() => {});

      res.status(201).json({ ok: true, id: inq._id });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const items = await Inquiry.find().sort({ date: -1 });
    res.json({ total: items.length, items });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await Inquiry.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const inq = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inq) return res.status(404).json({ error: 'Not found.' });
    await log(req, 'DELETE_INQUIRY', inq.email);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
