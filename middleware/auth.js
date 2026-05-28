const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    const token =
      req.cookies?.zc_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach admin info directly from JWT — no DB round-trip needed
    req.admin = {
      _id:      decoded.id,
      id:       decoded.id,
      username: decoded.username,
      role:     decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = { protect };
