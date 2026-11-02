const cron = require('node-cron');
const { runDoseReminderSweep } = require('../services/doseReminders');

// Guards against a slow run overlapping the next tick inside this process.
// The per-dose atomic claim remains the real protection across processes.
let running = false;

const tick = async () => {
  if (running) return;
  running = true;

  try {
    const stats = await runDoseReminderSweep();

    if (stats.sent > 0 || stats.failed > 0) {
      console.log(
        `[Reminders] checked=${stats.checked} sent=${stats.sent} skipped=${stats.skipped} failed=${stats.failed}`
      );
    }

    if (stats.reason === 'disabled' || stats.reason === 'mongodb-offline') {
      // Quiet: the reason is expected in dev/in-memory mode.
      return;
    }
  } catch (err) {
    // The sweep already handles per-dose failures; this is a last resort so a
    // bad tick can never take the server down.
    console.error('[Reminders] Unexpected sweep error:', err.message);
  } finally {
    running = false;
  }
};

const startReminderCron = () => {
  if (process.env.EMAIL_REMINDERS_ENABLED === '0') {
    console.log('📧 Email reminders disabled via EMAIL_REMINDERS_ENABLED=0');
    return;
  }

  // Every minute: doses fire at their scheduled minute, with a bounded
  // catch-up window handled inside the sweep.
  cron.schedule('* * * * *', tick, { noOverlap: true });
  console.log('📧 Dose reminder cron started (every minute)');
};

module.exports = { startReminderCron, tick };
