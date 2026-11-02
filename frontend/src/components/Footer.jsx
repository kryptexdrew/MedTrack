import React from 'react';

export default function Footer({ className = "" }) {
  return (
    <footer className={`w-full pb-8 pt-4 px-4 flex flex-col items-center space-y-3 ${className}`} data-purpose="site-footer">
      <div className="inline-flex flex-wrap items-center justify-center gap-y-1 gap-x-2 text-[11px] sm:text-xs text-slate-500 bg-white/90 border border-slate-200/80 rounded-full px-4 py-1.5 shadow-2xs">
        <span className="inline-flex items-center text-slate-700 font-medium">
          <svg className="w-3.5 h-3.5 mr-1.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
          End-to-End Encrypted Medication Profile
        </span>
        <span className="text-slate-300">•</span>
        <a className="inline-flex min-h-9 items-center px-1 hover:text-slate-800 transition-colors cursor-pointer md:min-h-0 md:px-0" onClick={(e) => { e.preventDefault(); alert("MedTrack HIPAA Privacy Policy: All medical data is protected with 256-bit encryption."); }} href="#privacy">
          Privacy Policy
        </a>
        <span className="text-slate-300">•</span>
        <a className="inline-flex min-h-9 items-center px-1 hover:text-slate-800 transition-colors cursor-pointer md:min-h-0 md:px-0" onClick={(e) => { e.preventDefault(); alert("MedTrack Terms of Care: Dedicated to patient adherence and clinical accuracy."); }} href="#terms">
          Terms of Care
        </a>
      </div>
      <p className="text-[11px] sm:text-[12px] text-slate-400 font-normal">
        © 2026 MedTrack Healthcare Systems, Inc. All rights reserved.
      </p>
    </footer>
  );
}

