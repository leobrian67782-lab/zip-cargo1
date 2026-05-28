const express    = require('express');
const { body, validationResult } = require('express-validator');
const Inquiry    = require('../models/Inquiry');
const { protect }= require('../middleware/auth');
const log        = require('../middleware/activityLogger');

const router = express.Router();

router.post('/',
  body('name').notEmpty().trim().escape().withMessage('Name required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('message').notEmpty().trim().escape().withMessage('Message required.'),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const inq = await Inquiry.create({ name: req.body.name, email: req.body.email, company: req.body.company || '', service: req.body.service || '', message: req.body.message });
      res.status(201).json({ ok: true, id: inq._id });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const filter = search
      ? { $or: [
          { name:    { $regex: search, $options: 'i' } },
          { email:   { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } },
        ]}
      : {};

    const total = await Inquiry.countDocuments(filter);
    const items = await Inquiry.find(filter)
      .sort({ date: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json({ total, page: +page, pages: Math.ceil(total / +limit), items });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// CSV export of all inquiries
router.get('/export/csv', async (req, res) => {
  try {
    const items = await Inquiry.find().sort({ date: -1 });
    const header = ['Date', 'Name', 'Email', 'Company', 'Service', 'Message', 'Read'];
    const rows = items.map(i => [
      new Date(i.date).toISOString(),
      `"${(i.name    || '').replace(/"/g, '""')}"`,
      `"${(i.email   || '').replace(/"/g, '""')}"`,
      `"${(i.company || '').replace(/"/g, '""')}"`,
      `"${(i.service || '').replace(/"/g, '""')}"`,
      `"${(i.message || '').replace(/"/g, '""')}"`,
      i.read ? 'Yes' : 'No',
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inquiries-${Date.now()}.csv"`);
    res.send(csv);
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
