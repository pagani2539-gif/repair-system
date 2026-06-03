import React, { useEffect, useState } from 'react';
import { purchaseOrderApi, inventoryApi } from '../api';
import { useApi } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { useNotification } from '../components/Layout';
import { formatDateThai } from '../utils/formatDate';
import {
  ShoppingBag,
  Plus,
  Search,
  ChevronRight,
  Trash,
  Check,
  X,
  Printer,
  Sparkles,
  Clock,
  Zap,
  AlertTriangle
} from 'lucide-react';
import type { PurchaseOrder, InventoryItem, PurchaseOrderItem } from '../types';

const PurchaseOrderList: React.FC = () => {
  const { notify, refreshUnreadCounts } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'Draft' | 'Pending' | 'Received' | 'Cancelled'>('all');

  // Column specific filters
  const [colFilters, setColFilters] = useState({
    po_no: '',
    created_by: 'All',
    item_count: '',
    total_price: '',
    status: 'All',
    updated_at: ''
  });

  const filterInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    fontSize: '0.8rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-app)',
    color: 'var(--text-main)',
    outline: 'none',
    fontFamily: 'inherit',
    fontWeight: 'normal'
  };

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null);

  // Form States (Manual PO)
  const [note, setNote] = useState('');
  const [poNo, setPoNo] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [projectName, setProjectName] = useState('');
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [orderQty, setOrderQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Form states for ordering new device not in inventory
  const [isAddingNewDevice, setIsAddingNewDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceModel, setNewDeviceModel] = useState('');

  // Loading flags for double-submit protection
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch POs
  const { data: posData, loading, request: fetchPOs } = useApi(purchaseOrderApi.getAll);
  const pos: PurchaseOrder[] = posData || [];

  // Fetch Inventory items for dropdown
  const { data: inventoryData, request: fetchInventory } = useApi(inventoryApi.getAll);
  const inventoryItems: InventoryItem[] = inventoryData || [];

  // Fetch selected PO detail
  const { data: poDetail, loading: loadingDetail, request: loadPoDetail, setData: setPoDetail } = useApi(
    purchaseOrderApi.getById
  );

  useEffect(() => {
    fetchPOs();
    fetchInventory({ search: '' });
  }, [fetchPOs, fetchInventory]);

  useEffect(() => {
    if (selectedPoId !== null) {
      loadPoDetail(selectedPoId);
    }
  }, [selectedPoId, loadPoDetail]);

  const handleScanAutoPO = async () => {
    setIsScanning(true);
    try {
      await purchaseOrderApi.autoGenerate();
      notify('สแกนสต็อกต่ำและอัปเดตใบสั่งซื้ออัตโนมัติสำเร็จ');
      fetchPOs();
      refreshUnreadCounts(); // Update low stock count badge in sidebar
    } catch {
      notify('เกิดข้อผิดพลาดในการสแกนสต็อก', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddItem = () => {
    if (isAddingNewDevice) {
      const nameTrimmed = newDeviceName.trim();
      if (!nameTrimmed) {
        notify('กรุณากรอกชื่ออุปกรณ์ใหม่', 'error');
        return;
      }

      if (orderQty <= 0) {
        notify('จำนวนสั่งซื้อต้องมากกว่า 0', 'error');
        return;
      }

      if (unitPrice < 0) {
        notify('ราคาต่อหน่วยต้องไม่น้อยกว่า 0', 'error');
        return;
      }

      // Check duplicates in current orderItems by name
      const existsName = orderItems.find(item => item.item_name?.toLowerCase() === nameTrimmed.toLowerCase());
      if (existsName) {
        notify('มีรายการอุปกรณ์ชื่อนี้อยู่ในใบสั่งซื้อแล้ว', 'error');
        return;
      }

      const newItem: PurchaseOrderItem & { isNewItem?: boolean } = {
        inventory_id: -1, // Temporary ID
        quantity: orderQty,
        unit_price: unitPrice,
        item_name: nameTrimmed,
        item_model: newDeviceModel.trim(),
        current_stock: 0,
        isNewItem: true
      };

      setOrderItems([...orderItems, newItem]);
      
      // Reset inputs
      setNewDeviceName('');
      setNewDeviceModel('');
      setOrderQty(1);
      setUnitPrice(0);
      setIsAddingNewDevice(false);
      notify('เพิ่มรายการอุปกรณ์ใหม่เรียบร้อยแล้ว');
      return;
    }

    if (!selectedInventoryId) {
      notify('กรุณาเลือกพัสดุอะไหล่', 'error');
      return;
    }
    const targetItem = inventoryItems.find(i => i.id === parseInt(selectedInventoryId));
    if (!targetItem) return;

    if (orderQty <= 0) {
      notify('จำนวนสั่งซื้อต้องมากกว่า 0', 'error');
      return;
    }

    if (unitPrice < 0) {
      notify('ราคาต่อหน่วยต้องไม่น้อยกว่า 0', 'error');
      return;
    }

    // Check duplicate
    const exists = orderItems.find(item => item.inventory_id === targetItem.id);
    if (exists) {
      notify('มีพัสดุรายการนี้อยู่ในรายการสั่งซื้อแล้ว', 'error');
      return;
    }

    const newItem: PurchaseOrderItem = {
      inventory_id: targetItem.id,
      quantity: orderQty,
      unit_price: unitPrice,
      item_name: targetItem.name,
      item_model: targetItem.model || '',
      current_stock: targetItem.quantity
    };

    setOrderItems([...orderItems, newItem]);
    // Reset item input fields
    setSelectedInventoryId('');
    setOrderQty(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      notify('กรุณาเพิ่มรายการสั่งซื้ออย่างน้อย 1 รายการ', 'error');
      return;
    }

    const poNoTrimmed = poNo.trim();
    if (poNoTrimmed && poNoTrimmed.length > 50) {
      notify('เลขที่ใบสั่งซื้อยาวเกินไป (สูงสุด 50 ตัวอักษร)', 'error');
      return;
    }

    const noteTrimmed = note.trim();
    if (noteTrimmed && noteTrimmed.length > 500) {
      notify('หมายเหตุยาวเกินไป (สูงสุด 500 ตัวอักษร)', 'error');
      return;
    }

    const orderedByTrimmed = orderedBy.trim();
    if (orderedByTrimmed && orderedByTrimmed.length > 100) {
      notify('ชื่อผู้สั่งซื้อยาวเกินไป (สูงสุด 100 ตัวอักษร)', 'error');
      return;
    }

    const projectNameTrimmed = projectName.trim();
    if (projectNameTrimmed && projectNameTrimmed.length > 200) {
      notify('ชื่อโครงการยาวเกินไป (สูงสุด 200 ตัวอักษร)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create any new devices in the inventory first
      const preparedItems = [...orderItems];
      for (let i = 0; i < preparedItems.length; i++) {
        const item = preparedItems[i] as PurchaseOrderItem & { isNewItem?: boolean };
        if (item.isNewItem) {
          const formData = new FormData();
          formData.append('name', item.item_name || '');
          formData.append('model', item.item_model || '');
          formData.append('quantity', '0');
          formData.append('min_stock', '5'); // default min stock
          formData.append('requires_sn', '0'); // default to not require serial numbers for new PO items
          
          const createdInventoryItem = (await inventoryApi.create(formData)) as { id: number };
          item.inventory_id = createdInventoryItem.id;
        }
      }

      // 2. Create the Purchase Order
      await purchaseOrderApi.create({
        po_no: poNoTrimmed || undefined,
        note: noteTrimmed || undefined,
        ordered_by: orderedByTrimmed || undefined,
        project_name: projectNameTrimmed || undefined,
        items: preparedItems.map(item => ({
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      });
      notify('สร้างใบสั่งซื้อเรียบร้อยแล้ว');
      setShowCreateModal(false);
      // Reset form
      setPoNo('');
      setNote('');
      setOrderedBy('');
      setProjectName('');
      setOrderItems([]);
      fetchPOs();
      fetchInventory({ search: '' }); // Refresh inventory dropdown to include newly added items
    } catch (err) {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ';
      notify(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePO = async (id: number, status?: string) => {
    const isReceived = status === 'Received';
    const confirmMsg = isReceived
      ? 'คุณแน่ใจว่าต้องการลบใบสั่งซื้อนี้? เนื่องจากใบสั่งซื้อนี้ได้นำของเข้าสต็อกเรียบร้อยแล้ว การลบจะทำการหักคืนจำนวนพัสดุในคลังกลับไปโดยอัตโนมัติ'
      : 'คุณแน่ใจว่าต้องการลบใบสั่งซื้อนี้? การลบใบสั่งซื้อไม่สามารถย้อนคืนได้';

    if (!window.confirm(confirmMsg)) return;

    try {
      await purchaseOrderApi.delete(id);
      notify('ลบใบสั่งซื้อเรียบร้อยแล้ว');
      setShowDetailModal(false);
      setSelectedPoId(null);
      setPoDetail(null);
      fetchPOs();
      refreshUnreadCounts();
    } catch {
      notify('เกิดข้อผิดพลาดในการลบใบสั่งซื้อ', 'error');
    }
  };

  const handleReceivePO = async (id: number) => {
    if (!window.confirm('คุณต้องการบันทึกการรับสินค้าทั้งหมดจากใบสั่งซื้อนี้ใช่หรือไม่? สต็อกพัสดุในคลังจะเพิ่มขึ้นโดยอัตโนมัติ')) return;

    setIsReceiving(true);
    try {
      await purchaseOrderApi.receive(id);
      notify('รับสินค้าและอัปเดตสต็อกเรียบร้อยแล้ว');
      setShowDetailModal(false);
      setSelectedPoId(null);
      setPoDetail(null);
      fetchPOs();
      refreshUnreadCounts(); // Sync low stock count badge
    } catch (err) {
      const errMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'เกิดข้อผิดพลาดในการรับสินค้า';
      notify(errMsg, 'error');
    } finally {
      setIsReceiving(false);
    }
  };

  const handlePrintPO = (po: PurchaseOrder & { items?: PurchaseOrderItem[] }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้เปิด Pop-up window เพื่อพิมพ์ใบสั่งซื้อ\n(Allow pop-up in your browser)');
      return;
    }

    const itemsRows = (po.items || []).map((item, idx) => `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : 'transparent'};">
        <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${item.item_name}</div>
          <div style="font-size: 10px; color: #64748b;">${item.item_model || '-'}</div>
        </td>
        <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #475569;">${item.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${(item.quantity * item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const totalQty = (po.items || []).reduce((acc, curr) => acc + curr.quantity, 0);
    const totalPrice = (po.items || []).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

    printWindow.document.write('<!DOC' + 'TYPE html>\n' + '<ht' + 'ml lang="th">\n<he' + 'ad>\n' + `
  <meta charset="UTF-8">
  <title>ใบสั่งซื้อ - ${po.po_no}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { 
      size: A4 portrait; 
      margin: 0; 
    }
    body {
      font-family: 'Outfit', 'Sarabun', sans-serif;
      margin: 0; padding: 0;
      color: #0f172a;
      line-height: 1.4;
      font-size: 12px;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * { box-sizing: border-box; }
    
    .print-page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      padding: 12mm;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #fff;
    }

    .top-gradient-band {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background-image: linear-gradient(90deg, #0284c7, #0ea5e9);
    }

    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 14px;
      margin-top: 8px;
    }
    .company-logo-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-box {
      background: #f0f9ff;
      padding: 8px;
      border-radius: 10px;
      border: 1.5px solid #0ea5e930;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .company-info h1 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.1;
      letter-spacing: -0.3px;
    }
    .company-info p.subtitle {
      margin: 3px 0 0 0;
      font-size: 10.5px;
      color: #0284c7;
      font-weight: 700;
    }
    .company-info p.address {
      margin: 1px 0 0 0;
      font-size: 8.5px;
      color: #64748b;
    }
    
    .document-title {
      text-align: right;
    }
    .document-title h2 {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: 0.3px;
      background-color: #f0f9ff;
      border: 1px solid #cbd5e1;
      padding: 4px 12px;
      border-radius: 8px;
      display: inline-block;
    }
    .document-title .po-no-badge {
      margin-top: 5px;
    }
    .po-no-text {
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #e2e8f0;
      display: inline-block;
    }

    /* Meta Info Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fff;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.02);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kpi-card.left-accent-sky {
      border-color: #0284c7;
    }
    .kpi-card.left-accent-blue {
      border-color: #0ea5e9;
    }
    .kpi-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-row {
      display: flex;
      font-size: 10.5px;
    }
    .meta-label {
      width: 120px;
      color: #64748b;
    }
    .meta-value {
      flex: 1;
      font-weight: 700;
      color: #0f172a;
    }

    /* Table Section */
    .card-table-wrapper {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table th {
      background-color: #0284c7;
      color: #ffffff;
      padding: 8px 10px;
      font-weight: 700;
      text-align: left;
      font-size: 11px;
    }
    .data-table td {
      padding: 8px 10px;
      vertical-align: middle;
      color: #0f172a;
    }
    .total-row {
      font-weight: 800;
      background-color: #f8fafc !important;
    }
    .total-row td {
      border-top: 1.5px solid #e2e8f0 !important;
      border-bottom: none;
      padding: 10px;
    }

    /* Footer Note (Yellow Card) */
    .footer-note {
      padding: 10px 12px;
      background-color: #fffbeb;
      border: 1.5px solid #fef3c7;
      border-radius: 8px;
      font-size: 9.5px;
      line-height: 1.45;
      color: #92400e;
    }

    /* Signatures */
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 6px;
    }
    .sig-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      background-color: #f8fafc;
    }
    .sig-line {
      border-bottom: 1.5px solid #94a3b8;
      width: 80%;
      margin: 8px auto;
    }
    .sig-name {
      font-weight: 700;
      font-size: 10px;
      color: #0f172a;
    }
    .sig-title {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    .sig-date {
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="print-page">
    <div class="top-gradient-band"></div>
    
    <!-- Header Section -->
    <div class="header">
      <div class="company-logo-info">
        <div class="logo-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l-3-3Z"/><path d="m17 8-3-3"/></svg>
        </div>
        <div class="company-info">
          <h1>CMA - CENTRAL MAINTENANCE & ASSET</h1>
          <p class="subtitle">ระบบบริหารจัดการงานซ่อมบำรุงและพัสดุอุปกรณ์</p>
          <p class="address">Ref. Document — For internal use only | ใช้ภายในองค์กรเท่านั้น</p>
        </div>
      </div>
      
      <div class="document-title">
        <h2>ใบสั่งซื้อ (Purchase Order)</h2>
        <div class="po-no-badge">
          <span class="po-no-text">เลขที่: ${po.po_no}</span>
        </div>
      </div>
    </div>

    <!-- Meta Info Grid -->
    <div class="meta-grid">
      <div class="kpi-card left-accent-sky">
        <div class="kpi-card-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          ข้อมูลใบสั่งซื้อ / รายละเอียด
        </div>
        <div class="meta-row">
          <span class="meta-label">ผู้สั่งซื้อ / ผู้ขอซื้อ:</span>
          <span class="meta-value">${po.ordered_by || 'ไม่ได้ระบุ'}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">หน่วยงาน / โครงการ:</span>
          <span class="meta-value">${po.project_name || '-'}</span>
        </div>
        <div class="meta-row" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
          <span class="meta-label" style="width: 70px;">หมายเหตุ:</span>
          <span class="meta-value" style="font-weight: normal; font-size: 9.5px; line-height: 1.35; color: #475569;">${po.note || '-'}</span>
        </div>
      </div>
      
      <div class="kpi-card left-accent-blue">
        <div class="kpi-card-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
          การออกเอกสาร & พิมพ์
        </div>
        <div class="meta-row">
          <span class="meta-label">วันที่ออกเอกสาร:</span>
          <span class="meta-value">${formatDateThai(po.created_at)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">ผู้ออกเอกสาร:</span>
          <span class="meta-value">${po.created_by === 'System' ? '🤖 ระบบอัตโนมัติ' : '👤 เจ้าหน้าที่พัสดุ'}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">พิมพ์เมื่อ:</span>
          <span class="meta-value">${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
        </div>
      </div>
    </div>

    <div class="card-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center; border-radius: 4px 0 0 4px;">ลำดับ</th>
            <th style="width: 44%;">รายการพัสดุ / อุปกรณ์</th>
            <th style="width: 12%; text-align: center;">จำนวน</th>
            <th style="width: 18%; text-align: right;">ราคา/หน่วย</th>
            <th style="width: 18%; text-align: right; border-radius: 0 4px 4px 0;">ราคารวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2" style="text-align: right;">สรุปยอดรวมรายการสั่งซื้อทั้งหมด:</td>
            <td style="text-align: center; color: #0284c7; font-weight: 800;">${totalQty}</td>
            <td></td>
            <td style="text-align: right; font-size: 14px; color: #0284c7; font-weight: 800;">${totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="footer-note">
      <strong>ข้อกำหนดและเงื่อนไข:</strong> เอกสารฉบับนี้สร้างขึ้นโดยระบบบริหารจัดการพัสดุส่วนกลาง เพื่อใช้เป็นหลักฐานในการสั่งซื้อและตรวจรับเข้าคลัง 
      กรุณาตรวจสอบความถูกต้องของจำนวนและราคาเทียบกับใบส่งสินค้าจริงทุกครั้งเมื่อทำการรับของ
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">( ${po.ordered_by || '............................................'} )</div>
        <div class="sig-title">ผู้ขออนุมัติสั่งซื้อ</div>
        <div class="sig-date">วันที่ ...... / ...... / ......</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">( ............................................ )</div>
        <div class="sig-title">เจ้าหน้าที่พัสดุ / ผู้ตรวจรับเข้าคลัง</div>
        <div class="sig-date">วันที่ ...... / ...... / ......</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">( ............................................ )</div>
        <div class="sig-title">ผู้อนุมัติสั่งจ่าย</div>
        <div class="sig-date">วันที่ ...... / ...... / ......</div>
      </div>
    </div>
  </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 800);
  };

  // Stats
  const totalCount = pos.length;
  const draftCount = pos.filter(p => p.status === 'Draft').length;
  const pendingCount = pos.filter(p => p.status === 'Pending').length;
  const receivedCount = pos.filter(p => p.status === 'Received').length;

  const filteredPOs = pos.filter(p => {
    const matchesSearch =
      p.po_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Check activeTab (KPI Filter)
    if (activeTab !== 'all' && p.status !== activeTab) return false;

    // Check Column Filters
    if (colFilters.po_no && !p.po_no.toLowerCase().includes(colFilters.po_no.toLowerCase())) return false;
    
    if (colFilters.created_by !== 'All') {
      const isSystem = p.created_by === 'System';
      if (colFilters.created_by === 'System' && !isSystem) return false;
      if (colFilters.created_by === 'User' && isSystem) return false;
    }

    if (colFilters.item_count && p.item_count !== undefined && !p.item_count.toString().includes(colFilters.item_count)) return false;
    if (colFilters.total_price && p.total_price !== undefined && !p.total_price.toString().includes(colFilters.total_price)) return false;
    if (colFilters.status !== 'All' && p.status !== colFilters.status) return false;
    
    if (colFilters.updated_at) {
      const formattedDate = formatDateThai(p.updated_at).toLowerCase();
      if (!formattedDate.includes(colFilters.updated_at.toLowerCase())) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <span className="status-badge" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>แบบร่าง</span>;
      case 'Pending':
        return <span className="status-badge" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}>สั่งซื้อแล้ว/รออนุมัติ</span>;
      case 'Received':
        return <span className="status-badge" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>รับของแล้ว</span>;
      case 'Cancelled':
        return <span className="status-badge" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>ยกเลิก</span>;
      default:
        return null;
    }
  };

  const getTabStyle = (tab: typeof activeTab): React.CSSProperties => {
    const isActive = activeTab === tab;
    
    let activeBorder = 'var(--primary)';
    let activeBg = 'var(--primary-light)';
    let activeText = 'var(--primary)';
    
    if (tab === 'Draft') {
      activeBorder = 'var(--border)';
      activeBg = 'var(--bg-app)';
      activeText = 'var(--text-muted)';
    } else if (tab === 'Pending') {
      activeBorder = 'var(--warning-border)';
      activeBg = 'var(--warning-light)';
      activeText = 'var(--warning)';
    } else if (tab === 'Received') {
      activeBorder = 'var(--success-border)';
      activeBg = 'var(--success-light)';
      activeText = 'var(--success)';
    }
    
    return {
      padding: '8px 18px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: 600,
      border: '1px solid',
      borderColor: isActive ? activeBorder : 'var(--border)',
      backgroundColor: isActive ? activeBg : 'var(--bg-card)',
      color: isActive ? activeText : 'var(--text-muted)',
      cursor: 'pointer',
      transition: 'var(--transition-smooth)',
      outline: 'none'
    };
  };

  return (
    <div className="po-list-page" style={{ padding: '2rem 2.5rem', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-title">
          <h2>ระบบจัดการสั่งซื้อพัสดุและอะไหล่ (Purchase Orders)</h2>
          <p>จัดการการสั่งสินค้าใหม่ทดแทนสต็อกคลังเดิม สแกนสต็อกอัตโนมัติ และตรวจนับการรับเข้าคลัง</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            onClick={handleScanAutoPO}
            disabled={isScanning}
            variant="outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700
            }}
          >
            <Sparkles size={16} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'กำลังสแกน...' : 'สแกนสต็อกต่ำสร้าง PO อัตโนมัติ'}
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700
            }}
          >
            <Plus size={16} /> สร้างใบสั่งซื้อใหม่
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <Card 
          onClick={() => setActiveTab('all')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.25rem',
            cursor: 'pointer',
            borderWidth: '2px',
            borderColor: activeTab === 'all' ? 'var(--primary)' : 'var(--border)',
            backgroundColor: activeTab === 'all' ? 'var(--primary-light)' : 'var(--bg-card)',
            transition: 'all 0.2s'
          }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px', padding: '12px' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalCount}</div>
            <div className="stat-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ใบสั่งซื้อทั้งหมด</div>
          </div>
        </Card>

        <Card 
          onClick={() => setActiveTab('Draft')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.25rem',
            cursor: 'pointer',
            borderWidth: '2px',
            borderColor: activeTab === 'Draft' ? 'var(--text-muted)' : 'var(--border)',
            backgroundColor: activeTab === 'Draft' ? 'var(--bg-app)' : 'var(--bg-card)',
            transition: 'all 0.2s'
          }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', borderRadius: '12px', padding: '12px' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{draftCount}</div>
            <div className="stat-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ฉบับร่างสะสม (Draft)</div>
          </div>
        </Card>

        <Card 
          onClick={() => setActiveTab('Pending')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.25rem',
            cursor: 'pointer',
            borderWidth: '2px',
            borderColor: activeTab === 'Pending' ? 'var(--warning)' : 'var(--border)',
            backgroundColor: activeTab === 'Pending' ? 'var(--warning-light)' : 'var(--bg-card)',
            transition: 'all 0.2s'
          }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '12px', padding: '12px' }}>
            <Zap size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{pendingCount}</div>
            <div className="stat-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>สั่งของแล้ว/รอรับสินค้า</div>
          </div>
        </Card>

        <Card 
          onClick={() => setActiveTab('Received')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.25rem',
            cursor: 'pointer',
            borderWidth: '2px',
            borderColor: activeTab === 'Received' ? 'var(--success)' : 'var(--border)',
            backgroundColor: activeTab === 'Received' ? 'var(--success-light)' : 'var(--bg-card)',
            transition: 'all 0.2s'
          }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px', padding: '12px' }}>
            <Check size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{receivedCount}</div>
            <div className="stat-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รับสินค้าเข้าคลังแล้ว</div>
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-input"
              style={{
                paddingLeft: '44px',
                height: '42px',
                width: '100%',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                fontSize: '0.95rem',
                backgroundColor: 'var(--bg-app)'
              }}
              placeholder="ค้นหาเลขที่ใบสั่งซื้อ หรือหมายเหตุประกอบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button style={getTabStyle('all')} onClick={() => setActiveTab('all')}>
              ทั้งหมด ({totalCount})
            </button>
            <button style={getTabStyle('Draft')} onClick={() => setActiveTab('Draft')}>
              แบบร่าง ({draftCount})
            </button>
            <button style={getTabStyle('Pending')} onClick={() => setActiveTab('Pending')}>
              สั่งแล้ว ({pendingCount})
            </button>
            <button style={getTabStyle('Received')} onClick={() => setActiveTab('Received')}>
              รับสินค้าแล้ว ({receivedCount})
            </button>
          </div>
        </div>
      </Card>

      {/* PO Data Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="60px" />
          ))}
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-app)' }}>
                  <th style={{ width: '20%', whiteSpace: 'nowrap' }}>เลขที่ใบสั่งซื้อ</th>
                  <th style={{ width: '15%', whiteSpace: 'nowrap' }}>ประเภทผู้สั่ง</th>
                  <th style={{ width: '15%', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวนรายการ</th>
                  <th style={{ width: '15%', textAlign: 'right', whiteSpace: 'nowrap' }}>ราคารวม (บาท)</th>
                  <th style={{ width: '15%', textAlign: 'center', whiteSpace: 'nowrap' }}>สถานะ</th>
                  <th style={{ width: '15%', whiteSpace: 'nowrap' }}>วันที่อัปเดต</th>
                  <th style={{ width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
                </tr>
                <tr className="filter-row" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="text" 
                      placeholder="ค้นหาเลขที่ PO..." 
                      style={filterInputStyle}
                      value={colFilters.po_no}
                      onChange={(e) => setColFilters({ ...colFilters, po_no: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <select
                      style={filterInputStyle}
                      value={colFilters.created_by}
                      onChange={(e) => setColFilters({ ...colFilters, created_by: e.target.value })}
                    >
                      <option value="All">ทั้งหมด</option>
                      <option value="System">🤖 ระบบอัตโนมัติ</option>
                      <option value="User">👤 เจ้าหน้าที่</option>
                    </select>
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="number" 
                      placeholder="จำนวน..." 
                      style={{ ...filterInputStyle, textAlign: 'center' }}
                      value={colFilters.item_count}
                      onChange={(e) => setColFilters({ ...colFilters, item_count: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="number" 
                      placeholder="ราคา..." 
                      style={{ ...filterInputStyle, textAlign: 'right' }}
                      value={colFilters.total_price}
                      onChange={(e) => setColFilters({ ...colFilters, total_price: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <select
                      style={filterInputStyle}
                      value={colFilters.status}
                      onChange={(e) => setColFilters({ ...colFilters, status: e.target.value })}
                    >
                      <option value="All">ทั้งหมด</option>
                      <option value="Draft">แบบร่าง</option>
                      <option value="Pending">สั่งซื้อแล้ว</option>
                      <option value="Received">รับของแล้ว</option>
                      <option value="Cancelled">ยกเลิก</option>
                    </select>
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="text" 
                      placeholder="วันที่..." 
                      style={filterInputStyle}
                      value={colFilters.updated_at}
                      onChange={(e) => setColFilters({ ...colFilters, updated_at: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      ไม่พบข้อมูลประวัติใบสั่งซื้อ
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => (
                    <tr key={po.id} className="modern-table-row">
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShoppingBag size={14} color="var(--primary)" />
                          {po.po_no}
                        </div>
                        {po.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }}>{po.note}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {po.created_by === 'System' ? '🤖 ระบบอัตโนมัติ' : '👤 เจ้าหน้าที่'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {po.item_count}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                        {po.total_price ? po.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getStatusBadge(po.status)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDateThai(po.updated_at)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => {
                              setSelectedPoId(po.id);
                              setShowDetailModal(true);
                            }}
                            style={{ color: 'var(--primary)', padding: '4px' }}
                            title="ดูรายละเอียดใบสั่งซื้อ"
                          >
                            <ChevronRight size={16} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeletePO(po.id, po.status)}
                            style={{ padding: '4px 8px' }}
                            title="ลบใบสั่งซื้อ"
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- Detailed Modal --- */}
      {showDetailModal && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '820px', width: '95%', padding: '1.25rem 1.5rem', gap: '0.75rem', maxHeight: 'calc(100vh - 3.5rem)', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>รายละเอียดใบสั่งซื้อ {poDetail?.po_no}</h3>
              <button className="close-btn" onClick={() => { setShowDetailModal(false); setSelectedPoId(null); setPoDetail(null); }}>
                <X size={20} />
              </button>
            </div>
            
            {loadingDetail || !poDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem 0' }}>
                <Skeleton variant="rect" height="40px" />
                <Skeleton variant="rect" height="150px" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ผู้สร้างเอกสาร:</span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>{poDetail.created_by === 'System' ? '🤖 ระบบอัตโนมัติ' : '👤 เจ้าหน้าที่คลังพัสดุ'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>วันที่ออกเอกสาร:</span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>{formatDateThai(poDetail.created_at)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>สถานะปัจจุบัน:</span>
                      <div style={{ marginTop: '2px' }}>{getStatusBadge(poDetail.status)}</div>
                    </div>
                  </div>
                  {(poDetail.ordered_by || poDetail.project_name) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ผู้สั่งซื้อ / ผู้เสนอซื้อ:</span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>{poDetail.ordered_by || '-'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>โครงการ / งานที่ใช้:</span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginTop: '2px' }}>{poDetail.project_name || '-'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {poDetail.note && (
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>หมายเหตุเพิ่มเติม</h5>
                    <p style={{ margin: 0, padding: '8px 12px', backgroundColor: 'var(--warning-light)', border: '1px solid var(--warning-border)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-main)' }}>{poDetail.note}</p>
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 10px 0' }}>รายการอะไหล่สั่งซื้อ</h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <table className="data-table" style={{ tableLayout: 'auto', width: '100%', border: 'none' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-app)' }}>
                          <th style={{ padding: '8px 6px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>อุปกรณ์</th>
                          <th style={{ padding: '8px 6px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>รุ่น</th>
                          <th style={{ padding: '8px 6px', fontSize: '0.78rem', textAlign: 'center', whiteSpace: 'nowrap' }}>สต็อกเดิม</th>
                          <th style={{ padding: '8px 6px', fontSize: '0.78rem', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวนที่สั่ง</th>
                          <th style={{ padding: '8px 6px', fontSize: '0.78rem', textAlign: 'right', whiteSpace: 'nowrap' }}>ราคา/หน่วย</th>
                          <th style={{ padding: '8px 6px', fontSize: '0.78rem', textAlign: 'right', whiteSpace: 'nowrap' }}>ราคารวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poDetail.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, padding: '8px 6px', fontSize: '0.82rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.item_name}</td>
                            <td style={{ padding: '8px 6px', fontSize: '0.82rem' }}>{item.item_model || '-'}</td>
                            <td style={{ textAlign: 'center', padding: '8px 6px', fontSize: '0.82rem', color: (item.current_stock || 0) < (item.min_stock || 0) ? 'red' : 'inherit' }}>
                              {item.current_stock} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Min: {item.min_stock})</span>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, padding: '8px 6px', fontSize: '0.82rem' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '8px 6px', fontSize: '0.82rem' }}>{item.unit_price.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, padding: '8px 6px', fontSize: '0.82rem' }}>{(item.quantity * item.unit_price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: 800, backgroundColor: 'var(--bg-app)' }}>
                          <td colSpan={3} style={{ textAlign: 'right', padding: '8px 6px', fontSize: '0.8rem' }}>รวมราคาทั้งสิ้น:</td>
                          <td style={{ textAlign: 'center', padding: '8px 6px', fontSize: '0.8rem' }}>
                            {poDetail.items?.reduce((acc, curr) => acc + curr.quantity, 0)} ชิ้น
                          </td>
                          <td></td>
                          <td style={{ textAlign: 'right', color: 'var(--primary)', padding: '8px 6px', fontSize: '0.82rem' }}>
                            {(poDetail.total_price !== undefined && poDetail.total_price !== null ? poDetail.total_price : (poDetail.items?.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                  {poDetail.status === 'Draft' && (
                    <Button
                      onClick={async () => {
                        if (window.confirm('คุณต้องการเปลี่ยนสถานะใบสั่งซื้อจากแบบร่างเป็นสั่งซื้อแล้วใช่หรือไม่?')) {
                          try {
                            await purchaseOrderApi.update(poDetail.id, { status: 'Pending' });
                            notify('ส่งใบสั่งซื้อสำเร็จ');
                            loadPoDetail(poDetail.id);
                            fetchPOs();
                          } catch {
                            notify('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
                          }
                        }
                      }}
                      style={{ backgroundColor: 'var(--warning)', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      ส่งใบสั่งซื้อ
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    onClick={() => handleDeletePO(poDetail.id, poDetail.status)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    <Trash size={14} style={{ marginRight: '4px' }} /> ลบใบสั่งซื้อ
                  </Button>

                  {poDetail.status !== 'Received' && (
                    <Button
                      onClick={() => handleReceivePO(poDetail.id)}
                      disabled={isReceiving}
                      style={{ backgroundColor: 'var(--success)', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <Check size={14} style={{ marginRight: '4px' }} />
                      {isReceiving ? 'กำลังรับของ...' : 'รับสินค้าเข้าคลัง'}
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => handlePrintPO(poDetail)}
                    style={{ backgroundColor: 'var(--primary)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    <Printer size={14} /> พิมพ์ใบสั่งซื้อ
                  </Button>
                  
                  <Button variant="outline" onClick={() => { setShowDetailModal(false); setSelectedPoId(null); setPoDetail(null); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    ปิดหน้าต่าง
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Create Modal --- */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '820px', width: '95%', padding: '1.25rem 1.5rem', gap: '0.75rem', maxHeight: 'calc(100vh - 3.5rem)', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>สร้างใบสั่งซื้อใหม่ด้วยมือ</h3>
              <button className="close-btn" onClick={() => { setShowCreateModal(false); setOrderItems([]); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 1.3fr 1.8fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>เลขที่ใบสั่งซื้อ (ทางเลือก)</label>
                  <Input
                    placeholder="สร้างอัตโนมัติ"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    maxLength={50}
                    style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>ผู้สั่งซื้อ / ผู้เสนอซื้อ</label>
                  <Input
                    placeholder="ระบุชื่อผู้เสนอซื้อ"
                    value={orderedBy}
                    onChange={(e) => setOrderedBy(e.target.value)}
                    maxLength={100}
                    style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>ใช้สำหรับโครงการ / งาน</label>
                  <Input
                    placeholder="ระบุชื่องาน/โครงการ"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    maxLength={200}
                    style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>หมายเหตุ/วัตถุประสงค์สั่งซื้อ</label>
                  <Input
                    placeholder="เช่น อะไหล่ด่วนสำหรับงานซ่อม..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Add item interface */}
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>เลือกพัสดุและกำหนดราคา</h5>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewDevice(!isAddingNewDevice);
                      setSelectedInventoryId('');
                      setNewDeviceName('');
                      setNewDeviceModel('');
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    {isAddingNewDevice ? '← เลือกอุปกรณ์ที่มีอยู่แล้ว' : '+ สั่งซื้ออุปกรณ์ใหม่ (ไม่มีในคลัง)'}
                  </button>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isAddingNewDevice ? '1.5fr 1fr 1fr 1fr auto' : '2.5fr 1fr 1.2fr auto',
                  gap: '0.75rem',
                  alignItems: 'end'
                }}>
                  {isAddingNewDevice ? (
                    <>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>ชื่ออุปกรณ์ใหม่ *</label>
                        <Input
                          placeholder="ระบุชื่ออุปกรณ์"
                          value={newDeviceName}
                          onChange={(e) => setNewDeviceName(e.target.value)}
                          maxLength={100}
                          style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>รุ่น / แบรนด์</label>
                        <Input
                          placeholder="ระบุรุ่น (ถ้ามี)"
                          value={newDeviceModel}
                          onChange={(e) => setNewDeviceModel(e.target.value)}
                          maxLength={100}
                          style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>รายการพัสดุ</label>
                      <select
                        className="form-control"
                        style={{
                          width: '100%',
                          height: '34px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '6px 10px',
                          outline: 'none',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem'
                        }}
                        value={selectedInventoryId}
                        onChange={(e) => setSelectedInventoryId(e.target.value)}
                      >
                        <option value="">-- เลือกอุปกรณ์จากคลัง --</option>
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} {item.model ? `(${item.model})` : ''} - คงเหลือ {item.quantity} (เกณฑ์: {item.min_stock})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>จำนวนสั่งซื้อ</label>
                    <Input
                      type="number"
                      min={1}
                      value={orderQty}
                      onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 0))}
                      style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', display: 'block', color: 'var(--text-muted)' }}>ราคาต่อหน่วย (บาท)</label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <Button type="button" onClick={handleAddItem} variant="outline" style={{ height: '34px', fontSize: '0.8rem', padding: '0 16px', fontWeight: 700 }}>
                    เพิ่มรายการ
                  </Button>
                </div>
              </div>

              {/* Items List Table */}
              <div>
                <h5 style={{ margin: '0 0 6px 0' }}>รายการอุปกรณ์ทั้งหมดใน PO นี้</h5>
                <table className="data-table" style={{ border: '1px solid var(--border)' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ width: '30%' }}>ชื่ออุปกรณ์</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>คงเหลือคลัง</th>
                      <th style={{ width: '13%', textAlign: 'center' }}>จำนวนสั่งซื้อ</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>ราคาต่อหน่วย</th>
                      <th style={{ width: '17%', textAlign: 'right' }}>ราคารวม</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                          ยังไม่มีอุปกรณ์ในรายการสั่งซื้อ
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.item_name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{item.item_model}</span></td>
                          <td style={{ textAlign: 'center' }}>{item.current_stock}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{item.unit_price.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{(item.quantity * item.unit_price).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button"
                              className="btn btn-text-danger btn-sm" 
                              onClick={() => handleRemoveItem(idx)}
                              title="ลบรายการ"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {orderItems.length > 0 && (
                    <tfoot>
                      <tr style={{ fontWeight: 800, backgroundColor: '#f8fafc' }}>
                        <td colSpan={2} style={{ textAlign: 'right' }}>ยอดราคารวม:</td>
                        <td style={{ textAlign: 'center' }}>
                          {orderItems.reduce((acc, curr) => acc + curr.quantity, 0)} ชิ้น
                        </td>
                        <td></td>
                        <td style={{ textAlign: 'right', color: 'var(--primary)' }}>
                          {orderItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {orderItems.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: 'var(--warning-light)', border: '1px solid var(--warning-border)', borderRadius: '8px', color: 'var(--warning)', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} />
                  <span>กรุณาเลือกอุปกรณ์จากตัวเลือกด้านบนและกดปุ่ม <strong>"เพิ่มรายการ"</strong> ก่อนเพื่อใส่พัสดุในใบสั่งซื้อ</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                <Button variant="outline" type="button" onClick={() => { setShowCreateModal(false); setOrderItems([]); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || orderItems.length === 0}
                  style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'สร้างใบสั่งซื้อ (Draft)'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderList;
