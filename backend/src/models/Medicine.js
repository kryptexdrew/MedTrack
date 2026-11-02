const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    form: { 
      type: String, 
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injections', 'Topical', 'Other'], 
      default: 'Tablet' 
    },
    notes: { type: String, default: '' },
    frequency: { 
      type: String, 
      default: 'Once a day' 
    },
    repeatEvery: { type: String, default: '8 hours' },
    firstDoseAt: { type: String, default: '8:00 AM' },
    scheduledTimes: [{ type: String }],
    days: [{ type: String }],
    startDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    endDate: { type: String, default: '' },
    browserNotification: { type: Boolean, default: true },
    emailReminder: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'ended'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medicine', medicineSchema);

