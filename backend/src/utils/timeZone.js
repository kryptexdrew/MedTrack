/**
 * Timezone helpers.
 *
 * The database stores `scheduledAt` as a real UTC instant. All user-facing
 * values (`date` = YYYY-MM-DD, `scheduledTime` = "2:00 PM") stay as the user's
 * own wall-clock values, so the UI can render them without any conversion.
 *
 * There is no timezone library in this project, so the UTC <-> zoned wall time
 * conversion is done with Intl.DateTimeFormat, which is DST-aware.
 */

const GRACE_MINUTES = 60;
const GRACE_MS = GRACE_MINUTES * 60 * 1000;
// A click is considered "late" once it is more than a few minutes after the
// scheduled minute (avoids flagging a normal on-time click due to seconds).
const LATE_THRESHOLD_MS = 5 * 60 * 1000;

const isValidTimeZone = (timeZone) => {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse "2:00 PM", "2 PM", "14:00", "09:30" into minutes after midnight.
 */
const parseScheduledTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const value = String(timeStr).trim();

  const twelveHour = value.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP])\.?\s*M\.?$/i);
  if (twelveHour) {
    let hours = parseInt(twelveHour[1], 10);
    const minutes = parseInt(twelveHour[2] || '0', 10);
    const period = twelveHour[3].toUpperCase();
    if (period === 'P' && hours !== 12) hours += 12;
    if (period === 'A' && hours === 12) hours = 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
    return 0;
  }

  const twentyFourHour = value.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const hours = parseInt(twentyFourHour[1], 10);
    const minutes = parseInt(twentyFourHour[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  return 0;
};

/**
 * Offset (ms) of `timeZone` at the given UTC instant. Positive east of UTC.
 */
const getTimeZoneOffsetMs = (utcDate, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(utcDate)
    .reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  // Some ICU builds report midnight as hour "24".
  const hour = parts.hour === '24' ? '00' : parts.hour;

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - utcDate.getTime();
};

const parseDateParts = (dateStr = '') => {
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
};

/**
 * Convert a wall-clock date/time in a timezone into a UTC Date.
 *
 * zonedTimeToUtc('2026-10-30', '2:00 PM', 'Asia/Manila')
 *   -> 2026-10-30T06:00:00.000Z
 *
 * When the timezone is unknown/invalid the server's local timezone is used,
 * which matches the behaviour of the original naive date/time fields.
 */
const zonedTimeToUtc = (dateStr, timeStr, timeZone) => {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;

  const minutes = parseScheduledTimeToMinutes(timeStr);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (!isValidTimeZone(timeZone)) {
    // Server-local fallback for legacy data / early requests.
    return new Date(parts.year, parts.month - 1, parts.day, hours, mins, 0, 0);
  }

  const wallClockUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hours, mins, 0, 0);

  // First guess assumes UTC, then correct by the zone offset at that instant.
  let offset = getTimeZoneOffsetMs(new Date(wallClockUtc), timeZone);
  let instant = wallClockUtc - offset;

  // Re-check: DST transitions can change the offset between the guess and the
  // resolved instant, so refine once.
  const refinedOffset = getTimeZoneOffsetMs(new Date(instant), timeZone);
  if (refinedOffset !== offset) {
    offset = refinedOffset;
    instant = wallClockUtc - offset;
  }

  return new Date(instant);
};

/**
 * Current wall-clock date (YYYY-MM-DD) in the given timezone.
 */
const getZonedDateString = (timeZone, now = new Date()) => {
  if (!isValidTimeZone(timeZone)) return now.toLocaleDateString('en-CA');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
};

const getZonedDayOfWeek = (timeZone, now = new Date()) => {
  if (!isValidTimeZone(timeZone)) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  }
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
};

/**
 * Shared predicate used by the sweep and by the take/skip endpoints.
 */
const isPastGrace = (scheduledAt, now = new Date()) => {
  if (!scheduledAt) return false;
  return new Date(scheduledAt).getTime() + GRACE_MS <= now.getTime();
};

const isLateEntry = (scheduledAt, recordedAt = new Date()) => {
  if (!scheduledAt) return false;
  return new Date(recordedAt).getTime() > new Date(scheduledAt).getTime() + LATE_THRESHOLD_MS;
};

module.exports = {
  GRACE_MINUTES,
  GRACE_MS,
  LATE_THRESHOLD_MS,
  isValidTimeZone,
  parseScheduledTimeToMinutes,
  getTimeZoneOffsetMs,
  zonedTimeToUtc,
  getZonedDateString,
  getZonedDayOfWeek,
  isPastGrace,
  isLateEntry,
};
