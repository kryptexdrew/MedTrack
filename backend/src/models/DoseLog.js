const mongoose = require('mongoose');

const doseLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true },
    form: { type: String, default: 'Tablet' },
    // User-facing wall-clock values (no timezone conversion needed in the UI).
    scheduledTime: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD (user's local date)
    // UTC instant of the scheduled dose. Source of truth for grace/auto-miss.
    scheduledAt: { type: Date, index: true },
    status: {
      type: String,
      // "upcoming" is the legacy value and is migrated to "pending".
      enum: ['pending', 'taken', 'skipped', 'missed', 'upcoming'],
      default: 'pending'
    },
    // True when a dose was marked taken after its scheduled minute.
    isLate: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    recordedAt: { type: Date },
    // Email reminder lifecycle. "sending" is an atomic claim so overlapping
    // cron ticks (or multiple server instances) can never double-send.
    reminderStatus: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed', 'skipped'],
      default: 'pending'
    },
    reminderSentAt: { type: Date, default: null },
    reminderAttempts: { type: Number, default: 0 },
    reminderClaimedAt: { type: Date, default: null },
    reminderLastError: { type: String, default: '' }
  },
  { timestamps: true }
);

// One log per scheduled dose, which makes backfill and Take/Skip idempotent.
// Partial so legacy rows without a medicineId can never block index creation.
doseLogSchema.index(
  { userId: 1, medicineId: 1, date: 1, scheduledTime: 1 },
  {
    unique: true,
    name: 'uniq_user_medicine_date_time',
    partialFilterExpression: { medicineId: { $type: 'objectId' } },
  }
);

// Drives the auto-miss sweep and today's queries.
doseLogSchema.index({ userId: 1, status: 1, scheduledAt: 1 }, { name: 'status_sweep' });

// Drives the every-minute reminder sweep.
doseLogSchema.index(
  { status: 1, scheduledAt: 1, reminderStatus: 1 },
  { name: 'reminder_due' }
);

module.exports = mongoose.model('DoseLog', doseLogSchema);
