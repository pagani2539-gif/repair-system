/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import { inventoryApi, withdrawalApi, UPLOAD_URL } from '../api';
import { useNotification } from '../components/Layout';
import { printElement } from '../utils/pdfGenerator';
import PrintWithdrawalTemplate from '../components/PrintWithdrawalTemplate';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import type { InventoryItem } from '../types';
import { 
  Package, 
  ChevronDown,
  Download,
  CheckCircle2,
  Trash2,
  Search,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WithdrawalItem {
  inventory_id: number;
  name: string;
  model: string;
  quantity: number;
  max_quantity: number;
  image_path?: string;
  serial_numbers?: string[];
  available_serials?: string[];
  requires_sn?: number;
}

const NewWithdrawal: React.FC = () => {
  const { notify, playNotificationSound } = useNotification();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<WithdrawalItem[]>([]);
  const [recipient, setRecipient] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('ติดตั้งใหม่');
  const [selectedType, setSelectedType] = useState('ติดตั้งใหม่');
  const [customType, setCustomType] = useState('');
  const [note, setNote] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastWithdrawalData, setLastWithdrawalData] = useState<any>(null);

  // Custom Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data = await inventoryApi.getAll({});
        setInventory(data.filter(item => item.quantity > 0));
      } catch {
        notify('ไม่สามารถโหลดข้อมูลอุปกรณ์ได้', 'error');
      }
    };
    fetchInventory();
  }, [notify]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addItem = async (inventoryId: number) => {
    const item = inventory.find(i => i.id === inventoryId);
    if (!item) return;

    if (selectedItems.find(si => si.inventory_id === inventoryId)) {
      notify('อุปกรณ์นี้ถูกเลือกไปแล้ว', 'info');
      return;
    }

    let inStockSerials: string[] = [];
    try {
      const instances = await inventoryApi.getInstances(inventoryId);
      inStockSerials = instances.map(inst => inst.serial_number);
    } catch (err) {
      console.error('Failed to fetch available serial numbers', err);
    }

    setSelectedItems([...selectedItems, {
      inventory_id: item.id,
      name: item.name,
      model: item.model || '',
      quantity: 1,
      max_quantity: item.quantity,
      image_path: item.image_path,
      serial_numbers: [''],
      available_serials: inStockSerials,
      requires_sn: item.requires_sn
    }]);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const removeItem = (inventoryId: number) => {
    setSelectedItems(selectedItems.filter(si => si.inventory_id !== inventoryId));
  };

  const updateItemQuantity = (inventoryId: number, qty: number) => {
    setSelectedItems(selectedItems.map(si => {
      if (si.inventory_id === inventoryId) {
        const newQty = Math.max(1, qty);
        const newSn = [...(si.serial_numbers || [])];
        if (newSn.length < newQty) {
          while (newSn.length < newQty) newSn.push('');
        } else if (newSn.length > newQty) {
          newSn.length = newQty;
        }
        return { ...si, quantity: newQty, serial_numbers: newSn };
      }
      return si;
    }));
  };

  const updateItemSerial = (inventoryId: number, index: number, sn: string) => {
    setSelectedItems(selectedItems.map(si => {
      if (si.inventory_id === inventoryId) {
        const newSn = [...(si.serial_numbers || [])];
        newSn[index] = sn;
        return { ...si, serial_numbers: newSn };
      }
      return si;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRecipient = recipient.trim();
    const trimmedProjectName = projectName.trim();
    const trimmedLocation = location.trim();
    const trimmedType = type.trim();
    const trimmedNote = note.trim();

    if (selectedItems.length === 0) {
      notify('กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (!trimmedRecipient) {
      notify('กรุณากรอกชื่อผู้เบิก / หน่วยงาน', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (!trimmedProjectName) {
      notify('กรุณากรอกชื่อโครงการ / งาน', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (trimmedRecipient.length > 100) {
      notify('ชื่อผู้เบิกยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (trimmedProjectName.length > 100) {
      notify('ชื่อโครงการยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (trimmedLocation.length > 100) {
      notify('สถานที่ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (trimmedType.length > 100) {
      notify('ประเภทการเบิกยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (trimmedNote.length > 1000) {
      notify('หมายเหตุยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (selectedItems.some(si => si.quantity <= 0)) {
      notify('กรุณาระบุจำนวนอุปกรณ์ให้มากกว่า 0', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    if (selectedItems.some(si => si.quantity > si.max_quantity)) {
      notify('จำนวนที่เบิกเกินจำนวนอุปกรณ์คงเหลือในคลัง', 'error', 'ระบบคลังพัสดุ', 'inventory');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        recipient: trimmedRecipient,
        project_name: trimmedProjectName,
        location: trimmedLocation,
        type: trimmedType,
        note: trimmedNote,
        items: selectedItems.map(si => ({ 
          inventory_id: si.inventory_id, 
          quantity: si.quantity,
          serial_numbers: (si.serial_numbers || []).map(sn => sn.trim()).filter(sn => sn !== '')
        }))
      };
      const response = await withdrawalApi.create(payload);
      
      setLastWithdrawalData({
        ...payload,
        id: response.id,
        created_at: new Date().toISOString(),
        items_detail: selectedItems
      });
      setIsSubmitted(true);
      notify('บันทึกการเบิกอุปกรณ์เรียบร้อยแล้ว', 'success', 'ระบบคลังพัสดุ', 'inventory');
      playNotificationSound();
    } catch (error: any) {
      notify(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error', 'ระบบคลังพัสดุ', 'inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!lastWithdrawalData) return;
    printElement('pdf-withdrawal-template', `ใบเบิกอุปกรณ์ - WD-${lastWithdrawalData.id || 'XXXXXX'}`);
  };

  const filteredInventory = inventory.filter(item => 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    !selectedItems.some(si => si.inventory_id === item.id)
  );

  if (isSubmitted) {
    return (
      <div className="withdrawal-success-page" style={{ padding: '3rem 1rem', display: 'flex', justifyContent: 'center' }}>
        <Card className="success-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="success-icon" style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={48} />
          </div>
          <h2 className="success-title" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>บันทึกการเบิกสำเร็จ!</h2>
          <p className="success-desc" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            ระบบได้ทำการตัดสต็อกอัตโนมัติเรียบร้อยแล้ว <br />
            คุณสามารถดาวน์โหลดใบเบิกอุปกรณ์เพื่อเป็นหลักฐานได้ที่ปุ่มด้านล่าง
          </p>

          {lastWithdrawalData && lastWithdrawalData.items_detail && (
            <div style={{ textAlign: 'left', background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>รายละเอียดรายการที่เบิก:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lastWithdrawalData.items_detail.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ minWidth: '20px' }}>{idx + 1}.</span>
                      {item.image_path ? (
                        <img 
                          src={`${UPLOAD_URL}/uploads/${item.image_path}`} 
                          alt={item.name} 
                          style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} 
                        />
                      ) : (
                        <div style={{ width: '32px', height: '32px', background: 'var(--bg-card)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                          <Package size={16} style={{ opacity: 0.3 }} />
                        </div>
                      )}
                      <span><strong style={{ color: 'var(--text-main)' }}>{item.name}</strong> {item.model ? `(${item.model})` : ''}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>x{item.quantity}</div>
                      {item.serial_numbers && item.serial_numbers.some((sn: string) => sn.trim()) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          S/N: {item.serial_numbers.filter((sn: string) => sn.trim()).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>ผู้เบิก:</strong> {lastWithdrawalData.recipient} | <strong>โครงการ:</strong> {lastWithdrawalData.project_name || '-'} | <strong>สถานที่:</strong> {lastWithdrawalData.location || '-'}
              </div>
            </div>
          )}
          
          <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Button variant="primary" onClick={handleDownloadPDF} icon={<Download size={20} style={{ marginRight: '8px' }} />}>
              ดาวน์โหลดใบเบิกอุปกรณ์ (PDF)
            </Button>
            <Button variant="outline" onClick={() => navigate('/inventory')}>
              กลับไปยังหน้าคลังพัสดุ
            </Button>
          </div>
          <Button variant="text" onClick={() => {
            setIsSubmitted(false);
            setSelectedItems([]);
            setRecipient('');
            setProjectName('');
            setLocation('');
            setNote('');
            setType('ติดตั้งใหม่');
            setSelectedType('ติดตั้งใหม่');
            setCustomType('');
          }}>
            ทำการเบิกรายการใหม่
          </Button>
        </Card>

        {/* Hidden template for PDF generation */}
        {lastWithdrawalData && (
          <PrintWithdrawalTemplate withdrawal={lastWithdrawalData} />
        )}
      </div>
    );
  }

  return (
    <div className="new-withdrawal-page">
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div className="page-title">
          <h2>เบิกอุปกรณ์จากคลัง (หลายรายการ)</h2>
          <p>เลือกรายการอุปกรณ์ ระบุประเภทการใช้งาน และกรอกรายละเอียดเพื่อเบิกสินค้า</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="withdrawal-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Item Selection Card */}
            <Card title="รายการอุปกรณ์ที่ต้องการเบิก" icon={<Package size={20} />}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>เลือกอุปกรณ์เพิ่ม <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>(เลือกได้หลายอย่าง)</span></label>
                
                {/* Custom Searchable Dropdown */}
                <div ref={dropdownRef} style={{ position: 'relative', marginTop: '8px' }}>
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{ 
                      padding: '12px 16px', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.95rem',
                      color: isDropdownOpen ? 'var(--text-main)' : 'var(--text-muted)'
                    }}
                  >
                    <span>{isDropdownOpen ? 'กำลังค้นหา...' : '-- คลิกเพื่อค้นหาและเลือกอุปกรณ์ --'}</span>
                    <ChevronDown size={18} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {isDropdownOpen && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '110%', 
                      left: 0, 
                      right: 0, 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px', 
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)', 
                      zIndex: 100,
                      overflow: 'hidden'
                    }}>
                      <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input 
                          autoFocus
                          placeholder="พิมพ์ชื่ออุปกรณ์ หรือ รุ่น..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text-main)', fontSize: '0.95rem' }}
                        />
                        {searchTerm && <X size={16} onClick={() => setSearchTerm('')} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />}
                      </div>
                      
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {filteredInventory.length > 0 ? (
                          filteredInventory.map(item => (
                            <div 
                              key={item.id} 
                              onClick={() => addItem(item.id)}
                              style={{ 
                                padding: '10px 16px', 
                                borderBottom: '1px solid var(--border)', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px',
                                transition: 'background 0.2s'
                              }}
                              className="dropdown-item-hover"
                            >
                              {item.image_path ? (
                                <img 
                                  src={`${UPLOAD_URL}/uploads/${item.image_path}`} 
                                  alt={item.name} 
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} 
                                />
                              ) : (
                                <div style={{ width: '40px', height: '40px', background: 'var(--bg-app)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                  <Package size={18} style={{ opacity: 0.3 }} />
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.model || '-'}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>คงเหลือ</div>
                                <div style={{ fontWeight: 700, color: item.quantity < 10 ? 'var(--danger)' : 'var(--primary)' }}>{item.quantity}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            ไม่พบอุปกรณ์ที่ค้นหา
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedItems.length > 0 ? (
                <div className="data-table-container" style={{ marginTop: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>ลำดับ</th>
                        <th>รายการอุปกรณ์</th>
                        <th style={{ textAlign: 'center', width: '100px' }}>จำนวน</th>
                        <th style={{ width: '250px' }}>S/N (ถ้ามี)</th>
                        <th style={{ textAlign: 'center', width: '100px' }}>คงเหลือ</th>
                        <th style={{ textAlign: 'right', width: '60px' }}>ลบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((si, idx) => (
                        <tr key={si.inventory_id}>
                          <td style={{ verticalAlign: 'middle' }}>{idx + 1}</td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {si.image_path ? (
                                <img 
                                  src={`${UPLOAD_URL}/uploads/${si.image_path}`} 
                                  alt={si.name} 
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} 
                                />
                              ) : (
                                <div style={{ width: '40px', height: '40px', background: 'var(--bg-app)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                  <Package size={18} style={{ opacity: 0.3 }} />
                                </div>
                              )}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 700, wordBreak: 'break-word', whiteSpace: 'normal' }}>{si.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{si.model}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <input 
                                type="number" 
                                value={si.quantity} 
                                min="1" 
                                onChange={(e) => updateItemQuantity(si.inventory_id, parseInt(e.target.value) || 0)}
                                style={{ 
                                  width: '70px', 
                                  textAlign: 'center', 
                                  padding: '6px', 
                                  background: 'var(--bg-card)', 
                                  border: si.quantity > si.max_quantity ? '1px solid var(--danger)' : '1px solid var(--border)', 
                                  borderRadius: '8px', 
                                  color: si.quantity > si.max_quantity ? 'var(--danger)' : 'var(--text-main)',
                                  outline: 'none'
                                }}
                              />
                              {si.quantity > si.max_quantity && (
                                <span style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 600, display: 'block', whiteSpace: 'nowrap' }}>
                                  เกินคลัง ({si.max_quantity})
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            {si.requires_sn === 1 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {Array.from({ length: si.quantity }).map((_, i) => {
                                  const listId = `serials-${si.inventory_id}-${i}`;
                                  const otherSelected = (si.serial_numbers || []).filter((_, idx) => idx !== i && _ !== '');
                                  const available = (si.available_serials || []).filter(sn => !otherSelected.includes(sn));
                                  
                                  return (
                                    <React.Fragment key={i}>
                                      <input 
                                        type="text" 
                                        list={listId}
                                        value={si.serial_numbers?.[i] || ''} 
                                        placeholder={`ระบุหรือเลือก S/N ${si.quantity > 1 ? `ชิ้นที่ ${i+1}` : ''}...`}
                                        onChange={(e) => updateItemSerial(si.inventory_id, i, e.target.value)}
                                        style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.85rem' }}
                                      />
                                      {available.length > 0 && (
                                        <datalist id={listId}>
                                          {available.map(sn => (
                                            <option key={sn} value={sn} />
                                          ))}
                                        </datalist>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'center', background: 'var(--bg-app)', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                                ไม่ต้องระบุ S/N
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', color: si.max_quantity < 5 ? 'var(--danger)' : 'inherit' }}>
                            {si.max_quantity}
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                            <button 
                              type="button" 
                              className="btn btn-text-danger"
                              style={{ padding: '6px' }}
                              onClick={() => removeItem(si.inventory_id)}
                              title="ลบรายการ"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1.5px dashed var(--border)', borderRadius: '12px', background: 'var(--bg-app)' }}>
                  <Package size={40} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ยังไม่ได้เลือกอุปกรณ์ กรุณาเลือกจากดรอปดาวน์ด้านบน</p>
                </div>
              )}
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card title="ข้อมูลการเบิก">
              <Input 
                label="ชื่อผู้เบิก / หน่วยงาน"
                type="text" 
                required 
                maxLength={100}
                placeholder="ระบุชื่อผู้รับ..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                disabled={loading}
              />

              <Input 
                label="โครงการ / งาน"
                type="text" 
                required 
                maxLength={100}
                placeholder="ระบุชื่อโครงการ..."
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                disabled={loading}
              />

              <Input 
                label="สถานที่ / หน้างาน"
                type="text" 
                maxLength={100}
                placeholder="ระบุสถานที่..."
                value={location}
                onChange={e => setLocation(e.target.value)}
                disabled={loading}
              />

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>ประเภทการเบิก</label>
                <select 
                  value={selectedType} 
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedType(val);
                    if (val !== 'อื่นๆ') {
                      setType(val);
                    } else {
                      setType(customType);
                    }
                  }}
                  disabled={loading}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                >
                  <option value="ติดตั้งใหม่">ติดตั้งใหม่</option>
                  <option value="ซ่อมแซม">ซ่อมแซม</option>
                  <option value="สำรองใช้งาน">สำรองใช้งาน</option>
                  <option value="ทดสอบ">ทดสอบ</option>
                  <option value="อื่นๆ">อื่นๆ...</option>
                </select>
              </div>

              {selectedType === 'อื่นๆ' && (
                <Input 
                  type="text" 
                  required 
                  maxLength={100}
                  placeholder="ระบุประเภทการเบิกอื่นๆ..."
                  value={customType}
                  onChange={e => {
                    setCustomType(e.target.value);
                    setType(e.target.value);
                  }}
                  disabled={loading}
                />
              )}
              
              <TextArea 
                label="หมายเหตุเพิ่มเติม"
                rows={4} 
                maxLength={1000}
                placeholder="ระบุหมายเหตุ..." 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                disabled={loading}
              />
              
              <Button 
                type="submit" 
                variant="primary" 
                loading={loading} 
                disabled={loading} 
                style={{ width: '100%', marginTop: '1rem' }}
              >
                บันทึกการเบิก
              </Button>
            </Card>
          </div>
        </div>
      </form>

      {/* Global CSS for dropdown hover */}
      <style>{`
        .dropdown-item-hover:hover {
          background: rgba(59, 130, 246, 0.08) !important;
        }
      `}</style>
    </div>
  );
};

export default NewWithdrawal;
