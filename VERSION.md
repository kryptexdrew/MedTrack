# MedTrack — Saved Version

## v1.4.0 — Login Badge Cleanup + Two-Column Doses + Real Course Widget (saved 2026-11-02)

This file records the state of the project at the moment the version was
archived. There is no git history, so this folder is the reference copy.

### Snapshot location

- Folder: `C:\Users\PC\Desktop\MedTrack_Backups\v1.4.0_login_cleanup_dashboard_grid_2026-11-02`
- Archive: `C:\Users\PC\Desktop\MedTrack_Backups\v1.4.0_login_cleanup_dashboard_grid_2026-11-02.zip`

Excluded from the snapshot (regenerate with `npm install` / `npm run build`):
`node_modules`, `frontend/dist`, `backend/tmp`, `.git`, logs.

`backend/.env` **is** included because it holds the local Mongo/JWT/Brevo
settings this version was tested with. Treat it as secret. It contains the
working Atlas credential used for the verification below.

### What changed in this version

#### Login: top badges removed, spacing rebalanced

- Removed the left-column pill **“System Operational & HIPAA Compliant”**
  (green pulsing dot) from `frontend/src/pages/Login.jsx`.
- Removed the right-hero pill **“Next-Gen Patient Adherence Suite”**
  (rose dot).
- Left column: the inner content wrapper now has `pt-8`, so the MedTrack logo
  sits ~72 px below the viewport top on desktop (`lg:py-10` + `32px`) instead
  of being flush with the edge.
- Right hero: the copy wrapper now has `pt-8`, and the heading’s old
  `mt-10 xl:mt-12` was removed so the heading starts at the new top spacing.
- No other login markup or behaviour changed.

#### Dashboard: “Today’s doses” is now a two-column grid

- `frontend/src/pages/Dashboard.jsx`: replaced the single white `divide-y`
  card with a grid wrapper:
  `grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2`.
- Each dose is its own card:
  `flex flex-col justify-between gap-3 rounded-2xl border p-4 ... sm:flex-row sm:items-center`.
  Time + name/details sit on the left, status badge or actions on the right.
- The current dose keeps its red tint (`border-red-100 bg-red-50/40`); other
  cards are white with a subtle hover.
- The empty state is now a standalone card instead of a row inside the list.
- All Take / Skip / Taken / Missed / Skipped / Upcoming actions are unchanged.
- Result: 2 columns on desktop (`md` and up), 1 column on mobile.

#### Dashboard: “Courses ending soon” now shows real data

Helpers added at module scope in `Dashboard.jsx`:

- `parseCourseDate` — parses `endDate` (`"YYYY-MM-DD"`, optional time suffix)
  at local midnight.
- `getDaysUntil` — whole days from the start of today; uses `Math.round` so
  DST 23 h/25 h days do not shift the count.
- `formatCourseEndDate` — e.g. `Nov 5, 2026`.
- `describeDaysLeft` — `Ends today` / `Ends tomorrow` / `Ends in N days`.

Computation:

1. Keep medicines whose `status` is `active` (missing status is treated as
   active).
2. Parse `endDate`; drop empty/invalid values.
3. Drop courses whose `endDate` is in the past.
4. Drop courses more than **7 days** away.
5. Sort ascending by days remaining and take the **top 2**.

UI:

- Empty result → the existing **“No courses ending soon”** message.
- Otherwise a short list: bold medicine name, a calendar icon with
  `Ends: <date>`, and an orange pill for courses ending within 3 days
  (`Ends today`, `Ends tomorrow`, `Ends in N days`).
- Strict 7-day window: a course ending in 20 days no longer occupies the card.

### Verification at save time

- `frontend`: `npm run build` OK; `npm run lint` exit 0 with 0 errors.
- Login measured in headless Chrome at 1440 × 900:
  - Left pill absent, right pill absent.
  - Inner content `padding-top` = **32 px**; brand margin 0.
- Dashboard measured in headless Chrome against a temporary account (removed
  afterwards):
  - Desktop 1440 × 900: dose grid `display: grid`, **2 columns**
    (389.3 px each), `gap-x` 24 px, `gap-y` 16 px; each card
    `display: flex` with `justify-content: space-between`.
  - Mobile 390 × 844: **1 column** (358 px), no horizontal overflow.
  - Widget with courses at +2 d, +5 d, +20 d, −3 d, and no `endDate`:
    shows **Alpha (+2 d)** with the orange “Ends in 2 days” pill and
    **Beta (+5 d)**; the +20 d and expired courses are excluded.
- API health at save time: `GET /api/health` → `200`,
  `database: connected`.

### Database state at save time

No migrations or schema changes in v1.4.0. The database is unchanged from
v1.3.1/v1.3.0/v1.2.0 and remains connected.

### Restore

1. Copy the snapshot folder anywhere.
2. `cd backend && npm install`, then `cd ../frontend && npm install`.
3. Keep the included `backend/.env` (or recreate it from `.env.example`).
4. `npm run dev` in `backend` (port 8000) and `frontend` (port 5173).
5. On a restored/seeded database run `npm run reminders:backfill` once.
6. If statuses were ever seeded from an older schema, run
   `npm run migrate:doses` once to normalize them.

### Known open item

Live Brevo delivery is blocked until the server IP `158.62.20.137` is
whitelisted at `https://app.brevo.com/security/authorised_ips`. Until then live
sends log HTTP 401 and are retried/marked failed; password reset is affected by
the same restriction.

### Version history

- **v1.4.0** (2026-11-02) — Login top badges removed with rebalanced spacing;
  Dashboard “Today’s doses” converted to a responsive two-column card grid;
  “Courses ending soon” now lists up to two active courses ending within
  7 days with date + warning pill. This snapshot.
- **v1.3.1** (2026-11-01) — Calendar month-navigation skip fixed; login hero
  badge/heading/subtitle/image/caption fully centered. Folder:
  `v1.3.1_calendar_fix_centered_hero_2026-11-01`.
- **v1.3.0** (2026-10-31) — Accurate per-medicine next-dose labels, next-dose
  utility + tests, edit-form schedule fix; login carousel removed, illustrated
  medicine-tracker hero, centered footer. Folder:
  `v1.3.0_next_dose_login_hero_2026-10-31`.
- **v1.2.0** (2026-10-31) — Email dose reminders, reusable email layer, login
  redesign. Folder: `v1.2.0_email_reminders_2026-10-31`.
- **v1.1.0** (2026-10-31) — Auto-miss doses, UTC `scheduledAt`, reports
  adherence math. Folder: `v1.1.0_automiss_2026-10-31`.
