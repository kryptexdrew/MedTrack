import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Attach JWT token to all outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medtrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // The backend uses this to compute UTC `scheduledAt` values and to decide
  // when a dose's grace period really ends for this user.
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) config.headers['X-Timezone'] = timeZone;
  } catch {
    // Intl unavailable: the backend falls back to its own timezone.
  }
  return config;
});

// Intercept responses for global error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If backend server is unreachable, we can provide helpful feedback
    if (error.code === 'ERR_NETWORK') {
      console.warn('Backend server is offline or unreachable. Please start backend on port 8000.');
    }
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;

