import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_REACT_APP_API_URL || import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL;
const API_BASE_URL = rawBaseUrl 
  ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api`) 
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.url && config.url.includes('/pdf')) {
      config.params = { ...config.params, t: new Date().getTime() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 & 429
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('jwt_token');
    }

    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limit exceeded. Please wait.');
    }

    return Promise.reject(error);
  }
);

export default api;
