import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

export default function CreateNewPassword() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    token ? '' : 'This password-reset link is invalid or incomplete. Please request a new link.'
  );
  const [loading, setLoading] = useState(false);

  const { resetPassword, logout } = useAuth();
  const navigate = useNavigate();

  // Remove the token from the address bar/history as soon as it is captured.
  // It is kept only in React state and never written to localStorage/sessionStorage.
  useEffect(() => {
    if (searchParams.get('token')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword;
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This password-reset link is invalid or incomplete. Please request a new link.');
      return;
    }
    if (!isMatching) {
      setError('Passwords do not match.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!hasUpperLower) {
      setError('Password must include both uppercase and lowercase letters.');
      return;
    }
    if (!hasNumberOrSymbol) {
      setError('Password must include at least one number or special symbol.');
      return;
    }

    setLoading(true);
    const res = await resetPassword(token, newPassword, confirmPassword);
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'Unable to reset your password. Please request a new link.');
      return;
    }

    // Clear any stale session in this browser; all older JWTs are also revoked server-side.
    logout();
    const query = res.email ? `?email=${encodeURIComponent(res.email)}` : '';
    navigate(`/password-reset-completed${query}`, { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-[#f4f7fa] p-4 text-slate-700 sm:p-6 lg:p-8">
      <main className="w-full max-w-[540px] flex flex-col items-center my-auto">
        <section className="w-full bg-white rounded-3xl shadow-[0_10px_35px_-4px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.03)] border border-slate-100 p-8 sm:p-10 flex flex-col items-center">
          {/* Top icon badge */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-14 h-14 bg-gradient-to-b from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-md shadow-rose-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </span>
          </div>

          {/* Security Protocol Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[11px] font-bold text-rose-600 tracking-wider uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            SECURITY PROTOCOL
          </div>

          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight text-center mb-2">Create new password</h1>
          <p className="text-sm text-slate-500 text-center max-w-[420px] leading-relaxed mb-4">
            Set a strong, HIPAA-compliant password to restore access to your medication schedule and dose alerts.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-6">
            <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span>Single-use secure reset link &middot; expires in 30 minutes</span>
          </div>

          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl" role="alert">
              <p>{error}</p>
              {!token && (
                <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-red-700 hover:underline md:min-h-0" to="/reset-password">
                  Request a new reset link
                </Link>
              )}
            </div>
          )}

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {/* Field 1: New Password */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700" htmlFor="new-password">New Password</label>
                <span className="text-rose-500 tracking-wide text-[11px] font-bold">REQUIRED</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" width="16" x="4" y="10"></rect>
                    <path d="M8 10V7a4 4 0 118 0v3" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </span>
                <input
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </button>
              </div>

              {/* Password Strength Indicator */}
              <div className="flex items-center justify-between text-xs mt-2 px-0.5">
                <span className="text-slate-500">Password Strength</span>
                <span className={`font-bold ${hasMinLength && hasUpperLower && hasNumberOrSymbol ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {hasMinLength && hasUpperLower && hasNumberOrSymbol ? 'Strong' : 'Medium'}
                </span>
              </div>

              {/* Criteria Checklist Box */}
              <div className="mt-2.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 shrink-0 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 shrink-0 ${hasUpperLower ? 'text-emerald-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span>Includes uppercase &amp; lowercase letters</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 shrink-0 ${hasNumberOrSymbol ? 'text-emerald-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span>Includes at least one number or special symbol</span>
                </div>
              </div>
            </div>

            {/* Field 2: Confirm Password */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700" htmlFor="confirm-password">Confirm New Password</label>
                {isMatching && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                    PASSWORDS MATCH
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" width="16" x="4" y="10"></rect>
                    <path d="M8 10V7a4 4 0 118 0v3" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </span>
                <input
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {/* Security note: sessions are always revoked on reset */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-start gap-3">
              <div className="text-rose-500 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <div className="text-xs leading-normal">
                <span className="font-bold text-slate-800 block">All other sessions will be signed out</span>
                <p className="text-slate-500 mt-0.5">
                  For your security, existing devices and browsers must log in again with the new password.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-600 hover:from-rose-700 hover:to-rose-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Updating...' : 'Reset Password'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </button>

              <Link
                className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition duration-150 hover:bg-slate-200 md:min-h-0"
                to="/login"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span>Cancel and return to Log in</span>
              </Link>
            </div>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
}
