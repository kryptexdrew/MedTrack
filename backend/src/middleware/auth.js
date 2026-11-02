const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { isValidTimeZone } = require('../utils/timeZone');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const headerTimeZone = req.headers['x-timezone'];
    const clientTimeZone = isValidTimeZone(headerTimeZone) ? headerTimeZone : '';

    // Demo tokens are only accepted outside production.
    if (token.startsWith('demo_token') && process.env.NODE_ENV !== 'production') {
      req.user = { id: 'user_1', email: 'juan@email.com', fullName: 'Juan Dela Cruz', role: 'self' };
      req.userId = 'user_1';
      req.timezone = clientTimeZone;
      return next();
    }

    const secret = process.env.JWT_SECRET || 'medtrack_super_secret_jwt_key_default';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    req.userId = decoded.id;
    req.timezone = clientTimeZone;

    // Revoke tokens issued before the most recent password change.
    // The in-memory fallback has no user records, so skip this check there.
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id).select('passwordChangedAt tokenVersion timezone');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
      }

      // Versioned tokens are revoked immediately, even within the same second.
      if (typeof decoded.tv === 'number' && decoded.tv !== (user.tokenVersion || 0)) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
      }

      // Legacy tokens (issued before versioning) are checked against the reset time.
      if (user.passwordChangedAt && typeof decoded.iat === 'number') {
        const changedAtSeconds = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
        if (decoded.iat < changedAtSeconds) {
          return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
        }
      }

      // Keep the stored zone in sync with the device (travelling / DST-safe).
      if (clientTimeZone && clientTimeZone !== user.timezone) {
        user.timezone = clientTimeZone;
        await user.save().catch(() => {});
      }

      req.timezone = user.timezone || clientTimeZone;
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
