/**
 * One-off migration for the auto-miss feature.
 *
 *   node scripts/migrateDoseStatuses.js           (apply)
 *   node scripts/migrateDoseStatuses.js --dry-run (report only)
 *
 * What it does:
 *  1. Renames the legacy "upcoming" status to "pending".
 *  2. Deduplicates dose logs so the unique per-dose index can be built.
 *  3. Backfills the new UTC `scheduledAt` field from date + scheduledTime,
 *     using each user's stored timezone (falls back to server time).
 *  4. Marks already-overdue pending doses as missed.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const DoseLog = require('../src/models/DoseLog');
const User = require('../src/models/User');
const { zonedTimeToUtc, isPastGrace } = require('../src/utils/timeZone');

const DRY_RUN = process.argv.includes('--dry-run');

const statusRank = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'taken': return 4;
    case 'skipped': return 3;
    case 'missed': return 2;
    default: return 1;
  }
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to ${mongoose.connection.name}${DRY_RUN ? ' (dry run)' : ''}`);

  // 0. Remove rows written by an older, incompatible schema (they have no
  //    userId/date, so every user-scoped query already ignores them).
  const logCollection = mongoose.connection.collection('doselogs');
  const legacyDocs = await logCollection.countDocuments({
    userId: { $exists: false },
    date: { $exists: false },
  });
  console.log(`Rows from the old dose schema: ${legacyDocs}`);
  if (!DRY_RUN && legacyDocs > 0) {
    const result = await logCollection.deleteMany({
      userId: { $exists: false },
      date: { $exists: false },
    });
    console.log(`  -> removed ${result.deletedCount || 0} stale row(s)`);
  }

  // 1. Legacy status rename.
  const legacy = await logCollection.countDocuments({ status: 'upcoming' });
  console.log(`Legacy "upcoming" doses: ${legacy}`);
  if (!DRY_RUN && legacy > 0) {
    await logCollection.updateMany({ status: 'upcoming' }, { $set: { status: 'pending' } });
    console.log('  -> renamed to "pending"');
  }

  // 2. Deduplicate (keep the most meaningful, then most recent).
  const duplicates = await logCollection
    .aggregate([
      {
        $group: {
          _id: {
            userId: '$userId',
            medicineId: '$medicineId',
            date: '$date',
            scheduledTime: '$scheduledTime',
          },
          count: { $sum: 1 },
          ids: { $push: { id: '$_id', status: '$status', recordedAt: '$recordedAt' } },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  console.log(`Duplicate dose groups: ${duplicates.length}`);
  let removed = 0;
  if (!DRY_RUN) {
    for (const group of duplicates) {
      const sorted = group.ids.sort((a, b) => {
        const rank = statusRank(b.status) - statusRank(a.status);
        if (rank !== 0) return rank;
        return new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0);
      });
      const removeIds = sorted.slice(1).map((doc) => doc.id);
      if (removeIds.length) {
        const result = await logCollection.deleteMany({ _id: { $in: removeIds } });
        removed += result.deletedCount || 0;
      }
    }
    console.log(`  -> removed ${removed} duplicate dose(s)`);
  }

  // 3 + 4. Backfill scheduledAt and catch up overdue doses.
  const users = await User.find({}).select('_id timezone').lean();
  const timezoneByUser = new Map(users.map((user) => [String(user._id), user.timezone || '']));

  const missing = await logCollection
    .find({ $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }] })
    .project({ userId: 1, date: 1, scheduledTime: 1, status: 1 })
    .toArray();

  console.log(`Doses missing scheduledAt: ${missing.length}`);
  let backfilled = 0;
  let markedMissed = 0;

  for (const doc of missing) {
    const scheduledAt = zonedTimeToUtc(doc.date, doc.scheduledTime, timezoneByUser.get(String(doc.userId)) || '');
    if (!scheduledAt) continue;

    const update = { $set: { scheduledAt } };
    if (['pending', 'upcoming'].includes(String(doc.status || '').toLowerCase()) && isPastGrace(scheduledAt)) {
      update.$set.status = 'missed';
      markedMissed += 1;
    }

    if (!DRY_RUN) await logCollection.updateOne({ _id: doc._id }, update);
    backfilled += 1;
  }

  console.log(`Backfilled scheduledAt: ${backfilled} (${markedMissed} opened as missed)`);

  if (!DRY_RUN) {
    // Old unique indexes (if any) can block the new one.
    await DoseLog.syncIndexes();
    console.log('Dose indexes synced.');
  }

  await mongoose.disconnect();
  console.log('Migration complete.');
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
