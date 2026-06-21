const express     = require('express');
const { body, validationResult } = require('express-validator');
const ContactSettings = require('../models/ContactSettings');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── PUBLIC: GET /api/contact-settings — read by the website footer ───────
// No auth required — every visitor's browser calls this to render the
// real phone/email/website/hours, instead of each browser silently
// falling back to hardcoded defaults because the real values used to
// live only in the admin's own localStorage.
router.get('/', async (req, res) => {
  try {
    const settings = await ContactSettings.getSingleton();
    res.json({
      ok: true,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      hours: settings.hours,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load contact settings.' });
  }
});

// ── ADMIN: everything below requires authentication ───────────────────────
router.use(protect);

// PUT /api/contact-settings — update one or more fields
router.put('/',
  body('phone').optional().trim().isLength({ max: 50 }),
  body('email').optional().trim().isLength({ max: 200 }),
  body('website').optional().trim().isLength({ max: 200 }),
  body('hours').optional().trim().isLength({ max: 100 }),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const settings = await ContactSettings.getSingleton();
      ['phone', 'email', 'website', 'hours'].forEach((field) => {
        if (typeof req.body[field] === 'string') settings[field] = req.body[field];
      });
      settings.updatedBy = req.admin?.username || '';
      await settings.save();
      res.json({ ok: true, settings });
    } catch (err) {
      res.status(500).json({ error: 'Could not save contact settings.' });
    }
  }
);

module.exports = router;
