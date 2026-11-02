const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// GET /api/reports/weekly
router.get('/weekly', authMiddleware, async (req, res) => {
  try {
    return res.json({
      success: true,
      period: 'Oct 11 – Oct 17, 2026',
      stats: {
        adherence: 86,
        taken: 18,
        missed: 2,
        skipped: 1
      },
      dailyAdherence: [
        { day: 'Sun', percent: 100, color: 'green' },
        { day: 'Mon', percent: 100, color: 'green' },
        { day: 'Tue', percent: 100, color: 'green' },
        { day: 'Wed', percent: 67, color: 'amber' },
        { day: 'Thu', percent: 100, color: 'green' },
        { day: 'Fri', percent: 67, color: 'amber' },
        { day: 'Sat', percent: 33, color: 'red' }
      ],
      byMedicine: [
        { name: 'Paracetamol 500mg', percent: 100 },
        { name: 'Neozep 500mg', percent: 78 },
        { name: 'Alaxan FR 500mg', percent: 82 },
        { name: 'Lola Remedios 500mg', percent: 75 },
        { name: 'Cough Syrup 10ml', percent: 67 },
        { name: 'Vitamin C 500mg', percent: 75 }
      ]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate weekly report' });
  }
});

// GET /api/reports/monthly
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    return res.json({
      success: true,
      period: 'October 2026',
      stats: {
        adherence: 85,
        taken: 74,
        missed: 9,
        skipped: 4
      },
      weeklyAdherence: [
        { week: 'Week 1', percent: 90 },
        { week: 'Week 2', percent: 88 },
        { week: 'Week 3', percent: 80 },
        { week: 'Week 4', percent: 82 }
      ],
      byMedicine: [
        { name: 'Paracetamol 500mg', percent: 96 },
        { name: 'Neozep 500mg', percent: 81 },
        { name: 'Alaxan FR 500mg', percent: 84 },
        { name: 'Lola Remedios 500mg', percent: 78 },
        { name: 'Cough Syrup 10ml', percent: 70 },
        { name: 'Vitamin C 500mg', percent: 78 }
      ]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate monthly report' });
  }
});

module.exports = router;

