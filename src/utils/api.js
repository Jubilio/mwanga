import axios from 'axios';

const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const isDev = import.meta.env.DEV;
const isLocalhostApi = /^(https?:)?\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(envApiUrl);

let baseURL = '/api';
if (isDev && isLocalhostApi) {
  baseURL = '/api';
} else if (envApiUrl && !isDev) {
  baseURL = envApiUrl.replace(/\/$/, '');
  if (!baseURL.endsWith('/api')) {
    baseURL = `${baseURL}/api`;
  }
} else if (isDev && envApiUrl && !isLocalhostApi) {
  // Local development but pointing to remote API
  baseURL = '/api'; // Force local proxy
}

const api = axios.create({
  baseURL,
});

// Interceptor for Auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mwanga-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
