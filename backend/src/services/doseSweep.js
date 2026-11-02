const mongoose = require('mongoose');
const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const { mockDoseLogs } = require('../store');
const {
  GRACE_MS,
  zonedTimeToUtc,
  isPastGrace,
} = require('../utils/timeZone');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const PENDING_STATUSES = ['pending', 'upcoming'];

const addDaysToDateString = (dateStr, delta) => {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateStr;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
};

const compareDateStrings = (a, b) => String(a).localeCompare(String(b));

const getServerDateString = (date = new Date()) => date.toLocaleDateString('en-CA');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDayNameForDateString = (dateStr) => {
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
  return DAY_NAMES[new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()];
};

/**
 * Resolve a user's IANA timezone (empty string = server local time).
 */
const getTimezoneForUser = async (userId) => {
  if (!isMongoConnected() || !userId || !mongoose.isValidObjectId(userId)) return '';
  try {
    const user = await User.findById(userId).select('timezone').lean();
    return user?.timezone || '';
  } catch {
    return '';
  }
};

const getTimezonesForUsers = async (userIds = []) => {
  const map = {};
  if (!isMongoConnected()) return map;
  const ids = [...new Set(userIds.map(String))].filter((id) => mongoose.isValidObjectId(id));
  if (!ids.length) return map;
  try {
    const users = await User.find({ _id: { $in: ids } }).select('timezone').lean();
    users.forEach((user) => {
      map[String(user._id)] = user.timezone || '';
    });
  } catch {
    // Ignore: empty map means server-local conversion.
  }
  return map;
};

/**
 * Fill in `scheduledAt` for rows written before the field existed.
 */
const backfillScheduledAt = async (filter = {}, limit = 500) => {
  if (!isMongoConnected()) return 0;

  const docs = await DoseLog.find({
    ...filter,
    $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }],
  })
    .limit(limit)
    .select('_id userId date scheduledTime');

  if (!docs.length) return 0;

  const timezones = await getTimezonesForUsers(docs.map((doc) => doc.userId));
  const operations = docs
    .map((doc) => {
      const scheduledAt = zonedTimeToUtc(doc.date, doc.scheduledTime, timezones[String(doc.userId)]);
      if (!scheduledAt) return null;
      return { updateOne: { filter: { _id: doc._id }, update: { $set: { scheduledAt } } } };
    })
    .filter(Boolean);

  if (!operations.length) return 0;
  await DoseLog.bulkWrite(operations, { ordered: false });
  return operations.length;
};

/**
 * Flip every pending dose that is more than the grace period past its
 * scheduled time to "missed". Safe to call as often as you like.
 *
 * @param {string} [userId] scope to one user; omit for the global cron sweep
 * @returns {Promise<number>} number of doses marked missed
 */
const sweepMissedDoses = async (userId) => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - GRACE_MS);
  const scope = userId ? { userId } : {};

  if (!isMongoConnected()) {
    let changed = 0;
    mockDoseLogs.forEach((log) => {
      if (!PENDING_STATUSES.includes(String(log.status || '').toLowerCase())) return;
      if (userId && String(log.userId) !== String(userId)) return;
      const scheduledAt =
        log.scheduledAt || zonedTimeToUtc(log.date, log.scheduledTime, '');
      if (!scheduledAt) return;
      log.scheduledAt = scheduledAt;
      if (isPastGrace(scheduledAt, now)) {
        log.status = 'missed';
        changed += 1;
      }
    });
    return changed;
  }

  // Legacy rows have no scheduledAt, so they can't be compared yet.
  await backfillScheduledAt(scope);

  const result = await DoseLog.updateMany(
    {
      ...scope,
      status: { $in: PENDING_STATUSES },
      scheduledAt: { $lte: cutoff },
    },
    { $set: { status: 'missed' } }
  );

  return result.modifiedCount || 0;
};

// Avoid re-walking 90 days of schedules on every request from the same user.
const lastBackfillByUser = new Map();
const BACKFILL_TTL_MS = 10 * 60 * 1000;

const shouldBackfill = (userId) => {
  const last = lastBackfillByUser.get(String(userId)) || 0;
  return Date.now() - last > BACKFILL_TTL_MS;
};

const markBackfilled = (userId) => {
  lastBackfillByUser.set(String(userId), Date.now());
};

/**
 * Materialize the expected dose rows for a date range.
 *
 * Without this, "missed" doses have nothing to live on: the app only ever
 * stored rows for doses the user clicked or that the midnight generator made
 * for today, so past days had no denominator at all.
 *
 * @param {string} userId
 * @param {{ days?: number, timezone?: string }} [options]
 */
const ensureDoseLogsForRange = async (userId, options = {}) => {
  const { days = 90 } = options;
  if (!isMongoConnected() || !userId || !mongoose.isValidObjectId(userId)) return 0;
  if (!shouldBackfill(userId)) return 0;

  const timezone = options.timezone !== undefined ? options.timezone : await getTimezoneForUser(userId);
  const todayStr = getServerDateString();
  const windowStart = addDaysToDateString(todayStr, -Math.abs(days));

  const medicines = await Medicine.find({ userId, status: 'active' }).lean();
  if (!medicines.length) {
    markBackfilled(userId);
    return 0;
  }

  const operations = [];

  medicines.forEach((medicine) => {
    const medicineId = medicine._id;
    if (!medicineId) return;

    const times =
      Array.isArray(medicine.scheduledTimes) && medicine.scheduledTimes.length > 0
        ? medicine.scheduledTimes
        : [medicine.firstDoseAt || '8:00 AM'];

    const startDate = medicine.startDate && /^\d{4}-\d{2}-\d{2}$/.test(medicine.startDate)
      ? medicine.startDate
      : windowStart;
    const endDate = medicine.endDate && /^\d{4}-\d{2}-\d{2}$/.test(medicine.endDate)
      ? medicine.endDate
      : todayStr;

    const from = compareDateStrings(startDate, windowStart) > 0 ? startDate : windowStart;
    const to = compareDateStrings(endDate, todayStr) < 0 ? endDate : todayStr;
    if (compareDateStrings(from, to) > 0) return;

    const activeDays = Array.isArray(medicine.days) ? medicine.days.filter(Boolean) : [];

    for (let dateStr = from; compareDateStrings(dateStr, to) <= 0; dateStr = addDaysToDateString(dateStr, 1)) {
      if (activeDays.length > 0 && !activeDays.includes(getDayNameForDateString(dateStr))) continue;

      times.forEach((time) => {
        const scheduledAt = zonedTimeToUtc(dateStr, time, timezone);
        if (!scheduledAt) return;

        operations.push({
          updateOne: {
            filter: { userId, medicineId, date: dateStr, scheduledTime: time },
            update: {
              $setOnInsert: {
                userId,
                medicineId,
                medicineName: medicine.name,
                dosage: medicine.dosage,
                form: medicine.form,
                notes: medicine.notes || '',
                date: dateStr,
                scheduledTime: time,
                scheduledAt,
                // Past days open as missed immediately; the rest stay pending
                // until their grace period expires.
                status: isPastGrace(scheduledAt) ? 'missed' : 'pending',
              },
            },
            upsert: true,
          },
        });
      });
    }
  });

  markBackfilled(userId);

  if (!operations.length) return 0;

  let written = 0;
  for (let i = 0; i < operations.length; i += 500) {
    const chunk = operations.slice(i, i + 500);
    try {
      const result = await DoseLog.bulkWrite(chunk, { ordered: false });
      written += (result.upsertedCount || 0) + (result.modifiedCount || 0);
    } catch (err) {
      // Duplicate key = another request inserted the same dose first. Fine.
      if (err?.code !== 11000 && !err?.writeErrors) throw err;
      written += err.result?.upsertedCount || 0;
    }
  }

  return written;
};

module.exports = {
  GRACE_MS,
  PENDING_STATUSES,
  addDaysToDateString,
  getTimezoneForUser,
  backfillScheduledAt,
  sweepMissedDoses,
  ensureDoseLogsForRange,
  markBackfilled,
};
