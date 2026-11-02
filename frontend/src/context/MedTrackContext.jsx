import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { getLocalDateString, addDays } from '../utils/dateUtils';

const MedTrackContext = createContext(null);

const getEntityId = (value) => (value && typeof value === 'object' ? value._id || value.id : value);

// Composite identity for a dose: medicine + date + scheduled time.
const getDoseKey = (log) =>
  `${getEntityId(log?.medicineId) ?? log?.medicineName ?? ''}|${log?.date ?? ''}|${log?.scheduledTime ?? ''}`;

// Replace an existing log for the same dose instead of appending a duplicate.
const upsertDoseLog = (list, log) => {
  const key = getDoseKey(log);
  const index = list.findIndex((item) => getDoseKey(item) === key);
  if (index === -1) return [...list, log];
  const next = [...list];
  next[index] = { ...next[index], ...log };
  return next;
};

// Add a medicine without ever creating a duplicate entry in local state.
const upsertMedicine = (list, medicine) => {
  const id = getEntityId(medicine);
  if (!id) return list;
  const index = list.findIndex((item) => String(getEntityId(item)) === String(id));
  if (index === -1) return [...list, medicine];
  const next = [...list];
  next[index] = { ...next[index], ...medicine };
  return next;
};

// A dose only counts towards adherence once it has a final status. Pending
// (or legacy "upcoming") doses are future or still inside their grace window
// and must not drag today's percentage down.
const statusOf = (log) => {
  const value = String(log?.status || '').toLowerCase();
  return value === 'upcoming' ? 'pending' : value;
};

const summarizeDoses = (logs = []) => {
  let taken = 0;
  let skipped = 0;
  let missed = 0;
  let pending = 0;

  logs.forEach((log) => {
    const status = statusOf(log);
    if (status === 'taken') taken += 1;
    else if (status === 'skipped') skipped += 1;
    else if (status === 'missed') missed += 1;
    else pending += 1;
  });

  const expected = taken + skipped + missed;
  return {
    taken,
    skipped,
    missed,
    pending,
    expected,
    adherence: expected > 0 ? Math.round((taken / expected) * 100) : 0,
  };
};

const adherenceColor = (percent) =>
  percent >= 80 ? 'bg-[#047835]' : percent >= 50 ? 'bg-[#d96504]' : 'bg-[#b91c1c]';

/**
 * Per-medicine adherence for a set of logs. Each medicine's percentage uses
 * its own expected count as the denominator, so a medicine whose doses were
 * missed still drops.
 */
const summarizeByMedicine = (logs = []) => {
  const byMedicine = {};

  logs.forEach((log) => {
    const name = log.medicineName || log.name || 'Unknown';
    if (!byMedicine[name]) byMedicine[name] = { taken: 0, skipped: 0, missed: 0, pending: 0 };
    const status = statusOf(log);
    if (status === 'taken' || status === 'skipped' || status === 'missed') {
      byMedicine[name][status] += 1;
    } else {
      byMedicine[name].pending += 1;
    }
  });

  return Object.keys(byMedicine)
    .map((name) => {
      const entry = byMedicine[name];
      const expected = entry.taken + entry.skipped + entry.missed;
      const percent = expected > 0 ? Math.round((entry.taken / expected) * 100) : 0;
      return {
        name,
        percent,
        taken: entry.taken,
        skipped: entry.skipped,
        missed: entry.missed,
        expected,
        color: adherenceColor(percent),
      };
    })
    .sort((a, b) => b.expected - a.expected || a.name.localeCompare(b.name));
};

export const MedTrackProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [history, setHistory] = useState([]); // All dose logs
  const [todayDoses, setTodayDoses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated) {
      setMedicines([]);
      setHistory([]);
      setTodayDoses([]);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch medicines
      const medRes = await api.get('/medicines');
      if (medRes && medRes.medicines) {
        setMedicines(medRes.medicines);
      } else {
        setMedicines([]);
      }

      // Fetch today doses
      const todayRes = await api.get('/doses/today');
      if (todayRes && todayRes.doses) {
        setTodayDoses(todayRes.doses);
      } else {
        setTodayDoses([]);
      }

      // Fetch history (all)
      const histRes = await api.get('/doses/history?status=All');
      if (histRes && histRes.sections) {
        // Flatten all sections into single array
        const allLogs = [];
        histRes.sections.forEach(section => {
          if (section.records) {
            section.records.forEach(record => {
              allLogs.push(record);
            });
          }
        });
        setHistory(allLogs);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setMedicines([]);
      setHistory([]);
      setTodayDoses([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, user?.id]);

  // Add medicine
  const addMedicine = async (medicineData) => {
    try {
      const res = await api.post('/medicines', medicineData);
      const newMedicine = res?.medicine || res?.data?.medicine;
      if (newMedicine && (newMedicine._id || newMedicine.id)) {
        setMedicines(prev => upsertMedicine(prev || [], newMedicine));
        return { success: true, medicine: newMedicine };
      }
      // Fallback: refetch if backend doesn't return the full new medicine object
      await fetchAllData();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Update medicine
  const updateMedicine = async (id, medicineData) => {
    try {
      const res = await api.put(`/medicines/${id}`, medicineData);
      if (res && res.medicine) {
        await fetchAllData();
        return { success: true, medicine: res.medicine };
      }
      return { success: false, message: res?.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Delete medicine
  const deleteMedicine = async (id) => {
    try {
      await api.delete(`/medicines/${id}`);
      await fetchAllData();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Record a generated or existing dose without ever appending a duplicate.
  const recordDose = async (id, payload = {}, status) => {
    const isGenerated = typeof id === 'string' && id.startsWith('gen_');

    try {
      let log;

      if (isGenerated) {
        const res = await api.post('/doses', {
          medicineId: payload.medicineId,
          date: payload.date || getLocalDateString(new Date()),
          scheduledTime: payload.scheduledTime,
          status,
        });
        log = res?.doseLog || res?.dose;
      } else {
        const action = status === 'taken' ? 'take' : 'skip';
        const res = await api.post(`/doses/${id}/${action}`);
        log = res?.doseLog || res?.dose || res?.log;
      }

      if (log && typeof log === 'object') {
        // Map-and-replace by composite key, never setDoses([...prev, newLog]).
        setHistory((prev) => upsertDoseLog(prev || [], log));
        if (log.date === getLocalDateString(new Date())) {
          setTodayDoses((prev) => upsertDoseLog(prev || [], log));
        }
      }

      return { success: true };
    } catch (err) {
      console.error(`${status === 'taken' ? 'Take' : 'Skip'} dose error:`, err.message);
      return { success: false, message: err.message };
    } finally {
      // Reconcile with the server, but never let a refresh failure make a
      // successful save look like a failed click.
      fetchAllData().catch((err) => {
        console.error('Refresh after dose update failed:', err.message);
      });
    }
  };

  const takeDose = (id, payload = {}) => recordDose(id, payload, 'taken');

  const skipDose = (id, payload = {}) => recordDose(id, payload, 'skipped');

  // Calculate stats
  const activeMedicinesCount = medicines.filter(m => m.status === 'active').length;

  const todayDateStr = getLocalDateString(new Date());

  // Stats for the last `days` calendar days (inclusive of today).
  const periodStats = useCallback((days = 7) => {
    const from = getLocalDateString(addDays(new Date(), -(Math.max(1, days) - 1)));
    const logs = (history || []).filter((log) => log.date && log.date >= from && log.date <= todayDateStr);
    return summarizeDoses(logs);
  }, [history, todayDateStr]);

  const weeklyAdherencePercent = periodStats(7).adherence;

  // Calculate streak
  const calculateStreak = () => {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = getLocalDateString(d);
      const dayLogs = history.filter(h => h.date === dayStr);
      if (dayLogs.length === 0) break;
      const daySummary = summarizeDoses(dayLogs);
      // A day whose doses are all still pending isn't a miss yet.
      if (daySummary.expected === 0) continue;
      if (daySummary.adherence >= 80) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // Reports calculations.
  // Adherence = Taken / Total Expected, where "expected" is every dose that
  // reached a final status (taken + skipped + missed). Missed doses therefore
  // sit in the denominator and in the Missed card.
  const totals = summarizeDoses(history);
  const totalTaken = totals.taken;
  const totalMissed = totals.missed;
  const totalSkipped = totals.skipped;
  const totalExpected = totals.expected;
  const overallAdherence = totals.adherence;

  // By-medicine adherence, optionally scoped to the last `days` days.
  const medicineStatsForPeriod = useCallback((days = null) => {
    const logs = days
      ? (history || []).filter((log) => {
          if (!log.date) return false;
          const from = getLocalDateString(addDays(new Date(), -(Math.max(1, days) - 1)));
          return log.date >= from && log.date <= todayDateStr;
        })
      : history || [];
    return summarizeByMedicine(logs);
  }, [history, todayDateStr]);

  // Daily stats for the last 7 days.
  const dailyStats = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = getLocalDateString(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const summary = summarizeDoses((history || []).filter(h => h.date === dayStr));
    const percent = summary.adherence;
    dailyStats.push({
      day: dayName,
      date: dayStr,
      percent,
      taken: summary.taken,
      expected: summary.expected,
      missed: summary.missed,
      color:
        summary.expected === 0
          ? 'bg-slate-300'
          : percent >= 80
            ? 'bg-[#047835]'
            : percent >= 50
              ? 'bg-[#d96504]'
              : 'bg-[#b91c1c]',
    });
  }

  // Four 7-day buckets for the monthly view (oldest first).
  const weeklyBreakdown = [3, 2, 1, 0].map((weeksAgo, index) => {
    const to = getLocalDateString(addDays(new Date(), -weeksAgo * 7));
    const from = getLocalDateString(addDays(new Date(), -(weeksAgo * 7 + 6)));
    const summary = summarizeDoses(
      (history || []).filter(h => h.date && h.date >= from && h.date <= to)
    );
    return {
      week: `Week ${index + 1}`,
      from,
      to,
      ...summary,
    };
  });

  const value = {
    medicines,
    history,
    todayDoses,
    loading,
    fetchAllData,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    takeDose,
    skipDose,
    activeMedicinesCount,
    weeklyAdherencePercent,
    periodStats,
    currentStreak,
    totalTaken,
    totalMissed,
    totalSkipped,
    totalExpected,
    overallAdherence,
    medicineStatsForPeriod,
    dailyStats,
    weeklyBreakdown
  };

  return (
    <MedTrackContext.Provider value={value}>
      {children}
    </MedTrackContext.Provider>
  );
};

export const useMedTrack = () => {
  const context = useContext(MedTrackContext);
  if (!context) {
    throw new Error('useMedTrack must be used within a MedTrackProvider');
  }
  return context;
};
