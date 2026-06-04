const express    = require('express');
const jwt        = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Admin      = require('../models/Admin');
const { protect }= require('../middleware/auth');
const log        = require('../middleware/activityLogger');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge:   24 * 60 * 60 * 1000,
};

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

router.post('/login',
  body('username').trim().notEmpty().withMessage('Username required.'),
  body('password').notEmpty().withMessage('Password required.'),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    const { username, password } = req.body;
    try {
      const admin = await Admin.findOne({ username: username.toLowerCase() });
      if (!admin || !(await admin.comparePassword(password)))
        return res.status(401).json({ error: 'Incorrect username or password.' });
      admin.lastLogin = new Date();
      await admin.save();
      const token = signToken(admin._id);
      res.cookie('zc_token', token, cookieOpts);
      await log(req, 'LOGIN', admin.username);
      res.json({ ok: true, token: token, admin: { username: admin.username, role: admin.role } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

router.post('/logout', protect, async (req, res) => {
  await log(req, 'LOGOUT', req.admin.username);
  res.clearCookie('zc_token');
  res.json({ ok: true });
});

router.get('/me', protect, (req, res) => {
  res.json({ username: req.admin.username, role: req.admin.role });
});

router.post('/change-password', protect,
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Minimum 8 characters.'),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    const { oldPassword, newPassword } = req.body;
    try {
      const admin = await Admin.findById(req.admin._id);
      if (!(await admin.comparePassword(oldPassword)))
        return res.status(400).json({ error: 'Current password is incorrect.' });
      admin.password = newPassword;
      await admin.save();
      await log(req, 'CHANGE_PASSWORD', admin.username);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

module.exports = router;
