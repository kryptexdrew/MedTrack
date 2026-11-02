import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('medtrack_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('medtrack_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [initialCheck, setInitialCheck] = useState(true);

  // Validate existing token with MongoDB on startup
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('medtrack_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res && res.user) {
            setUser(res.user);
            localStorage.setItem('medtrack_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          logout();
        }
      }
      setInitialCheck(false);
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('medtrack_token', res.token);
        localStorage.setItem('medtrack_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      return { success: false, message: res?.message || 'Login failed' };
    } catch (err) {
      return { 
        success: false, 
        message: err.message || 'Invalid email or password' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      if (res && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('medtrack_token', res.token);
        localStorage.setItem('medtrack_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      return { success: false, message: res?.message || 'Registration failed' };
    } catch (err) {
      return { 
        success: false, 
        message: err.message || 'Registration failed. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('medtrack_token');
    localStorage.removeItem('medtrack_user');
  };

  const forgotPassword = async (email) => {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      return { success: true, message: res?.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const resetPassword = async (token, password, confirmPassword) => {
    try {
      const res = await api.post('/auth/reset-password', { token, password, confirmPassword });
      return { success: true, message: res?.message, email: res?.email };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        initialCheck,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
