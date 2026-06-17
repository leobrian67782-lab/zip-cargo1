const express     = require('express');
const { body, validationResult } = require('express-validator');
const AiSettings  = require('../models/AiSettings');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes here require an authenticated admin
router.use(protect);

// ── GET /api/ai-settings — fetch current settings ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const settings = await AiSettings.getSingleton();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Could not load AI settings.' });
  }
});

// ── PUT /api/ai-settings — update announcements / knowledge notes ─────────
router.put('/',
  body('announcements').optional().isString().isLength({ max: 4000 }),
  body('knowledgeNotes').optional().isString().isLength({ max: 4000 }),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const settings = await AiSettings.getSingleton();
      if (typeof req.body.announcements === 'string') settings.announcements = req.body.announcements;
      if (typeof req.body.knowledgeNotes === 'string') settings.knowledgeNotes = req.body.knowledgeNotes;
      settings.updatedBy = req.admin?.username || '';
      await settings.save();
      res.json({ ok: true, settings });
    } catch (err) {
      res.status(500).json({ error: 'Could not save AI settings.' });
    }
  }
);

// ── POST /api/ai-settings/restrictions — add a restriction ────────────────
router.post('/restrictions',
  body('text').notEmpty().trim().isLength({ max: 500 }).withMessage('Restriction text required.'),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const settings = await AiSettings.getSingleton();
      settings.restrictions.push({ text: req.body.text });
      settings.updatedBy = req.admin?.username || '';
      await settings.save();
      res.json({ ok: true, settings });
    } catch (err) {
      res.status(500).json({ error: 'Could not add restriction.' });
    }
  }
);

// ── DELETE /api/ai-settings/restrictions/:id — remove a restriction ───────
router.delete('/restrictions/:id', async (req, res) => {
  try {
    const settings = await AiSettings.getSingleton();
    settings.restrictions = settings.restrictions.filter(
      r => r._id.toString() !== req.params.id
    );
    settings.updatedBy = req.admin?.username || '';
    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove restriction.' });
  }
});

module.exports = router;
