import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = 'https://mwanga-financial-api.onrender.com/api'; // I'll use a placeholder or detect from env

const api = axios.create({
  baseURL,
});

// Interceptor for Auth
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('mwanga-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
