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

