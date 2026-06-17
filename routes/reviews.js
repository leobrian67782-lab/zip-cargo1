const express = require('express');
const { body, validationResult } = require('express-validator');
const Review   = require('../models/Review');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── PUBLIC: POST /api/reviews — customer submits a review ────────────────
router.post('/',
  body('name').notEmpty().trim().isLength({ max: 200 }).withMessage('Name is required.'),
  body('message').notEmpty().trim().isLength({ max: 1000 }).withMessage('Review message is required.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('company').optional().trim().isLength({ max: 200 }),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const review = await Review.create({
        name:    req.body.name,
        company: req.body.company || '',
        rating:  req.body.rating,
        message: req.body.message,
        status:  'pending',
      });
      res.json({ ok: true, review });
    } catch (err) {
      res.status(500).json({ error: 'Could not submit review. Please try again.' });
    }
  }
);

// ── PUBLIC: GET /api/reviews/approved — only approved reviews for display ─
router.get('/approved', async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' }).sort({ date: -1 }).limit(50);
    res.json({ ok: true, reviews });
  } catch (err) {
    res.status(500).json({ error: 'Could not load reviews.' });
  }
});

// ── ADMIN: everything below requires authentication ───────────────────────
router.use(protect);

// GET /api/reviews — all reviews (any status) for admin moderation
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ date: -1 });
    res.json({ ok: true, reviews });
  } catch (err) {
    res.status(500).json({ error: 'Could not load reviews.' });
  }
});

// PATCH /api/reviews/:id — approve or reject a review
router.patch('/:id',
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status.'),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    try {
      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      if (!review) return res.status(404).json({ error: 'Review not found.' });
      res.json({ ok: true, review });
    } catch (err) {
      res.status(500).json({ error: 'Could not update review.' });
    }
  }
);

// DELETE /api/reviews/:id — permanently remove a review
router.delete('/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete review.' });
  }
});

module.exports = router;
