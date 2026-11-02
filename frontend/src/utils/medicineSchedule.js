// Utility functions for medicine scheduling

export const formatDateForInput = (dateStr) => {
  try {
    if (!dateStr) return '';
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseTimeToMinutes = (timeStr) => {
  try {
    if (!timeStr) return 0;
    // Handle formats like "5:00 AM", "17:00", "05:00"
    const time12Match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (time12Match) {
      let hours = parseInt(time12Match[1], 10);
      const minutes = parseInt(time12Match[2], 10);
      const period = time12Match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    // Handle 24h format
    const time24Match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (time24Match) {
      const hours = parseInt(time24Match[1], 10);
      const minutes = parseInt(time24Match[2], 10);
      return hours * 60 + minutes;
    }
  } catch {}
  return 0;
};

export const minutesToTimeString = (totalMinutes) => {
  const minutesInDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(minutesInDay / 60);
  const mins = minutesInDay % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

export const convert24hTo12h = (time24) => {
  if (!time24) return time24;
  if (/^\d{1,2}:\d{2}\s*(AM|PM)/i.test(time24)) return time24;
  if (/^\d{2}:\d{2}$/.test(time24)) {
    const [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    return `${hours}:${m} ${period}`;
  }
  return time24;
};

export const convert12hTo24h = (time12) => {
  if (!time12) return time12;
  if (/^\d{2}:\d{2}$/.test(time12)) return time12;
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return time12;
};

export const calculateDoses = (frequency, repeatEvery, firstDoseAt, customTimes = []) => {
  if (frequency === 'Once a day') {
    return [{ time: convert12hTo24h(firstDoseAt) || firstDoseAt, displayTime: convert24hTo12h(firstDoseAt) || firstDoseAt, dayOffset: 0 }];
  }
  if (frequency === 'Every few hours') {
    const intervalHours = parseInt(String(repeatEvery).replace(/[^0-9]/g, ''), 10) || 8;
    const startTime = convert12hTo24h(firstDoseAt) || firstDoseAt;
    const startMinutes = parseTimeToMinutes(startTime);
    const doses = [];
    for (let h = 0; h < 24; h += intervalHours) {
      const doseMinutes = startMinutes + h * 60;
      const dayOffset = Math.floor(doseMinutes / (24 * 60));
      const time24 = minutesToTimeStringIn24h(doseMinutes);
      doses.push({
        time: time24,
        displayTime: convert24hTo12h(time24),
        dayOffset
      });
    }
    return doses;
  }
  if (frequency === 'Multiple times per day' || frequency === 'Several times a day') {
    if (customTimes && customTimes.length > 0) {
      return customTimes.map((t) => {
        const time24 = convert12hTo24h(t) || t;
        return {
          time: time24,
          displayTime: convert24hTo12h(time24),
          dayOffset: 0
        };
      });
    }
    // Fallback
    const startTime = convert12hTo24h(firstDoseAt) || firstDoseAt;
    return [
      { time: startTime, displayTime: convert24hTo12h(startTime), dayOffset: 0 },
      { time: minutesToTimeStringIn24h(parseTimeToMinutes(startTime) + 8 * 60), displayTime: convert24hTo12h(minutesToTimeStringIn24h(parseTimeToMinutes(startTime) + 8 * 60)), dayOffset: 0 },
      { time: minutesToTimeStringIn24h(parseTimeToMinutes(startTime) + 16 * 60), displayTime: convert24hTo12h(minutesToTimeStringIn24h(parseTimeToMinutes(startTime) + 16 * 60)), dayOffset: 0 }
    ];
  }
  if (frequency === 'Specific days') {
    const startTime = convert12hTo24h(firstDoseAt) || firstDoseAt;
    return [{ time: startTime, displayTime: convert24hTo12h(startTime), dayOffset: 0 }];
  }
  return [{ time: convert12hTo24h(firstDoseAt) || firstDoseAt, displayTime: convert24hTo12h(firstDoseAt) || firstDoseAt, dayOffset: 0 }];
};

const minutesToTimeStringIn24h = (totalMinutes) => {
  const minutesInDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(minutesInDay / 60);
  const mins = minutesInDay % 60;
  return `${String(hours24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const calculateTotalDoses = (frequency, repeatEvery, selectedDays, startDate, endDate, customTimes = []) => {
  if (!startDate) return { count: 0, isOngoing: false };
  const start = new Date(startDate + 'T00:00:00');
  if (isNaN(start.getTime())) return { count: 0, isOngoing: false };
  
  if (!endDate) {
    return { count: 0, isOngoing: true }; // Ongoing
  }
  
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(end.getTime()) || end < start) return { count: 0, isOngoing: false };
  
  const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  let dosesPerDay = 1;
  if (frequency === 'Every few hours') {
    const intervalHours = parseInt(String(repeatEvery).replace(/[^0-9]/g, ''), 10) || 8;
    dosesPerDay = Math.floor(24 / intervalHours);
  } else if (frequency === 'Multiple times per day' || frequency === 'Several times a day') {
    dosesPerDay = customTimes && customTimes.length > 0 ? customTimes.length : 3;
  } else if (frequency === 'Once a day') {
    dosesPerDay = 1;
  } else if (frequency === 'Specific days') {
    dosesPerDay = 1;
  }
  
  if (frequency === 'Specific days') {
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    let count = 0;
    for (let i = 0; i < daysDiff; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDate.getDay()];
      if (selectedDays && selectedDays.includes(dayName)) {
        count += dosesPerDay;
      }
    }
    return { count, isOngoing: false };
  }
  
  // For other frequencies
  const daysCount = selectedDays && selectedDays.length > 0 ? selectedDays.length : 7;
  const totalDoses = Math.max(0, Math.round((daysDiff * dosesPerDay * daysCount) / 7));
  return { count: totalDoses, isOngoing: false };
};

export const getDosageParts = (dosageStr) => {
  if (!dosageStr) return { amount: '', unit: 'mg' };
  const match = dosageStr.match(/^([0-9.]+)\s*(.*)$/);
  if (match) {
    const amount = match[1];
    let unit = match[2].trim() || 'mg';
    // Normalize common units
    const unitLower = unit.toLowerCase();
    if (unitLower === 'milligram' || unitLower === 'milligrams') unit = 'mg';
    else if (unitLower === 'milliliter' || unitLower === 'milliliters') unit = 'ml';
    else if (unitLower === 'microgram' || unitLower === 'micrograms' || unitLower === 'mcg') unit = 'mcg';
    else if (unitLower === 'tablet' || unitLower === 'tablets') unit = 'tablets';
    else if (unitLower === 'unit' || unitLower === 'units') unit = 'units';
    else if (unitLower === 'puff' || unitLower === 'puffs') unit = 'puffs';
    else if (unitLower === 'drop' || unitLower === 'drops') unit = 'drops';
    else if (!unit) unit = 'mg';
    return { amount, unit };
  }
  return { amount: dosageStr, unit: 'mg' };
};

// Units that are written as words and pluralized ("1 tablet", "2 tablets").
const COUNTABLE_UNITS = new Set(['tablet', 'capsule', 'unit', 'puff', 'drop', 'pill']);

const formatCountableUnit = (amount, unit) => {
  const base = String(unit).toLowerCase().replace(/s$/, '');
  return `${amount} ${Number(amount) === 1 ? base : `${base}s`}`;
};

/**
 * Normalize a stored dosage for display.
 * "1tablets" -> "1 tablet", "2 capsule" -> "2 capsules", "500mg" -> "500mg".
 */
export const formatDosage = (dosageStr, form = '') => {
  const raw = String(dosageStr || '').trim();
  if (!raw) return '';

  // Bare number + a known form: treat the form as the unit.
  if (/^\d+(?:\.\d+)?$/.test(raw) && form) {
    const base = String(form).toLowerCase().replace(/s$/, '');
    if (COUNTABLE_UNITS.has(base)) return formatCountableUnit(raw, base);
    return raw;
  }

  const match = raw.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)$/);
  if (!match) return raw;

  const [, amount, rawUnit] = match;
  const base = rawUnit.toLowerCase().replace(/s$/, '');
  if (COUNTABLE_UNITS.has(base)) return formatCountableUnit(amount, base);

  // Units like mg/ml/mcg stay attached to the number.
  return `${amount}${rawUnit}`;
};

export const combineDosage = (amount, unit) => {
  const value = String(amount ?? '').trim();
  if (!value) return '';
  if (!unit) return value;

  const base = String(unit).toLowerCase().replace(/s$/, '');
  if (COUNTABLE_UNITS.has(base)) return formatCountableUnit(value, base);

  return `${value}${unit}`;
};

