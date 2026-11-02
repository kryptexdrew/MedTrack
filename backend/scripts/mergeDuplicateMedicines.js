#!/usr/bin/env node
/**
 * One-off repair for duplicate medicine records created by the old
 * AddMedicine double-submit bug.
 *
 * A duplicate is only merged when every identifying field matches AND the
 * records were created within 10 seconds of each other. Dose logs from the
 * duplicate are moved to the kept record; colliding logs are merged by status.
 *
 * Usage:
 *   node scripts/mergeDuplicateMedicines.js          # dry run
 *   node scripts/mergeDuplicateMedicines.js --apply  # write changes
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const MAX_GAP_MS = 10 * 1000;

const normalize = (value = '') => String(value ?? '').trim();
const sameArray = (a = [], b = []) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

const contentKey = (m) => [
  String(m.userId),
  normalize(m.name).toLowerCase(),
  normalize(m.dosage).toLowerCase(),
  normalize(m.form).toLowerCase(),
  normalize(m.frequency).toLowerCase(),
  normalize(m.repeatEvery).toLowerCase(),
  normalize(m.firstDoseAt).toLowerCase(),
  JSON.stringify(m.scheduledTimes || []),
  JSON.stringify(m.days || []),
  normalize(m.startDate),
  normalize(m.endDate),
].join('|');

const statusRank = { upcoming: 0, missed: 1, skipped: 2, taken: 3 };

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const medicines = await db.collection('medicines').find({}).toArray();

  const groups = new Map();
  for (const med of medicines) {
    const key = contentKey(med);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(med);
  }

  const plans = [];
  for (const records of groups.values()) {
    if (records.length < 2) continue;
    const sorted = [...records].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
    const cluster = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].createdAt || 0) - new Date(sorted[i - 1].createdAt || 0);
      if (gap <= MAX_GAP_MS) cluster.push(sorted[i]);
      else {
        if (cluster.length > 1) plans.push(cluster);
        cluster.length = 0;
        cluster.push(sorted[i]);
      }
    }
    if (cluster.length > 1) plans.push(cluster);
  }

  if (plans.length === 0) {
    console.log('No duplicate medicine records found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${plans.length} duplicate group(s). Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  for (const cluster of plans) {
    const keeper = cluster[0];
    console.log(`KEEP  ${keeper._id}  ${keeper.name} (${keeper.dosage})`);

    for (const duplicate of cluster.slice(1)) {
      console.log(`  MERGE ${duplicate._id}  created +${new Date(duplicate.createdAt) - new Date(keeper.createdAt)}ms`);

      const logs = await db.collection('doselogs').find({ medicineId: duplicate._id }).toArray();
      let moved = 0;
      let merged = 0;

      for (const log of logs) {
        const keeperLog = await db.collection('doselogs').findOne({
          userId: keeper.userId,
          medicineId: keeper._id,
          date: log.date,
          scheduledTime: log.scheduledTime,
        });

        if (!keeperLog) {
          moved++;
          if (APPLY) {
            await db.collection('doselogs').updateOne(
              { _id: log._id },
              {
                $set: {
                  medicineId: keeper._id,
                  medicineName: keeper.name,
                  dosage: keeper.dosage,
                  form: keeper.form,
                },
              }
            );
          }
        } else {
          merged++;
          const duplicateWins =
            (statusRank[log.status] ?? 0) > (statusRank[keeperLog.status] ?? 0) ||
            ((statusRank[log.status] ?? 0) === (statusRank[keeperLog.status] ?? 0) &&
              new Date(log.recordedAt || 0) > new Date(keeperLog.recordedAt || 0));

          if (APPLY) {
            if (duplicateWins) {
              await db.collection('doselogs').updateOne(
                { _id: keeperLog._id },
                {
                  $set: {
                    status: log.status,
                    recordedAt: log.recordedAt || keeperLog.recordedAt,
                  },
                }
              );
            }
            await db.collection('doselogs').deleteOne({ _id: log._id });
          }
        }
      }

      console.log(`    logs: ${logs.length} total, ${moved} moved, ${merged} merged`);

      if (APPLY) {
        await db.collection('medicines').deleteOne({ _id: duplicate._id });
        console.log('    duplicate medicine deleted');
      }
    }
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to make these changes.');
  }

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Merge failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
