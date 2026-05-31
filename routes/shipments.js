const express    = require('express');
const { body, validationResult } = require('express-validator');
const Shipment   = require('../models/Shipment');
const { protect }= require('../middleware/auth');
const log        = require('../middleware/activityLogger');

const router = express.Router();

// PUBLIC: track by tracking number
router.get('/track/:tracking', async (req, res) => {
  try {
    const s = await Shipment.findOne({ tracking: req.params.tracking.toUpperCase().trim() }).select('-__v');
    if (!s) return res.status(404).json({ error: 'Shipment not found.' });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.use(protect);

router.get('/stats', async (req, res) => {
  try {
    const [total, delivered, inTransit, onHold, pending] = await Promise.all([
      Shipment.countDocuments(),
      Shipment.countDocuments({ status: 'Delivered' }),
      Shipment.countDocuments({ status: { $in: ['In Transit', 'Out for Delivery'] } }),
      Shipment.countDocuments({ status: 'On Hold' }),
      Shipment.countDocuments({ status: 'Pending' }),
    ]);
    const recent = await Shipment.find().sort({ createdAt: -1 }).limit(5).select('tracking rName status createdAt');
    res.json({ total, delivered, inTransit, onHold, pending, recent });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { tracking: { $regex: search, $options: 'i' } },
        { sName:    { $regex: search, $options: 'i' } },
        { rName:    { $regex: search, $options: 'i' } },
      ];
    }
    const total = await Shipment.countDocuments(filter);
    const items = await Shipment.find(filter).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit).select('-__v');
    res.json({ total, page: +page, pages: Math.ceil(total / +limit), items });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const s = await Shipment.findById(req.params.id).select('-__v');
    if (!s) return res.status(404).json({ error: 'Not found.' });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/',
  body('tracking').notEmpty().withMessage('Tracking number required.').trim(),
  body('sName').notEmpty().withMessage('Sender name required.').trim(),
  body('rName').notEmpty().withMessage('Recipient name required.').trim(),
  body('origin').notEmpty().withMessage('Origin required.').trim(),
  body('dest').notEmpty().withMessage('Destination required.').trim(),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const exists = await Shipment.findOne({ tracking: req.body.tracking.toUpperCase().trim() });
      if (exists) return res.status(409).json({ error: 'Tracking number already exists.' });

      // Create with ONE timeline entry only — prevents duplicate
      const shipmentData = {
        ...req.body,
        tracking: req.body.tracking.toUpperCase().trim(),
        timeline: [{
          status:    req.body.status || 'Pending',
          location:  req.body.location || req.body.origin,
          note:      'Shipment created',
          timestamp: new Date(),
        }],
      };

      // Use insertOne approach to bypass the pre-save hook that adds another timeline entry
      const s = new Shipment(shipmentData);
      s.$skipTimelineUpdate = true; // flag to skip in pre-save
      await s.save();

      await log(req, 'CREATE_SHIPMENT', s.tracking);
      res.status(201).json(s);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'Tracking number already exists.' });
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

router.put('/:id', async (req, res) => {
  try {
    const s = await Shipment.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found.' });

    const oldStatus = s.status;
    const fields = ['service','sName','sPhone','sEmail','origin','rName','rPhone','rEmail','dest','desc','weight','value','cost','eta','location','notes','status'];
    fields.forEach(f => { if (req.body[f] !== undefined) s[f] = req.body[f]; });

    // Only add timeline entry if status actually changed
    if (req.body.status && req.body.status !== oldStatus) {
      s.timeline.push({
        status:    s.status,
        location:  s.location,
        note:      `Status updated to ${s.status}`,
        timestamp: new Date(),
      });
    }

    if (req.body.timelineNote) {
      s.timeline.push({
        status:    s.status,
        location:  s.location,
        note:      req.body.timelineNote,
        timestamp: new Date(),
      });
    }

    s.$skipTimelineUpdate = true; // skip pre-save hook
    await s.save();
    await log(req, 'UPDATE_SHIPMENT', s.tracking);
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const s = await Shipment.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found.' });
    await log(req, 'DELETE_SHIPMENT', s.tracking);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
