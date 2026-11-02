const crypto = require('crypto');

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

/**
 * Generate a cryptographically secure, URL-safe reset token.
 * The raw token is emailed to the user and never persisted.
 */
const generateResetToken = () => crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');

/**
 * Hash a reset token with SHA-256 before storing or looking it up.
 * Deterministic so the API can match without storing plaintext.
 */
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const isValidEmail = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
};

/**
 * Enforce the same password rules the UI advertises.
 * Returns an error message, or null when the password is acceptable.
 */
const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return 'Password must include both uppercase and lowercase letters.';
  }
  if (!/[\d!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'`~/]/.test(password)) {
    return 'Password must include at least one number or special symbol.';
  }
  return null;
};

module.exports = {
  RESET_TOKEN_TTL_MS,
  RESET_TOKEN_PATTERN,
  generateResetToken,
  hashResetToken,
  normalizeEmail,
  isValidEmail,
  validatePassword,
};
