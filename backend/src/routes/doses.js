const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const doseService = require('../services/doseService');
const medicineService = require('../services/medicineService');
const { ensureDoseLogsForRange, sweepMissedDoses } = require('../services/doseSweep');
const {
  zonedTimeToUtc,
  getZonedDateString,
  isPastGrace,
  isLateEntry,
  GRACE_MINUTES,
} = require('../utils/timeZone');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const getRequestTimezone = (req) => req.timezone || '';

const byScheduledAtAsc = (a, b) => {
  const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
  const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
  if (aTime !== bTime) return aTime - bTime;
  return String(a.scheduledTime || '').localeCompare(String(b.scheduledTime || ''));
};

const byScheduledAtDesc = (a, b) => byScheduledAtAsc(b, a);

/**
 * Run the on-demand pieces that keep dose statuses truthful:
 *  - materialize expected doses (90-day window, throttled per user)
 *  - flip overdue pending doses to missed
 */
const refreshDoses = async (req) => {
  if (!isMongoConnected() || !mongoose.isValidObjectId(req.userId)) return;
  try {
    await ensureDoseLogsForRange(req.userId, { timezone: getRequestTimezone(req), days: 90 });
    await sweepMissedDoses(req.userId);
  } catch (err) {
    // Never let housekeeping break a page load.
    console.error('Dose refresh error:', err.message);
  }
};

// GET /api/doses/today
router.get('/today', authMiddleware, async (req, res) => {
  try {
    await refreshDoses(req);
    const todayStr = getZonedDateString(getRequestTimezone(req));

    let doses = await doseService.getDoses(req.userId, { date: todayStr });
    doses = [...doses].sort(byScheduledAtAsc);

    const total = doses.length;
    const taken = doses.filter((d) => d.status === 'taken').length;
    const skipped = doses.filter((d) => d.status === 'skipped').length;
    const missed = doses.filter((d) => d.status === 'missed').length;
    const pending = doses.filter((d) => d.status === 'pending' || d.status === 'upcoming').length;

    // The next dose is the earliest one still waiting.
    const nextDose = doses.find((d) => d.status === 'pending' || d.status === 'upcoming') || null;

    return res.json({
      success: true,
      date: todayStr,
      stats: {
        total,
        taken,
        skipped,
        missed,
        pending,
        upcoming: pending,
        percent: total > 0 ? Math.round((taken / total) * 100) : 0,
      },
      nextDose,
      doses,
    });
  } catch (err) {
    console.error('Today doses error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch today doses' });
  }
});

// POST /api/doses
// Creates (or updates) the log for a generated scheduled dose.
// Body: { medicineId, date, scheduledTime, status }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { medicineId, date, scheduledTime, status } = req.body || {};

    if (!medicineId || !date || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'medicineId, date, and scheduledTime are required.',
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ success: false, message: 'Invalid dose date.' });
    }

    if (typeof scheduledTime !== 'string' || scheduledTime.length > 20) {
      return res.status(400).json({ success: false, message: 'Invalid scheduled time.' });
    }

    const doseStatus = status || 'taken';
    if (!['taken', 'skipped'].includes(doseStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid dose status.' });
    }

    const medicine = await medicineService.getMedicineById(medicineId, req.userId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const timezone = getRequestTimezone(req);
    const scheduledAt = zonedTimeToUtc(date, scheduledTime, timezone);

    if (isPastGrace(scheduledAt)) {
      return res.status(409).json({
        success: false,
        message: `This dose's ${GRACE_MINUTES}-minute grace period has ended, so it is marked as missed.`,
      });
    }

    const dose = await doseService.upsertDose({
      userId: req.userId,
      medicineId: medicine._id || medicine.id,
      medicineName: medicine.name,
      dosage: medicine.dosage,
      form: medicine.form,
      notes: medicine.notes,
      date,
      scheduledTime,
      scheduledAt,
      timezone,
      status: doseStatus,
      isLate: doseStatus === 'taken' ? isLateEntry(scheduledAt) : false,
    });

    return res.status(201).json({
      success: true,
      message: `Dose marked as ${doseStatus}`,
      doseLog: dose,
      dose,
    });
  } catch (err) {
    console.error('Create dose error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to save dose.' });
  }
});

const respondWithStatusChange = async (req, res, status) => {
  try {
    const { id } = req.params;
    const result = await doseService.updateDoseStatus(id, req.userId, status, {
      timezone: getRequestTimezone(req),
    });

    if (!result.dose) {
      return res.status(404).json({ success: false, message: 'Dose record not found' });
    }

    if (result.reason === 'grace-expired') {
      return res.status(409).json({
        success: false,
        message: `This dose's ${GRACE_MINUTES}-minute grace period has ended, so it is marked as missed.`,
        dose: result.dose,
      });
    }

    return res.json({
      success: true,
      message: status === 'taken' ? 'Dose marked as taken' : 'Dose marked as skipped',
      dose: result.dose,
      doseLog: result.dose,
    });
  } catch (err) {
    console.error(`Dose ${status} error:`, err);
    return res.status(500).json({
      success: false,
      message: status === 'taken' ? 'Error marking dose as taken' : 'Error marking dose as skipped',
    });
  }
};

// POST /api/doses/:id/take
router.post('/:id/take', authMiddleware, (req, res) => respondWithStatusChange(req, res, 'taken'));

// POST /api/doses/:id/skip
router.post('/:id/skip', authMiddleware, (req, res) => respondWithStatusChange(req, res, 'skipped'));

// GET /api/doses/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    await refreshDoses(req);

    const { status } = req.query; // status: All, Taken, Missed, Skipped, Pending

    const filter = {};
    if (status && status !== 'All') {
      filter.status = String(status).toLowerCase();
    }

    const logs = await doseService.getDoses(req.userId, filter);

    // Group logs by date, newest date first.
    const grouped = {};
    logs.forEach((log) => {
      const dateKey = log.date || 'Today';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(log);
    });

    const sections = Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        count: grouped[date].length,
        // Latest scheduled time first inside each day.
        records: [...grouped[date]].sort(byScheduledAtDesc),
      }));

    return res.json({
      success: true,
      totalCount: logs.length,
      sections,
    });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dose history' });
  }
});

module.exports = router;
