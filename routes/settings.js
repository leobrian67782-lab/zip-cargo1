const express      = require('express');
const SiteSettings = require('../models/SiteSettings');
const { protect }  = require('../middleware/auth');
const log          = require('../middleware/activityLogger');

const router = express.Router();

const ALLOWED_KEYS = ['phone', 'email', 'hours', 'website'];

// PUBLIC: get all site settings (for frontend to display contact info)
router.get('/public', async (req, res) => {
  try {
    const docs = await SiteSettings.find({ key: { $in: ALLOWED_KEYS } });
    const result = {};
    docs.forEach(d => { result[d.key] = d.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// All routes below require auth
router.use(protect);

// GET all settings
router.get('/', async (req, res) => {
  try {
    const docs = await SiteSettings.find();
    const result = {};
    docs.forEach(d => { result[d.key] = d.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT a single setting
router.put('/:key', async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Invalid setting key.' });
  }
  const value = (req.body.value || '').toString().trim();
  try {
    const doc = await SiteSettings.findOneAndUpdate(
      { key },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    await log(req, 'UPDATE_SETTING', `${key} = ${value}`);
    res.json({ key: doc.key, value: doc.value });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
