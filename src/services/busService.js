import api from './api';

export const busService = {
  searchBuses: async params => {
    const response = await api.get('/buses/search', { params });
    return response;
  },

  getBusDetails: async busId => {
    const response = await api.get(`/buses/${busId}`);
    return response;
  },

  getSeatLayout: async (busId, scheduleId) => {
    const response = await api.get(`/buses/${busId}/seats`, {
      params: { schedule_id: scheduleId },
    });
    return response;
  },

  bookTicket: async bookingData => {
    const response = await api.post('/bookings', bookingData);
    return response;
  },

  getMyBookings: async () => {
    const response = await api.get('/bookings');
    return response;
  },

  getBookingDetail: async bookingId => {
    const response = await api.get(`/bookings/${bookingId}`);
    return response;
  },

  getPopularRoutes: async () => {
    const response = await api.get('/buses/popular-routes');
    return response;
  },

  cancelBooking: async (bookingId, reason = '') => {
    const response = await api.delete(`/bookings/${bookingId}`, {
      params: { reason },
      data: { reason },
    });
    return response;
  },

  getRoutes: async () => {
    const response = await api.get('/routes');
    return response;
  },

  getTickets: async bookingId => {
    const response = await api.get(`/bookings/${bookingId}/tickets`);
    return response;
  },

  getRefunds: async () => {
    const response = await api.get('/refunds');
    return response;
  },

  getRefundDetail: async refundId => {
    const response = await api.get(`/refunds/${refundId}`);
    return response;
  },
};
