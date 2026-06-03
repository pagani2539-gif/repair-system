import axios from 'axios';
import type { Repair, RepairDetail, RepairStatsResponse, InventoryItem, Withdrawal, InventoryStats, DashboardData, GlobalSearchResults, PurchaseOrder, PurchaseOrderItem } from './types';

const API_URL = import.meta.env.DEV 
  ? 'http://localhost:5221/api' 
  : '/api';

export const UPLOAD_URL = import.meta.env.DEV 
  ? 'http://localhost:5221' 
  : window.location.origin;

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
  getAll: async (params: { status?: string; location?: string; search?: string; type?: string; priority?: string; sortBy?: string }) => {
    const response = await api.get<Repair[]>('/repairs', { params });
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get<RepairStatsResponse>('/repairs/stats');
    return response.data;
  },
  
  getDashboardStats: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get<DashboardData>('/repairs/dashboard-stats', { params });
    return response.data;
  },
  
  getUnreadCount: async () => {
    const response = await api.get<{ repair: number; claim: number; lowStock: number; total: number; count: number }>('/repairs/unread-count');
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
    project_name?: string;
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

export const inventoryApi = {
  getAll: async (params: { search?: string }) => {
    const response = await api.get<InventoryItem[]>('/inventory', { params });
    return response.data;
  },
  getById: async (id: number | string) => {
    const response = await api.get<InventoryItem>(`/inventory/${id}`);
    return response.data;
  },
  getInstances: async (id: number | string) => {
    const response = await api.get<Array<{ id: number; serial_number: string; condition: string }>>(`/inventory/${id}/instances`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get<InventoryStats>('/inventory/stats');
    return response.data;
  },
  create: async (formData: FormData) => {
    const response = await api.post('/inventory', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  update: async (id: number | string, formData: FormData) => {
    const response = await api.patch(`/inventory/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  addSerialNumbers: async (id: number | string, serialNumbers: string[]) => {
    const response = await api.post(`/inventory/${id}/serial-numbers`, {
      serial_numbers: serialNumbers
    });
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  }
};

export const withdrawalApi = {
  getAll: async () => {
    const response = await api.get<Withdrawal[]>('/withdrawals');
    return response.data;
  },
  getById: async (id: number | string) => {
    const response = await api.get<Withdrawal>(`/withdrawals/${id}`);
    return response.data;
  },
  updateItemSn: async (withdrawalId: number | string, itemId: number | string, serialNumbers: string[]) => {
    const response = await api.put(`/withdrawals/${withdrawalId}/items/${itemId}/serial-numbers`, {
      serial_numbers: serialNumbers
    });
    return response.data;
  },
  create: async (data: {
    recipient: string;
    project_name?: string;
    type: string;
    note?: string;
    items: Array<{ inventory_id: number; quantity: number; serial_numbers?: string[] }>;
  }) => {
    const response = await api.post('/withdrawals', data);
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/withdrawals/${id}`);
    return response.data;
  }
};

export const transactionApi = {
  getAll: async () => {
    const response = await api.get('/transactions');
    return response.data;
  },
  getLatest: async () => {
    const response = await api.get<{
      id: number;
      transaction_type: 'ADD_STOCK' | 'WITHDRAW' | 'BORROW' | 'RETURN';
      quantity_added: number;
      quantity_withdrawn: number;
      quantity_borrowed: number;
      quantity_returned: number;
      product_name: string;
      user_name?: string;
    } | null>('/transactions/latest');
    return response.data;
  },
  addStock: async (data: {
    inventory_id: number;
    quantity: number;
    user_name: string;
    note?: string;
    serial_numbers?: string[];
  }) => {
    const response = await api.post('/transactions/add-stock', data);
    return response.data;
  },
  borrow: async (data: {
    inventory_id: number;
    instance_id?: number;
    quantity: number;
    user_name: string;
    project_name?: string;
    location?: string;
    note?: string;
  }) => {
    const response = await api.post('/transactions/borrow', data);
    return response.data;
  },
  return: async (data: FormData | Record<string, unknown>) => {
    const response = await api.post('/transactions/return', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  }
};

export const searchApi = {
  globalSearch: async (q: string) => {
    const response = await api.get<GlobalSearchResults>('/search', { params: { q } });
    return response.data;
  }
};

export const purchaseOrderApi = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const response = await api.get<PurchaseOrder[]>('/purchase-orders', { params });
    return response.data;
  },
  getById: async (id: number | string) => {
    const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
    return response.data;
  },
  create: async (data: { po_no?: string; note?: string; ordered_by?: string; project_name?: string; items: PurchaseOrderItem[] }) => {
    const response = await api.post('/purchase-orders', data);
    return response.data;
  },
  update: async (id: number | string, data: { status?: string; note?: string; ordered_by?: string; project_name?: string; items?: PurchaseOrderItem[] }) => {
    const response = await api.patch(`/purchase-orders/${id}`, data);
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/purchase-orders/${id}`);
    return response.data;
  },
  receive: async (id: number | string, data?: { items?: { inventory_id: number; received_quantity: number }[] }) => {
    const response = await api.post(`/purchase-orders/${id}/receive`, data);
    return response.data;
  },
  autoGenerate: async () => {
    const response = await api.post('/purchase-orders/auto-generate');
    return response.data;
  }
};

