import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNotification } from '../components/Layout';
import { printElement } from '../utils/pdfGenerator';
import { formatDateThai, parseDate } from '../utils/formatDate';
import DatePicker from '../components/ui/DatePicker';
import {
  Boxes,
  Zap,
  ArrowUpRight,
  ShoppingBag,
  Download,
  Printer,
  Loader2,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { inventoryApi, withdrawalApi, purchaseOrderApi } from '../api';
import type { InventoryItem, Withdrawal, PurchaseOrder, AssetLifecycleItem } from '../types';

type ReportType = 'inventory_summary' | 'low_stock' | 'withdrawals' | 'purchase_orders' | 'asset_lifecycle';

const Reports: React.FC = () => {
  const { notify } = useNotification();
  const [loadingReport, setLoadingReport] = useState<ReportType | null>(null);

  // States for date range filters
  const [quickFilter, setQuickFilter] = useState<'all' | '30_days' | '3_months' | '1_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // States to hold print templates data
  const [printData, setPrintData] = useState<{
    type: ReportType;
    title: string;
    dateStr: string;
    periodStr?: string;
    headers: string[];
    rows: (string | number)[][];
    totals?: { label: string; value: string }[];
  } | null>(null);

  const toLocalYYYYMMDD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleQuickFilterChange = (filterType: 'all' | '30_days' | '3_months' | '1_year' | 'custom') => {
    setQuickFilter(filterType);
    const end = new Date();
    if (filterType === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (filterType === '30_days') {
      const start = new Date();
      start.setDate(end.getDate() - 30);
      setStartDate(toLocalYYYYMMDD(start));
      setEndDate(toLocalYYYYMMDD(end));
    } else if (filterType === '3_months') {
      const start = new Date();
      start.setMonth(end.getMonth() - 3);
      setStartDate(toLocalYYYYMMDD(start));
      setEndDate(toLocalYYYYMMDD(end));
    } else if (filterType === '1_year') {
      const start = new Date();
      start.setFullYear(end.getFullYear() - 1);
      setStartDate(toLocalYYYYMMDD(start));
      setEndDate(toLocalYYYYMMDD(end));
    } else if (filterType === 'custom') {
      if (!startDate) {
        const start = new Date();
        start.setMonth(end.getMonth() - 1);
        setStartDate(toLocalYYYYMMDD(start));
      }
      if (!endDate) {
        setEndDate(toLocalYYYYMMDD(end));
      }
    }
  };

  const handleDateChange = (field: 'start' | 'end', val: string) => {
    setQuickFilter('custom');
    if (field === 'start') {
      setStartDate(val);
    } else {
      setEndDate(val);
    }
  };

  const fetchReportData = async (type: ReportType) => {
    setLoadingReport(type);
    try {
      if (type === 'inventory_summary') {
        const data = await inventoryApi.getAll({ search: '' });
        return data;
      } else if (type === 'low_stock') {
        const data = await inventoryApi.getAll({ search: '' });
        return data.filter(item => item.quantity < item.min_stock);
      } else if (type === 'withdrawals') {
        const data = await withdrawalApi.getAll();
        if (startDate || endDate) {
          const startMs = startDate ? new Date(startDate + 'T00:00:00').getTime() : -Infinity;
          const endMs = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;
          return data.filter(w => {
            if (!w.created_at) return false;
            const itemMs = parseDate(w.created_at).getTime();
            return itemMs >= startMs && itemMs <= endMs;
          });
        }
        return data;
      } else if (type === 'purchase_orders') {
        const data = await purchaseOrderApi.getAll();
        if (startDate || endDate) {
          const startMs = startDate ? new Date(startDate + 'T00:00:00').getTime() : -Infinity;
          const endMs = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;
          return data.filter(po => {
            const dateToUse = po.created_at || po.updated_at;
            if (!dateToUse) return false;
            const itemMs = parseDate(dateToUse).getTime();
            return itemMs >= startMs && itemMs <= endMs;
          });
        }
        return data;
      } else if (type === 'asset_lifecycle') {
        const data = await inventoryApi.getLifecycleReport();
        return data;
      }
      return [];
    } catch {
      notify('ไม่สามารถดึงข้อมูลสำหรับออกรายงานได้', 'error');
      return null;
    } finally {
      setLoadingReport(null);
    }
  };

  const getCsvString = (headers: string[], rows: (string | number)[][]): string => {
    // UTF-8 BOM to prevent Thai garbled characters in Excel
    const BOM = '\uFEFF';
    
    const escapeCsvCell = (val: string | number | null | undefined): string => {
      const str = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    };

    const headerLine = headers.map(escapeCsvCell).join(',');
    const rowLines = rows.map(row => row.map(escapeCsvCell).join(','));

    return BOM + [headerLine, ...rowLines].join('\n');
  };

  const downloadCsv = (csvStr: string, fileName: string) => {
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async (type: ReportType) => {
    const data = await fetchReportData(type);
    if (!data) return;

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const getPeriodSuffix = () => {
      if (startDate && endDate) {
        return `_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}`;
      }
      return `_${today}`;
    };
    const periodSuffix = getPeriodSuffix();

    if (type === 'inventory_summary') {
      const items = data as InventoryItem[];
      const headers = ['รหัสพัสดุ', 'ชื่ออะไหล่/พัสดุ', 'รุ่น (Model)', 'จำนวนคงเหลือในคลัง', 'เกณฑ์แจ้งเตือนสต็อกต่ำ', 'ต้องการ S/N', 'อัปเดตล่าสุด'];
      const rows = items.map(i => [
        i.id,
        i.name,
        i.model || '-',
        i.quantity,
        i.min_stock,
        i.requires_sn === 1 ? 'ใช่' : 'ไม่ใช่',
        formatDateThai(i.updated_at)
      ]);
      const csvStr = getCsvString(headers, rows);
      downloadCsv(csvStr, `inventory_summary_${today}`);
    } 
    else if (type === 'low_stock') {
      const items = data as InventoryItem[];
      const headers = ['รหัสพัสดุ', 'ชื่ออะไหล่/พัสดุ', 'รุ่น (Model)', 'จำนวนคงเหลือคลัง', 'เกณฑ์ขั้นต่ำ', 'จำนวนที่ขาดแคลน (ต้องซื้อเพิ่ม)'];
      const rows = items.map(i => [
        i.id,
        i.name,
        i.model || '-',
        i.quantity,
        i.min_stock,
        i.min_stock - i.quantity
      ]);
      const csvStr = getCsvString(headers, rows);
      downloadCsv(csvStr, `low_stock_reorder_${today}`);
    } 
    else if (type === 'withdrawals') {
      const items = data as Withdrawal[];
      const headers = ['รหัสใบเบิก', 'ผู้รับ/ผู้เบิก', 'ประเภทงานเบิก', 'โครงการ/หน้างาน', 'รหัสสถานี', 'ชื่อสถานี', 'พื้นที่ย่อย', 'จังหวัด', 'ภูมิภาค', 'รายการพัสดุที่เบิก', 'วันที่ทำรายการ'];
      const rows = items.map(w => [
        w.id,
        w.recipient,
        w.type,
        w.project_name || '-',
        w.station_code || '-',
        w.station_name || w.location_snapshot || w.location || '-',
        w.station_area_name || '-',
        w.station_province || '-',
        w.station_region || '-',
        w.items_summary || '-',
        formatDateThai(w.created_at)
      ]);
      const csvStr = getCsvString(headers, rows);
      downloadCsv(csvStr, `withdrawals_report${periodSuffix}`);
    } 
    else if (type === 'purchase_orders') {
      const items = data as PurchaseOrder[];
      const headers = ['เลขที่ใบสั่งซื้อ', 'ประเภทผู้ออกเอกสาร', 'จำนวนรายการอุปกรณ์', 'สถานะใบสั่งซื้อ', 'วันที่อัปเดตล่าสุด', 'หมายเหตุประกอบ'];
      const rows = items.map(po => [
        po.po_no,
        po.created_by === 'System' ? 'ระบบอัตโนมัติ' : 'เจ้าหน้าที่คลัง',
        po.item_count || 0,
        po.status === 'Draft' ? 'แบบร่าง' : po.status === 'Pending' ? 'สั่งซื้อแล้ว/รอตรวจรับ' : po.status === 'Received' ? 'รับของแล้ว' : 'ยกเลิก',
        formatDateThai(po.updated_at),
        po.note || '-'
      ]);
      const csvStr = getCsvString(headers, rows);
      downloadCsv(csvStr, `purchase_orders${periodSuffix}`);
    }
    else if (type === 'asset_lifecycle') {
      const items = data as AssetLifecycleItem[];
      const headers = ['Serial Number', 'ชื่ออุปกรณ์', 'รุ่น (Model)', 'ด่านติดตั้ง', 'ราคาอะไหล่/ชิ้น', 'ระยะรับประกัน (เดือน)', 'อายุการใช้งาน (เดือน)', 'ค่าซ่อมบำรุงสะสม', 'หมดประกันแล้ว', 'ค่าซ่อมบำรุงเกิน 70%', 'คำแนะนำ'];
      const rows = items.map(i => [
        i.serial_number,
        i.device_name,
        i.model || '-',
        i.station_name ? `${i.station_code ? `[${i.station_code}] ` : ''}${i.station_name}` : i.current_location,
        i.unit_price,
        i.warranty_months,
        i.age_months,
        i.total_repair_cost,
        i.is_expired_warranty ? 'หมดประกัน' : 'ยังไม่หมดประกัน',
        i.cost_exceeds_threshold ? 'เกิน 70%' : 'ไม่เกิน 70%',
        i.recommended_replacement ? 'แนะนำให้สับเปลี่ยน (Replace)' : 'ใช้งานต่อได้ (Keep)'
      ]);
      const csvStr = getCsvString(headers, rows);
      downloadCsv(csvStr, `asset_lifecycle_analysis_${today}`);
    }

    notify('ส่งออกข้อมูล Excel (CSV) สำเร็จ');
  };

  const handlePrintPDF = async (type: ReportType) => {
    const data = await fetchReportData(type);
    if (!data) return;

    const dateStr = formatDateThai(new Date().toISOString());
    const getPeriodTextThai = (reportType: ReportType) => {
      if (reportType === 'inventory_summary' || reportType === 'low_stock') {
        return 'ข้อมูล ณ วันที่ปัจจุบัน';
      }
      
      if (startDate && endDate) {
        return `ช่วงเวลา: ${formatDateThai(startDate)} ถึง ${formatDateThai(endDate)}`;
      } else if (startDate) {
        return `ช่วงเวลา: ตั้งแต่ ${formatDateThai(startDate)}`;
      } else if (endDate) {
        return `ช่วงเวลา: จนถึง ${formatDateThai(endDate)}`;
      }
      return 'ช่วงเวลา: ข้อมูลทั้งหมด';
    };
    
    const periodStr = getPeriodTextThai(type);
    let title = '';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let totals: { label: string; value: string }[] | undefined = undefined;

    if (type === 'inventory_summary') {
      const items = data as InventoryItem[];
      title = 'รายงานสรุปพัสดุคงคลังทั้งหมด (Inventory Balance)';
      headers = ['รหัส', 'ชื่อพัสดุ', 'รุ่น (Model)', 'คงเหลือในคลัง', 'เกณฑ์ขั้นต่ำ', 'สถานะสต็อก'];
      rows = items.map(i => {
        const isLow = i.quantity < i.min_stock;
        const isOut = i.quantity === 0;
        const status = isOut ? 'สินค้าหมด' : isLow ? 'สต็อกต่ำกว่าเกณฑ์' : 'ปกติ';
        return [
          i.id,
          i.name,
          i.model || '-',
          `${i.quantity} ชิ้น`,
          `${i.min_stock} ชิ้น`,
          status
        ];
      });
      totals = [{ label: 'จำนวนรายการพัสดุรวม:', value: `${items.length} รายการ` }];
    } 
    else if (type === 'low_stock') {
      const items = data as InventoryItem[];
      title = 'รายงานรายการพัสดุสต็อกต่ำที่จำเป็นต้องสั่งซื้อ (Low Stock Reorder)';
      headers = ['รหัส', 'ชื่อพัสดุอะไหล่', 'รุ่น (Model)', 'คงคลังปัจจุบัน', 'เกณฑ์ขั้นต่ำ', 'แนะนำสั่งซื้อเพิ่ม'];
      rows = items.map(i => [
        i.id,
        i.name,
        i.model || '-',
        `${i.quantity} ชิ้น`,
        `${i.min_stock} ชิ้น`,
        `${i.min_stock - i.quantity} ชิ้น`
      ]);
      totals = [{ label: 'จำนวนรายการพัสดุที่วิกฤต:', value: `${items.length} รายการ` }];
    } 
    else if (type === 'withdrawals') {
      const items = data as Withdrawal[];
      title = 'รายงานสรุปการเบิกจ่ายพัสดุคลัง (Stock Withdrawals)';
      headers = ['รหัสเบิก', 'ผู้รับ/ผู้เบิก', 'ประเภทเบิก', 'โครงการ/สถานที่', 'รายการพัสดุที่เบิก', 'วันที่เบิก'];
      rows = items.map(w => [
        `#${w.id}`,
        w.recipient,
        w.type,
        w.project_name 
          ? `${w.project_name} (${w.station_code ? `[${w.station_code}] ` : ''}${w.station_name || w.location_snapshot || w.location || '-'}${w.station_area_name ? ` - ${w.station_area_name}` : ''}${w.station_province ? ` จ.${w.station_province}` : ''})` 
          : `${w.station_code ? `[${w.station_code}] ` : ''}${w.station_name || w.location_snapshot || w.location || '-'}${w.station_area_name ? ` - ${w.station_area_name}` : ''}${w.station_province ? ` จ.${w.station_province}` : ''}`,
        w.items_summary || '-',
        formatDateThai(w.created_at).split(' เวลา ')[0]
      ]);
      totals = [{ label: 'จำนวนรายการใบเบิกทั้งหมด:', value: `${items.length} ใบงาน` }];
    } 
    else if (type === 'purchase_orders') {
      const items = data as PurchaseOrder[];
      title = 'รายงานสรุปประวัติจัดสั่งซื้อสินค้าคลัง (Purchase Orders)';
      headers = ['เลขที่ใบสั่งซื้อ', 'ออกโดย', 'จำนวนสินค้า', 'สถานะจัดซื้อ', 'ปรับปรุงล่าสุด'];
      rows = items.map(po => {
        const stat = po.status === 'Draft' ? 'แบบร่าง' : po.status === 'Pending' ? 'สั่งซื้อแล้ว/รอตรวจรับ' : po.status === 'Received' ? 'ตรวจรับเรียบร้อย' : 'ยกเลิก';
        return [
          po.po_no,
          po.created_by === 'System' ? 'ระบบอัตโนมัติ' : 'เจ้าหน้าที่คลัง',
          `${po.item_count} รายการ`,
          stat,
          formatDateThai(po.updated_at).split(' เวลา ')[0]
        ];
      });
      totals = [
        { label: 'จำนวนใบสั่งซื้อรวม:', value: `${items.length} ฉบับ` }
      ];
    }
    else if (type === 'asset_lifecycle') {
      const items = data as AssetLifecycleItem[];
      title = 'รายงานวิเคราะห์รอบอายุและค่าใช้จ่ายสะสม (Asset Lifecycle & Maintenance Analysis)';
      headers = ['Serial No.', 'อุปกรณ์', 'ด่าน/สถานที่', 'อายุใช้งาน', 'ค่าซ่อมสะสม', 'สถานะ/คำแนะนำ'];
      rows = items.map(i => {
        const expiredStr = i.is_expired_warranty ? 'หมดประกัน' : 'ในประกัน';
        const costStr = i.cost_exceeds_threshold ? 'ค่าซ่อมเกิน 70%' : 'ปกติ';
        const recStr = i.recommended_replacement 
          ? `แนะนำสับเปลี่ยน (${costStr === 'ปกติ' ? expiredStr : costStr})` 
          : 'ปกติ (Keep)';
        return [
          i.serial_number,
          `${i.device_name} (${i.model || '-'})`,
          i.station_name ? `${i.station_code || ''} ${i.station_name}` : i.current_location,
          `${i.age_months} ด. (${expiredStr})`,
          `${i.total_repair_cost.toLocaleString()} บ.`,
          recStr
        ];
      });
      const replacedCount = items.filter(i => i.recommended_replacement).length;
      totals = [
        { label: 'อุปกรณ์ในวิเคราะห์ทั้งหมด:', value: `${items.length} รายการ` },
        { label: 'อุปกรณ์แนะนำสับเปลี่ยน (Replace):', value: `${replacedCount} รายการ` }
      ];
    }

    setPrintData({ type, title, dateStr, periodStr, headers, rows, totals });

    // Renders the component, wait short time, then print
    setTimeout(() => {
      printElement('report-print-container', title);
    }, 400);
  };

  const getSelectedRangeLabel = () => {
    if (startDate && endDate) {
      return `${formatDateThai(startDate)} ถึง ${formatDateThai(endDate)}`;
    }
    if (startDate) {
      return `ตั้งแต่ ${formatDateThai(startDate)}`;
    }
    if (endDate) {
      return `จนถึง ${formatDateThai(endDate)}`;
    }
    return 'ข้อมูลทั้งหมด';
  };

  return (
    <div className="reports-page" style={{ padding: '2rem 2.5rem', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-title">
          <h2>รายงานสรุปสถิติสำหรับผู้บริหาร</h2>
          <p>ระบบออกเอกสารรายงาน พิมพ์ A4 PDF และดาวน์โหลดข้อมูลพัสดุในรูปแบบ Excel สำหรับส่งข้อมูลเสนอผู้บริหาร</p>
        </div>
      </div>

      {/* Date Filter Panel */}
      <Card style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.06)', color: '#3b82f6', padding: '8px', borderRadius: '8px' }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>เลือกช่วงเวลาของรายงาน</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>กำหนดขอบเขตวันที่ของข้อมูลสำหรับรายงานประวัติเบิกจ่ายและใบสั่งซื้อ</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-app)', padding: '4px', borderRadius: '10px' }}>
              {([
                { label: 'ทั้งหมด', value: 'all' },
                { label: '30 วันล่าสุด', value: '30_days' },
                { label: '3 เดือนล่าสุด', value: '3_months' },
                { label: '1 ปีล่าสุด', value: '1_year' },
                { label: 'กำหนดเอง', value: 'custom' }
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleQuickFilterChange(opt.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: quickFilter === opt.value ? 'var(--bg-card)' : 'transparent',
                    color: quickFilter === opt.value ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: quickFilter === opt.value ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            
            {/* Date Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>ตั้งแต่</span>
              <DatePicker
                value={startDate}
                onChange={(val) => handleDateChange('start', val)}
                placeholder="เริ่มวันที่"
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>ถึง</span>
              <DatePicker
                value={endDate}
                onChange={(val) => handleDateChange('end', val)}
                placeholder="สิ้นสุดวันที่"
              />
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Report 1: Inventory Balance */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.06)', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
              <Boxes size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>รายงานสรุปพัสดุคงคลังทั้งหมด</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ภาพรวมจำนวนพัสดุคงคลังทั้งหมด</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, minHeight: '40px' }}>
            แสดงรายละเอียดปริมาณพัสดุอะไหล่ในสต็อก เกณฑ์ระดับความปลอดภัย สถานะภาพคงเหลือ และการตรวจนับพัสดุภาพรวมของระบบ
          </p>
          
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '8px', marginTop: 'auto' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
            ข้อมูลสรุปยอดคงเหลือจริง ณ เวลาปัจจุบัน
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="outline"
              disabled={loadingReport !== null}
              onClick={() => handleExportExcel('inventory_summary')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {loadingReport === 'inventory_summary' ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              ส่งออกไฟล์ Excel
            </Button>
            <Button
              disabled={loadingReport !== null}
              onClick={() => handlePrintPDF('inventory_summary')}
              className="btn-report-blue"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <Printer size={14} />
              พิมพ์ PDF (A4)
            </Button>
          </div>
        </Card>

        {/* Report 2: Low Stock Alert */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)', color: '#f59e0b', padding: '10px', borderRadius: '10px' }}>
              <Zap size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>รายงานรายการพัสดุสต็อกต่ำ</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>พัสดุที่วิกฤตต่ำกว่าเกณฑ์ความปลอดภัย</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, minHeight: '40px' }}>
            สรุปข้อมูลสินค้าคงคลังที่ต่ำกว่าเกณฑ์ขั้นต่ำ (min_stock) เพื่อใช้พิจารณาดำเนินการสั่งจัดซื้อพัสดุเพิ่มเติม
          </p>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '8px', marginTop: 'auto' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></span>
            ข้อมูลวิเคราะห์จากสถานะคงเหลือจริง ณ เวลาปัจจุบัน
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="outline"
              disabled={loadingReport !== null}
              onClick={() => handleExportExcel('low_stock')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {loadingReport === 'low_stock' ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              ส่งออกไฟล์ Excel
            </Button>
            <Button
              disabled={loadingReport !== null}
              onClick={() => handlePrintPDF('low_stock')}
              className="btn-report-orange"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <Printer size={14} />
              พิมพ์ PDF (A4)
            </Button>
          </div>
        </Card>

        {/* Report 3: Stock Withdrawals */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
              <ArrowUpRight size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>รายงานประวัติเบิกจ่ายพัสดุ</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ติดตามประวัติการเบิกออกใช้งานของพนักงาน</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, minHeight: '40px' }}>
            แสดงประวัติการเบิกสินค้าพัสดุไปใช้ โครงการที่ได้รับพัสดุ วันเวลาที่ส่งออกพัสดุ และชื่อของพนักงานผู้เบิกอุปกรณ์
          </p>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '8px', marginTop: 'auto' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
            ช่วงเวลาที่เลือก: {getSelectedRangeLabel()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="outline"
              disabled={loadingReport !== null}
              onClick={() => handleExportExcel('withdrawals')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {loadingReport === 'withdrawals' ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              ส่งออกไฟล์ Excel
            </Button>
            <Button
              disabled={loadingReport !== null}
              onClick={() => handlePrintPDF('withdrawals')}
              className="btn-report-green"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <Printer size={14} />
              พิมพ์ PDF (A4)
            </Button>
          </div>
        </Card>

        {/* Report 4: Purchase Orders */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.06)', color: '#6366f1', padding: '10px', borderRadius: '10px' }}>
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>รายงานประวัติจัดสั่งซื้อพัสดุ</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>สรุปประวัติและสถานะการจัดสั่งซื้อ</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, minHeight: '40px' }}>
            รายงานสรุปประวัติจัดสั่งซื้อพัสดุจากผู้ขาย สถานะการตรวจรับ รายละเอียดเลขใบสั่งซื้อ และจำนวนรายการที่ดำเนินการ
          </p>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '8px', marginTop: 'auto' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#6366f1', borderRadius: '50%' }}></span>
            ช่วงเวลาที่เลือก: {getSelectedRangeLabel()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="outline"
              disabled={loadingReport !== null}
              onClick={() => handleExportExcel('purchase_orders')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {loadingReport === 'purchase_orders' ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              ส่งออกไฟล์ Excel
            </Button>
            <Button
              disabled={loadingReport !== null}
              onClick={() => handlePrintPDF('purchase_orders')}
              className="btn-report-indigo"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <Printer size={14} />
              พิมพ์ PDF (A4)
            </Button>
          </div>
        </Card>

        {/* Report 5: Asset Cost & Lifecycle Analytics */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.06)', color: '#f43f5e', padding: '10px', borderRadius: '10px' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>รายงานวิเคราะห์รอบอายุและค่าใช้จ่าย</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>วิเคราะห์รอบอายุหมดประกันและค่าใช้จ่ายสะสม</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, minHeight: '40px' }}>
            แสดงรายการทรัพย์สินที่มีอายุใช้งานมากกว่าระยะรับประกัน หรือค่าซ่อมแซมสะสมที่จุดด่านซ่อมสูงเกินกว่า 70% ของมูลค่าเครื่องใหม่
          </p>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '8px', marginTop: 'auto' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#f43f5e', borderRadius: '50%' }}></span>
            วิเคราะห์คำแนะนำในการสับเปลี่ยนทรัพย์สิน (Keep/Replace)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="outline"
              disabled={loadingReport !== null}
              onClick={() => handleExportExcel('asset_lifecycle')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {loadingReport === 'asset_lifecycle' ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              ส่งออกไฟล์ Excel
            </Button>
            <Button
              disabled={loadingReport !== null}
              onClick={() => handlePrintPDF('asset_lifecycle')}
              className="btn-report-rose"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#f43f5e', color: '#ffffff', border: 'none' }}
            >
              <Printer size={14} />
              พิมพ์ PDF (A4)
            </Button>
          </div>
        </Card>
      </div>

      {/* --- Hidden Print Templates --- */}
      {printData && (
        <div id="report-print-container" style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', backgroundColor: 'white', boxSizing: 'border-box' }}>
          <div style={{ padding: '12mm', fontFamily: 'Sarabun, sans-serif', color: '#0f172a', position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '297mm', boxSizing: 'border-box' }}>
            
            {/* Top Gradient Accent Band */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '6px', 
              backgroundImage: 'linear-gradient(90deg, #475569, #64748b)' 
            }} />

            {/* Header section (Dashboard Style) */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '2px solid #e2e8f0', 
              paddingBottom: '10px', 
              marginTop: '4px'
            }}>
              <div>
                <h1 style={{ color: '#0f172a', fontSize: '18px', margin: 0, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.3px' }}>
                  CMA - ระบบซ่อมบำรุงและจัดสรรพัสดุกลาง
                </h1>
                <p style={{ margin: '3px 0 0 0', fontSize: '10.5px', color: '#475569', fontWeight: 700 }}>
                  ระบบบริหารจัดการงานซ่อมบำรุงและพัสดุอุปกรณ์
                </p>
                <p style={{ margin: '1px 0 0 0', fontSize: '8.5px', color: '#64748b' }}>
                  รายงานบริหารจัดการระบบอย่างเป็นทางการส่งคณะผู้บริหาร
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  color: '#0f172a',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  display: 'inline-block'
                }}>
                  รายงานสรุปและสถิติ
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                  พิมพ์เมื่อ: {printData.dateStr}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div style={{ 
              textAlign: 'center', 
              margin: '6px 0',
              padding: '8px',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {printData.title.toUpperCase()}
              </h3>
              {printData.periodStr && (
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', fontWeight: 700 }}>
                  ประจำช่วงเวลา: {printData.periodStr}
                </div>
              )}
            </div>

            {/* Table (Dashboard Card Style) */}
            <div style={{ 
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
                <colgroup>
                  {((type: ReportType): string[] => {
                    switch (type) {
                      case 'inventory_summary':
                      case 'low_stock':
                        return ['10%', '25%', '20%', '15%', '15%', '15%'];
                      case 'withdrawals':
                        return ['10%', '15%', '15%', '30%', '20%', '10%'];
                      case 'purchase_orders':
                        return ['20%', '20%', '15%', '15%', '15%', '15%'];
                      case 'asset_lifecycle':
                        return ['15%', '30%', '20%', '15%', '10%', '10%'];
                      default:
                        return [];
                    }
                  })(printData.type).map((w, idx) => (
                    <col key={idx} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#475569', color: '#ffffff' }}>
                    {printData.headers.map((h, index) => (
                      <th
                        key={index}
                        style={{
                          padding: '6px 8px',
                          textAlign: index === 0 ? 'left' : (index === printData.headers.length - 1 ? 'right' : 'center'),
                          fontWeight: 700,
                          fontSize: '11px',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal',
                          overflowWrap: 'break-word'
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {printData.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: rowIdx % 2 === 1 ? '#f8fafc' : 'transparent'
                      }}
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          style={{
                            padding: '6px 8px',
                            textAlign: cellIdx === 0 ? 'left' : (cellIdx === row.length - 1 ? 'right' : 'center'),
                            color: cell === 'สินค้าหมด' || (typeof cell === 'string' && cell.startsWith('แนะนำให้สับเปลี่ยน')) ? '#ef4444' : cell === 'สต็อกต่ำกว่าเกณฑ์' ? '#f59e0b' : '#334155',
                            fontWeight: cell === 'สินค้าหมด' || cell === 'สต็อกต่ำกว่าเกณฑ์' || (typeof cell === 'string' && cell.startsWith('แนะนำให้สับเปลี่ยน')) ? 700 : 'normal',
                            wordWrap: 'break-word',
                            whiteSpace: 'normal',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            {printData.totals && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end', 
                marginTop: '4px', 
                padding: '8px 12px', 
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                width: 'fit-content',
                alignSelf: 'flex-end',
                minWidth: '240px',
                boxSizing: 'border-box'
              }}>
                {printData.totals.map((total, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', fontWeight: 700, margin: '2px 0' }}>
                    <span style={{ color: '#475569' }}>{total.label}</span>
                    <span style={{ textAlign: 'right', color: '#0f172a', marginLeft: '24px' }}>{total.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Signatures (Stamp Boxes) */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: 'auto', 
              paddingTop: '12px', 
              borderTop: '1.5px solid #e2e8f0', 
              fontSize: '11px',
              gap: '16px'
            }}>
              <div style={{ 
                border: '1.5px dashed #cbd5e1',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                padding: '10px',
                textAlign: 'center',
                flex: 1
              }}>
                <div style={{ borderBottom: '1px solid #94a3b8', width: '130px', margin: '2px auto 6px auto', height: '18px' }}></div>
                <p style={{ margin: 0, fontWeight: 700 }}>ลงชื่อ ............................................</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>( .......................................... )</p>
                <div style={{ marginTop: '6px', fontWeight: 800, color: '#475569' }}>เจ้าหน้าที่คลังอุปกรณ์</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>ผู้จัดทำรายงาน</div>
                <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>วันที่: ....../……/……</div>
              </div>
              
              <div style={{ 
                border: '1.5px dashed #cbd5e1',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                padding: '10px',
                textAlign: 'center',
                flex: 1
              }}>
                <div style={{ borderBottom: '1px solid #94a3b8', width: '130px', margin: '2px auto 6px auto', height: '18px' }}></div>
                <p style={{ margin: 0, fontWeight: 700 }}>ลงชื่อ ............................................</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>( .......................................... )</p>
                <div style={{ marginTop: '6px', fontWeight: 800, color: '#475569' }}>ผู้มีอำนาจอนุมัติ / ผู้บริหาร</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>ผู้ตรวจทานและลงนาม</div>
                <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>วันที่: ....../……/……</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '8px', 
              color: '#94a3b8',
              marginTop: '6px',
              paddingTop: '4px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <span>ระบบบริหารสรุปสถิติออกรายงานโดยอัตโนมัติ CMA</span>
              <span>Ref: CMA-RP-AUTO | พิมพ์เป็นเอกสารหลักฐานการบริหารจัดการ</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
