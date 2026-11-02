const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const medicineService = require('../services/medicineService');
const doseService = require('../services/doseService');
const { generateDosesForMedicine, syncDosesForMedicine } = require('../jobs/doseGenerator');

// GET /api/medicines
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, type } = req.query;
    const medicines = await medicineService.getMedicines(req.userId, { status, form: type });
    return res.json({ success: true, medicines });
  } catch (err) {
    console.error('Fetch medicines error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch medicines' });
  }
});

// GET /api/medicines/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await medicineService.getMedicineById(id, req.userId);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    return res.json({ success: true, medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching medicine details' });
  }
});

// POST /api/medicines
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      dosage,
      form,
      notes,
      frequency,
      repeatEvery,
      firstDoseAt,
      scheduledTimes,
      days,
      startDate,
      endDate,
      browserNotification,
      emailReminder
    } = req.body;

    if (!name || !dosage) {
      return res.status(400).json({ success: false, message: 'Medicine name and dosage are required' });
    }

    const times = scheduledTimes && scheduledTimes.length > 0 
      ? scheduledTimes 
      : [firstDoseAt || '8:00 AM'];

    const chosenDays = days && days.length > 0 
      ? days 
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const medicineData = {
      name,
      dosage,
      form: form || 'Tablet',
      notes: notes || '',
      frequency: frequency || 'Once a day',
      repeatEvery: repeatEvery || '24 hours',
      firstDoseAt: firstDoseAt || '8:00 AM',
      scheduledTimes: times,
      days: chosenDays,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '',
      browserNotification: browserNotification !== false,
      emailReminder: !!emailReminder,
      status: 'active'
    };
    const newMed = await medicineService.createMedicine(req.userId, medicineData);

    // Materialize today's dose rows immediately. Without this, a medicine
    // added after midnight has no row for a later dose today, so the reminder
    // cron would have nothing to fire on if the user closes the app.
    try {
      await generateDosesForMedicine(newMed);
    } catch (err) {
      console.warn('Dose generation after create failed:', err.message);
    }

    return res.status(201).json({ success: true, medicine: newMed });
  } catch (err) {
    console.error('Create medicine error:', err);
    res.status(500).json({ success: false, message: 'Failed to create medicine' });
  }
});

// PUT /api/medicines/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.userId;
    delete updates._id;
    if ('emailReminder' in updates) updates.emailReminder = !!updates.emailReminder;
    if ('browserNotification' in updates) updates.browserNotification = updates.browserNotification !== false;

    const medicine = await medicineService.updateMedicine(id, req.userId, updates);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

    // Keep today's pending doses in step with the edited schedule. Never
    // touches taken/missed history or a dose whose reminder already went out.
    try {
      await syncDosesForMedicine(medicine);
    } catch (err) {
      console.warn('Dose sync after update failed:', err.message);
    }

    return res.json({ success: true, medicine });
  } catch (err) {
    console.error('Update medicine error:', err);
    res.status(500).json({ success: false, message: 'Error updating medicine' });
  }
});

// DELETE /api/medicines/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await medicineService.deleteMedicine(id, req.userId);
    await doseService.deleteDosesByMedicine(id);
    return res.json({ success: true, message: 'Medicine removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting medicine' });
  }
});

module.exports = router;

