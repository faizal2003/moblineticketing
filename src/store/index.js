// src/store/index.js - PERBAIKAN FINAL
export { store } from './store';

// Hanya ekspor actions, jangan semua
export {
  login,
  register,
  logout,
  checkAuthStatus,
  setCredentials,
  clearError,
  resetAuthState
} from './slices/authSlice';

export {
  fetchAvailableBuses,
  selectSeats,
  createBooking,
  processPayment,
  fetchBookingHistory,
  fetchBookingDetail,
  cancelBooking,
  downloadTicket,
  checkSeatAvailability,
  resetBookingState,
  updateSearchParams,
  selectBus,
  toggleSeatSelection
} from './slices/bookingSlice';