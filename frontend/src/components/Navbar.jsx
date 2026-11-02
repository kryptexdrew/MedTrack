import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Today' },
  { to: '/medicines', label: 'Medicines' },
  { to: '/history', label: 'History' },
  { to: '/reports/weekly', label: 'Reports', match: '/reports' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const menuRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return 'JD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const isLinkActive = (isActive, link) =>
    link.match ? pathname.startsWith(link.match) : isActive;

  // Close the profile menu whenever the route changes.
  useEffect(() => {
    setShowDropdown(false);
  }, [pathname]);

  // Close the profile menu on outside tap/click and on Escape.
  useEffect(() => {
    if (!showDropdown) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowDropdown(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Nav Container */}
        <div className="flex min-w-0 items-center space-x-8 sm:space-x-10">
          <Link to="/dashboard" className="flex shrink-0 items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm shadow-red-200">
              <svg className="h-4 w-4 -rotate-45" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M19.5 12c0-3.866-3.134-7-7-7a7 7 0 000 14c3.866 0 7-3.134 7-7zM8.5 8.5l7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">MedTrack</span>
          </Link>

          {/* Main Nav Links — desktop only; phones use the bottom tab bar */}
          <nav className="hidden items-center space-x-1 text-sm font-medium md:flex md:space-x-2">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 transition-colors ${
                    isLinkActive(isActive, link)
                      ? 'bg-red-50 font-semibold text-red-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowDropdown((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 active:bg-red-100 md:h-9 md:w-9"
            title="User Profile Menu"
            aria-label="User profile menu"
            aria-haspopup="menu"
            aria-expanded={showDropdown}
            type="button"
          >
            {getInitials(user?.fullName)}
          </button>

          {showDropdown && (
            <div
              role="menu"
              className="animate-fadeIn absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-100 bg-white py-2 shadow-lg md:w-56"
            >
              <div className="border-b border-slate-100 px-4 py-2">
                <p className="text-xs font-bold text-slate-800">{user?.fullName || 'Juan Dela Cruz'}</p>
                <p className="truncate text-[11px] text-slate-500">{user?.email || 'juan@email.com'}</p>
                <span className="mt-1 inline-block rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {user?.role === 'caregiver' ? 'Caregiver Account' : 'Self-Care Account'}
                </span>
              </div>
              <div className="py-1">
                <Link
                  to="/medicines/add"
                  role="menuitem"
                  onClick={() => setShowDropdown(false)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-xs text-slate-700 hover:bg-slate-50 md:py-2"
                >
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Add New Medicine
                </Link>
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-medium text-red-600 hover:bg-red-50 md:py-2"
                >
                  <svg className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
