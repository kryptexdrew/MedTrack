export const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

export const getLocalDateTime = (date = new Date()) => {
  return date;
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getDayOfWeek = (date = new Date()) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};
