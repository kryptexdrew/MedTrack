import React from 'react';

export default function StatusHeader() {
  return (
    <header className="w-full pt-6 px-8 sm:px-12 flex items-center justify-between" data-purpose="system-status-header">
      <div className="inline-flex items-center space-x-2 text-[13px] font-medium text-slate-600 tracking-normal">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
        <span>System Operational &amp; HIPAA Compliant</span>
      </div>
    </header>
  );
}

