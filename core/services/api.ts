import axios from 'axios';

// Key used for persisting session token in client storage
export const AUTH_TOKEN_KEY = 'sami_auth_token';

// Secure centralized Axios instance for SAMI B2B Gateway Router
export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to attach JWT token to all API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiry / 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/2fa');
      if (!isAuthRoute) {
        console.warn('[SAMI Security] Session token invalid or expired. Clearing local token.');
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
    return Promise.reject(error);
  }
);

// Helper to set or clear token explicitly
export const setBearerToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
  }
};
