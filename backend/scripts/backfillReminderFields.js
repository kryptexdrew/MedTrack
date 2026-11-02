#!/usr/bin/env node
/**
 * One-time backfill for the email-reminder feature.
 *
 * - Grandfathers existing accounts as verified (no double opt-in yet).
 * - Defaults the account-level reminder master switch to on.
 * - Marks already-past doses as skipped so the new reminder UI/audit view does
 *   not show months of "pending" reminders that were never due.
 *
 * Usage: npm run reminders:backfill
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const DoseLog = require('../src/models/DoseLog');

const CATCH_UP_MS = 15 * 60 * 1000;

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<username>')) {
    console.error('MONGO_URI is missing or still a placeholder. Nothing to backfill.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const now = new Date();

  const verified = await User.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true, emailVerifiedAt: now } }
  );

  const masterSwitch = await User.updateMany(
    { emailRemindersEnabled: { $exists: false } },
    { $set: { emailRemindersEnabled: true } }
  );

  const pastDoses = await DoseLog.updateMany(
    {
      scheduledAt: { $lt: new Date(now.getTime() - CATCH_UP_MS) },
      reminderStatus: { $exists: false },
    },
    { $set: { reminderStatus: 'skipped', reminderLastError: 'pre-feature' } }
  );

  console.log(`Users marked verified:            ${verified.modifiedCount}`);
  console.log(`Users with reminders enabled:      ${masterSwitch.modifiedCount}`);
  console.log(`Past doses marked reminder-skipped: ${pastDoses.modifiedCount}`);

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
