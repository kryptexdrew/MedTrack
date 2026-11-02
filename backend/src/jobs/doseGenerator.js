const cron = require('node-cron');
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const { mockMedicines, mockDoseLogs } = require('../store');
const { getDayOfWeek } = require('../utils/dateUtils');
const {
  zonedTimeToUtc,
  getZonedDateString,
  getZonedDayOfWeek,
  isPastGrace,
} = require('../utils/timeZone');
const { getTimezoneForUser, sweepMissedDoses } = require('../services/doseSweep');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const isActiveOnDay = (medicine, dayName) =>
  !(medicine.days && medicine.days.length > 0) || medicine.days.includes(dayName);

const isWithinDateRange = (medicine, dateStr) => {
  if (medicine.startDate && dateStr < medicine.startDate) return false;
  if (medicine.endDate && dateStr > medicine.endDate) return false;
  return true;
};

const getScheduledTimes = (medicine) =>
  medicine.scheduledTimes && medicine.scheduledTimes.length > 0
    ? medicine.scheduledTimes
    : [medicine.firstDoseAt || '8:00 AM'];

const generateDosesForMedicine = async (medicine) => {
  const userId = medicine.userId;

  if (isMongoConnected()) {
    const timezone = await getTimezoneForUser(userId);
    const today = new Date();
    const todayStr = getZonedDateString(timezone, today);
    // The medicine's weekday rule must be read in the user's zone, not the
    // server's, or reminders fire on the wrong local day.
    const dayName = getZonedDayOfWeek(timezone, today);

    if (!isActiveOnDay(medicine, dayName)) return;
    if (!isWithinDateRange(medicine, todayStr)) return;

    for (const time of getScheduledTimes(medicine)) {
      const scheduledAt = zonedTimeToUtc(todayStr, time, timezone);

      const existing = await DoseLog.findOne({
        userId,
        medicineId: medicine._id,
        date: todayStr,
        scheduledTime: time,
      });
      if (existing) continue;

      await DoseLog.create({
        userId,
        medicineId: medicine._id,
        medicineName: medicine.name,
        dosage: medicine.dosage,
        form: medicine.form,
        scheduledTime: time,
        date: todayStr,
        scheduledAt,
        // Starting the server late in the day shouldn't fabricate "pending"
        // doses whose grace period already ended.
        status: isPastGrace(scheduledAt) ? 'missed' : 'pending',
        notes: medicine.notes || '',
      });
    }
    return;
  }

  // In-memory fallback: server-local time, same as the original behaviour.
  const todayStr = new Date().toLocaleDateString('en-CA');
  const dayName = getDayOfWeek(new Date());

  if (!isActiveOnDay(medicine, dayName)) return;
  if (!isWithinDateRange(medicine, todayStr)) return;

  for (const time of getScheduledTimes(medicine)) {
    const existing = mockDoseLogs.find(
      (d) =>
        d.userId?.toString() === userId?.toString() &&
        d.medicineId === medicine.id &&
        d.date === todayStr &&
        d.scheduledTime === time
    );
    if (existing) continue;

    const scheduledAt = zonedTimeToUtc(todayStr, time, '');
    mockDoseLogs.push({
      id: 'dose_' + Date.now() + Math.random().toString(36).substring(2, 5),
      userId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      form: medicine.form,
      scheduledTime: time,
      date: todayStr,
      scheduledAt,
      status: isPastGrace(scheduledAt) ? 'missed' : 'pending',
      notes: medicine.notes || '',
    });
  }
};

/**
 * Reconcile the medicine's rows for today after an edit.
 *
 * Only future, still-pending, never-reminded rows are touched, so taken or
 * missed history is never rewritten. Newly added dose times are created right
 * away instead of waiting for the next midnight run.
 *
 * @returns {Promise<number>} number of stale rows removed
 */
const syncDosesForMedicine = async (medicine) => {
  if (!isMongoConnected() || !medicine?._id) return 0;

  const userId = medicine.userId;
  const timezone = await getTimezoneForUser(userId);
  const todayStr = getZonedDateString(timezone);
  const dayName = getZonedDayOfWeek(timezone);

  const removable = {
    userId,
    medicineId: medicine._id,
    status: { $in: ['pending', 'upcoming'] },
    reminderSentAt: null,
    scheduledAt: { $gte: new Date() },
  };

  const stillScheduled =
    medicine.status === 'active' &&
    isActiveOnDay(medicine, dayName) &&
    isWithinDateRange(medicine, todayStr);

  if (!stillScheduled) {
    const removed = await DoseLog.deleteMany(removable);
    return removed.deletedCount || 0;
  }

  const times = getScheduledTimes(medicine);
  const removed = await DoseLog.deleteMany({ ...removable, scheduledTime: { $nin: times } });

  await generateDosesForMedicine(medicine);
  return removed.deletedCount || 0;
};

const generateAllDoses = async () => {
  try {
    console.log('[Cron] Generating doses for today...');
    if (isMongoConnected()) {
      const medicines = await Medicine.find({ status: 'active' });
      for (const med of medicines) {
        await generateDosesForMedicine(med);
      }
    } else {
      for (const med of mockMedicines) {
        if (med.status === 'active') {
          await generateDosesForMedicine(med);
        }
      }
    }
    console.log('[Cron] Dose generation completed');
  } catch (err) {
    console.error('[Cron] Error generating doses:', err);
  }
};

const runMissedSweep = async () => {
  try {
    const changed = await sweepMissedDoses();
    if (changed > 0) {
      console.log(`[Cron] Marked ${changed} dose(s) as missed`);
    }
  } catch (err) {
    console.error('[Cron] Error sweeping missed doses:', err);
  }
};

const startDoseGenerator = () => {
  // Run daily at midnight to create the new day's doses.
  cron.schedule('0 0 * * *', generateAllDoses);
  // Every 15 minutes, flip pending doses past their grace window to missed.
  cron.schedule('*/15 * * * *', runMissedSweep);
  // Also run on startup.
  generateAllDoses();
  runMissedSweep();
};

module.exports = {
  startDoseGenerator,
  generateAllDoses,
  generateDosesForMedicine,
  syncDosesForMedicine,
  runMissedSweep,
};
