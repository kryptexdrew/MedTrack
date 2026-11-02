const mongoose = require('mongoose');
const DoseLog = require('../models/DoseLog');
const { mockDoseLogs } = require('../store');
const { zonedTimeToUtc, isPastGrace, isLateEntry } = require('../utils/timeZone');

const isMongoConnected = () => mongoose.connection.readyState === 1;

const normalizeStatus = (status) => {
  const value = String(status || '').toLowerCase();
  return value === 'upcoming' ? 'pending' : value;
};

const PENDING = ['pending', 'upcoming'];

class DoseService {
  async getDoses(userId, filter = {}) {
    if (isMongoConnected()) {
      const query = { userId };
      if (filter.status) {
        query.status = filter.status === 'pending'
          ? { $in: PENDING }
          : filter.status;
      }
      if (filter.date) query.date = filter.date;
      if (filter.from || filter.to) {
        query.date = {};
        if (filter.from) query.date.$gte = filter.from;
        if (filter.to) query.date.$lte = filter.to;
      }
      // Newest day first, then latest scheduled time first (2:00 PM > 8:00 AM).
      return await DoseLog.find(query).sort({ date: -1, scheduledAt: -1, scheduledTime: -1 });
    }

    // In-memory fallback
    let logs = mockDoseLogs.filter((d) => d.userId === userId || d.userId?.toString() === userId?.toString());
    if (filter.status) {
      const wanted = filter.status.toLowerCase();
      logs = logs.filter((d) => {
        const status = normalizeStatus(d.status);
        return wanted === 'pending' ? status === 'pending' : status === wanted;
      });
    }
    if (filter.date) logs = logs.filter((d) => d.date === filter.date);
    if (filter.from) logs = logs.filter((d) => d.date >= filter.from);
    if (filter.to) logs = logs.filter((d) => d.date <= filter.to);

    return logs.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return (b.scheduledTime || '').localeCompare(a.scheduledTime || '');
    });
  }

  async getDoseById(doseId, userId) {
    if (isMongoConnected() && mongoose.isValidObjectId(doseId)) {
      return await DoseLog.findOne({ _id: doseId, userId });
    }
    return (
      mockDoseLogs.find(
        (d) => d.id === doseId && (d.userId === userId || d.userId?.toString() === userId?.toString())
      ) || null
    );
  }

  async createDose(doseData) {
    if (isMongoConnected()) {
      return await DoseLog.create(doseData);
    }
    const newDose = {
      id: doseData._id?.toString() || 'dose_' + Date.now() + Math.random().toString(36).substring(2, 5),
      ...doseData,
    };
    mockDoseLogs.push(newDose);
    return newDose;
  }

  /**
   * Create or update the single log for a medicine's scheduled dose.
   * Composite identity: userId + medicineId + date + scheduledTime.
   * This makes repeated "Take"/"Skip" clicks idempotent instead of
   * appending duplicate logs.
   */
  async upsertDose(doseData) {
    const { userId, medicineId, date, scheduledTime, status } = doseData;
    const scheduledAt =
      doseData.scheduledAt ||
      zonedTimeToUtc(date, scheduledTime, doseData.timezone);

    const payload = {
      status: normalizeStatus(status),
      recordedAt: new Date(),
      medicineName: doseData.medicineName,
      dosage: doseData.dosage,
      form: doseData.form,
      notes: doseData.notes || '',
      ...(scheduledAt ? { scheduledAt } : {}),
      ...(typeof doseData.isLate === 'boolean' ? { isLate: doseData.isLate } : {}),
    };

    if (isMongoConnected()) {
      return await DoseLog.findOneAndUpdate(
        { userId, medicineId, date, scheduledTime },
        {
          $set: payload,
          $setOnInsert: { userId, medicineId, date, scheduledTime },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );
    }

    const existing = mockDoseLogs.find(
      (d) =>
        String(d.userId) === String(userId) &&
        String(d.medicineId) === String(medicineId) &&
        d.date === date &&
        d.scheduledTime === scheduledTime
    );

    if (existing) {
      Object.assign(existing, payload);
      return existing;
    }

    const newDose = {
      id: 'dose_' + Date.now() + Math.random().toString(36).substring(2, 5),
      status: 'pending',
      ...doseData,
      scheduledAt: scheduledAt || undefined,
      recordedAt: new Date(),
    };
    mockDoseLogs.push(newDose);
    return newDose;
  }

  /**
   * Change a dose's status with the 1-hour grace rule applied.
   *
   * Returns { dose, reason }:
   *  - reason "not-found"      no such dose for this user
   *  - reason "grace-expired"  dose is past its grace window; stays missed
   */
  async updateDoseStatus(doseId, userId, status, options = {}) {
    const dose = await this.getDoseById(doseId, userId);
    if (!dose) return { dose: null, reason: 'not-found' };

    const scheduledAt =
      dose.scheduledAt || zonedTimeToUtc(dose.date, dose.scheduledTime, options.timezone);

    const isTakingOrSkipping = status === 'taken' || status === 'skipped';
    const currentStatus = normalizeStatus(dose.status);

    if (isTakingOrSkipping && isPastGrace(scheduledAt) && currentStatus !== 'taken' && currentStatus !== 'skipped') {
      // A sweep may not have reached this row yet; treat it as missed and
      // refuse the action. (A tap inside the window always wins, even if a
      // sweep already flipped the row a second earlier.)
      if (currentStatus !== 'missed') {
        dose.status = 'missed';
        if (isMongoConnected()) await dose.save();
      }
      return { dose, reason: 'grace-expired' };
    }

    const recordedAt = new Date();
    dose.status = normalizeStatus(status);
    dose.recordedAt = recordedAt;
    dose.isLate = status === 'taken' ? isLateEntry(scheduledAt, recordedAt) : false;
    if (!dose.scheduledAt && scheduledAt) dose.scheduledAt = scheduledAt;

    if (isMongoConnected()) await dose.save();
    return { dose, reason: null };
  }

  async deleteDosesByMedicine(medicineId) {
    if (isMongoConnected() && mongoose.isValidObjectId(medicineId)) {
      return await DoseLog.deleteMany({ medicineId });
    }
    for (let i = mockDoseLogs.length - 1; i >= 0; i--) {
      if (mockDoseLogs[i].medicineId === medicineId) {
        mockDoseLogs.splice(i, 1);
      }
    }
    return { deletedCount: 0 };
  }
}

module.exports = new DoseService();
