const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const authMiddleware = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');
const {
  RESET_TOKEN_TTL_MS,
  RESET_TOKEN_PATTERN,
  generateResetToken,
  hashResetToken,
  normalizeEmail,
  isValidEmail,
  validatePassword,
} = require('../utils/passwordReset');

const JWT_SECRET = process.env.JWT_SECRET || 'medtrack_super_secret_jwt_key_default';

const isMongoConnected = () => mongoose.connection.readyState === 1;

// Limit reset-request and reset-confirmation attempts per IP address.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password-reset requests. Please try again later.',
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password-reset attempts. Please try again later.',
  },
});

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id ? user._id.toString() : user.id, 
      email: user.email, 
      fullName: user.fullName, 
      role: user.role,
      tv: user.tokenVersion || 0
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Seed starter medicines for a new user in MongoDB (disabled to keep new accounts clean)
const seedStarterMedicines = async (userId) => {
  try {
    // Intentionally left empty - new users should start with no pre-populated data
    return;
  } catch (err) {
    console.warn('Starter medicines seed note:', err.message);
  }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields: full name, email, and password.' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long.' 
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'An account with this email address already exists. Please log in.' 
      });
    }

    // Create new user in MongoDB (pre-save hook hashes password)
    const user = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: password,
      role: role || 'self'
    });

    await user.save();

    // Seed starter medicines and dose logs for the new user
    await seedStarterMedicines(user._id);

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified !== false,
        emailRemindersEnabled: user.emailRemindersEnabled !== false
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create account. Please try again.' 
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user in MongoDB
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Verify password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified !== false,
        emailRemindersEnabled: user.emailRemindersEnabled !== false
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login. Please try again.' 
    });
  }
});

// POST /api/auth/forgot-password
// Always returns the same generic message so account existence is not disclosed.
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email address, password-reset instructions will be sent.',
  };

  try {
    const email = normalizeEmail(req.body && req.body.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    if (!isMongoConnected()) {
      return res.json(genericResponse);
    }

    const user = await User.findOne({ email });

    if (user) {
      const rawToken = generateResetToken();
      user.passwordResetTokenHash = hashResetToken(rawToken);
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      // Overwrites any previously issued token, invalidating older links.
      await user.save();

      const resetUrl = `${getFrontendUrl()}/create-new-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail({
          to: user.email,
          fullName: user.fullName,
          resetUrl,
        });
      } catch (emailErr) {
        // Log only a safe message: never the token, URL, or provider response body.
        console.error('Password reset email delivery failed:', emailErr.message);
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // The client always gets the generic response (no account enumeration),
      // but developers need to see that no email was sent in this case.
      console.warn(`[forgot-password] No account found for ${email}; no reset email sent.`);
    }

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err.message);
    // Do not expose database/provider details to the client.
    return res.json(genericResponse);
  }
});

// POST /api/auth/reset-password
// Body: { token, password, confirmPassword }
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};

    if (typeof token !== 'string' || !RESET_TOKEN_PATTERN.test(token.trim())) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid, expired, or has already been used.',
      });
    }

    if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password and confirmation are required.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const policyError = validatePassword(password);
    if (policyError) {
      return res.status(400).json({ success: false, message: policyError });
    }

    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Password reset is temporarily unavailable. Please try again later.',
      });
    }

    const tokenHash = hashResetToken(token.trim());
    const now = new Date();

    // Atomically claim the token: only one request can consume it, and only
    // while it is unexpired. Clearing it here prevents concurrent reuse.
    const user = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: { $gt: now },
      },
      {
        $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid, expired, or has already been used.',
      });
    }

    user.password = password;
    user.passwordChangedAt = now;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    // The pre-save hook hashes the new password with the existing bcrypt setup.
    await user.save();

    return res.json({
      success: true,
      message: 'Your password has been reset. Please log in with your new password.',
      email: user.email,
    });
  } catch (err) {
    console.error('Reset password error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to reset your password right now. Please try again.',
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified !== false,
        emailRemindersEnabled: user.emailRemindersEnabled !== false,
        timezone: user.timezone || ''
      }
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
});

// PATCH /api/auth/preferences
// Account-level switches. The per-medicine "Email reminder" toggle still has
// to be on for a reminder to be sent.
router.patch('/preferences', authMiddleware, async (req, res) => {
  try {
    const { emailRemindersEnabled } = req.body || {};

    if (typeof emailRemindersEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'emailRemindersEnabled must be a boolean.',
      });
    }

    if (!isMongoConnected() || !mongoose.isValidObjectId(req.userId)) {
      return res.status(503).json({
        success: false,
        message: 'Preferences are unavailable without a database connection.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { emailRemindersEnabled } },
      { new: true, runValidators: true }
    ).select('emailRemindersEnabled emailVerified');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      settings: {
        emailRemindersEnabled: user.emailRemindersEnabled !== false,
        emailVerified: user.emailVerified !== false,
      },
    });
  } catch (err) {
    console.error('Update preferences error:', err);
    return res.status(500).json({ success: false, message: 'Could not update preferences.' });
  }
});

module.exports = router;
