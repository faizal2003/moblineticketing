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

  scanTicket: async (ticketCode) => {
    // Backend can accept ticket_code directly
    const response = await api.post('/conductor/scan', { 
      ticket_code: ticketCode,
      action: 'board' 
    });
    return response;
  },

  validateTicket: async (ticketCode) => {
    const response = await api.post('/conductor/scan', { 
      ticket_code: ticketCode,
      action: 'scan' 
    });
    return response;
  },

  updateTicketStatus: async (ticketId, status, notes = '') => {
    // status: pending, boarded, missed
    const response = await api.put(`/conductor/tickets/${ticketId}/status`, { 
      status,
      notes
    });
    return response;
  },

  getLogs: async () => {
    const response = await api.get('/conductor/logs');
    return response;
  },

  reportDeparture: async (scheduleId, notes = '') => {
    const response = await api.post('/conductor/report-departure', {
      schedule_id: scheduleId,
      actual_time: new Date().toISOString(),
      notes
    });
    return response;
  },

  reportArrival: async (scheduleId, notes = '') => {
    const response = await api.post('/conductor/report-arrival', {
      schedule_id: scheduleId,
      actual_time: new Date().toISOString(),
      notes
    });
    return response;
  }
};