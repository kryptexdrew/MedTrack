// Basic Jest unit test for streak calculation logic
const calculateStreak = (history) => {
  const getLocalDateString = (date = new Date()) => {
    return date.toLocaleDateString('en-CA');
  };
  
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = getLocalDateString(d);
    const dayLogs = history.filter(h => h.date === dayStr);
    if (dayLogs.length === 0) break;
    const totalDoses = dayLogs.length;
    const takenCount = dayLogs.filter(h => h.status === 'taken').length;
    const adherence = (takenCount / totalDoses) * 100;
    // Valid if 100% adherence OR >= 80% adherence
    if (adherence >= 80) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

describe('Streak Calculation', () => {
  const getLocalDateString = (date = new Date()) => {
    return date.toLocaleDateString('en-CA');
  };

  test('Perfect streak - all doses taken', () => {
    const today = new Date();
    const history = [];
    // 3 consecutive days all taken
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      history.push({ date: getLocalDateString(d), status: 'taken' });
      history.push({ date: getLocalDateString(d), status: 'taken' });
    }
    expect(calculateStreak(history)).toBe(3);
  });

  test('Broken streak - below 80% adherence', () => {
    const today = new Date();
    const history = [];
    // Yesterday: 1 taken out of 2 = 50% (should break streak)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    history.push({ date: getLocalDateString(yesterday), status: 'taken' });
    history.push({ date: getLocalDateString(yesterday), status: 'missed' });
    expect(calculateStreak(history)).toBe(0);
  });

  test('80% streak - exactly 80% adherence is valid', () => {
    const today = new Date();
    const history = [];
    // Today: 4 taken out of 5 = 80% (valid)
    const todayStr = getLocalDateString(today);
    for (let i = 0; i < 4; i++) {
      history.push({ date: todayStr, status: 'taken' });
    }
    history.push({ date: todayStr, status: 'missed' });
    expect(calculateStreak(history)).toBe(1);
  });

  test('100% streak with skipped doses still counts as 100% taken?', () => {
    const today = new Date();
    const history = [];
    // Skipped doesn't count as taken - only taken counts toward adherence
    const todayStr = getLocalDateString(today);
    history.push({ date: todayStr, status: 'taken' });
    history.push({ date: todayStr, status: 'skipped' });
    // 1 taken out of 2 = 50%, should break
    expect(calculateStreak(history)).toBe(0);
  });
});
