import api from './api';

export const conductorService = {
  getTodaySchedule: async () => {
    const response = await api.get('/conductor/today-schedule');
    return response;
  },

  getPassengerList: async (scheduleId) => {
    const response = await api.get(`/conductor/schedules/${scheduleId}/passengers`);
    return response;
  },

  scanTicket: async (ticketCode, action = 'scan') => {
    const response = await api.post('/conductor/scan', { 
      ticket_code: ticketCode,
      action: action 
    });
    return response;
  },

  updateTicketStatus: async (ticketId, status, notes = '') => {
    const response = await api.put(`/conductor/tickets/${ticketId}/status`, { 
      status,
      notes
    });
    return response;
  },
};