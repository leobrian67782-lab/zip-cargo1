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
  body('photo').optional().isString(),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    let photo = '';
    if (req.body.photo) {
      // Only accept valid base64 image data URLs, capped at ~2MB encoded
      // (roughly 1.5MB original file) to keep MongoDB documents small and fast.
      const isDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(req.body.photo);
      if (!isDataUrl) {
        return res.status(400).json({ error: 'Photo must be a valid image file.' });
      }
      if (req.body.photo.length > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'Photo is too large. Please use an image under 1.5MB.' });
      }
      photo = req.body.photo;
    }

    try {
      const review = await Review.create({
        name:    req.body.name,
        company: req.body.company || '',
        rating:  req.body.rating,
        message: req.body.message,
        photo,
        status:  'pending',
      });
      const Notification = require('../models/Notification');
      Notification.push(
        'review',
        `New ${req.body.rating}-star review from ${req.body.name}`,
        req.body.message.slice(0, 80),
        'section:reviews'
      ).catch(() => {});
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

// PATCH /api/reviews/:id — approve/reject a review, and/or set its photo
router.patch('/:id',
  body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status.'),
  body('photo').optional().isString(),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    const update = {};
    if (req.body.status) update.status = req.body.status;

    if (typeof req.body.photo === 'string') {
      if (req.body.photo === '') {
        update.photo = ''; // explicit removal
      } else {
        const isDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(req.body.photo);
        if (!isDataUrl) return res.status(400).json({ error: 'Photo must be a valid image file.' });
        if (req.body.photo.length > 2 * 1024 * 1024) {
          return res.status(400).json({ error: 'Photo is too large. Please use an image under 1.5MB.' });
        }
        update.photo = req.body.photo;
      }
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    try {
      const review = await Review.findByIdAndUpdate(req.params.id, update, { new: true });
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
