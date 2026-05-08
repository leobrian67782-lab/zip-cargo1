const express    = require('express');
const { body, validationResult } = require('express-validator');
const Inquiry    = require('../models/Inquiry');
const { protect }= require('../middleware/auth');
const log        = require('../middleware/activityLogger');

const router = express.Router();

// PUBLIC: submit inquiry from contact form
router.post('/',
  body('name').notEmpty().trim().escape().withMessage('Name required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('message').notEmpty().trim().escape().withMessage('Message required.'),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    try {
      const inq = await Inquiry.create({
        name:    req.body.name,
        email:   req.body.email,
        company: req.body.company || '',
        service: req.body.service || '',
        message: req.body.message,
      });
      res.status(201).json({ ok: true, id: inq._id });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// ADMIN routes below
router.use(protect);

// GET /api/inquiries
router.get('/', async (req, res) => {
  try {
    const items = await Inquiry.find().sort({ date: -1 });
    res.json({ total: items.length, items });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/inquiries/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await Inquiry.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/inquiries/:id
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
