const express      = require('express');
const { body, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');
const Shipment     = require('../models/Shipment');
const { protect }  = require('../middleware/auth');

const router = express.Router();

// PUBLIC: create a subscription
router.post('/',
  body('tracking').notEmpty().trim().withMessage('Tracking number required.'),
  body('name').notEmpty().trim().withMessage('Name required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    const { tracking, name, email, phone, plan } = req.body;

    try {
      // Verify the shipment exists
      const shipment = await Shipment.findOne({ tracking: tracking.toUpperCase().trim() });
      if (!shipment) return res.status(404).json({ error: 'Shipment not found. Please check your tracking number.' });

      // Prevent duplicate subscriptions for same tracking + email
      const exists = await Subscription.findOne({
        tracking: tracking.toUpperCase().trim(),
        email: email.toLowerCase(),
        status: { $ne: 'expired' },
      });
      if (exists) return res.status(409).json({ error: 'You already have an active subscription for this shipment.' });

      const sub = await Subscription.create({
        tracking: tracking.toUpperCase().trim(),
        name,
        email,
        phone: phone || '',
        plan: ['basic', 'premium'].includes(plan) ? plan : 'basic',
      });

      res.status(201).json({
        ok: true,
        tracking: sub.tracking,
        plan: sub.plan,
        status: sub.status,
        // TODO: replace with real payment URL when payment provider is integrated
        paymentUrl: null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// ADMIN: list all subscriptions
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await Subscription.countDocuments();
    const items = await Subscription.find()
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);
    res.json({ total, page: +page, pages: Math.ceil(total / +limit), items });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
