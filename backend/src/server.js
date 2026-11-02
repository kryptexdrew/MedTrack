const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const doseRoutes = require('./routes/doses');
const reportRoutes = require('./routes/reports');
const { startDoseGenerator } = require('./jobs/doseGenerator');
const { startReminderCron } = require('./jobs/reminderCron');

const app = express();

// Middleware
// Pin CORS to the configured frontend origin(s); wildcard + credentials is unsafe.
const allowedOrigins = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server/curl requests with no Origin header.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

// Enable only when deployed behind a trusted reverse proxy.
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/doses', doseRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'in-memory fallback';
  res.json({ 
    status: 'ok', 
    database: mongoStatus,
    timestamp: new Date().toISOString() 
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
  console.warn('⚠️ Brevo is not fully configured. Password-reset and dose-reminder emails will not be sent until BREVO_API_KEY and BREVO_SENDER_EMAIL are set.');
}

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 MedTrack API Server running on port ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}/api/health`);
    console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'In-Memory Testing Mode'}`);
    console.log(`========================================`);
    // Start dose generator cron job
    startDoseGenerator();
    // Start the every-minute dose reminder cron job
    startReminderCron();
  });
};

if (MONGO_URI && !MONGO_URI.includes('<username>')) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB Atlas');
      startServer();
    })
    .catch((err) => {
      console.warn('⚠️ MongoDB connection failed (' + err.message + ').');
      console.warn('Starting MedTrack in in-memory testing mode so you can test immediately.');
      startServer();
    });
} else {
  console.log('ℹ️ No active MONGO_URI provided in .env (or contains placeholder).');
  console.log('Starting in in-memory mode with preloaded demo data.');
  startServer();
}
