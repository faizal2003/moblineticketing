import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Helper untuk API calls
const bookingAPI = {
  fetchAvailableBuses: (params) => {
    // Map mobile params to backend expected keys
    const mappedParams = {
      origin: params.departure,
      destination: params.destination,
      date: params.departureDate.split('T')[0], // Get YYYY-MM-DD
      passengers: params.passengers
    };
    return api.get('/buses/search', { params: mappedParams });
  },
  
  selectSeats: (busId, scheduleId) => 
    api.get(`/buses/${busId}/seats`, { params: { schedule_id: scheduleId } }),
  
  createBooking: (bookingData) => {
    // Transform mobile data to backend structure
    const transformedData = {
      schedule_id: bookingData.scheduleId || bookingData.busId, // Backend uses schedule_id
      passengers: [
        {
          full_name: bookingData.passengerInfo.mainPassenger.name,
          id_number: bookingData.passengerInfo.mainPassenger.identityNumber,
          phone: bookingData.passengerInfo.mainPassenger.phone,
          seat_number: bookingData.seats[0]?.number
        },
        ...(bookingData.passengerInfo.additionalPassengers || []).map((p, index) => ({
          full_name: p.name,
          id_number: p.identityNumber,
          phone: p.phone || bookingData.passengerInfo.mainPassenger.phone,
          seat_number: bookingData.seats[index + 1]?.number
        }))
      ],
      notes: bookingData.passengerInfo.specialRequests
    };
    return api.post('/bookings', transformedData);
  },
  
  processPayment: (bookingId, paymentData) => 
    api.post(`/bookings/${bookingId}/confirm-payment`, paymentData),
  
  fetchBookingHistory: () => 
    api.get('/bookings'),
  
  fetchBookingDetail: (bookingId) => 
    api.get(`/bookings/${bookingId}`),
  
  cancelBooking: (bookingId) => 
    api.delete(`/bookings/${bookingId}`),
  
  downloadTicket: (ticketId) => 
    api.get(`/tickets/${ticketId}/qr`),
  
  checkSeatAvailability: (busId, scheduleId) => 
    api.get(`/buses/${busId}/seats`, { params: { schedule_id: scheduleId } }),
};

// Async Thunks dengan error handling yang konsisten
const createBookingThunk = (name, apiCall) => 
  createAsyncThunk(
    `booking/${name}`,
    async (data, { rejectWithValue }) => {
      try {
        const response = await apiCall(data);
        return response.data;
      } catch (error) {
        const errorMessage = error.response?.data?.message || 
                            error.message || 
                            'Request failed. Please try again.';
        return rejectWithValue(errorMessage);
      }
    }
  );

export const fetchAvailableBuses = createBookingThunk(
  'fetchAvailableBuses', 
  (params) => bookingAPI.fetchAvailableBuses(params)
);

export const selectSeats = createBookingThunk(
  'selectSeats', 
  ({ busId, scheduleId }) => bookingAPI.selectSeats(busId, scheduleId)
);

export const createBooking = createBookingThunk(
  'createBooking', 
  (bookingData) => bookingAPI.createBooking(bookingData)
);

export const processPayment = createBookingThunk(
  'processPayment', 
  ({ bookingId, paymentData }) => bookingAPI.processPayment(bookingId, paymentData)
);

export const fetchBookingHistory = createBookingThunk(
  'fetchBookingHistory', 
  () => bookingAPI.fetchBookingHistory()
);

export const fetchBookingDetail = createBookingThunk(
  'fetchBookingDetail', 
  (bookingId) => bookingAPI.fetchBookingDetail(bookingId)
);

export const cancelBooking = createBookingThunk(
  'cancelBooking', 
  (bookingId) => bookingAPI.cancelBooking(bookingId)
);

export const downloadTicket = createAsyncThunk(
  'booking/downloadTicket',
  async (ticketId, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.downloadTicket(ticketId);
      return { ticketId, data: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to download ticket';
      return rejectWithValue(errorMessage);
    }
  }
);

export const checkSeatAvailability = createBookingThunk(
  'checkSeatAvailability', 
  ({ busId, scheduleId }) => bookingAPI.checkSeatAvailability(busId, scheduleId)
);

// Initial state yang lebih sederhana dan aman
const initialState = {
  // Search
  searchParams: {
    departure: '',
    destination: '',
    departureDate: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
    passengers: 1,
    returnDate: null,
    tripType: 'one-way',
  },
  
  // Buses
  availableBuses: [],
  selectedBus: null,
  busLoading: false,
  busError: null,
  
  // Seats
  selectedSeats: [],
  seatMap: [],
  seatAvailability: [],
  seatLoading: false,
  seatError: null,
  
  // Passenger Info (tidak simpan data sensitif)
  passengerInfo: {
    mainPassenger: {
      name: '',
      email: '',
      phone: '',
    },
    additionalPassengers: [],
    pickupPoint: '',
    dropPoint: '',
    specialRequests: '',
  },
  
  // Booking (simpan minimal data)
  currentBooking: {
    id: null,
    bookingCode: '',
    status: 'draft',
    busId: null,
    seats: [],
    totalAmount: 0,
    paymentMethod: '',
    paymentStatus: 'pending',
    bookingDate: null,
  },
  
  // History
  bookingHistory: [],
  historyLoading: false,
  historyError: null,
  
  // Active booking
  activeBooking: null,
  bookingLoading: false,
  bookingError: null,
  
  // General state
  loading: false,
  error: null,
  success: false,
  lastUpdated: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    resetBookingState: () => initialState,
    
    updateSearchParams: (state, action) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    
    clearSearchResults: (state) => {
      state.availableBuses = [];
      state.selectedBus = null;
      state.busError = null;
    },
    
    selectBus: (state, action) => {
      state.selectedBus = action.payload;
      if (action.payload?.seatLayout) {
        state.seatMap = action.payload.seatLayout;
      }
    },
    
    toggleSeatSelection: (state, action) => {
      const seat = action.payload;
      const index = state.selectedSeats.findIndex(s => s.number === seat.number);
      
      if (index === -1 && state.selectedSeats.length < state.searchParams.passengers) {
        state.selectedSeats.push({
          ...seat,
          passengerIndex: state.selectedSeats.length,
        });
      } else if (index !== -1) {
        state.selectedSeats.splice(index, 1);
        // Reassign indices
        state.selectedSeats.forEach((s, idx) => {
          s.passengerIndex = idx;
        });
      }
    },
    
    clearSeatSelection: (state) => {
      state.selectedSeats = [];
    },
    
    updatePassengerInfo: (state, action) => {
      state.passengerInfo = { ...state.passengerInfo, ...action.payload };
    },
    
    addAdditionalPassenger: (state) => {
      const newPassenger = {
        name: '',
        identityNumber: '',
        identityType: 'KTP',
        ageGroup: 'adult',
      };
      state.passengerInfo.additionalPassengers.push(newPassenger);
    },
    
    removeAdditionalPassenger: (state, action) => {
      const index = action.payload;
      if (index >= 0 && index < state.passengerInfo.additionalPassengers.length) {
        state.passengerInfo.additionalPassengers.splice(index, 1);
      }
    },
    
    updateAdditionalPassenger: (state, action) => {
      const { index, data } = action.payload;
      if (state.passengerInfo.additionalPassengers[index]) {
        state.passengerInfo.additionalPassengers[index] = {
          ...state.passengerInfo.additionalPassengers[index],
          ...data,
        };
      }
    },
    
    // Hapus paymentInfo dari Redux - simpan di local state component saja
    setCurrentBooking: (state, action) => {
      state.currentBooking = { ...state.currentBooking, ...action.payload };
    },
    
    clearCurrentBooking: (state) => {
      state.currentBooking = initialState.currentBooking;
      state.selectedSeats = [];
      state.selectedBus = null;
      state.passengerInfo = initialState.passengerInfo;
    },
    
    setActiveBooking: (state, action) => {
      state.activeBooking = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
      state.busError = null;
      state.seatError = null;
      state.historyError = null;
      state.bookingError = null;
    },
    
    clearSuccess: (state) => {
      state.success = false;
    },
    
    updateBookingStatus: (state, action) => {
      const { bookingId, status, paymentStatus } = action.payload;
      
      // Helper untuk update booking di berbagai tempat
      const updateBooking = (booking) => {
        if (booking.id === bookingId) {
          booking.status = status;
          if (paymentStatus) booking.paymentStatus = paymentStatus;
        }
      };
      
      updateBooking(state.currentBooking);
      updateBooking(state.activeBooking);
      
      state.bookingHistory = state.bookingHistory.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status, ...(paymentStatus && { paymentStatus }) }
          : booking
      );
    },
    updatePaymentInfo: (state, action) => {
      state.currentBooking.paymentMethod = action.payload.method;
    },
  },
  extraReducers: (builder) => {
    // HAPUS fungsi addDefaultCases karena menyebabkan duplikasi
    // Sebagai gantinya, tulis semua handler secara eksplisit
    
    // Fetch Available Buses
    builder
      .addCase(fetchAvailableBuses.pending, (state) => {
        state.busLoading = true;
        state.busError = null;
      })
      .addCase(fetchAvailableBuses.fulfilled, (state, action) => {
        state.busLoading = false;
        state.availableBuses = action.payload.data || [];
      })
      .addCase(fetchAvailableBuses.rejected, (state, action) => {
        state.busLoading = false;
        state.busError = action.payload;
      });
    
    // Create Booking - TULIS SEMUA HANDLER SECARA LENGKAP
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.lastUpdated = new Date().toISOString();
        
        // Backend returns booking data in the 'data' field
        const bookingData = action.payload.data;
        if (bookingData) {
          // Store with backend consistent naming (snake_case)
          const newBooking = {
            id: bookingData.booking_id || bookingData.id,
            booking_code: bookingData.booking_code,
            total_price: bookingData.total_price,
            totalAmount: parseFloat(bookingData.total_price), // Alias for frontend compatibility
            total_passengers: bookingData.total_passengers,
            booking_status: bookingData.booking_status,
            payment_status: bookingData.payment_status,
            created_at: new Date().toISOString(),
            // Mock schedule for immediate display if not provided
            schedule: bookingData.schedule || state.selectedBus?.schedule || {
              bus_name: state.selectedBus?.name,
              departure_city: state.selectedBus?.departure,
              arrival_city: state.selectedBus?.destination,
              departure_time: state.selectedBus?.departureTime,
            },
            seats: bookingData.seats || state.selectedSeats,
          };
          
          state.currentBooking = newBooking;
          
          // Add to history
          state.bookingHistory.unshift(newBooking);
        }
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
    
    // Process Payment - TULIS SEMUA HANDLER SECARA LENGKAP
    builder
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.lastUpdated = new Date().toISOString();
        
        // Update current booking state
        state.currentBooking.payment_status = 'paid';
        state.currentBooking.booking_status = 'confirmed';
        state.currentBooking.paymentStatus = 'paid';
        state.currentBooking.status = 'confirmed';
        
        // Update in history too
        const bookingId = state.currentBooking.id;
        state.bookingHistory = state.bookingHistory.map(booking => 
          booking.id === bookingId 
            ? { ...booking, booking_status: 'confirmed', payment_status: 'paid' }
            : booking
        );
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
    
    // Fetch Booking History
    builder
      .addCase(fetchBookingHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchBookingHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.bookingHistory = action.payload.data || [];
      })
      .addCase(fetchBookingHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload;
      });
    
    // Fetch Booking Detail
    builder
      .addCase(fetchBookingDetail.pending, (state) => {
        state.bookingLoading = true;
        state.bookingError = null;
      })
      .addCase(fetchBookingDetail.fulfilled, (state, action) => {
        state.bookingLoading = false;
        state.activeBooking = action.payload.data;
      })
      .addCase(fetchBookingDetail.rejected, (state, action) => {
        state.bookingLoading = false;
        state.bookingError = action.payload;
      });
    
    // Check Seat Availability
    builder
      .addCase(checkSeatAvailability.pending, (state) => {
        state.seatLoading = true;
        state.seatError = null;
      })
      .addCase(checkSeatAvailability.fulfilled, (state, action) => {
        state.seatLoading = false;
        state.seatMap = action.payload.data.seat_layout || [];
      })
      .addCase(checkSeatAvailability.rejected, (state, action) => {
        state.seatLoading = false;
        state.seatError = action.payload;
      });
  },
});

export const {
  resetBookingState,
  updateSearchParams,
  clearSearchResults,
  selectBus,
  toggleSeatSelection,
  clearSeatSelection,
  updatePassengerInfo,
  addAdditionalPassenger,
  removeAdditionalPassenger,
  updateAdditionalPassenger,
  setCurrentBooking,
  clearCurrentBooking,
  setActiveBooking,
  clearError,
  clearSuccess,
  updateBookingStatus,
  updatePaymentInfo,
} = bookingSlice.actions;

// Selectors
export const selectSearchParams = (state) => state.booking.searchParams;
export const selectAvailableBuses = (state) => state.booking.availableBuses;
export const selectSelectedBus = (state) => state.booking.selectedBus;
export const selectBusLoading = (state) => state.booking.busLoading;
export const selectBusError = (state) => state.booking.busError;

export const selectSelectedSeats = (state) => state.booking.selectedSeats;
export const selectSeatMap = (state) => state.booking.seatMap;
export const selectSeatLoading = (state) => state.booking.seatLoading;
export const selectSeatError = (state) => state.booking.seatError;

export const selectPassengerInfo = (state) => state.booking.passengerInfo;
export const selectCurrentBooking = (state) => state.booking.currentBooking;
export const selectBookingHistory = (state) => state.booking.bookingHistory;
export const selectActiveBooking = (state) => state.booking.activeBooking;
export const selectHistoryLoading = (state) => state.booking.historyLoading;
export const selectHistoryError = (state) => state.booking.historyError;

export const selectLoading = (state) => state.booking.loading;
export const selectError = (state) => state.booking.error;
export const selectSuccess = (state) => state.booking.success;

// Memoize or simplify to avoid new reference if possible
export const selectPaymentInfo = (state) => state.booking.currentBooking.paymentMethod;

export default bookingSlice.reducer;