import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatusHeader from '../components/StatusHeader';
import Footer from '../components/Footer';

export default function CreateAccount() {
  const [role, setRole] = useState('self'); // Sign-up supports self-care accounts only
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState('');

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const isMatching = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!isMatching) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (!agreed) {
      setError('Please agree to the Terms of Care and Privacy Policy.');
      return;
    }

    const res = await register({ fullName: fullName.trim(), email: email.trim(), password, role });
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-[#f7fafc] p-4 font-sans text-slate-700 antialiased sm:p-6">
      {/* Top Status */}
      <StatusHeader />

      {/* Main Form Card */}
      <main className="w-full flex-grow flex items-center justify-center my-4 sm:my-6">
        <div className="w-full max-w-[490px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-100 p-7 sm:p-9 relative" data-purpose="signup-card">
          {/* Top Pill Icon Badge */}
          <div className="flex justify-center mb-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100/60 shadow-sm">
              <svg className="w-5 h-5 text-red-500 transform -rotate-45" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <rect height="8" rx="4" ry="4" width="18" x="3" y="8"></rect>
                <path d="M12 8v8"></path>
              </svg>
            </div>
          </div>

          {/* Header Titles */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MedTrack</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">Create your medication profile</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Role / User Mode Selection */}
            <div className="bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100" data-purpose="mode-selector">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                I AM USING MEDTRACK FOR
              </span>
              <button
                type="button"
                onClick={() => setRole('self')}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-center space-x-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all md:min-h-0 ${
                  role === 'self'
                    ? 'bg-white border-rose-200/80 shadow-sm text-slate-800 ring-1 ring-rose-200'
                    : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100/60'
                }`}
              >
                <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>My Own Care</span>
              </button>
            </div>

            {/* Full Name Input */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="font-medium text-slate-700" htmlFor="fullname">Full Name</label>
                <span className="text-[11px] text-slate-400">Legal or Preferred</span>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-slate-400 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                    <rect height="16" rx="2" width="18" x="3" y="4"></rect>
                    <circle cx="12" cy="10" r="2.5"></circle>
                    <path d="M8 17a4 4 0 0 1 8 0"></path>
                  </svg>
                </div>
                <input
                  className="w-full pl-9 pr-3 py-2 min-h-11 text-xs text-slate-800 placeholder-slate-400 bg-transparent border-0 focus:ring-0 rounded-xl md:min-h-0"
                  id="fullname"
                  placeholder="e.g., Alex Johnson"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email Address Input */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="font-medium text-slate-700" htmlFor="email">Email Address</label>
                <span className="text-[11px] text-slate-400">For dose reminders</span>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-slate-400 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                    <rect height="16" rx="2" width="20" x="2" y="4"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </svg>
                </div>
                <input
                  className="w-full pl-9 pr-3 py-2 min-h-11 text-xs text-slate-800 placeholder-slate-400 bg-transparent border-0 focus:ring-0 rounded-xl md:min-h-0"
                  id="email"
                  placeholder="name@email.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Two-column Password & Confirm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <label className="font-medium text-slate-700" htmlFor="password">Password</label>
                </div>
                <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-slate-400 transition-all">
                  <input
                    className="w-full pl-3 pr-7 py-2 min-h-11 text-xs tracking-widest text-slate-600 bg-transparent border-0 focus:ring-0 rounded-xl md:min-h-0"
                    id="password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <label className="font-medium text-slate-700" htmlFor="confirm">Confirm</label>
                  <span className={`text-[10px] font-bold ${isMatching ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isMatching ? 'Match ✓' : 'Match check'}
                  </span>
                </div>
                <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-slate-400 transition-all">
                  <input
                    className="w-full pl-3 pr-3 py-2 min-h-11 text-xs tracking-widest text-slate-600 bg-transparent border-0 focus:ring-0 rounded-xl md:min-h-0"
                    id="confirm"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Password Requirements Bar */}
            <div className="flex items-center justify-between text-[11px] bg-slate-50/60 px-3 py-1.5 rounded-lg border border-slate-100">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span>At least 8 characters with letters &amp; numbers</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className={`w-2.5 h-1 rounded-full ${password.length >= 4 ? 'bg-rose-500' : 'bg-slate-300'}`}></span>
                <span className={`w-2.5 h-1 rounded-full ${password.length >= 8 ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                <span className={`w-2.5 h-1 rounded-full ${password.length >= 10 && isMatching ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start space-x-2 py-2 pt-1 md:py-0">
              <input
                className="mt-0.5 h-6 w-6 cursor-pointer rounded border-slate-300 text-rose-600 focus:ring-rose-500 md:h-4 md:w-4"
                id="terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <label className="text-[11px] leading-tight text-slate-500 select-none cursor-pointer" htmlFor="terms">
                I agree to the <span className="text-rose-600 hover:underline font-medium">Terms of Care</span> and <span className="text-rose-600 hover:underline font-medium">HIPAA-compliant Privacy Policy</span>.
              </label>
            </div>

            {/* Primary Submit Button */}
            <div className="pt-2">
              <button
                className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-md shadow-red-600/20 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Creating Account in MongoDB...
                  </span>
                ) : (
                  <>
                    <span className="text-sm">Create Account</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Log In Callout */}
            <div className="text-center text-xs text-slate-500 pt-1">
              Already have an account?{' '}
              <Link className="inline-flex min-h-11 items-center font-semibold text-rose-600 hover:underline md:min-h-0" to="/login">
                Log in
              </Link>
            </div>

            {/* Security Guarantee Box */}
            <div className="mt-4 pt-1">
              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 flex items-center justify-center space-x-2 text-[10px] tracking-tight font-semibold text-slate-600">
                <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
                <span className="uppercase tracking-wide">256-Bit Encrypted &amp; HIPAA-Compliant Healthcare Storage</span>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
