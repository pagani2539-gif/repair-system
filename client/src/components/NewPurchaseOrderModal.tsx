/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { inventoryApi, purchaseOrderApi } from '../api';
import { useNotification } from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import type { InventoryItem, VendorContact } from '../types';
import {
  ShoppingBag,
  X,
  Search,
  Plus,
  Trash2,
  Package,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Building2,
  UserCheck
} from 'lucide-react';

interface POItemRow {
  inventory_id: number;
  name: string;
  model: string;
  quantity: number;
  is_new?: boolean; // true ถ้าเพิ่งสร้างจาก modal นี้
}

interface NewPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewPurchaseOrderModal: React.FC<NewPurchaseOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // PO Header fields
  const [companyName, setCompanyName] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorContactPerson, setVendorContactPerson] = useState('');
  const [vendorTaxId, setVendorTaxId] = useState('');
  const [orderedBy, setOrderedBy] = useState(user?.full_name || '');
  const [projectName, setProjectName] = useState('');
  const [buyerDepartment, setBuyerDepartment] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [note, setNote] = useState('');

  // Vendor autocomplete
  const [vendors, setVendors] = useState<VendorContact[]>([]);
  const [isVendorListOpen, setIsVendorListOpen] = useState(false);
  const vendorBoxRef = useRef<HTMLDivElement>(null);

  // Items list
  const [items, setItems] = useState<POItemRow[]>([]);

  // Inventory picker dropdown
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // New-inventory inline form
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemModel, setNewItemModel] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [creatingNewItem, setCreatingNewItem] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Load inventory + vendors เมื่อเปิด modal
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoadingInventory(true);
      try {
        const [list, vendorList] = await Promise.all([
          inventoryApi.getAll({}),
          purchaseOrderApi.getVendors().catch(() => [])
        ]);
        setInventory(list);
        setVendors(vendorList);
      } catch {
        notify('ไม่สามารถโหลดข้อมูลพัสดุได้', 'error');
      } finally {
        setLoadingInventory(false);
      }
    };
    load();
  }, [isOpen, notify]);

  // Reset state เมื่อปิด modal
  const handleClose = () => {
    setCompanyName('');
    setVendorAddress('');
    setVendorPhone('');
    setVendorContactPerson('');
    setVendorTaxId('');
    setOrderedBy(user?.full_name || '');
    setProjectName('');
    setBuyerDepartment('');
    setBuyerPhone('');
    setBuyerEmail('');
    setNote('');
    setItems([]);
    setSearchTerm('');
    setIsPickerOpen(false);
    setIsVendorListOpen(false);
    setShowNewItemForm(false);
    setNewItemName('');
    setNewItemModel('');
    setNewItemQty(1);
    onClose();
  };

  // Click outside picker → close
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    if (isPickerOpen) {
      document.addEventListener('mousedown', handle);
      return () => document.removeEventListener('mousedown', handle);
    }
  }, [isPickerOpen]);

  // Click outside vendor list → close
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (vendorBoxRef.current && !vendorBoxRef.current.contains(e.target as Node)) {
        setIsVendorListOpen(false);
      }
    };
    if (isVendorListOpen) {
      document.addEventListener('mousedown', handle);
      return () => document.removeEventListener('mousedown', handle);
    }
  }, [isVendorListOpen]);

  const filteredVendors = useMemo(() => {
    const s = companyName.trim().toLowerCase();
    if (!s) return vendors;
    return vendors.filter(v => (v.company_name || '').toLowerCase().includes(s));
  }, [vendors, companyName]);

  const selectVendor = (v: VendorContact) => {
    setCompanyName(v.company_name || '');
    setVendorAddress(v.vendor_address || '');
    setVendorPhone(v.vendor_phone || '');
    setVendorContactPerson(v.vendor_contact_person || '');
    setVendorTaxId(v.vendor_tax_id || '');
    setIsVendorListOpen(false);
  };

  const filteredInventory = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return inventory
      .filter(it => !items.some(p => p.inventory_id === it.id))
      .filter(it => !s || it.name.toLowerCase().includes(s) || (it.model || '').toLowerCase().includes(s));
  }, [inventory, items, searchTerm]);

  const addExistingItem = (it: InventoryItem) => {
    setItems(prev => [...prev, {
      inventory_id: it.id,
      name: it.name,
      model: it.model || '',
      quantity: 1
    }]);
    setIsPickerOpen(false);
    setSearchTerm('');
  };

  const removeItem = (inventoryId: number) => {
    setItems(prev => prev.filter(p => p.inventory_id !== inventoryId));
  };

  const updateQuantity = (inventoryId: number, qty: number) => {
    setItems(prev => prev.map(p =>
      p.inventory_id === inventoryId ? { ...p, quantity: Math.max(1, qty) } : p
    ));
  };

  const handleCreateNewInventory = async () => {
    const name = newItemName.trim();
    if (!name) {
      notify('กรุณากรอกชื่อพัสดุใหม่', 'error');
      return;
    }
    if (newItemQty <= 0) {
      notify('จำนวนต้องมากกว่า 0', 'error');
      return;
    }

    setCreatingNewItem(true);
    try {
      // สร้างพัสดุใหม่ในคลัง — quantity=0 เพราะยังไม่รับเข้าจริง
      // (จะถูกบวกเข้าตอนกด "ตรวจรับพัสดุ" หลังจากนั้น)
      const formData = new FormData();
      formData.append('name', name);
      formData.append('model', newItemModel.trim());
      formData.append('quantity', '0');
      formData.append('min_stock', '1');
      formData.append('requires_sn', '0');

      const created = await inventoryApi.create(formData);

      // เพิ่มเข้า items list พร้อม flag is_new
      setItems(prev => [...prev, {
        inventory_id: created.id,
        name: created.name,
        model: created.model || '',
        quantity: newItemQty,
        is_new: true
      }]);

      // เพิ่มเข้า inventory state ด้วย (เผื่อ user เพิ่มซ้ำในรอบเดียวกัน)
      setInventory(prev => [...prev, created]);

      notify('สร้างพัสดุใหม่และเพิ่มเข้าใบสั่งซื้อเรียบร้อย');
      setShowNewItemForm(false);
      setNewItemName('');
      setNewItemModel('');
      setNewItemQty(1);
    } catch (err: any) {
      notify(err?.response?.data?.message || err?.message || 'ไม่สามารถสร้างพัสดุใหม่ได้', 'error');
    } finally {
      setCreatingNewItem(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      notify('กรุณาเลือกหรือเพิ่มพัสดุอย่างน้อย 1 รายการ', 'error');
      return;
    }
    if (!orderedBy.trim()) {
      notify('กรุณากรอกชื่อผู้สั่งซื้อ', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchaseOrderApi.create({
        company_name: companyName.trim() || undefined,
        vendor_address: vendorAddress.trim() || undefined,
        vendor_phone: vendorPhone.trim() || undefined,
        vendor_contact_person: vendorContactPerson.trim() || undefined,
        vendor_tax_id: vendorTaxId.trim() || undefined,
        buyer_department: buyerDepartment.trim() || undefined,
        buyer_phone: buyerPhone.trim() || undefined,
        buyer_email: buyerEmail.trim() || undefined,
        ordered_by: orderedBy.trim(),
        project_name: projectName.trim() || undefined,
        note: note.trim() || undefined,
        status: 'Pending',
        created_by: orderedBy.trim() || 'User',
        items: items.map(it => ({
          inventory_id: it.inventory_id,
          quantity: it.quantity,
          unit_price: 0 // ไม่แสดงราคาในระบบ ตาม memory rule
        }))
      });
      notify(`🎉 สร้างใบสั่งซื้อ ${res.po_no} เรียบร้อยแล้ว`);
      onSuccess();
      handleClose();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      notify(error?.response?.data?.message || error?.message || 'เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem' }}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '100%', maxHeight: '92vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="var(--primary)" /> สร้างใบสั่งซื้อใหม่ (PO)
          </h3>
          <button type="button" className="close-btn" onClick={handleClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* PO Header — ผู้สั่งซื้อ & โครงการ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Input
              label="ผู้สั่งซื้อ *"
              type="text"
              required
              maxLength={100}
              placeholder="ระบุชื่อผู้สั่งซื้อ..."
              value={orderedBy}
              onChange={e => setOrderedBy(e.target.value)}
              disabled={submitting}
            />
            <Input
              label="โครงการ / งบประมาณ"
              type="text"
              maxLength={150}
              placeholder="ระบุโครงการที่เกี่ยวข้อง (ถ้ามี)"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* ═══ Buyer Details Section (กระชับ) ═══ */}
          <div style={{
            marginTop: '0.5rem',
            padding: '12px 14px',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <UserCheck size={16} color="var(--success)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>ข้อมูลผู้จัดซื้อ</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>(สำหรับติดต่อกลับจากผู้ขาย — ไม่บังคับ)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '10px' }}>
              <Input
                label="แผนก / ฝ่าย"
                type="text"
                maxLength={100}
                placeholder="เช่น ฝ่าย IT"
                value={buyerDepartment}
                onChange={e => setBuyerDepartment(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="เบอร์ติดต่อ"
                type="text"
                maxLength={50}
                placeholder="08X-XXX-XXXX"
                value={buyerPhone}
                onChange={e => setBuyerPhone(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="อีเมล"
                type="email"
                maxLength={150}
                placeholder="name@company.com"
                value={buyerEmail}
                onChange={e => setBuyerEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* ═══ Vendor Details Section ═══ */}
          <div style={{
            marginTop: '0.5rem',
            padding: '14px',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Building2 size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>ข้อมูลบริษัทผู้ขาย / ผู้จัดจำหน่าย</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                (กรอกแล้วจะถูกบันทึก ครั้งต่อไปเลือกจาก dropdown ได้)
              </span>
            </div>

            {/* Company name with autocomplete */}
            <div ref={vendorBoxRef} style={{ position: 'relative', marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
                ชื่อบริษัท / ผู้ขาย
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={150}
                  placeholder="พิมพ์ชื่อบริษัท หรือเลือกจากรายการที่เคยใช้"
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setIsVendorListOpen(true); }}
                  onFocus={() => setIsVendorListOpen(true)}
                  disabled={submitting}
                  style={{ width: '100%', padding: '9px 36px 9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.88rem', color: 'var(--text-main)' }}
                />
                <ChevronDown
                  size={16}
                  onClick={() => !submitting && setIsVendorListOpen(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
                />
              </div>
              {isVendorListOpen && filteredVendors.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 60, maxHeight: '240px', overflowY: 'auto'
                }}>
                  {filteredVendors.map((v, idx) => (
                    <div
                      key={`${v.company_name}-${idx}`}
                      onClick={() => selectVendor(v)}
                      className="dropdown-item-hover"
                      style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <Building2 size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.company_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[v.vendor_contact_person, v.vendor_phone, v.vendor_tax_id].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="ผู้ติดต่อ"
                type="text"
                maxLength={150}
                placeholder="ชื่อพนักงานขาย / ผู้ติดต่อ"
                value={vendorContactPerson}
                onChange={e => setVendorContactPerson(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="เบอร์โทรศัพท์"
                type="text"
                maxLength={50}
                placeholder="เช่น 02-123-4567 หรือ 081-234-5678"
                value={vendorPhone}
                onChange={e => setVendorPhone(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginTop: '10px' }}>
              <TextArea
                label="ที่อยู่บริษัท"
                rows={2}
                maxLength={500}
                placeholder="ที่อยู่สำหรับออกใบเสร็จ/ใบกำกับภาษี"
                value={vendorAddress}
                onChange={e => setVendorAddress(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="เลขผู้เสียภาษี (Tax ID)"
                type="text"
                maxLength={20}
                placeholder="13 หลัก"
                value={vendorTaxId}
                onChange={e => setVendorTaxId(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Items section */}
          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
              รายการพัสดุที่ต้องการสั่งซื้อ * <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>({items.length} รายการ)</span>
            </label>

            {/* Inventory picker dropdown */}
            <div ref={pickerRef} style={{ position: 'relative', marginBottom: '8px' }}>
              <div
                onClick={() => !submitting && setIsPickerOpen(!isPickerOpen)}
                style={{
                  padding: '11px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.88rem',
                  color: isPickerOpen ? 'var(--text-main)' : 'var(--text-muted)',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={14} /> {isPickerOpen ? 'กำลังค้นหา...' : '-- เลือกพัสดุจากคลัง --'}
                </span>
                <ChevronDown size={16} style={{ transform: isPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {isPickerOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden'
                }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input
                      autoFocus
                      placeholder="พิมพ์ชื่อพัสดุหรือรุ่น..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {loadingInventory ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>กำลังโหลด...</div>
                    ) : filteredInventory.length > 0 ? (
                      filteredInventory.map(it => (
                        <div
                          key={it.id}
                          onClick={() => addExistingItem(it)}
                          style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                          className="dropdown-item-hover"
                        >
                          <Package size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{it.model || '-'} · คงเหลือ {it.quantity}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {searchTerm ? 'ไม่พบพัสดุที่ค้นหา' : 'ไม่มีพัสดุให้เลือก'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* "+ เพิ่มพัสดุใหม่" toggle */}
            {!showNewItemForm ? (
              <button
                type="button"
                onClick={() => setShowNewItemForm(true)}
                disabled={submitting}
                style={{
                  width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: 'var(--primary-light)', border: '1.5px dashed rgba(41, 182, 246, 0.4)', borderRadius: '10px',
                  color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                <Sparkles size={15} /> เพิ่มพัสดุใหม่ที่ยังไม่มีในคลัง
              </button>
            ) : (
              <div style={{ padding: '14px', background: 'var(--primary-light)', border: '1.5px solid rgba(41, 182, 246, 0.3)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} /> เพิ่มพัสดุใหม่
                  </span>
                  <button
                    type="button"
                    onClick={() => { setShowNewItemForm(false); setNewItemName(''); setNewItemModel(''); setNewItemQty(1); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px auto', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>ชื่อพัสดุ *</label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="เช่น Switch 24-Port"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>รุ่น</label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="(ถ้ามี)"
                      value={newItemModel}
                      onChange={e => setNewItemModel(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>จำนวน</label>
                    <input
                      type="number"
                      min={1}
                      value={newItemQty}
                      onChange={e => setNewItemQty(parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewInventory}
                    disabled={creatingNewItem || !newItemName.trim()}
                    style={{
                      padding: '7px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px',
                      fontSize: '0.78rem', fontWeight: 700, cursor: (creatingNewItem || !newItemName.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      opacity: (creatingNewItem || !newItemName.trim()) ? 0.5 : 1
                    }}
                  >
                    <Plus size={13} /> {creatingNewItem ? '...' : 'เพิ่ม'}
                  </button>
                </div>
                <p style={{ marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  💡 ระบบจะสร้างพัสดุใหม่ในคลัง (quantity = 0) แล้วเพิ่มเข้า PO นี้อัตโนมัติ จำนวนจริงจะถูกบวกเข้าตอนตรวจรับของ
                </p>
              </div>
            )}

            {/* Items table */}
            {items.length > 0 ? (
              <div style={{ marginTop: '14px', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>ลำดับ</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>รายการพัสดุ</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', width: '110px' }}>จำนวน</th>
                      <th style={{ padding: '8px 10px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.inventory_id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} color="var(--text-muted)" />
                            <div>
                              <div style={{ fontWeight: 700 }}>{it.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {it.model || '-'}
                                {it.is_new && (
                                  <span style={{ marginLeft: '6px', padding: '1px 6px', background: 'rgba(41, 182, 246, 0.12)', color: 'var(--primary)', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>
                                    ✨ ใหม่
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={e => updateQuantity(it.inventory_id, parseInt(e.target.value) || 0)}
                            disabled={submitting}
                            style={{ width: '70px', padding: '5px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => removeItem(it.inventory_id)}
                            disabled={submitting}
                            title="ลบรายการ"
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ marginTop: '14px', padding: '24px', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: '10px', background: 'var(--bg-app)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Package size={28} style={{ opacity: 0.3, marginBottom: '6px' }} />
                <div>ยังไม่มีรายการ — เลือกจาก dropdown หรือเพิ่มพัสดุใหม่</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <TextArea
              label="หมายเหตุ"
              rows={3}
              maxLength={1000}
              placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)..."
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>ยกเลิก</Button>
            <Button type="submit" variant="primary" loading={submitting} icon={<CheckCircle2 size={16} />}>
              บันทึกใบสั่งซื้อ (Pending)
            </Button>
          </div>
        </form>

        <style>{`
          .dropdown-item-hover:hover { background: rgba(59, 130, 246, 0.06) !important; }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

export default NewPurchaseOrderModal;
