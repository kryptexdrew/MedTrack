import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useMedTrack } from '../context/MedTrackContext';
import { getLocalDateString, getDayOfWeek } from '../utils/dateUtils';
import { parseTimeToMinutes, formatDosage } from '../utils/medicineSchedule';
import {
  resolveDoseStatus,
  isLateLog,
} from '../utils/doseStatus';

const INSPIRATIONAL_QUOTES = [
  "“Small steps every day still add up to big healing.”",
  "“Consistency is the truest form of self-care.”",
  "“Taking your medicine on time is an act of self-love.”",
  "“Every dose taken brings you one step closer to peak health.”",
  "“Health is a journey of small daily victories.”"
];

const getEntityId = (value) => (value && typeof value === 'object' ? value._id || value.id : value);

const normalizeTimeKey = (time = '') => String(time).trim().toUpperCase().replace(/\s+/g, ' ');

// "10:00 AM" and "10:00" should identify the same scheduled dose.
const sameScheduledTime = (a, b) => {
  if (!a || !b) return false;
  if (normalizeTimeKey(a) === normalizeTimeKey(b)) return true;
  const minutesA = parseTimeToMinutes(a);
  return minutesA > 0 && minutesA === parseTimeToMinutes(b);
};

const buildDoseDetail = (medicine) => {
  const dosage = formatDosage(medicine.dosage, medicine.form);
  const form = String(medicine.form || '').trim();
  let detail = dosage || form;
  if (medicine.notes) {
    detail = detail ? `${detail} · ${medicine.notes}` : medicine.notes;
  }
  return detail;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Medicine `endDate` values are stored as "YYYY-MM-DD" (sometimes with a time
// suffix). Parse just the calendar date at local midnight so day counts do not
// drift because of time zones.
const parseCourseDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date
    ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
    : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Whole days from `from` (start of day) to `date`.
const getDaysUntil = (date, from = new Date()) => {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  // Math.round absorbs the 23h/25h days created by DST changes.
  return Math.round((date - start) / DAY_MS);
};

const formatCourseEndDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const describeDaysLeft = (days) => {
  if (days <= 0) return 'Ends today';
  if (days === 1) return 'Ends tomorrow';
  return `Ends in ${days} days`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { takeDose: takeDoseAction, skipDose: skipDoseAction, activeMedicinesCount, weeklyAdherencePercent, currentStreak, medicines, history } = useMedTrack();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const generateDosesForDate = (date) => {
    const dateStr = getLocalDateString(date);
    const dayName = getDayOfWeek(date);
    const isToday = getLocalDateString(date) === getLocalDateString(new Date());
    const isFuture = date > new Date() && !isToday;
    const dosesList = [];
    
    if (medicines && medicines.length > 0) {
      const seenMedicines = new Set();

      medicines.forEach(med => {
        const medId = getEntityId(med);
        const medIdentity = String(medId || med.name || '').toLowerCase();

        // Never render the same medicine twice, even if the API returns a duplicate.
        if (!medIdentity || seenMedicines.has(medIdentity)) return;
        seenMedicines.add(medIdentity);

        if (med.status && med.status !== 'active') return;
        
        if (med.endDate && med.endDate !== '') {
          const endDate = new Date(med.endDate + 'T00:00:00');
          if (date > endDate) return;
        }
        
        if (med.startDate && med.startDate !== '') {
          const startDate = new Date(med.startDate + 'T00:00:00');
          if (date < startDate) return;
        }
        
        if (med.days && Array.isArray(med.days) && med.days.length > 0) {
          if (!med.days.includes(dayName)) {
            return;
          }
        }
        
        const times = (med.scheduledTimes && Array.isArray(med.scheduledTimes) && med.scheduledTimes.length > 0) 
          ? med.scheduledTimes 
          : [med.firstDoseAt || '8:00 AM'];
        
        const seenTimes = new Set();

        times.forEach(time => {
          // Collapse duplicate scheduled times ("10:00 AM" vs "10:00").
          const minutes = parseTimeToMinutes(time);
          const timeIdentity = minutes > 0 ? `mins:${minutes}` : `raw:${normalizeTimeKey(time)}`;
          if (seenTimes.has(timeIdentity)) return;
          seenTimes.add(timeIdentity);

          // Strict composite identity: medicineId + date + scheduledTime.
          const key = `${medIdentity}-${dateStr}-${timeIdentity}`;
          const matchingLogs = (history || []).filter(h =>
            h.date === dateStr &&
            sameScheduledTime(h.scheduledTime, time) &&
            (
              String(getEntityId(h.medicineId)) === String(medId) ||
              (!h.medicineId && h.medicineName && med.name &&
                h.medicineName.toLowerCase() === med.name.toLowerCase())
            )
          );

          // If old duplicate logs exist, prefer the most recently recorded one.
          const loggedDose = matchingLogs.sort((a, b) =>
            new Date(b.recordedAt || b.updatedAt || 0) - new Date(a.recordedAt || a.updatedAt || 0)
          )[0];

          const status = resolveDoseStatus(loggedDose, dateStr, time);

          dosesList.push({
            key,
            id: getEntityId(loggedDose) || `gen_${medIdentity}_${timeIdentity}_${dateStr}`,
            time: time,
            name: med.name,
            detail: buildDoseDetail(med),
            status: status,
            isLate: loggedDose ? isLateLog(loggedDose) : false,
            medicineId: medId,
            logged: !!loggedDose,
            isFuture
          });
        });
      });
    }
    
    dosesList.sort((a, b) => {
      const timeToMinutes = (t) => {
        if (!t) return 0;
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let hours = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + mins;
      };
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
    
    if (isToday) {
      const firstPending = dosesList.findIndex(d => d.status === 'pending');
      if (firstPending >= 0) {
        dosesList[firstPending].isCurrent = true;
      }
    }
    
    return dosesList;
  };
  
  const doses = generateDosesForDate(selectedDate);

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [pendingDoses, setPendingDoses] = useState(() => new Set());

  const setDosePending = (key, pending) => {
    if (!key) return;
    setPendingDoses((prev) => {
      const next = new Set(prev);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleTakeDose = async (dose) => {
    const isToday = getLocalDateString(selectedDate) === getLocalDateString(new Date());
    if (!isToday || !dose) return;
    const key = dose.key || dose.id;
    if (pendingDoses.has(key)) return;

    setDosePending(key, true);
    try {
      const doseId = typeof dose === 'object' ? dose.id : dose;
      const dateStr = getLocalDateString(selectedDate);
      const result = await takeDoseAction(doseId, {
        medicineId: typeof dose === 'object' ? dose.medicineId : undefined,
        date: dateStr,
        scheduledTime: typeof dose === 'object' ? dose.time : undefined,
        status: 'taken'
      });
      if (!result?.success) {
        alert(result?.message || 'Failed to take dose');
      }
    } catch (err) {
      console.error('Take dose failed:', err);
      alert(err?.message || 'Failed to take dose');
    } finally {
      // Always unlock the row, whether the API call succeeds or fails.
      setDosePending(key, false);
    }
  };

  const handleSkipDose = async (dose) => {
    const isToday = getLocalDateString(selectedDate) === getLocalDateString(new Date());
    if (!isToday || !dose) return;
    const key = dose.key || dose.id;
    if (pendingDoses.has(key)) return;

    setDosePending(key, true);
    try {
      const doseId = typeof dose === 'object' ? dose.id : dose;
      const dateStr = getLocalDateString(selectedDate);
      const result = await skipDoseAction(doseId, {
        medicineId: typeof dose === 'object' ? dose.medicineId : undefined,
        date: dateStr,
        scheduledTime: typeof dose === 'object' ? dose.time : undefined,
        status: 'skipped'
      });
      if (!result?.success) {
        alert(result?.message || 'Failed to skip dose');
      }
    } catch (err) {
      console.error('Skip dose failed:', err);
      alert(err?.message || 'Failed to skip dose');
    } finally {
      setDosePending(key, false);
    }
  };

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
  };

  // Month navigation moves `selectedDate`, so reset the day to the 1st BEFORE
  // changing the month. Without this, a 31st tries to roll into a shorter
  // month ("Nov 31") and JavaScript overflows it into the month after next,
  // making the calendar skip November entirely.
  const handlePrevMonth = () => {
    const prevMonth = new Date(selectedDate);
    prevMonth.setDate(1);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setSelectedDate(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedDate);
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setSelectedDate(nextMonth);
  };

  const totalDoses = doses.length;
  const takenCount = doses.filter(d => d.status === 'taken').length;
  const skippedCount = doses.filter(d => d.status === 'skipped').length;
  const missedCount = doses.filter(d => d.status === 'missed').length;
  const progressPercent = totalDoses > 0 ? (takenCount / totalDoses) * 100 : 0;
  const skippedPercent = totalDoses > 0 ? (skippedCount / totalDoses) * 100 : 0;
  const missedPercent = totalDoses > 0 ? (missedCount / totalDoses) * 100 : 0;

  const nextDose = doses.find(d => d.status === 'pending') || null;

  // doses are in ascending time order, so the last missed one is the most
  // recent dose the user let slip.
  const mostRecentMissed = [...doses].reverse().find(d => d.status === 'missed') || null;

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Juan';
  
  const isTodaySelected = getLocalDateString(selectedDate) === getLocalDateString(new Date());
  const dateDisplay = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const monthDisplay = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // "Courses ending soon": active medicines with a future end date, soonest
  // first. If several finish within the next 7 days, list up to two of them;
  // otherwise show only the single nearest one.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingCourses = (medicines || [])
    .filter((med) => (med.status || 'active') === 'active')
    .map((med) => {
      const endDate = parseCourseDate(med.endDate);
      if (!endDate) return null;
      const daysLeft = getDaysUntil(endDate, today);
      if (daysLeft < 0) return null;
      return {
        id: String(getEntityId(med) || med.name),
        name: med.name,
        endDate,
        daysLeft
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const coursesWithinWeek = upcomingCourses.filter((course) => course.daysLeft <= 7).slice(0, 2);
  const endingCourses = coursesWithinWeek.length > 0 ? coursesWithinWeek : upcomingCourses.slice(0, 1);

  return (
    <div className="flex min-h-dvh flex-col justify-start bg-[#f8fafc] text-slate-800 antialiased">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-28 sm:px-6 md:pb-8 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Good morning, {firstName}</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{dateDisplay}</p>
          </div>
          <div>
            <Link
              to="/medicines/add"
              className="inline-flex min-h-10 items-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-red-200 transition-all duration-150 hover:bg-red-700 md:min-h-0"
            >
              <svg className="w-3.5 h-3.5 mr-1.5 -ml-0.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              Add medicine
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-100 p-6 custom-shadow-card">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 md:pr-4">
                  <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    {isTodaySelected ? "Today's Progress" : `${dateDisplay.split(',')[0]} Progress`}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1 mb-3">
                    {takenCount} of {totalDoses} doses taken
                  </h2>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex" role="img" aria-label={`${takenCount} taken, ${skippedCount} skipped, ${missedCount} missed`}>
                    <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${skippedPercent}%` }}></div>
                    <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${missedPercent}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    <span className="font-semibold text-emerald-700">{takenCount} Taken</span>
                    <span className="text-slate-300"> · </span>
                    <span className="font-semibold text-amber-700">{skippedCount} Skipped</span>
                    <span className="text-slate-300"> · </span>
                    <span className="font-semibold text-red-600">{missedCount} Missed</span>
                  </p>
                </div>
                <div className="hidden md:block w-px bg-slate-100 h-16 self-center"></div>
                <div className="md:col-span-4 md:pl-2">
                  <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Next Dose</span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{nextDose?.name || (totalDoses > 0 ? 'No doses left today' : 'No doses scheduled')}</h3>
                  <p className="text-xs font-semibold text-red-600 mt-0.5">
                    {nextDose ? `${nextDose.time} · ${isTodaySelected ? 'due now' : 'scheduled'}` : 'All doses accounted for'}
                  </p>
                  {mostRecentMissed && (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium leading-snug text-red-600" role="status">
                      <svg className="mt-px h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                      <span>You missed your {mostRecentMissed.time} dose of {mostRecentMissed.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 custom-shadow-card flex items-center justify-between w-full">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block">Weekly Adherence</span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{weeklyAdherencePercent}%</div>
                  <span className="text-[11px] text-slate-400 inline-block mt-0.5">{weeklyAdherencePercent > 0 ? 'Based on last 7 days' : 'No data yet'}</span>
                </div>
                <div className="flex items-end space-x-1 h-9 self-center pl-2">
                  <div className={`w-1.5 rounded-sm ${weeklyAdherencePercent >= 10 ? 'bg-emerald-600' : 'bg-slate-200'}`} style={{ height: weeklyAdherencePercent >= 10 ? '28px' : '8px' }}></div>
                  <div className={`w-1.5 rounded-sm ${weeklyAdherencePercent >= 25 ? 'bg-emerald-600' : 'bg-slate-200'}`} style={{ height: weeklyAdherencePercent >= 25 ? '32px' : '8px' }}></div>
                  <div className={`w-1.5 rounded-sm ${weeklyAdherencePercent >= 40 ? 'bg-emerald-600' : 'bg-slate-200'}`} style={{ height: weeklyAdherencePercent >= 40 ? '36px' : '8px' }}></div>
                  <div className={`w-1.5 rounded-sm ${weeklyAdherencePercent >= 60 ? 'bg-emerald-600' : 'bg-slate-200'}`} style={{ height: weeklyAdherencePercent >= 60 ? '28px' : '8px' }}></div>
                  <div className={`w-1.5 rounded-sm ${weeklyAdherencePercent >= 75 ? 'bg-emerald-600' : 'bg-slate-200'}`} style={{ height: weeklyAdherencePercent >= 75 ? '32px' : '8px' }}></div>
                  <div className={`w-1.5 rounded-sm ${weeklyAdherencePercent >= 90 ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ height: weeklyAdherencePercent >= 90 ? '20px' : '8px' }}></div>
                  <div className={`w-1.5 rounded-sm ${weeklyAdherencePercent >= 100 ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ height: weeklyAdherencePercent >= 100 ? '16px' : '8px' }}></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 custom-shadow-card w-full">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block">Current Streak</span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{currentStreak} days</div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Based on your activity</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 custom-shadow-card w-full sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block">Active Medicines</span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{activeMedicinesCount}</div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{totalDoses} doses scheduled today</p>
              </div>
            </div>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-3.5">
                {isTodaySelected ? "Today's doses" : `${dateDisplay.split(',')[0]}, ${dateDisplay.split(',')[1].trim()} doses`}
              </h2>
              {doses.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-xs text-slate-500 custom-shadow-card">
                  No doses scheduled for this day.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                  {doses.map((dose) => {
                    const isCurrent = isTodaySelected && !!dose.isCurrent;
                    const isSaving = pendingDoses.has(dose.key);
                    return (
                      <div
                        key={dose.key}
                        className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors custom-shadow-card sm:flex-row sm:items-center ${isCurrent ? 'border-red-100 bg-red-50/40' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60'}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`w-12 shrink-0 text-xs font-semibold ${isCurrent ? 'font-bold text-red-600' : 'text-slate-800'}`}>{dose.time}</span>
                          <div className="min-w-0">
                            <h3 className="truncate text-xs font-bold text-slate-900">{dose.name}</h3>
                            <p className="truncate text-[11px] font-normal text-slate-400">{dose.detail}</p>
                          </div>
                        </div>

                        {dose.status === 'taken' && (
                          <div className="shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" fillRule="evenodd"></path></svg>
                              Taken{dose.isLate ? ' (Late)' : ''}
                            </span>
                          </div>
                        )}

                        {dose.status === 'skipped' && (
                          <div className="shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                              <span className="mr-1 text-xs leading-none">—</span>
                              Skipped
                            </span>
                          </div>
                        )}

                        {dose.status === 'missed' && (
                          <div className="shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-100">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"></path>
                              </svg>
                              Missed
                            </span>
                          </div>
                        )}

                        {dose.status === 'pending' && isCurrent && isTodaySelected && (
                          <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                            <button onClick={() => handleSkipDose(dose)} disabled={isSaving} aria-busy={isSaving} className={`min-h-11 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors shadow-2xs sm:min-h-0 sm:flex-none sm:py-1.5 ${isSaving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`} type="button" aria-label="Skip dose">{isSaving ? 'Saving…' : 'Skip'}</button>
                            <button onClick={() => handleTakeDose(dose)} disabled={isSaving} aria-busy={isSaving} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white transition-colors shadow-sm shadow-red-200 sm:min-h-0 sm:flex-none sm:py-1.5 ${isSaving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-700 cursor-pointer'}`} type="button" aria-label="Take dose">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" fillRule="evenodd"></path></svg>
                              {isSaving ? 'Saving…' : 'Take dose'}
                            </button>
                          </div>
                        )}

                        {dose.status === 'pending' && !isCurrent && isTodaySelected && (
                          <div className="flex shrink-0 items-center gap-2">
                            <button onClick={() => handleTakeDose(dose)} disabled={isSaving} aria-busy={isSaving} className={`min-h-10 rounded border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 sm:min-h-0 sm:px-2.5 ${isSaving ? 'opacity-60 cursor-not-allowed' : 'hover:text-red-600 hover:bg-red-50 cursor-pointer'}`} title="Take ahead of time" aria-label="Take dose early">{isSaving ? 'Saving…' : 'Take'}</button>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">Upcoming</span>
                          </div>
                        )}

                        {dose.status === 'pending' && !isTodaySelected && (
                          <div className="shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">Scheduled</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 custom-shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-900">{monthDisplay}</h3>
                <div className="flex items-center space-x-1.5">
                  {!isTodaySelected && (
                    <button onClick={() => setSelectedDate(new Date())} className="min-h-10 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 md:min-h-0" type="button">Today</button>
                  )}
                  {isTodaySelected && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-600">Today</span>}
                  <button onClick={handlePrevMonth} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 md:h-auto md:w-auto md:p-1" title="Previous Month" type="button">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  </button>
                  <button onClick={handleNextMonth} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 md:h-auto md:w-auto md:p-1" title="Next Month" type="button">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  </button>
                </div>
              </div>
              <div className="calendar-grid text-[10px] font-medium text-slate-400 mb-2">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div className="calendar-grid text-xs text-slate-600 gap-y-2">
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const daysInMonth = lastDay.getDate();
                  const startDay = firstDay.getDay();
                  const today = new Date();
                  const days = [];
                  for (let i = 0; i < startDay; i++) { days.push(<span key={`empty-${i}`}></span>); }
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, month, d);
                    const isTodayDate = dateObj.toDateString() === today.toDateString();
                    const isSelected = dateObj.toDateString() === selectedDate.toDateString();
                    days.push(
                      <button key={d} onClick={() => setSelectedDate(dateObj)} className={`flex min-h-10 items-center justify-center rounded-full py-1 transition hover:bg-slate-100 md:min-h-0 ${isSelected ? 'bg-red-600 text-white hover:bg-red-700' : ''}`} type="button">
                        <span className={`${isTodayDate && !isSelected ? 'text-red-600 font-semibold' : ''}`}>{d}</span>
                      </button>
                    );
                  }
                  return days;
                })()}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] space-y-1 font-normal text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
                  <span>Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                  <span>Medicine course ends</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50/40 rounded-2xl border border-red-100/70 p-5 custom-shadow-card">
              <span className="text-[10px] font-bold tracking-wider text-red-600 uppercase">Quote of the day</span>
              <p className="text-xs font-bold text-slate-900 mt-2 leading-relaxed min-h-[36px]">{INSPIRATIONAL_QUOTES[quoteIndex]}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Daily encouragement</span>
                <button onClick={handleNextQuote} className="min-h-10 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-red-600 shadow-2xs transition-colors hover:bg-slate-50 cursor-pointer md:min-h-0" type="button">New quote</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 custom-shadow-card">
              <h3 className="mb-3 text-xs font-bold text-slate-900">Courses ending soon</h3>

              {endingCourses.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">No courses ending soon</div>
              ) : (
                <ul className="space-y-2.5">
                  {endingCourses.map((course) => (
                    <li
                      key={course.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-bold text-slate-900">{course.name}</p>
                        {course.daysLeft <= 3 && (
                          <span
                            className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700"
                            title={describeDaysLeft(course.daysLeft)}
                          >
                            {describeDaysLeft(course.daysLeft)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <svg className="h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <span>Ends: {formatCourseEndDate(course.endDate)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
