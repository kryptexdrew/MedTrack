import React, { useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { useMedTrack } from '../context/MedTrackContext';
import { parseTimeToMinutes, formatDosage } from '../utils/medicineSchedule';
import { isLateLog } from '../utils/doseStatus';
import { getLocalDateString } from '../utils/dateUtils';

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "500mg", "500 mg", "1 tablespooon"... anything that looks like a dose unit.
const TRAILING_DOSE_PATTERN = /\s*\d+(?:\.\d+)?\s*(?:mg|ml|g|mcg|iu|units?|tablets?|tabs?|capsules?|caps?|puffs?|drops?)\s*$/i;

const stripTrailingDosage = (name, dosage) => {
  const original = String(name || '').trim();
  if (!original) return original;

  let cleaned = original;
  const dosageValue = String(dosage || '').trim();
  if (dosageValue) {
    cleaned = cleaned.replace(new RegExp(`\\s*${escapeRegExp(dosageValue)}$`, 'i'), '').trim();
  }
  cleaned = cleaned.replace(TRAILING_DOSE_PATTERN, '').trim();

  // Never reduce a medicine name to an empty string.
  return cleaned || original;
};

/**
 * Build a display name with the dosage appended exactly once.
 * "Amoxicillin 500mg" + "500mg" -> "Amoxicillin 500mg" (not 500mg 500mg).
 */
const buildDoseName = (rawName, dosage, form) => {
  const cleanedName = stripTrailingDosage(rawName, dosage);
  const formattedDosage = formatDosage(dosage, form);
  if (!formattedDosage) return cleanedName;
  if (new RegExp(`\\s*${escapeRegExp(formattedDosage)}$`, 'i').test(cleanedName)) {
    return cleanedName;
  }
  return `${cleanedName} ${formattedDosage}`.trim();
};

export default function History() {
  const { history, loading } = useMedTrack();
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Taken', 'Missed', 'Skipped'
  const [rangeFilter, setRangeFilter] = useState('week'); // 'week' or 'month'

  const filteredGroups = useMemo(() => {
    const daysToSubtract = rangeFilter === 'month' ? 30 : 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);
    // Compare calendar dates as strings, not instants, so "7 days ago" always
    // includes the whole day.
    const cutoffDateStr = getLocalDateString(cutoffDate);

    const grouped = {};
    (history || []).forEach(log => {
      const logDate = log.date;
      if (!logDate) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return;
      if (logDate < cutoffDateStr) return;

      if (!grouped[logDate]) grouped[logDate] = [];
      grouped[logDate].push(log);
    });

    const groups = Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map(date => {
        let dateLabel = date;
        try {
          const dateObj = new Date(date + 'T00:00:00');
          if (!isNaN(dateObj.getTime())) {
            dateLabel = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          }
        } catch { /* keep the raw date */ }

        const doses = grouped[date]
          .map(r => {
            const rawName = r.medicineName || r.name || (r.medicine?.name) || 'Medicine';
            const dosage = r.dosage || r.medicine?.dosage || '';
            return {
              id: r._id || r.id,
              time: r.scheduledTime || r.time || '8:00 AM',
              name: buildDoseName(rawName, dosage, r.form || r.medicine?.form),
              status: (r.status || 'taken').toLowerCase() === 'upcoming' ? 'pending' : (r.status || 'taken').toLowerCase(),
              isLate: isLateLog(r),
              recordedAt: r.recordedAt || r.updatedAt,
            };
          })
          // Latest dose at the top inside each day (2:00 PM before 8:00 AM).
          .sort((a, b) => {
            const diff = parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time);
            if (diff !== 0) return diff;
            return (a.name || '').localeCompare(b.name || '');
          });

        return { dateLabel, doses };
      });

    return groups
      .map(g => ({
        ...g,
        doses: g.doses.filter(d => {
          if (statusFilter === 'All') return true;
          return d.status === statusFilter.toLowerCase();
        }),
      }))
      .filter(g => g.doses.length > 0);
  }, [history, statusFilter, rangeFilter]);

  return (
    <div className="min-h-dvh bg-[#f8f9fa] font-sans text-slate-800 antialiased">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 pb-28 sm:px-6 md:pb-8" data-purpose="history-view">
        {/* Header Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">History</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Every dose you took, skipped or missed</p>
        </div>

        {/* Filters & Range Selector Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {['All', 'Taken', 'Missed', 'Skipped'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`min-h-10 rounded-full px-4 py-1.5 transition-colors cursor-pointer md:min-h-0 ${
                  statusFilter === status
                    ? 'bg-[#c91f1f] text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Time Interval Toggle Switch */}
          <div className="flex items-center bg-[#f1f3f5] p-0.5 rounded-lg border border-gray-200/60 self-start sm:self-auto text-xs font-medium">
            <button
              onClick={() => setRangeFilter('week')}
              className={`min-h-10 px-3.5 py-1 rounded-md transition-all cursor-pointer md:min-h-0 ${
                rangeFilter === 'week'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              type="button"
            >
              This week
            </button>
            <button
              onClick={() => setRangeFilter('month')}
              className={`min-h-10 px-3.5 py-1 rounded-md transition-all cursor-pointer md:min-h-0 ${
                rangeFilter === 'month'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              type="button"
            >
              This month
            </button>
          </div>
        </div>

        {/* History List Container */}
        <section className="bg-white rounded-xl shadow-xs border border-gray-200/80 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Loading history...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No history yet. Start tracking your medications!
            </div>
          ) : (
            filteredGroups.map((group, gIdx) => (
              <div key={gIdx}>
                {/* Date Header */}
                <div className="flex items-center justify-between border-b border-gray-200/60 bg-[#f0f4f8]/70 px-4 py-2.5 sm:px-5">
                  <span className="text-xs font-semibold text-gray-600">{group.dateLabel}</span>
                  <span className="text-xs font-medium text-gray-500">{group.doses.length} doses</span>
                </div>

                {/* Doses */}
                {group.doses.map((dose, dIdx) => (
                  <div
                    key={dose.id || dIdx}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50/50 sm:px-5"
                  >
                    <div className="flex min-w-0 flex-1 items-center space-x-3 sm:space-x-10">
                      <span className="w-14 shrink-0 text-xs font-semibold text-gray-900 sm:w-16">{dose.time}</span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-medium text-gray-800">{dose.name}</span>
                      </div>
                    </div>

                    {dose.status === 'taken' && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8f7ee] px-3 py-1 text-xs font-medium text-[#1e8349]">
                        <span>✓</span> Taken{dose.isLate ? ' (Late)' : ''}
                      </span>
                    )}

                    {dose.status === 'pending' && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Upcoming
                      </span>
                    )}

                    {dose.status === 'skipped' && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fef5e7] px-3 py-1 text-xs font-medium text-[#c27803]">
                        <span className="text-xs font-bold leading-none">−</span> Skipped
                      </span>
                    )}

                    {dose.status === 'missed' && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fde8e8] px-3 py-1 text-xs font-medium text-[#d83a3a]">
                        <span className="text-xs font-bold leading-none">✕</span> Missed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

