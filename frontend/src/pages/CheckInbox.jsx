import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatusHeader from '../components/StatusHeader';
import Footer from '../components/Footer';

export default function CheckInbox() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [isEditing, setIsEditing] = useState(false);
  const [countdown, setCountdown] = useState(48);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { forgotPassword } = useAuth();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setResendMessage('Enter an email address to resend the link.');
      return;
    }

    setResending(true);
    setResendMessage('');
    const res = await forgotPassword(normalizedEmail);
    setResending(false);

    if (res.success) {
      setCountdown(60);
      setResendMessage('If an account exists for that email, a new reset link has been sent.');
    } else {
      setResendMessage(res.message || 'Could not resend the link. Please try again.');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-[#f8fafc] p-4 text-slate-800 antialiased selection:bg-red-100 selection:text-red-700 sm:p-6 md:p-8">
      <StatusHeader />

      <main className="w-full flex-grow flex items-center justify-center my-6">
        <div className="w-full max-w-[540px] bg-white rounded-2xl p-6 sm:p-10 card-shadow border border-slate-100 relative" data-purpose="verification-card">
          {/* Top Pill Icon with Badge */}
          <div className="flex justify-center mb-5">
            <div className="relative w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500 transform -rotate-45" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.5 6h3a4.5 4.5 0 014.5 4.5v0a4.5 4.5 0 01-4.5 4.5h-3a4.5 4.5 0 01-4.5-4.5v0A4.5 4.5 0 0110.5 6z" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M15 6v9" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
            </div>
          </div>

          {/* Card Titles */}
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold tracking-wider text-red-500 uppercase mb-1">MedTrack Access</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Check your inbox</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              We've dispatched an authenticated reset key and recovery link directly to:
            </p>
          </div>

          {/* Target Destination Container */}
          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 text-red-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase leading-tight">Target Destination</span>
                {isEditing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-0.5 w-full min-h-9 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-800 md:min-h-0"
                    autoFocus
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate block">{email}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 md:min-h-0"
              type="button"
            >
              <span>{isEditing ? 'Save' : 'Edit'}</span>
            </button>
          </div>

          {/* Action Button: Open Email Client */}
          <a
            className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-red-200 transition-colors text-sm mb-3.5"
            href={`mailto:${email}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span>Open Email Client</span>
          </a>

          {/* Resend Status Row */}
          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span>
                {countdown > 0 ? (
                  <>Available to resend in <strong className="text-slate-800 font-semibold">{countdown}s</strong></>
                ) : (
                  <span className="text-emerald-600 font-medium">Link ready to resend</span>
                )}
              </span>
            </div>
            <button
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors md:min-h-0 ${
                countdown > 0 || resending
                  ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                  : 'text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer'
              }`}
              type="button"
            >
              {resending ? 'Sending...' : 'Resend Link'}
            </button>
          </div>

          {resendMessage && (
            <p className="text-[11px] text-slate-600 text-center -mt-3 mb-4" role="status">
              {resendMessage}
            </p>
          )}

          {/* Security Protocol Box */}
          <div className="bg-red-50/60 border border-red-100 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-1.5 mb-1 text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="text-[11px] font-bold tracking-wider uppercase">Security Protocol</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-5">
              The encrypted reset link expires in <strong className="text-slate-800 font-semibold">30 minutes</strong> and can only be used once. If your message does not arrive promptly, check your spam or institutional filtering inbox.
            </p>
          </div>

          {/* Instructions Stepper */}
          <ol className="space-y-3.5 mb-8 text-xs text-slate-600">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[11px] font-bold text-red-500">1</span>
              <span className="leading-relaxed">Follow the single-use URL enclosed in the verification dispatch.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[11px] font-bold text-red-500">2</span>
              <span className="leading-relaxed">Establish a new HIPAA–compliant credential to immediately restore medication alerts.</span>
            </li>
          </ol>

          <div className="border-t border-slate-100 pt-5 text-center space-y-2">
            <div>
              <Link className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 md:min-h-0" to="/login">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span>Return to Log in</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

