import axios from 'axios';

// Use VITE_REACT_APP_API_URL or VITE_API_URL from environment, fallback to '/api' for proxy
const rawBaseUrl = import.meta.env.VITE_REACT_APP_API_URL || import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL;
const API_BASE_URL = rawBaseUrl 
  ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api`) 
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token and cache-buster for PDF requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url && config.url.includes('/pdf')) {
    config.params = { ...config.params, t: new Date().getTime() };
  }
  return config;
});

export default api;
