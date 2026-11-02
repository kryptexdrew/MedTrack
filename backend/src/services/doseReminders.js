const mongoose = require('mongoose');
const DoseLog = require('../models/DoseLog');
const { sendDoseReminderEmail } = require('./emailService');
const { isPastGrace } = require('../utils/timeZone');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const numberFromEnv = (name, fallback) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

// How far past its scheduled instant a dose may still be reminded. Kept well
// inside the 60-minute auto-miss grace window so a reminder can never arrive
// for a dose that has already been marked missed.
const MAX_CATCH_UP_MS = numberFromEnv('REMINDER_MAX_CATCHUP_MINUTES', 15) * 60 * 1000;
// Never send early. A tick can land up to 59 seconds after the scheduled
// minute, which the catch-up window below absorbs.
const LOOK_AHEAD_MS = 0;
const MAX_ATTEMPTS = Math.max(1, numberFromEnv('REMINDER_MAX_ATTEMPTS', 3));
// A process that crashes after claiming but before sending would otherwise
// leave a row stuck in "sending" forever. Requeue it after this long.
const STALE_CLAIM_MS = 10 * 60 * 1000;
// Caps a single tick so a backlog can't burn the Brevo quota in one burst.
const MAX_PER_RUN = 50;

const getAppUrl = () =>
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

// Rows written before the reminder fields existed have no `reminderAttempts`,
// and MongoDB's $lt does not match missing fields, so allow both shapes.
const attemptsAvailable = () => ({
  $or: [
    { reminderAttempts: { $exists: false } },
    { reminderAttempts: { $lt: MAX_ATTEMPTS } },
  ],
});

/**
 * Decide whether this dose should receive a reminder right now.
 * Returns a short machine-readable reason when it should not.
 */
const getSkipReason = (dose, now) => {
  const user = dose.userId;
  const medicine = dose.medicineId;

  if (!user || typeof user !== 'object') return 'user-missing';
  if (!user.email) return 'email-missing';
  if (user.emailVerified === false) return 'email-unverified';
  if (user.emailRemindersEnabled === false) return 'user-disabled';

  if (!medicine || typeof medicine !== 'object') return 'medicine-missing';
  if (medicine.status !== 'active') return 'medicine-inactive';
  if (medicine.emailReminder !== true) return 'medicine-disabled';

  if (dose.reminderSentAt) return 'already-sent';
  if ((dose.reminderAttempts || 0) >= MAX_ATTEMPTS) return 'attempts-exhausted';
  if (isPastGrace(dose.scheduledAt, now)) return 'past-grace';

  return null;
};

const markSkipped = async (doseId, reason) => {
  await DoseLog.updateOne(
    { _id: doseId, reminderSentAt: null },
    {
      $set: {
        reminderStatus: 'skipped',
        reminderClaimedAt: null,
        reminderLastError: reason,
      },
    }
  ).catch(() => {});
};

/**
 * Atomically take ownership of a dose before sending. Only one caller can win,
 * which is what makes duplicate cron ticks and restarts safe.
 */
const claimDose = async (doseId, now) => {
  return DoseLog.findOneAndUpdate(
    {
      _id: doseId,
      status: { $in: ['pending', 'upcoming'] },
      reminderSentAt: null,
      reminderStatus: { $in: ['pending', 'failed', null] },
      ...attemptsAvailable(),
    },
    {
      $set: { reminderStatus: 'sending', reminderClaimedAt: now },
      $inc: { reminderAttempts: 1 },
    },
    { new: true }
  ).lean();
};

const markSent = async (doseId, now) => {
  await DoseLog.updateOne(
    { _id: doseId },
    {
      $set: {
        reminderStatus: 'sent',
        reminderSentAt: now,
        reminderClaimedAt: null,
      },
      $unset: { reminderLastError: 1 },
    }
  );
};

const markFailed = async (doseId, err) => {
  const message = String(err?.message || 'unknown error').slice(0, 200);
  await DoseLog.updateOne(
    { _id: doseId },
    {
      $set: {
        reminderStatus: 'failed',
        reminderClaimedAt: null,
        reminderLastError: message,
      },
    }
  ).catch(() => {});
  return message;
};

/**
 * Send reminder emails for every dose that has just come due.
 *
 * Safe to run as often as you like: eligibility is re-checked, the row is
 * atomically claimed, failures retry on a later tick (max attempts), and no
 * error is ever rethrown into the cron scheduler.
 *
 * @param {{ now?: Date, dryRun?: boolean, userId?: string }} [options]
 * @returns {Promise<{ checked: number, sent: number, skipped: number, failed: number, wouldSend?: number, reason?: string }>}
 */
const runDoseReminderSweep = async ({ now = new Date(), dryRun = false, userId } = {}) => {
  const stats = { checked: 0, sent: 0, skipped: 0, failed: 0, ...(dryRun ? { wouldSend: 0 } : {}) };

  if (process.env.EMAIL_REMINDERS_ENABLED === '0') {
    return { ...stats, reason: 'disabled' };
  }

  // Reminders need durable dedupe, so the in-memory fallback is a no-op.
  if (!isMongoConnected()) {
    return { ...stats, reason: 'mongodb-offline' };
  }

  const from = new Date(now.getTime() - MAX_CATCH_UP_MS);
  const to = new Date(now.getTime() + LOOK_AHEAD_MS);

  if (!dryRun) {
    // Recover claims abandoned by a crash/restart mid-send.
    await DoseLog.updateMany(
      {
        reminderStatus: 'sending',
        reminderSentAt: null,
        reminderClaimedAt: { $lt: new Date(now.getTime() - STALE_CLAIM_MS) },
        ...attemptsAvailable(),
      },
      {
        $set: {
          reminderStatus: 'failed',
          reminderClaimedAt: null,
          reminderLastError: 'stale-claim',
        },
      }
    ).catch(() => {});
  }

  let due;
  try {
    due = await DoseLog.find({
      ...(userId ? { userId } : {}),
      status: { $in: ['pending', 'upcoming'] },
      reminderSentAt: null,
      reminderStatus: { $in: ['pending', 'failed', null] },
      ...attemptsAvailable(),
      scheduledAt: { $gte: from, $lte: to },
    })
      .sort({ scheduledAt: 1 })
      .limit(MAX_PER_RUN)
      .populate('userId', 'fullName email timezone emailVerified emailRemindersEnabled')
      .populate('medicineId', 'name dosage form status emailReminder')
      .lean();
  } catch (err) {
    console.error(`[Reminders] Could not load due doses: ${err.message}`);
    return { ...stats, reason: 'query-failed' };
  }

  stats.checked = due.length;

  for (const dose of due) {
    const skipReason = getSkipReason(dose, now);

    if (skipReason) {
      stats.skipped += 1;
      if (!dryRun) await markSkipped(dose._id, skipReason);
      continue;
    }

    if (dryRun) {
      stats.wouldSend += 1;
      continue;
    }

    const claimed = await claimDose(dose._id, new Date());
    if (!claimed) {
      // Another tick or instance already handled it.
      continue;
    }

    // A user can take/skip a dose in the milliseconds between the query and
    // the claim. Re-read so a reminder never lands after the fact.
    const stillPending = await DoseLog.exists({
      _id: dose._id,
      status: { $in: ['pending', 'upcoming'] },
    });
    if (!stillPending) {
      await markSkipped(dose._id, 'no-longer-pending');
      stats.skipped += 1;
      continue;
    }

    const user = dose.userId;
    const medicine = dose.medicineId;
    const dashboardUrl = `${getAppUrl()}/dashboard?dose=${String(dose._id)}`;

    try {
      await sendDoseReminderEmail({
        to: user.email,
        toName: user.fullName,
        fullName: user.fullName,
        medicineName: medicine.name || dose.medicineName,
        dosage: medicine.dosage || dose.dosage,
        form: medicine.form || dose.form,
        scheduledTime: dose.scheduledTime,
        scheduledAt: dose.scheduledAt,
        timezone: user.timezone || '',
        dashboardUrl,
      });

      await markSent(dose._id, new Date());
      stats.sent += 1;
      console.log(`[Reminders] Sent reminder for dose ${String(dose._id)}.`);
    } catch (err) {
      const message = await markFailed(dose._id, err);
      stats.failed += 1;
      console.warn(
        `[Reminders] Send failed for dose ${String(dose._id)} (attempt ${claimed.reminderAttempts}/${MAX_ATTEMPTS}): ${message}`
      );
    }
  }

  return stats;
};

module.exports = {
  MAX_ATTEMPTS,
  MAX_CATCH_UP_MS,
  LOOK_AHEAD_MS,
  getSkipReason,
  runDoseReminderSweep,
};
