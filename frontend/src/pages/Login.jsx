import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Custom 3D-style illustration bundled with the app: a clock surrounded by
// floating pills, plus a medication schedule card.
// To use your own upload instead, drop the file in frontend/public/ (or
// frontend/src/assets/) and point HERO_IMAGE_SRC at it.
const HERO_IMAGE_SRC = '/hero-medicine-tracker.svg';

const HERO_CAPTION = 'Track your medication seamlessly across all your devices.';

const inputClasses =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10';

const ArrowRightIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

const EyeIcon = ({ off = false }) => (
  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7S3.73 16.06 2.46 12Z" />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    {off && <path d="M4 20 20 4" />}
  </svg>
);

const LockIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <rect height="11" rx="2" width="16" x="4" y="10" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

/** Graceful fallback if the hero photo can't load (offline or blocked). */
const HeroArtwork = () => (
  <svg className="h-full w-full" fill="none" viewBox="0 0 400 300" aria-hidden="true">
    <defs>
      <linearGradient id="hero-screen" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#fff7f7" />
        <stop offset="100%" stopColor="#ffe9e9" />
      </linearGradient>
      <linearGradient id="hero-pill" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#fecaca" />
      </linearGradient>
    </defs>

    {/* soft glow + loose pills behind the device */}
    <circle cx="322" cy="74" fill="#ffffff" fillOpacity="0.08" r="54" />
    <circle cx="66" cy="232" fill="#ffffff" fillOpacity="0.06" r="42" />
    <g opacity="0.55">
      <rect fill="url(#hero-pill)" height="16" rx="8" transform="rotate(-24 322 216)" width="48" x="298" y="208" />
      <rect fill="url(#hero-pill)" height="14" rx="7" transform="rotate(18 92 74)" width="40" x="72" y="67" />
      <circle cx="348" cy="150" fill="#fecaca" r="9" />
      <circle cx="54" cy="128" fill="#fee2e2" fillOpacity="0.8" r="7" />
    </g>

    {/* tablet device */}
    <rect fill="#ffffff" fillOpacity="0.16" height="196" rx="28" width="266" x="67" y="52" />
    <rect fill="#ffffff" height="184" rx="24" width="254" x="73" y="58" />
    <rect fill="url(#hero-screen)" height="148" rx="16" width="222" x="89" y="88" />
    <rect fill="#e2e8f0" height="8" rx="4" width="64" x="168" y="68" />

    {/* schedule rows on the screen */}
    <g>
      <rect fill="#ffffff" height="30" rx="10" width="192" x="104" y="100" />
      <circle cx="119" cy="115" fill="#16a34a" r="7" />
      <path d="m116 115 2.4 2.4 4-4.6" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <rect fill="#0f172a" fillOpacity="0.75" height="6" rx="3" width="84" x="134" y="108" />
      <rect fill="#94a3b8" height="5" rx="2.5" width="52" x="134" y="119" />

      <rect fill="#ffffff" height="30" rx="10" width="192" x="104" y="136" />
      <circle cx="119" cy="151" fill="#f59e0b" r="7" />
      <path d="M119 147v4.5l2.6 1.6" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" />
      <rect fill="#0f172a" fillOpacity="0.75" height="6" rx="3" width="96" x="134" y="144" />
      <rect fill="#94a3b8" height="5" rx="2.5" width="44" x="134" y="155" />

      <rect fill="#ffffff" height="30" rx="10" width="192" x="104" y="172" />
      <circle cx="119" cy="187" fill="#dc2626" r="7" />
      <path d="M116 184l6 6m0-6-6 6" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" />
      <rect fill="#0f172a" fillOpacity="0.75" height="6" rx="3" width="74" x="134" y="180" />
      <rect fill="#94a3b8" height="5" rx="2.5" width="58" x="134" y="191" />
    </g>

    {/* pill + capsule accents on the glass edge */}
    <g>
      <rect fill="#ffffff" height="22" rx="11" transform="rotate(-18 312 46)" width="66" x="279" y="35" />
      <path d="M311 36.5 318 50" stroke="#ef4444" strokeLinecap="round" strokeWidth="2" />
      <rect fill="#ffffff" height="20" rx="10" transform="rotate(14 34 196)" width="58" x="8" y="186" />
      <path d="m40 189 6 12" stroke="#dc2626" strokeLinecap="round" strokeWidth="2" />
    </g>
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => {
    const until = Number(localStorage.getItem('medtrack_trust_device_until') || 0);
    return until > Date.now();
  });
  const [error, setError] = useState('');
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      // 30-day trust window (the JWT itself is what persists the session).
      if (remember) {
        localStorage.setItem('medtrack_trust_device_until', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
      } else {
        localStorage.removeItem('medtrack_trust_device_until');
      }
      navigate('/dashboard');
    } else {
      setError(res.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="flex min-h-dvh bg-white font-sans text-slate-900 antialiased">
      {/* ------------------------------------------------------------------ */}
      {/* Left column: login form                                            */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex min-h-dvh w-full flex-col border-slate-100 bg-white px-5 py-7 sm:px-8 sm:py-9 lg:w-[46%] lg:min-w-[480px] lg:max-w-[720px] lg:border-r lg:px-12 lg:shadow-[10px_0_40px_-32px_rgba(15,23,42,0.35)] lg:py-10 xl:px-16"
        data-purpose="login-container"
      >
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col pt-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b91c1c] text-white shadow-[0_8px_20px_-8px_rgba(185,28,28,0.7)]">
              <svg className="h-5 w-5 -rotate-45" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold leading-none tracking-tight text-slate-900">MedTrack</span>
                <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-red-700 ring-1 ring-inset ring-red-100">
                  PRO
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Healthcare Management Portal</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mt-10">
            <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl">
              Welcome back
            </h1>
            <p className="mt-2.5 max-w-[360px] text-sm leading-relaxed text-slate-500">
              Sign in to securely access your prescription schedules and clinical profile.
            </p>
          </div>

          {/* Error notice */}
          {error && (
            <div
              className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700"
              role="alert"
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4m0 4h.01" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="mt-7 space-y-5" noValidate onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-slate-700" htmlFor="email">
                Email Address
              </label>
              <input
                autoComplete="email"
                className={inputClasses}
                id="email"
                inputMode="email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                required
                type="email"
                value={email}
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <label className="block text-[13px] font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <Link
                  className="-my-1 inline-flex items-center py-1 text-xs font-semibold text-red-700 transition-colors hover:text-red-800 focus:outline-none focus-visible:underline"
                  to="/reset-password"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className={`${inputClasses} pr-12`}
                  id="password"
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>

            {/* Trust device */}
            <label className="flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-[13px] text-slate-600 md:min-h-0">
              <input
                checked={remember}
                className="h-4 w-4 rounded border-slate-300 text-red-600 accent-red-600 focus:ring-red-500/40"
                onChange={(e) => setRemember(e.target.checked)}
                type="checkbox"
              />
              <span>
                Trust this device for <span className="font-semibold text-slate-700">30 days</span>
              </span>
            </label>

            {/* Submit */}
            <button
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b91c1c] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_-10px_rgba(185,28,28,0.75)] transition-colors hover:bg-[#991b1b] focus:outline-none focus-visible:ring-4 focus-visible:ring-red-600/25 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Authenticating...
                </>
              ) : (
                <>
                  Log In
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Signup */}
          <p className="mt-6 text-center text-[13px] text-slate-500">
            Don&apos;t have an account?{' '}
            <Link className="font-semibold text-red-700 transition-colors hover:text-red-800" to="/create-account">
              Signup
            </Link>
          </p>

          {/* Footer */}
          <footer className="mt-auto flex flex-col items-center justify-center pt-10 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-medium text-slate-400 sm:text-[11px]">
              <LockIcon />
              <span>End-to-End Encrypted Encryption Profile</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-medium text-slate-500 sm:text-[11px]">
              <a className="transition-colors hover:text-slate-800" href="#privacy-policy" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
              <span aria-hidden="true" className="h-3 w-px bg-slate-200" />
              <a className="transition-colors hover:text-slate-800" href="#terms-of-care" onClick={(e) => e.preventDefault()}>
                Terms of Care
              </a>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
              © 2026 MedTrack Healthcare Systems, Inc. All rights reserved.
            </p>
          </footer>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right column: brand hero (desktop only)                            */}
      {/* ------------------------------------------------------------------ */}
      <aside
        aria-label="MedTrack product highlights"
        className="relative hidden overflow-hidden bg-[#7f1d1d] lg:flex lg:flex-1 lg:flex-col lg:items-center lg:px-12 lg:py-10 xl:px-16"
      >
        {/* Gradient wash */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,#c53030_0%,#991b1b_45%,#5b1212_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-white/[0.06] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 bottom-0 h-[300px] w-[300px] rounded-full bg-rose-500/20 blur-3xl" />

        {/* Copy — centred as one block */}
        <div className="relative z-10 flex w-full flex-col items-center text-center pt-8">
          <h2 className="text-[34px] font-bold leading-[1.08] tracking-tight text-white xl:text-[44px]">
            Track smarter,
            <br />
            live healthier.
          </h2>
          <p className="mx-auto mt-4 mb-2 max-w-lg text-sm leading-relaxed text-rose-100/80 xl:text-[15px]">
            Stay on schedule with intelligent dosage reminders, multi-device refill tracking, and
            HIPAA-secure clinical insights.
          </p>
        </div>

        {/* Glass image frame */}
        <div className="relative z-10 my-8 flex w-full flex-1 items-center justify-center">
          <div className="relative w-full max-w-[480px]">
            <div aria-hidden="true" className="absolute -inset-5 rounded-[40px] bg-rose-400/20 blur-3xl" />
            <div className="relative rounded-[30px] border border-white/25 bg-white/10 p-3 shadow-[0_35px_80px_-25px_rgba(0,0,0,0.65)] backdrop-blur-xl">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-gradient-to-br from-white/15 to-white/5">
                {heroImageFailed ? (
                  <HeroArtwork />
                ) : (
                  <img
                    alt="Stylised clock surrounded by floating pills beside a medication schedule card"
                    className="h-full w-full object-cover"
                    decoding="async"
                    onError={() => setHeroImageFailed(true)}
                    referrerPolicy="no-referrer"
                    src={HERO_IMAGE_SRC}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="relative z-10 mx-auto max-w-lg text-center text-xs font-medium leading-relaxed text-rose-100/75">
          {HERO_CAPTION}
        </p>
      </aside>
    </div>
  );
}
