// ── Shared Brevo email sender ───────────────────────────────────────────
// Reuses the same Brevo API key already configured for the contact form.

async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, replyToEmail, replyToName }) {
  const apiKey      = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.CONTACT_EMAIL || 'info@zipcargo.com';

  if (!apiKey) {
    console.warn('BREVO_API_KEY not set — skipping email send.');
    return { skipped: true };
  }
  if (!toEmail) {
    console.warn('No recipient email provided — skipping email send.');
    return { skipped: true };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:   { name: 'ZipCargo Logistics', email: senderEmail },
        to:       [{ email: toEmail, name: toName || toEmail }],
        replyTo:  { email: replyToEmail || senderEmail, name: replyToName || 'ZipCargo Support' },
        subject,
        htmlContent,
        trackingSettings: { clickTracking: { enabled: false }, openTracking: { enabled: false } },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Brevo send failed:', res.status, text);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    console.error('Brevo send error:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = sendBrevoEmail;
