export interface Repair {
  id: number;
  ticket_no: string;
  reporter: string;
  location: string;
  device_name: string;
  problem: string;
  priority: 'ปกติ' | 'ด่วน' | 'ด่วนมาก' | 'วิกฤต';
  status: 'รอดำเนินการ' | 'กำลังซ่อม' | 'รออะไหล่' | 'เสร็จสิ้น';
  technician?: string;
  repair_note?: string;
  received_at: string;
  created_at: string;
  updated_at: string;
  is_read: number;
  project_name?: string;
  type?: 'repair' | 'claim';
}

export interface RepairLog {
  id: number;
  repair_id: number;
  action: string;
  user: string;
  note: string;
  created_at: string;
}

export interface DeviceChange {
  id: number;
  repair_id: number;
  old_serial: string;
  old_model: string;
  new_serial: string;
  new_model: string;
  changed_by: string;
  changed_at: string;
}

export interface RepairImage {
  id: number;
  repair_id: number;
  file_path: string;
  image_type: string;
  uploaded_at: string;
}

export interface RepairDetail extends Repair {
  logs: RepairLog[];
  images: RepairImage[];
  devices: DeviceChange[];
}

export interface RepairStats {
  total: number;
  pending: number;
  in_progress: number;
  on_hold: number;
  completed: number;
}

export interface RepairStatsResponse {
  repair: RepairStats;
  claim: RepairStats;
}

export interface InventoryItem {
  id: number;
  name: string;
  model?: string;
  description?: string;
  quantity: number;
  min_stock: number;
  requires_sn: number;
  image_path?: string;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalItem {
  id: number;
  withdrawal_id: number;
  inventory_id: number;
  quantity: number;
  item_name: string;
  item_model?: string;
  item_description?: string;
  item_image?: string;
  serial_numbers?: string;
  requires_sn?: number;
}

export interface Withdrawal {
  id: number;
  recipient: string;
  project_name?: string;
  location?: string;
  type: string;
  note?: string;
  created_at: string;
  items_summary?: string;
  items_missing_sn?: number;
  items: WithdrawalItem[];
}

export interface InventoryStats {
  total_items: number;
  critical: number;
  warning: number;
  optimal: number;
}

export interface DashboardData {
  kpis: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    critical_stock: number;
  };
  recentJobs: Repair[];
  recentLogs: (RepairLog & { ticket_no: string; device_name: string })[];
  technicians: { name: string; completed: number; active: number; total: number }[];
  inventory: {
    topUsed: { name: string; count: number }[];
    leastUsed: { name: string; count: number }[];
    criticalItems: { name: string; quantity: number; min_stock: number }[];
    recentTransactions: (InventoryTransaction & { product_name: string })[];
    recentWithdrawals: Withdrawal[];
  };
  analysis: {
    mostBroken: { name: string; count: number }[];
    overdue: { ticket_no: string; device_name: string; reporter: string; created_at: string; days_over: number }[];
    monthlyTrend: { month: string; count: number }[];
  };
  withdrawalBreakdown: { name: string; count: number }[];
  stockMovements: { month: string; added: number; withdrawn: number; borrowed: number; returned: number }[];
  purchaseOrders?: {
    total_po: number;
    pending_po: number;
    received_po: number;
    total_spent: number;
    recentPurchaseOrders: (PurchaseOrder & { total_cost?: number; total_items?: number })[];
  };
}

export interface GlobalSearchResults {
  inventory: InventoryItem[];
  repairs: Repair[];
  claims: Repair[];
}

export interface InventoryInstance {
  id: number;
  inventory_id: number;
  serial_number?: string;
  condition: 'New' | 'Good' | 'Fair' | 'Broken';
  status: 'In Stock' | 'Borrowed' | 'Withdrawn' | 'In Repair';
  current_location?: string;
  created_at: string;
}

export interface InventoryTransaction {
  id: number;
  inventory_id: number;
  instance_id?: number;
  transaction_type: 'ADD_STOCK' | 'WITHDRAW' | 'BORROW' | 'RETURN';
  quantity_added: number;
  quantity_withdrawn: number;
  quantity_borrowed: number;
  quantity_returned: number;
  project_name?: string;
  location?: string;
  user_name?: string;
  note?: string;
  created_at: string;
  product_name: string;
  product_model?: string;
  serial_number?: string;
  condition?: string;
  withdrawal_type?: string;
  withdrawal_id?: number;
  status?: string;
  return_image?: string;
}

export interface PurchaseOrderItem {
  id?: number;
  po_id?: number;
  inventory_id: number;
  quantity: number;
  unit_price: number;
  received_quantity?: number;
  item_name?: string;
  item_model?: string;
  current_stock?: number;
  min_stock?: number;
}

export interface PurchaseOrder {
  id: number;
  po_no: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Received' | 'Cancelled';
  created_by: string;
  note?: string;
  ordered_by?: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
  total_price?: number;
  items?: PurchaseOrderItem[];
}

