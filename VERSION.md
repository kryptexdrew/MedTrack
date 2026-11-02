# MedTrack — Saved Version

## v1.3.1 — Calendar Month Fix + Fully Centered Login Hero (saved 2026-11-01)

This file records the state of the project at the moment the version was
archived. There is no git history, so this folder is the reference copy.

### Snapshot location

- Folder: `C:\Users\PC\Desktop\MedTrack_Backups\v1.3.1_calendar_fix_centered_hero_2026-11-01`
- Archive: `C:\Users\PC\Desktop\MedTrack_Backups\v1.3.1_calendar_fix_centered_hero_2026-11-01.zip`

Excluded from the snapshot (regenerate with `npm install` / `npm run build`):
`node_modules`, `frontend/dist`, `backend/tmp`, `.git`, logs.

`backend/.env` **is** included because it holds the local Mongo/JWT/Brevo
settings this version was tested with. Treat it as secret.

### What changed in this version

#### Dashboard calendar: month navigation no longer skips a month

- Bug: from a 31-day month with the 31st selected (e.g. Oct 31), clicking
  **Next Month** skipped November and landed on December 1st.
- Cause: `new Date(2026, 9, 31).setMonth(10)` asks JavaScript for "November
  31", which overflows into December 1.
- Fix in `frontend/src/pages/Dashboard.jsx`:
  - New named `handlePrevMonth` / `handleNextMonth` handlers.
  - Both call `setDate(1)` **before** `setMonth(±1)`, so overflow cannot occur.
  - The two arrow buttons now call these handlers instead of inline
    `setMonth` calls.
- Behaviour: month navigation selects the 1st of the target month. The
  **Today** pill still snaps back to the current day.
- Edge cases verified: Oct 31 → Nov 1, Dec 31 → Jan 1 (year rollover),
  Jan 31 → Feb 1 (including leap year 2028), Mar/May/Aug 31 → 1st of the next
  month, Jan 1 → Dec 1 of the prior year, and 13 consecutive clicks walking
  Nov 2026 → Nov 2027 with no skipped or repeated month.

#### Login hero: every element horizontally centered

- The badge, heading, and subtitle now share one wrapper:
  `flex w-full flex-col items-center text-center`.
- Subtitle: `mx-auto mt-4 mb-2 max-w-lg` (512 px) so it wraps neatly in the
  middle instead of stretching across the panel.
- Image frame: unchanged markup/styling; its container now uses `my-8` (plus
  the existing `flex-1 items-center justify-center`).
- Caption: a direct `<p>` with `mx-auto max-w-lg text-center`; the old
  carousel-era `min-h` was removed.
- `<aside>` gained `lg:items-center` so the whole column is centered.

#### Carried over unchanged from v1.3.0

- **Medicines "Next Dose" labels**: `frontend/src/utils/nextDose.js`
  computes the first scheduled dose strictly after now, rolls to tomorrow when
  today is finished, honours weekday rules and course dates, and formats
  `"Today, 4:00 PM"` / `"Tomorrow, 8:00 AM"` / `"Mon, 8:00 AM"` /
  `"Course ended"`. The card refreshes every 30 s and on visibility/focus,
  shows due-soon doses in red, and passes the raw record to Edit so schedule
  fields prefill correctly.
- **Login hero illustration**: `frontend/public/hero-medicine-tracker.svg`
  (1200 × 900, 4:3) — stylised 3D clock, floating capsules/tablets, and a
  `MON 08 · DAILY DOSE` card with a completed check. Subtle animations respect
  `prefers-reduced-motion`. Carousel arrows/dots and related state removed.
- **Left-column footer**: centered lock row, links, and copyright.

#### Carried over unchanged from v1.2.0

- Email dose reminders (`reminderCron`, `doseReminders` sweep, atomic claims,
  retries, stale-claim recovery), reusable `emailService`, responsive
  `doseReminder` template, `User`/`DoseLog` reminder fields, preferences
  endpoint, and schedule re-sync on edit.
- Auto-miss handling, UTC `scheduledAt`, and reports adherence math from
  v1.1.0.
- Backfill and reminder test tooling (`npm run reminders:backfill`,
  `npm run test:dose-reminder`).

### Verification at save time

- Month navigation logic suite: **16/16 checks passed** — the original bug
  reproduced (`Oct 31 → Dec 1`), fixed next/previous paths, year and leap-year
  rollovers, 30-day months, mid-month normalisation, and a 13-step walk across
  a year boundary.
- Login centering measured in headless Chrome at 1440 × 900:
  - Badge, heading, subtitle, image, and caption centers all exactly
    **1051.2 px**, matching the hero column center (delta 0.0 px).
  - Subtitle width 512 px; image 454 px wide; 32 px vertical margins.
  - Repeated at 1366 × 768, 1280 × 720, 1024 × 768, and 1024 × 650: all five
    elements stay centered, no overlaps. On shorter viewports the page scrolls
    (the left form already sets that floor) and the caption remains inside the
    panel rather than being clipped.
- `frontend`: `npm run build` OK; `npm run lint` exit 0 with 0 errors (only
  pre-existing warnings).
- Next-dose logic suite from v1.3.0 still passes **34/34**.
- API health at save time: `GET /api/health` → `200`, `database: connected`.
  Protected routes return 401 without a token.

### Database state at save time

No migrations or schema changes in v1.3.1. The database is unchanged from
v1.3.0/v1.2.0 and remains connected; the reminder fields added in v1.2.0 are
still in place.

### Restore

1. Copy the snapshot folder anywhere.
2. `cd backend && npm install`, then `cd ../frontend && npm install`.
3. Keep the included `backend/.env` (or recreate it from `.env.example`).
4. `npm run dev` in `backend` (port 5000) and `frontend` (port 5173).
5. On a restored/seeded database run `npm run reminders:backfill` once.
6. If statuses were ever seeded from an older schema, run
   `npm run migrate:doses` once to normalize them.

### Known open item

Live Brevo delivery is blocked until the server IP `158.62.20.137` is
whitelisted at `https://app.brevo.com/security/authorised_ips`. Until then live
sends log HTTP 401 and are retried/marked failed; password reset is affected by
the same restriction.

### Version history

- **v1.3.1** (2026-11-01) — Calendar month-navigation skip fixed; login hero
  badge/heading/subtitle/image/caption fully centered. This snapshot.
- **v1.3.0** (2026-10-31) — Accurate per-medicine next-dose labels, next-dose
  utility + tests, edit-form schedule fix; login carousel removed, illustrated
  medicine-tracker hero, centered footer. Folder:
  `v1.3.0_next_dose_login_hero_2026-10-31`.
- **v1.2.0** (2026-10-31) — Email dose reminders, reusable email layer, login
  redesign. Folder: `v1.2.0_email_reminders_2026-10-31`.
- **v1.1.0** (2026-10-31) — Auto-miss doses, UTC `scheduledAt`, reports
  adherence math. Folder: `v1.1.0_automiss_2026-10-31`.
