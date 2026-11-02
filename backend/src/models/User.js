const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['self', 'caregiver'], default: 'self' },
    // Only the SHA-256 hash of a reset token is stored, never the token itself.
    passwordResetTokenHash: { type: String, select: false, index: true },
    passwordResetExpires: { type: Date, select: false },
    // Used to revoke JWTs issued before the most recent password change.
    passwordChangedAt: { type: Date },
    tokenVersion: { type: Number, default: 0 },
    // IANA timezone reported by the client (e.g. "Asia/Manila"). Empty means
    // "fall back to the server timezone", which matches legacy behaviour.
    timezone: { type: String, default: '' },
    // Registration is treated as the verification step until double opt-in
    // ships; the reminder sweep skips users whose flag is explicitly false.
    emailVerified: { type: Boolean, default: true },
    emailVerifiedAt: { type: Date },
    // Master switch for dose reminder emails. The per-medicine toggle on
    // Medicine.emailReminder is still required for a reminder to be sent.
    emailRemindersEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving (Mongoose 8 async pre hook)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
