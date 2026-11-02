const getLocalDateString = (date = new Date()) => {
  // Use local time in YYYY-MM-DD format (en-CA)
  return date.toLocaleDateString('en-CA');
};

const getLocalDateTime = (date = new Date()) => {
  return date;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDayOfWeek = (date = new Date()) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

module.exports = {
  getLocalDateString,
  getLocalDateTime,
  addDays,
  getDayOfWeek
};
