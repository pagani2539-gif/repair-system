import axios from 'axios';
import type { Repair, RepairDetail, RepairStatsResponse } from './types';

const API_URL = 'http://localhost:5221/api';

const api = axios.create({
  baseURL: API_URL,
});

// VERY AGGRESSIVE DEBUGGING
api.interceptors.response.use(response => {
  if (response.config.url?.includes('/repairs/stats')) {
    console.log('--- STATS API RAW DATA ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('pending type:', typeof response.data.pending);
    console.log('completed type:', typeof response.data.completed);
  }
  return response;
});

export const repairApi = {
  getAll: async (params: { status?: string; location?: string; search?: string; type?: string }) => {
    const response = await api.get<Repair[]>('/repairs', { params });
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get<RepairStatsResponse>('/repairs/stats');
    return response.data;
  },
  
  getUnreadCount: async () => {
    const response = await api.get<{ count: number }>('/repairs/unread-count');
    return response.data;
  },
  
  getById: async (id: number | string) => {
    const response = await api.get<RepairDetail>(`/repairs/${id}`);
    return response.data;
  },
  
  create: async (formData: FormData) => {
    const response = await api.post<{ id: number; ticket_no: string }>('/repairs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  createClaim: async (formData: FormData) => {
    const response = await api.post<{ id: number; ticket_no: string }>('/repairs/claim', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  updateStatus: async (id: number | string, data: { 
    status: string; 
    user: string; 
    note: string; 
    technician?: string; 
    repair_note?: string 
  }) => {
    const response = await api.patch(`/repairs/${id}/status`, data);
    return response.data;
  },

  update: async (id: number | string, data: {
    reporter: string;
    location: string;
    device_name: string;
    problem: string;
    priority: string;
  }) => {
    const response = await api.patch(`/repairs/${id}`, data);
    return response.data;
  },
  
  replaceDevice: async (id: number | string, data: {
    old_serial: string;
    old_model: string;
    new_serial: string;
    new_model: string;
    technician: string;
  }) => {
    const response = await api.post(`/repairs/${id}/replace-device`, data);
    return response.data;
  },

  delete: async (id: number | string) => {
    const response = await api.delete(`/repairs/remove/${id}`);
    return response.data;
  },

  markAsRead: async (id: number | string) => {
    const response = await api.patch(`/repairs/${id}/read`);
    return response.data;
  }
};
