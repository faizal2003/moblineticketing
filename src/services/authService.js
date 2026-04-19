import api from './api';

export const authService = {
  login: async (email, password, role) => {
    const response = await api.post('/login', { email, password, role });
    return response;
  },

  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response;
  },

  logout: async () => {
    const response = await api.post('/logout');
    return response;
  },

  // Fungsi baru untuk Google Login
  googleLogin: async (idToken) => {
    const response = await api.post('/auth/google', { id_token: idToken });
    return response;
  },
};