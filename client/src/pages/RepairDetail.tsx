import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import type { RepairDetail as IRepairDetail } from '../types';
import { 
  ArrowLeft, 
  History, 
  Image as ImageIcon, 
  User, 
  FileText, 
  Trash2, 
  MapPin, 
  Laptop, 
  AlertTriangle,
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  Settings
} from 'lucide-react';
import { generateRepairPDF } from '../utils/pdfGenerator';
import PrintTemplate from '../components/PrintTemplate';

const RepairDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [repair, setRepair] = useState<IRepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [deviceForm, setDeviceForm] = useState({
    old_serial: '',
    old_model: '',
    new_serial: '',
    new_model: '',
  });
  const [editForm, setEditForm] = useState({
    reporter: '',
    location: '',
    device_name: '',
    problem: '',
    priority: ''
  });

  const fetchRepair = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await repairApi.getById(id);
      setRepair(data);
      setStatusForm({ status: data.status, note: '' });
      setEditForm({
        reporter: data.reporter,
        location: data.location,
        device_name: data.device_name,
        problem: data.problem,
        priority: data.priority
      });
    } catch (error) {
      console.error('Error fetching repair detail:', error);
      notify('ไม่สามารถดึงข้อมูลรายการนี้ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, notify]);

  useEffect(() => {
    const markAsRead = async () => {
      if (!id) return;
      try {
        await repairApi.markAsRead(id);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    };
    markAsRead();
    fetchRepair();
  }, [fetchRepair, id]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await repairApi.updateStatus(id, { 
        status: statusForm.status, 
        repair_note: statusForm.note, 
        note: statusForm.note,
        user: 'ช่างเทคนิค' 
      });
      notify('อัปเดตสถานะงานเรียบร้อยแล้ว');
      setShowStatusModal(false);
      fetchRepair();
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    }
  };

  const handleDeviceReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await repairApi.replaceDevice(id, { ...deviceForm, technician: 'ช่างเทคนิค' });
      notify('บันทึกการเปลี่ยนอะไหล่เรียบร้อยแล้ว');
      setShowDeviceModal(false);
      fetchRepair();
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  const handleEditUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await repairApi.update(id, editForm);
      notify('แก้ไขข้อมูลเรียบร้อยแล้ว');
      setShowEditModal(false);
      fetchRepair();
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('คุณต้องการลบรายการแจ้งซ่อมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      await repairApi.delete(id);
      notify('ลบรายการแจ้งซ่อมสำเร็จ');
      navigate('/repairs');
    } catch {
      notify('เกิดข้อผิดพลาดในการลบรายการ', 'error');
    }
  };

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const handlePrint = async () => {
    if (!repair) return;
    setPdfLoading(true);
    try {
      const blob = await generateRepairPDF('pdf-print-template');
      if (blob) {
        setPdfBlob(blob);
        setShowPrintModal(true);
      }
    } catch {
      notify('ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob || !repair) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${repair.location}_${repair.device_name}_${repair.technician || 'ไม่ระบุ'}.pdf`;
    link.click();
    setShowPrintModal(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner"></div>
      <p style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>กำลังโหลดรายละเอียด...</p>
    </div>
  );
  if (!repair) return <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>ไม่พบข้อมูลรายการแจ้งซ่อม</div>;

  return (
    <div className="repair-detail">
      <PrintTemplate repair={repair} />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> ย้อนกลับ
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={handleDelete}>
            <Trash2 size={18} /> ลบรายการ
          </button>
          <button 
            className="btn btn-primary" 
            style={{ backgroundColor: '#ef4444' }} 
            onClick={handlePrint}
            disabled={pdfLoading}
          >
            {pdfLoading ? <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div> : <FileText size={18} />}
            ปริ้น PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>TICKET: {repair.ticket_no}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> {new Date(repair.created_at).toLocaleString('th-TH')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14}/> ล่าสุด: {new Date(repair.updated_at).toLocaleString('th-TH')}</div>
            </div>
          </div>
          <span className={`badge badge-${repair.status}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
            {repair.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => setShowEditModal(true)}>
             <Settings size={18} /> แก้ไข
          </button>
          <button className="btn btn-outline" onClick={() => setShowDeviceModal(true)}>
             <Wrench size={18} /> อุปกรณ์
          </button>
          <button className="btn btn-primary" onClick={() => setShowStatusModal(true)}>
            <CheckCircle2 size={18} /> อัปเดตสถานะ
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <FileText color="var(--primary)" /> รายละเอียดการแจ้งซ่อม
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="info-item">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  <User size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> ผู้แจ้งซ่อม
                </label>
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{repair.reporter}</p>
              </div>
              <div className="info-item">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> ระดับความสำคัญ
                </label>
                <p className={`priority-${repair.priority === 'วิกฤต' || repair.priority === 'ด่วนมาก' ? 'high' : repair.priority === 'ด่วน' ? 'medium' : 'low'}`} style={{ fontWeight: 700 }}>{repair.priority}</p>
              </div>
              <div className="info-item">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> สถานที่ / จุดติดตั้ง
                </label>
                <p style={{ fontWeight: 600 }}>{repair.location}</p>
              </div>
              <div className="info-item">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  <Laptop size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> ชื่ออุปกรณ์ / รุ่น
                </label>
                <p style={{ fontWeight: 600 }}>{repair.device_name}</p>
              </div>
            </div>
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '10px' }}>อาการเสีย / ปัญหาที่พบ</label>
              <p style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', lineHeight: '1.6' }}>
                {repair.problem}
              </p>
            </div>
            {repair.repair_note && (
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ color: '#166534', fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '10px' }}>บันทึกการแก้ไขจากช่าง (Final Note)</label>
                <p style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 500 }}>
                  {repair.repair_note}
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <History color="var(--primary)" /> ประวัติการดำเนินการ (Activity Timeline)
            </h3>
            <div className="timeline" style={{ paddingLeft: '1rem' }}>
              {repair.logs.map((log, index) => (
                <div key={log.id} style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', position: 'relative' }}>
                  <div style={{ flexShrink: 0, width: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      backgroundColor: index === 0 ? 'var(--primary)' : '#cbd5e1', 
                      zIndex: 1,
                      boxShadow: index === 0 ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'
                    }}></div>
                    {index !== repair.logs.length - 1 && <div style={{ flexGrow: 1, width: '2px', backgroundColor: '#e2e8f0', margin: '4px 0' }}></div>}
                  </div>
                  <div style={{ paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: index === 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>{log.action}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{new Date(log.created_at).toLocaleString('th-TH')}</span>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: '1.5' }}>{log.note}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                      <User size={14} /> โดย: {log.user}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ImageIcon color="var(--primary)" /> รูปภาพหลักฐาน
            </h3>
            {repair.images.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {repair.images.map(img => (
                  <div key={img.id} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'zoom-in' }}>
                    <img 
                      src={`http://localhost:5221/${img.file_path}`} 
                      crossOrigin="anonymous"
                      alt="repair evidence" 
                      style={{ width: '100%', height: '120px', objectFit: 'cover' }} 
                      onClick={() => window.open(`http://localhost:5000/${img.file_path}`, '_blank')}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed var(--border)' }}>
                <ImageIcon size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>ไม่มีรูปภาพประกอบ</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Wrench color="var(--primary)" /> อุปกรณ์ที่ติดตั้งใหม่
            </h3>
            {repair.devices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed var(--border)' }}>
                <p style={{ fontSize: '0.85rem' }}>ยังไม่มีการบันทึกการเปลี่ยนอะไหล่</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {repair.devices.map(dev => (
                  <div key={dev.id} style={{ padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.9rem' }}>
                    <div style={{ marginBottom: '0.75rem', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                      <Calendar size={14} /> {new Date(dev.changed_at).toLocaleDateString('th-TH')}
                    </div>
                    <div style={{ color: '#ef4444', marginBottom: '8px' }}>
                       <strong>ถอดออก:</strong> {dev.old_model} <br/>
                       <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>S/N: {dev.old_serial}</span>
                    </div>
                    <div style={{ color: '#10b981' }}>
                       <strong>ติดตั้งใหม่:</strong> {dev.new_model} <br/>
                       <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>S/N: {dev.new_serial}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Basic Info Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3><Settings size={20} color="var(--primary)" /> แก้ไขข้อมูลใบแจ้งซ่อม</h3>
            <form onSubmit={handleEditUpdate}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>ชื่อผู้แจ้ง</label>
                <input type="text" required value={editForm.reporter} onChange={e => setEditForm({...editForm, reporter: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>จุดติดตั้ง/สถานที่</label>
                <input type="text" required value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>อุปกรณ์ / รุ่น</label>
                <input type="text" required value={editForm.device_name} onChange={e => setEditForm({...editForm, device_name: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>ความสำคัญ</label>
                <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
                  <option value="ปกติ">ปกติ</option>
                  <option value="ด่วน">ด่วน</option>
                  <option value="ด่วนมาก">ด่วนมาก</option>
                  <option value="วิกฤต">วิกฤต</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>อาการเสีย/ปัญหา</label>
                <textarea rows={3} required value={editForm.problem} onChange={e => setEditForm({...editForm, problem: e.target.value})}></textarea>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3><CheckCircle2 size={20} color="var(--primary)" /> อัปเดตสถานะงาน</h3>
            <form onSubmit={handleStatusUpdate}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>เปลี่ยนสถานะเป็น</label>
                <select value={statusForm.status} onChange={e => setStatusForm({...statusForm, status: e.target.value as any})}>
                  <option value="รอดำเนินการ">รอดำเนินการ</option>
                  <option value="กำลังซ่อม">กำลังซ่อม</option>
                  <option value="รออะไหล่">รออะไหล่</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>บันทึกสรุปผล / หมายเหตุ</label>
                <textarea rows={4} value={statusForm.note} onChange={e => setStatusForm({...statusForm, note: e.target.value})} placeholder="ระบุรายละเอียดการดำเนินการ..."></textarea>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowStatusModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">ยืนยันการบันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Replacement Modal */}
      {showDeviceModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3><Wrench size={20} color="var(--primary)" /> บันทึกการเปลี่ยนอะไหล่</h3>
            <form onSubmit={handleDeviceReplace}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>ข้อมูลอุปกรณ์เดิม</h4>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>รุ่นอุปกรณ์</label>
                    <input type="text" required placeholder="ระบุรุ่นที่ถอดออก" value={deviceForm.old_model} onChange={e => setDeviceForm({...deviceForm, old_model: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Serial No.</label>
                    <input type="text" required placeholder="ระบุ Serial เดิม" value={deviceForm.old_serial} onChange={e => setDeviceForm({...deviceForm, old_serial: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--success)' }}>ข้อมูลอุปกรณ์ใหม่</h4>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>รุ่นอุปกรณ์</label>
                    <input type="text" required placeholder="ระบุรุ่นที่ติดตั้งใหม่" value={deviceForm.new_model} onChange={e => setDeviceForm({...deviceForm, new_model: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Serial No.</label>
                    <input type="text" required placeholder="ระบุ Serial ใหม่" value={deviceForm.new_serial} onChange={e => setDeviceForm({...deviceForm, new_serial: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDeviceModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">ยืนยันการเปลี่ยน</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Print Preview Modal */}
      {showPrintModal && repair && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3><FileText size={20} color="var(--primary)" /> ตัวอย่างใบรายงาน</h3>
              <button type="button" className="btn btn-outline" onClick={() => setShowPrintModal(false)}>ปิด</button>
            </div>
            
            <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center', marginBottom: '-250px' }}>
              <PrintTemplate repair={repair} isPreview={true} />
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-primary" onClick={downloadPDF}>ดาวน์โหลด PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairDetail;
