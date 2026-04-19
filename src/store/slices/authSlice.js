import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/authService';

// Helper untuk AsyncStorage (sama seperti kode Anda)
const storageHelper = {
  setAuthData: async (token, user) => {
    try {
      await AsyncStorage.multiSet([
        ['userToken', token],
        ['userData', JSON.stringify(user)]
      ]);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  },
  clearAuthData: async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      // ✅ Ambil dari response.data.data
      const { token, user } = response.data.data;
      await storageHelper.setAuthData(token, user);
      return { token, user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (idToken, { rejectWithValue }) => {
    try {
      const response = await authService.googleLogin(idToken);
      const { token, user } = response.data.data;
      await storageHelper.setAuthData(token, user);
      return { token, user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Google login failed.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      // Backend returns data: { user, token } just like login
      const { token, user } = response.data.data;
      await storageHelper.setAuthData(token, user);
      return { token, user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await storageHelper.clearAuthData();
      return null;
    } catch (error) {
      console.error('Logout error:', error);
      return rejectWithValue('Logout failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem('userToken'),
        AsyncStorage.getItem('userData')
      ]);
      if (token && userData) {
        return { token, user: JSON.parse(userData), isAuthenticated: true };
      }
      return { token: null, user: null, isAuthenticated: false };
    } catch (error) {
      await storageHelper.clearAuthData();
      return rejectWithValue('Auth check failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetAuthState: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // Google Login
      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      })

      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });
  }
});

export const { setCredentials, clearError, resetAuthState } = authSlice.actions;
export default authSlice.reducer;