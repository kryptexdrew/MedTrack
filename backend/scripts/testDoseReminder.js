#!/usr/bin/env node
/**
 * Manual dose-reminder diagnostic.
 *
 * Usage:
 *   npm run test:dose-reminder -- --dry-run
 *   npm run test:dose-reminder -- <doseId> --dry-run
 *   npm run test:dose-reminder -- <doseId> --to you@mail.com
 *   npm run test:dose-reminder -- --sweep --dry-run
 *
 * --dry-run  renders the email to tmp/dose-reminder.html without sending
 * --to       overrides the recipient (defaults to the dose owner's email)
 * --sweep    runs the real sweep in dry-run mode and prints the stats
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const DoseLog = require('../src/models/DoseLog');
// Register the models used by .populate().
require('../src/models/User');
require('../src/models/Medicine');
const { renderDoseReminder } = require('../src/emails/doseReminder');
const { sendDoseReminderEmail } = require('../src/services/emailService');
const { runDoseReminderSweep } = require('../src/services/doseReminders');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getValue = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
};

const dryRun = hasFlag('--dry-run');
const sweep = hasFlag('--sweep');
const explicitTo = getValue('--to');
const doseArg = args.find((arg) => !arg.startsWith('--') && arg !== explicitTo);
const appUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const main = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<username>')) {
    console.error('MONGO_URI is missing or still a placeholder.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  if (sweep) {
    const stats = await runDoseReminderSweep({ dryRun: true });
    console.log('Dry-run sweep stats:', stats);
    await mongoose.disconnect();
    return;
  }

  const query = mongoose.isValidObjectId(doseArg)
    ? { _id: doseArg }
    : { scheduledAt: { $ne: null } };

  const dose = await DoseLog.findOne(query)
    .sort({ scheduledAt: -1 })
    .populate('userId', 'fullName email timezone')
    .populate('medicineId', 'name dosage form status emailReminder')
    .lean();

  if (!dose) {
    console.error('No dose found for that id/query.');
    process.exit(1);
  }

  const medicine = dose.medicineId || {};
  const user = dose.userId || {};
  const to = explicitTo || user.email;
  const dashboardUrl = `${appUrl}/dashboard?dose=${String(dose._id)}`;

  const rendered = renderDoseReminder({
    fullName: user.fullName,
    medicineName: medicine.name || dose.medicineName,
    dosage: medicine.dosage || dose.dosage,
    form: medicine.form || dose.form,
    scheduledTime: dose.scheduledTime,
    scheduledAt: dose.scheduledAt,
    timezone: user.timezone || '',
    dashboardUrl,
  });

  const outDir = path.join(__dirname, '..', 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'dose-reminder.html');
  fs.writeFileSync(htmlPath, rendered.html);
  fs.writeFileSync(path.join(outDir, 'dose-reminder.txt'), rendered.text);

  console.log(`Dose:        ${dose._id} (${dose.status})`);
  console.log(`Medicine:    ${medicine.name || dose.medicineName} ${medicine.dosage || dose.dosage}`);
  console.log(`Scheduled:   ${dose.scheduledTime} / ${dose.scheduledAt}`);
  console.log(`Recipient:   ${to || '(none)'}`);
  console.log(`Subject:     ${rendered.subject}`);
  console.log(`HTML:        ${htmlPath}`);

  if (dryRun) {
    console.log('Dry run: no email sent.');
  } else if (!to) {
    console.error('No recipient email on the dose owner and no --to provided.');
  } else {
    await sendDoseReminderEmail({
      to,
      toName: user.fullName,
      fullName: user.fullName,
      medicineName: medicine.name || dose.medicineName,
      dosage: medicine.dosage || dose.dosage,
      form: medicine.form || dose.form,
      scheduledTime: dose.scheduledTime,
      scheduledAt: dose.scheduledAt,
      timezone: user.timezone || '',
      dashboardUrl,
    });
    console.log('Email sent.');
  }

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error('Dose reminder test failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
