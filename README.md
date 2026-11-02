# MedTrack - Healthcare Management Portal

A full-stack medication adherence tracking web application converted to **React.js** (frontend) and **Node.js/Express + MongoDB** (backend).

---

## 📁 Project Structure

```
MedTrack_Final Project/
├── backend/                  # Node.js + Express + MongoDB REST API
│   ├── src/
│   │   ├── controllers/      # Route logic
│   │   ├── middleware/       # JWT Authentication middleware
│   │   ├── models/           # Mongoose schemas (User, Medicine, DoseLog)
│   │   ├── routes/           # API endpoints (/auth, /medicines, /doses, /reports)
│   │   ├── store.js          # In-memory database fallback for instant testing
│   │   └── server.js         # Express app entry point
│   ├── .env                  # Environment variables (PORT, MONGO_URI, JWT_SECRET)
│   └── package.json
│
├── frontend/                 # React 19 + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── components/       # Shared UI (Navbar, Footer, StatusHeader)
│   │   ├── context/          # AuthContext (state, JWT token, user info)
│   │   ├── pages/            # All 12 converted React pages
│   │   │   ├── Login.jsx
│   │   │   ├── CreateAccount.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── CheckInbox.jsx
│   │   │   ├── CreateNewPassword.jsx
│   │   │   ├── PasswordResetCompleted.jsx
│   │   │   ├── Dashboard.jsx (Today's doses & schedule)
│   │   │   ├── Medicines.jsx (My medicines list)
│   │   │   ├── AddMedicine.jsx (Add / Edit medicine)
│   │   │   ├── History.jsx (Dose history log)
│   │   │   ├── WeeklyReport.jsx (Weekly adherence report)
│   │   │   └── MonthlyReport.jsx (Monthly adherence report)
│   │   ├── services/         # Axios API client with auth interceptor
│   │   ├── App.jsx           # React Router v7 routes
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
└── legacy_html/              # Archived original raw HTML template files
```

---

## 🚀 How to Run and Test

### 1. Run the Backend API

Open a terminal and run:

```bash
cd backend
npm run dev
# or
npm start
```

- Server will start at: `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/health`
- **Plug-and-Play Ready**: If you have not entered a MongoDB Atlas URL yet, the backend automatically runs in **In-Memory Testing Mode** with preloaded test data so you can test all features immediately!
- **To connect MongoDB Atlas**: Open `backend/.env` and replace `MONGO_URI` with your connection string.

---

### 2. Run the React Frontend

Open a second terminal and run:

```bash
cd frontend
npm run dev
```

- The app will be available at: `http://localhost:5173`
- Open your browser to `http://localhost:5173`.

---

## 🔘 Working Interactive Buttons & Features

- **Authentication**:
  - `Log in`: Validates credentials, saves JWT token, and redirects to Dashboard.
  - `Sign up`: Creates account with role selection ("My Own Care" / "As a Caregiver"), password strength check, and auto-login.
  - `Forgot password?`: Navigates to reset password form.
  - `Send Reset Link`: Dispatches reset email and routes to `/check-inbox`.
  - `Open Email Client`: Opens default mail client (`mailto:`).
  - `Create New Password`: Enforces password security requirements and matches confirmation.
  - `Password Reset Complete`: Shows 5-second countdown timer with working **Pause/Resume** button and direct navigation to Dashboard.
  - `User Initials (JD) Dropdown`: Shows profile info and a working **Log out** button.

- **Dashboard (Today)**:
  - `Take dose`: Instantly logs dose as taken, updates the progress bar and still-to-go count.
  - `Skip dose`: Marks dose as skipped with feedback.
  - `Add medicine` (header CTA): Opens the Add Medicine form.
  - `New quote`: Cycles dynamically through inspirational daily healthcare quotes.
  - `Calendar Prev/Next`: Navigates between months.

- **Medicines**:
  - `Active` / `Ended` segmented tabs: Filters medicines in real-time.
  - `Browse by type` chips (`All types`, `Tablets`, `Capsules`, `Syrups`): Clickable category filters.
  - `Delete`: Prompts confirmation and removes the medicine.
  - `Edit`: Pre-populates the medicine form for updating.

- **Add / Edit Medicine**:
  - Form chip selection (`Tablet`, `Capsule`, `Syrup`, `Other`).
  - Frequency selection (`Once a day`, `Several times a day`, `Specific days`, `Every few hours`).
  - Toggleable day chips (`Mon` through `Sun`).
  - Interactive notification and reminder toggle switches.
  - `Save medicine`: Persists to the database and redirects to the medicines list.
  - `Cancel`: Discards and returns to medicines list.

- **Email reminders** (backend cron):
  - When `Email reminder` is on for a medicine (and the account master switch is on), MedTrack emails the registered address at the scheduled dose minute.
  - Skipped doses never email; sent/failed state is stored per dose so restarts cannot double-send, and failed sends retry up to 3 times.
  - After upgrading an existing database run `npm run reminders:backfill` once. Preview an email with `npm run test:dose-reminder -- --dry-run`.

- **History**:
  - Filter chips: `All`, `Taken`, `Missed`, `Skipped` filter dose logs in real-time.
  - Interval toggle: `This week` / `This month`.

- **Reports**:
  - `Weekly` / `Monthly` segmented toggle buttons switch seamlessly between the weekly and monthly adherence breakdown views.

