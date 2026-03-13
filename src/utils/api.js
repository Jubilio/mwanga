import axios from 'axios';

let baseURL = import.meta.env.VITE_API_URL || '';
if (!baseURL.endsWith('/api')) {
  baseURL = `${baseURL.replace(/\/$/, '')}/api`;
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
