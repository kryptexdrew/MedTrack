import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';

export default function PasswordResetCompleted() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'Your MedTrack account';
  const [countdown, setCountdown] = useState(5);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPaused && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isPaused && countdown === 0) {
      navigate('/login');
    }
  }, [countdown, isPaused, navigate]);

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-[#f8fafc] px-4 py-10 text-slate-800 sm:px-6">
      <main className="w-full flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-[570px] bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.05)] border border-slate-100 p-8 sm:p-10 relative flex flex-col items-center">
          {/* Header Icon Badge */}
          <div className="relative mb-5">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center border border-red-100 shadow-[0_0_25px_-3px_rgba(239,68,68,0.25)]">
              <svg className="w-7 h-7 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path clipRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" fillRule="evenodd"></path>
              </svg>
            </div>
          </div>

          {/* Status Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[10.5px] font-bold tracking-widest text-red-600 uppercase border border-red-100 mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600"></span>
            <span>MedTrack Access</span>
            <span className="text-red-400">•</span>
            <span>Security Cleared</span>
          </div>

          <h1 className="text-2xl sm:text-[27px] font-extrabold text-slate-900 tracking-tight text-center mb-3">
            Password reset complete
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 text-center leading-relaxed max-w-[430px] mb-7">
            Your password has been updated. For your security, all previous sessions were signed out. Log in with your new password to continue.
          </p>

          {/* Account Details Box */}
          <div className="w-full bg-slate-50/80 rounded-xl border border-slate-200/70 p-4 mb-5">
            <div className="flex items-center justify-between pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase leading-none">Account</div>
                  <div className="text-[13px] font-medium text-slate-800 mt-0.5">{email}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active &amp; Secure
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200/60 bg-white/60 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl flex items-center gap-2 text-slate-500 text-[11px]">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span>All other active sessions and devices have been safely logged out for your clinical privacy.</span>
            </div>
          </div>

          {/* Auto Redirect Timer Bar */}
          <div className="w-full flex items-center justify-between text-xs mb-3.5 px-0.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px]">
              <span className="text-red-600 font-bold">↻</span>
              <span>
                {countdown > 0 ? (
                  <>Redirecting to sign in in <span className="font-bold text-slate-800">{countdown}s....</span></>
                ) : (
                  <span>Redirecting...</span>
                )}
              </span>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="inline-flex min-h-11 cursor-pointer items-center text-[11px] font-medium text-red-600 hover:text-red-700 hover:underline focus:outline-none md:min-h-0"
              type="button"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 mb-5">
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl text-[13.5px] transition-colors shadow-sm"
            >
              <span>Continue to Log In</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </Link>

            <Link
              to="/"
              className="w-full flex items-center justify-center bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 font-medium py-2.5 px-4 rounded-xl text-[13px] transition-colors"
            >
              Back to MedTrack Home
            </Link>
          </div>

          {/* Security Warning Callout */}
          <div className="w-full bg-[#fefdf5] border border-[#fef08a] rounded-xl p-4 text-left mb-6">
            <div className="flex items-start gap-2.5">
              <div className="text-[#ca8a04] flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-[12.5px] font-bold text-amber-900 leading-snug">
                  Did not request this change?
                </h4>
                <p className="text-[11.5px] text-amber-800 leading-relaxed mt-1">
                  If you did not initiate this reset, your account might be compromised. Immediately notify your primary caregiver or lock your medication vault.
                </p>
                <button
                  type="button"
                  onClick={() => alert('Clinical Dispatch Alert sent. Support has been notified.')}
                  className="mt-2.5 inline-flex min-h-11 cursor-pointer items-center gap-1 text-[11.5px] font-bold text-red-600 hover:text-red-700 md:min-h-0"
                >
                  <span>Contact Clinical Security Dispatch</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-[11.5px] text-slate-500">
            Need elder assistance or spoken setup?{' '}
            <button
              type="button"
              onClick={() => alert('Caregiver line: (800) 555-MEDS')}
              className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-red-600 hover:underline md:min-h-0"
            >
              Contact 24/7 Caregiver Support
            </button>
          </div>
        </div>

        {/* Security Token Strip */}
        <div className="w-full max-w-[570px] mt-4 px-3 flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path clipRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" fillRule="evenodd"></path>
            </svg>
            <span>Reset completed</span>
          </div>
          <div className="tracking-widest">SHA-256 token verified</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

