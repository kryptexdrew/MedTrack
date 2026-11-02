import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MedTrackProvider } from './context/MedTrackContext';
import MobileTabBar from './components/MobileTabBar';

// Pages
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import ResetPassword from './pages/ResetPassword';
import CheckInbox from './pages/CheckInbox';
import CreateNewPassword from './pages/CreateNewPassword';
import PasswordResetCompleted from './pages/PasswordResetCompleted';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import AddMedicine from './pages/AddMedicine';
import History from './pages/History';
import WeeklyReport from './pages/WeeklyReport';
import MonthlyReport from './pages/MonthlyReport';

// Protect routes that require login
function ProtectedRoute({ children }) {
  const { isAuthenticated, initialCheck } = useAuth();

  if (initialCheck) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to your medication profile...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <>
      {children}
      <MobileTabBar />
    </>
  ) : (
    <Navigate to="/login" replace />
  );
}

// Redirect already logged-in users away from auth pages
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, initialCheck } = useAuth();

  if (initialCheck) {
    return null;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

// Root redirect component
function RootRedirect() {
  const { isAuthenticated, initialCheck } = useAuth();
  if (initialCheck) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirection based on auth state */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/create-account"
        element={
          <PublicOnlyRoute>
            <CreateAccount />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <CreateAccount />
          </PublicOnlyRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/check-inbox" element={<CheckInbox />} />
      <Route path="/create-new-password" element={<CreateNewPassword />} />
      <Route path="/password-reset-completed" element={<PasswordResetCompleted />} />

      {/* Authenticated Application routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medicines"
        element={
          <ProtectedRoute>
            <Medicines />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medicines/add"
        element={
          <ProtectedRoute>
            <AddMedicine />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medicines/edit/:id"
        element={
          <ProtectedRoute>
            <AddMedicine />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Navigate to="/reports/weekly" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/weekly"
        element={
          <ProtectedRoute>
            <WeeklyReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/monthly"
        element={
          <ProtectedRoute>
            <MonthlyReport />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MedTrackProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </MedTrackProvider>
    </AuthProvider>
  );
}
