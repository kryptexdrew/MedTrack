// In-memory fallback database for instant plug-and-play testing before/without MongoDB Atlas

// Keep the demo data relevant no matter when the project is opened.
const getRelativeDateString = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('en-CA');
};

const TODAY = getRelativeDateString(0);
const YESTERDAY = getRelativeDateString(-1);
const TWO_DAYS_AGO = getRelativeDateString(-2);

const mockUsers = [
  {
    id: 'user_1',
    fullName: 'Juan Dela Cruz',
    email: 'juan@email.com',
    passwordHash: '$2a$12$e6xU4zY3jZ3sQnK8H0zCGuqMsm6MfqT2aXo5aM4Gv5T/mD3fQ6K3W', // password: 'password123'
    role: 'self'
  },
  {
    id: 'user_2',
    fullName: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    passwordHash: '$2a$12$e6xU4zY3jZ3sQnK8H0zCGuqMsm6MfqT2aXo5aM4Gv5T/mD3fQ6K3W',
    role: 'self'
  }
];

const mockMedicines = [
  {
    id: 'med_1',
    userId: 'user_1',
    name: 'Paracetamol',
    dosage: '500mg',
    form: 'Tablet',
    notes: 'Take after meals',
    frequency: 'Once a day',
    repeatEvery: '24 hours',
    firstDoseAt: '8:00 AM',
    scheduledTimes: ['8:00 AM'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startDate: getRelativeDateString(-28),
    endDate: '',
    browserNotification: true,
    emailReminder: false,
    status: 'active'
  },
  {
    id: 'med_2',
    userId: 'user_1',
    name: 'Neozep',
    dosage: '500mg',
    form: 'Tablet',
    notes: 'Take after meals',
    frequency: 'Once a day',
    repeatEvery: '24 hours',
    firstDoseAt: '5:00 AM',
    scheduledTimes: ['5:00 AM'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startDate: getRelativeDateString(-12),
    endDate: '',
    browserNotification: true,
    emailReminder: false,
    status: 'active'
  },
  {
    id: 'med_3',
    userId: 'user_1',
    name: 'Cough Syrup',
    dosage: '10ml',
    form: 'Syrup',
    notes: 'Before sleeping',
    frequency: 'Once a day',
    repeatEvery: '24 hours',
    firstDoseAt: '8:00 PM',
    scheduledTimes: ['8:00 PM'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startDate: getRelativeDateString(-14),
    endDate: getRelativeDateString(5),
    browserNotification: true,
    emailReminder: false,
    status: 'active'
  },
  {
    id: 'med_4',
    userId: 'user_1',
    name: 'Vitamin C',
    dosage: '500mg',
    form: 'Tablet',
    notes: 'With breakfast',
    frequency: 'Specific days',
    repeatEvery: '',
    firstDoseAt: '10:00 AM',
    scheduledTimes: ['10:00 AM'],
    days: ['Sat', 'Sun'],
    startDate: getRelativeDateString(-26),
    endDate: '',
    browserNotification: false,
    emailReminder: false,
    status: 'active'
  },
  {
    id: 'med_5',
    userId: 'user_1',
    name: 'Alaxan FR',
    dosage: '500mg',
    form: 'Capsule',
    notes: 'Take with water',
    frequency: 'Once a day',
    repeatEvery: '24 hours',
    firstDoseAt: '1:00 PM',
    scheduledTimes: ['1:00 PM'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startDate: getRelativeDateString(-10),
    endDate: getRelativeDateString(2),
    browserNotification: true,
    emailReminder: false,
    status: 'active'
  },
  {
    id: 'med_6',
    userId: 'user_1',
    name: 'Lola Remedios',
    dosage: '500mg',
    form: 'Tablet',
    notes: 'Take once daily',
    frequency: 'Once a day',
    repeatEvery: '24 hours',
    firstDoseAt: '9:00 PM',
    scheduledTimes: ['9:00 PM'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startDate: getRelativeDateString(-5),
    endDate: getRelativeDateString(9),
    browserNotification: true,
    emailReminder: false,
    status: 'active'
  }
];

const mockDoseLogs = [
  // Today's doses
  {
    id: 'dose_1',
    userId: 'user_1',
    medicineId: 'med_2',
    medicineName: 'Neozep 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '5:00 AM',
    date: TODAY,
    status: 'taken',
    notes: 'Take after meals'
  },
  {
    id: 'dose_2',
    userId: 'user_1',
    medicineId: 'med_1',
    medicineName: 'Paracetamol 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '8:00 AM',
    date: TODAY,
    status: 'taken',
    notes: 'Take after meals'
  },
  {
    id: 'dose_3',
    userId: 'user_1',
    medicineId: 'med_4',
    medicineName: 'Vitamin C 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '10:00 AM',
    date: TODAY,
    status: 'skipped',
    notes: ''
  },
  {
    id: 'dose_4',
    userId: 'user_1',
    medicineId: 'med_5',
    medicineName: 'Alaxan FR 500mg',
    dosage: '500mg',
    form: 'Capsule',
    scheduledTime: '1:00 PM',
    date: TODAY,
    status: 'pending',
    notes: 'Take with water'
  },
  {
    id: 'dose_5',
    userId: 'user_1',
    medicineId: 'med_3',
    medicineName: 'Cough Syrup 10ml',
    dosage: '10ml',
    form: 'Syrup',
    scheduledTime: '8:00 PM',
    date: TODAY,
    status: 'pending',
    notes: ''
  },
  {
    id: 'dose_6',
    userId: 'user_1',
    medicineId: 'med_6',
    medicineName: 'Lola Remedios 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '9:00 PM',
    date: TODAY,
    status: 'pending',
    notes: 'Take once daily'
  },

  // Yesterday
  {
    id: 'dose_7',
    userId: 'user_1',
    medicineId: 'med_6',
    medicineName: 'Lola Remedios 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '9:00 PM',
    date: YESTERDAY,
    status: 'taken'
  },
  {
    id: 'dose_8',
    userId: 'user_1',
    medicineId: 'med_3',
    medicineName: 'Cough Syrup 10ml',
    dosage: '10ml',
    form: 'Syrup',
    scheduledTime: '8:00 PM',
    date: YESTERDAY,
    status: 'taken'
  },
  {
    id: 'dose_9',
    userId: 'user_1',
    medicineId: 'med_5',
    medicineName: 'Alaxan FR 500mg',
    dosage: '500mg',
    form: 'Capsule',
    scheduledTime: '1:00 PM',
    date: YESTERDAY,
    status: 'taken'
  },
  {
    id: 'dose_10',
    userId: 'user_1',
    medicineId: 'med_1',
    medicineName: 'Paracetamol 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '8:00 AM',
    date: YESTERDAY,
    status: 'taken'
  },
  {
    id: 'dose_11',
    userId: 'user_1',
    medicineId: 'med_2',
    medicineName: 'Neozep 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '5:00 AM',
    date: YESTERDAY,
    status: 'missed'
  },

  // Two days ago
  {
    id: 'dose_12',
    userId: 'user_1',
    medicineId: 'med_6',
    medicineName: 'Lola Remedios 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '9:00 PM',
    date: TWO_DAYS_AGO,
    status: 'taken'
  },
  {
    id: 'dose_13',
    userId: 'user_1',
    medicineId: 'med_5',
    medicineName: 'Alaxan FR 500mg',
    dosage: '500mg',
    form: 'Capsule',
    scheduledTime: '1:00 PM',
    date: TWO_DAYS_AGO,
    status: 'missed'
  },
  {
    id: 'dose_14',
    userId: 'user_1',
    medicineId: 'med_1',
    medicineName: 'Paracetamol 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '8:00 AM',
    date: TWO_DAYS_AGO,
    status: 'taken'
  },
  {
    id: 'dose_15',
    userId: 'user_1',
    medicineId: 'med_2',
    medicineName: 'Neozep 500mg',
    dosage: '500mg',
    form: 'Tablet',
    scheduledTime: '5:00 AM',
    date: TWO_DAYS_AGO,
    status: 'taken'
  }
];

module.exports = {
  mockUsers,
  mockMedicines,
  mockDoseLogs
};
