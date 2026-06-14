export interface Repair {
  id: number;
  ticket_no: string;
  reporter: string;
  location: string;
  station_id?: number;
  station_area_id?: number;
  station_name?: string;
  station_code?: string;
  station_area_name?: string;
  station_province?: string;
  station_region?: string;
  location_snapshot?: string;
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
  storage_location?: string;
  unit_price?: number;
  warranty_months?: number;
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
  station_id?: number;
  station_area_id?: number;
  station_name?: string;
  station_code?: string;
  station_area_name?: string;
  station_province?: string;
  station_region?: string;
  location_snapshot?: string;
  type: string;
  note?: string;
  return_due_date?: string;
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
  people?: {
    topRecipients: { name: string; count: number; items: number; last_withdrawal: string }[];
    pendingReturns: { name: string; product_name: string; serial_number?: string; transaction_type: string; withdrawal_type?: string; days_out: number }[];
    pendingReturnsCount: number;
  };
  purchaseOrders?: {
    total_po: number;
    pending_po: number;
    received_po: number;
    total_spent: number;
    recentPurchaseOrders: (PurchaseOrder & { total_cost?: number; total_items?: number })[];
  };
  supervisors?: {
    name: string;
    station_count: number;
    stations_list: string;
    total_repairs: number;
    active_repairs: number;
  }[];
  unassignedStationsCount?: number;
  claimsKpis?: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
  inventoryConditions?: {
    condition: string;
    count: number;
  }[];
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
  station_id?: number;
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
  location_snapshot?: string;
  station_id?: number;
  station_name?: string;
  station_code?: string;
  station_province?: string;
  station_area_name?: string;
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
  return_due_date?: string;
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
  company_name?: string;
  vendor_address?: string;
  vendor_phone?: string;
  vendor_contact_person?: string;
  vendor_tax_id?: string;
  buyer_department?: string;
  buyer_phone?: string;
  buyer_email?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  item_count?: number;
  total_price?: number;
  items?: PurchaseOrderItem[];
}

export interface VendorContact {
  company_name: string;
  vendor_address?: string;
  vendor_phone?: string;
  vendor_contact_person?: string;
  vendor_tax_id?: string;
}

export interface Station {
  id: number;
  code: string;
  name: string;
  station_type: string;
  highway_no: string;
  km_post?: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'BOTH' | 'NONE';
  region: string;
  province: string;
  responsible_person?: string; // ชื่อผู้รับผิดชอบสถานี — optional ในเลเยอร์ type เพราะสถานีเก่าอาจไม่มี
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface StationArea {
  id: number;
  station_id: number;
  name: string;
  status: number;
}

export interface StationStats {
  repair_total: number;
  claim_total: number;
  pending: number;
  in_progress: number;
  on_hold: number;
  completed: number;
  withdrawal_total: number;
}

export interface StationDetailResponse {
  station: Station;
  stats: StationStats;
  repairs: Repair[];
  claims: Repair[];
  withdrawals: Withdrawal[];
  transactions: InventoryTransaction[];
}

export interface Company {
  id: number;
  name_th: string;
  name_en: string;
  name_short?: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  website: string;
  is_default: number;
  created_at?: string;
  updated_at?: string;
}

export interface Permissions {
  delete?: {
    repairs?: boolean;
    claims?: boolean;
    withdrawals?: boolean;
    inventory?: boolean;
    purchase_orders?: boolean;
    transactions?: boolean;
    stations?: boolean;
  };
  manage?: {
    settings?: boolean;
    stations?: boolean;
    companies?: boolean;
    users?: boolean;
  };
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  is_full: boolean;
  permissions: Permissions;
  force_password_change: boolean;
  is_active: boolean;
  last_login?: string | null;
  created_by?: number | null;
  created_at?: string;
}

export interface CompanyLogo {
  id: number;
  label: string;
  file_path: string;
  is_default: number;
  company_id: number | null;
  uploaded_at?: string;
}

export interface SystemSettings {
  line_token_repair?: string;
  line_token_stock?: string;
  [key: string]: string | undefined;
}


export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  old_data?: string | null;
  new_data?: string | null;
  user_name: string;
  created_at: string;
}

export interface AssetLifecycleItem {
  instance_id: number;
  serial_number: string;
  status: string;
  current_location: string;
  station_id: number;
  installed_at: string;
  inventory_id: number;
  device_name: string;
  model?: string;
  unit_price: number;
  warranty_months: number;
  station_name?: string;
  station_code?: string;
  total_repair_cost: number;
  age_months: number;
  is_expired_warranty: boolean;
  cost_exceeds_threshold: boolean;
  recommended_replacement: boolean;
}

