// src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLS } from './config';

const api = axios.create({
    baseURL: URLS.ORDER,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor → agrega token automáticamente
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    console.log('🔑 Token siendo enviado:', token ? `Sí (${token.substring(0, 20)}...)` : 'NO');
    console.log('📡 URL completa:', `${config.baseURL}${config.url}`);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;