import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Bottom navigation for phone-sized screens (< 768px).
 *
 * NOTE: this bar is position: fixed. Any page that renders it must leave room
 * at the bottom (e.g. `pb-28 md:pb-8`) or the last content will sit behind it.
 * The bar hides itself on the Add/Edit Medicine screen, which uses its own
 * sticky save bar instead.
 */
const TABS = [
  {
    to: '/dashboard',
    label: 'Today',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M8 3v3m8-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/medicines',
    label: 'Medicines',
    icon: (
      <svg className="w-[22px] h-[22px] -rotate-45" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect height="8" rx="4" width="16" x="4" y="8" />
        <path d="M12 8v8" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 4v3.5h3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/reports/weekly',
    label: 'Reports',
    match: '/reports',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M4 20V10m5 10V4m5 16v-7m5 7V7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const isTabActive = (pathname, tab) => {
  if (tab.match) return pathname.startsWith(tab.match);
  return pathname === tab.to;
};

export default function MobileTabBar() {
  const { pathname } = useLocation();

  // The form has its own sticky action bar; a second fixed bar would cover it.
  if (pathname === '/medicines/add' || pathname.startsWith('/medicines/edit/')) {
    return null;
  }

  const [today, medicines, history, reports] = TABS;

  const renderTab = (tab) => {
    const active = isTabActive(pathname, tab);
    return (
      <Link
        key={tab.to}
        to={tab.to}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 pb-1 pt-2 text-[10px] font-semibold transition-colors ${
          active ? 'text-red-600' : 'text-slate-500 active:text-slate-800'
        }`}
      >
        <span className={active ? 'text-red-600' : 'text-slate-400'}>{tab.icon}</span>
        <span className="leading-none">{tab.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {renderTab(today)}
        {renderTab(medicines)}

        <div className="flex items-start justify-center">
          <Link
            to="/medicines/add"
            aria-label="Add medicine"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-300/50 ring-4 ring-white transition-transform active:scale-95"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {renderTab(history)}
        {renderTab(reports)}
      </div>
    </nav>
  );
}
