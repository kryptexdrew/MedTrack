import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatusHeader from '../components/StatusHeader';
import Footer from '../components/Footer';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const res = await forgotPassword(normalizedEmail);
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'We could not process your request. Please try again.');
      return;
    }

    navigate(`/check-inbox?email=${encodeURIComponent(normalizedEmail)}`);
  };

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-[#F6F8FA] text-slate-800 antialiased selection:bg-red-100 selection:text-red-700">
      <StatusHeader />

      <main className="flex-grow flex items-center justify-center px-4 py-8" data-purpose="auth-container">
        <div className="w-full max-w-[430px] bg-white rounded-3xl p-8 sm:p-9 shadow-card border border-slate-100/80 flex flex-col items-center relative">
          {/* Top Red Link Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5" data-purpose="icon-badge">
            <svg className="w-5 h-5 -rotate-45" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>

          {/* Brand and Access Pill */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-[17px] font-bold text-slate-900 tracking-tight">MedTrack</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">ACCESS</span>
          </div>

          {/* Title and Subtitle */}
          <h1 className="text-xl font-bold text-slate-900 text-center mb-2 tracking-tight">Reset your password</h1>
          <p className="text-[13px] text-slate-500 text-center leading-relaxed max-w-[320px] mb-7">
            Enter the email address associated with your medication profile and we'll send a secure reset link.
          </p>

          {/* Form */}
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl" role="alert">
                {error}
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-800" htmlFor="email">Email Address</label>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">REQUIRED</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
                <input
                  className="min-h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 md:min-h-0"
                  id="email"
                  name="email"
                  placeholder="name@email.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-1.5 mt-2 text-slate-500">
                <svg className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span className="text-[11px] leading-tight text-slate-500">Ensure this matches your medication alert address</span>
              </div>
            </div>

            <button
              className="w-full bg-[#D92D20] hover:bg-[#B42318] active:scale-[0.99] text-white font-medium text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 cursor-pointer"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>

            <div className="bg-[#FFF5F5] border border-red-100 rounded-xl p-3 flex items-start gap-2.5 mt-3">
              <div className="text-red-500 flex-shrink-0 mt-0.5">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <p className="text-[11px] leading-snug text-slate-600">
                <strong className="font-semibold text-slate-800">Security note:</strong> Links expire in 30 minutes for your health data privacy.
              </p>
            </div>
          </form>

          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-700 transition-colors hover:text-slate-900 md:min-h-0"
            to="/login"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span>Back to Log in</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

