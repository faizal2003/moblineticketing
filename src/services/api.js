import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

const getBaseURL = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'https://5f8f-157-15-41-36.ngrok-free.app'; // IP komputer Anda
    } else {
      return 'http://localhost:8000/api'; // untuk iOS simulator
    }
  } else {
    return 'https://api.busticketing.com/api';
  }
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // 10 detik timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log('Full URL:', config.baseURL + config.url);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error('API Error Response:', error.response?.data);

    // Log error details
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
    });

    // Handle specific error codes
    if (error.response?.status === 401) {
      // Token expired or invalid
      try {
        await AsyncStorage.multiRemove(['userToken', 'userData']);
        // Anda bisa dispatch action untuk logout di sini
        // atau navigasi ke login screen
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }

      // Bisa tambahkan navigation logic di sini
      // Misal: navigation.navigate('Login')
    }

    // Handle network errors
    if (!error.response) {
      Alert.alert(
        'Network Error',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      Alert.alert(
        'Server Error',
        'Something went wrong on our server. Please try again later.',
        [{ text: 'OK' }]
      );
    }

    return Promise.reject(error);
  }
);

export default api;