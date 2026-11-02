import { parseTimeToMinutes } from './medicineSchedule';

/** Must match backend/src/utils/timeZone.js GRACE_MINUTES. */
export const GRACE_MINUTES = 60;
export const GRACE_MS = GRACE_MINUTES * 60 * 1000;
export const LATE_THRESHOLD_MS = 5 * 60 * 1000;

/** The backend may still return the legacy "upcoming" value. */
export const normalizeDoseStatus = (status) => {
  const value = String(status || '').toLowerCase();
  return value === 'upcoming' || !value ? 'pending' : value;
};

/**
 * The dose's scheduled instant in the browser's own timezone.
 * `scheduledTime` is stored as the user's wall-clock string, so no offset
 * conversion is needed here.
 */
export const getScheduledAt = (dateStr, timeStr) => {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const minutes = parseTimeToMinutes(timeStr);
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0
  );
};

export const isPastGrace = (dateStr, timeStr, now = new Date()) => {
  const scheduledAt = getScheduledAt(dateStr, timeStr);
  if (!scheduledAt) return false;
  return scheduledAt.getTime() + GRACE_MS <= now.getTime();
};

/** True when a taken log was recorded after its scheduled minute. */
export const isLateLog = (log) => {
  if (!log) return false;
  if (typeof log.isLate === 'boolean') return log.isLate;
  if (normalizeDoseStatus(log.status) !== 'taken' || !log.recordedAt) return false;
  const scheduledAt = log.scheduledAt
    ? new Date(log.scheduledAt)
    : getScheduledAt(log.date, log.scheduledTime);
  if (!scheduledAt) return false;
  return new Date(log.recordedAt).getTime() > scheduledAt.getTime() + LATE_THRESHOLD_MS;
};

/**
 * Resolve the status to render for a scheduled dose.
 * A log always wins; otherwise an overdue dose is "missed", not "upcoming".
 */
export const resolveDoseStatus = (log, dateStr, timeStr, now = new Date()) => {
  if (log) return normalizeDoseStatus(log.status);
  return isPastGrace(dateStr, timeStr, now) ? 'missed' : 'pending';
};
