// Utilities for the "Next dose" label on the Medicines cards.
//
// A medicine stores its daily times in `scheduledTimes` (e.g.
// ["10:00 AM", "8:00 PM"]). This module turns that list into the next real
// occurrence, taking the medicine's active weekdays and start/end dates into
// account.

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_MINUTES = 60;
// Safety bound so a bad date can never make the caller loop forever.
const MAX_LOOKAHEAD_DAYS = 400;

const pad2 = (value) => String(value).padStart(2, '0');

const toDateKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * "8:00 AM", "08:00", "20:00" -> minutes since midnight.
 * Returns null for anything unparseable so a bad value can't be mistaken for
 * midnight (which is what Number() fallbacks usually do).
 */
export const parseClockMinutes = (value) => {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  const minutes = Number(match[2]);
  if (minutes > 59) return null;

  let hours = Number(match[1]);
  const period = match[3] ? match[3].toUpperCase() : null;

  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
};

const normalizeScheduledTimes = (times) => {
  const raw = Array.isArray(times)
    ? times
    : typeof times === 'string'
      ? times.split(',')
      : [];

  const minutes = raw
    .map(parseClockMinutes)
    .filter((value) => value !== null);

  // Dedupe and sort so "first upcoming" is simply the first match.
  return [...new Set(minutes)].sort((a, b) => a - b);
};

const normalizeDays = (days) => {
  if (!Array.isArray(days) || days.length === 0) {
    return new Set(DAY_NAMES.map((day) => day.toLowerCase()));
  }
  return new Set(
    days
      .map((day) => String(day).trim().slice(0, 3).toLowerCase())
      .filter(Boolean)
  );
};

const normalizeDateKey = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

const parseDateKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const emptyResult = (state) => ({
  label: state === 'ended' ? 'Course ended' : 'No doses scheduled',
  date: null,
  minutesUntil: null,
  dayOffset: null,
  isTomorrow: false,
  isDueSoon: false,
  state,
});

/**
 * "Today, 4:00 PM" / "Tomorrow, 8:00 AM" / "Mon, 8:00 AM".
 */
export const formatNextDoseLabel = (target, now = new Date()) => {
  const dayOffset = Math.round(
    (startOfDay(target) - startOfDay(now)) / DAY_MS
  );
  const time = target.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (dayOffset <= 0) return `Today, ${time}`;
  if (dayOffset === 1) return `Tomorrow, ${time}`;
  return `${target.toLocaleDateString('en-US', { weekday: 'short' })}, ${time}`;
};

/**
 * Full details for the next dose.
 *
 * @param {string[]|string} scheduledTimes daily times ("10:00 AM, 8:00 PM")
 * @param {{ now?: Date, days?: string[], startDate?: string, endDate?: string }} [options]
 * @returns {{
 *   label: string,
 *   date: Date|null,
 *   minutesUntil: number|null,
 *   dayOffset: number|null,
 *   isTomorrow: boolean,
 *   isDueSoon: boolean,
 *   state: 'scheduled'|'ended'|'none'
 * }}
 */
export const getNextDoseInfo = (scheduledTimes, options = {}) => {
  const { now = new Date(), days, startDate, endDate } = options;

  const times = normalizeScheduledTimes(scheduledTimes);
  if (times.length === 0) return emptyResult('none');

  const today = startOfDay(now);
  const allowedDays = normalizeDays(days);
  const startKey = normalizeDateKey(startDate);
  const endKey = normalizeDateKey(endDate);

  // Already past the course end date.
  if (endKey && toDateKey(today) > endKey) return emptyResult('ended');

  // A future start date can be skipped in one jump instead of day by day.
  let dayOffset = 0;
  if (startKey) {
    const start = parseDateKey(startKey);
    if (start > today) {
      dayOffset = Math.max(0, Math.round((start - today) / DAY_MS));
    }
  }

  for (let step = 0; step < MAX_LOOKAHEAD_DAYS; step += 1, dayOffset += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + dayOffset);
    const dayKey = toDateKey(day);

    if (endKey && dayKey > endKey) break;
    if (startKey && dayKey < startKey) continue;
    if (!allowedDays.has(DAY_NAMES[day.getDay()].toLowerCase())) continue;

    for (const minutes of times) {
      const candidate = new Date(day);
      candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

      // Strictly after "now": a dose at exactly this minute is already due,
      // so the label moves on to the following one.
      if (candidate <= now) continue;

      const minutesUntil = Math.max(
        0,
        Math.round((candidate - now) / 60000)
      );

      return {
        label: formatNextDoseLabel(candidate, now),
        date: candidate,
        minutesUntil,
        dayOffset,
        isTomorrow: dayOffset === 1,
        isDueSoon: dayOffset === 0 && minutesUntil <= DUE_SOON_MINUTES,
        state: 'scheduled',
      };
    }
  }

  // No candidate was found before the course end date (or the search bound).
  return emptyResult(endKey ? 'ended' : 'none');
};

/**
 * Spec helper: the formatted next-dose label, e.g. "Today, 4:00 PM".
 *
 * @param {string[]|string} scheduledTimes
 * @param {Date} [now]
 * @returns {string}
 */
export const getNextDose = (scheduledTimes, now = new Date()) =>
  getNextDoseInfo(scheduledTimes, { now }).label;

/**
 * Resolve a medicine record (API shape) to its next dose, honouring its
 * weekdays and course dates.
 */
export const getNextDoseForMedicine = (medicine = {}, now = new Date()) => {
  const scheduledTimes = Array.isArray(medicine.scheduledTimes) && medicine.scheduledTimes.length > 0
    ? medicine.scheduledTimes
    : [medicine.firstDoseAt || ''];

  return getNextDoseInfo(scheduledTimes, {
    now,
    days: medicine.days,
    startDate: medicine.startDate,
    endDate: medicine.endDate,
  });
};
