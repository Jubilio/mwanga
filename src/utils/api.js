import axios from 'axios';
import i18n from '../i18n';

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
  config.headers['Accept-Language'] = i18n.resolvedLanguage || 'pt';
  const token = localStorage.getItem('mwanga-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
