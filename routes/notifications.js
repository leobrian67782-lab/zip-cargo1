const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/notifications — most recent notifications, newest first
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ date: -1 }).limit(50);
    const unread = await Notification.countDocuments({ read: false });
    res.json({ ok: true, notifications, unread });
  } catch (err) {
    res.status(500).json({ error: 'Could not load notifications.' });
  }
});

// PATCH /api/notifications/:id/read — mark a single notification read
router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update notification.' });
  }
});

// PATCH /api/notifications/read-all — mark everything read
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update notifications.' });
  }
});

module.exports = router;
