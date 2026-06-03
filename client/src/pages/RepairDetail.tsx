import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { repairApi, UPLOAD_URL } from '../api';
import { useNotification } from '../components/Layout';
import type { RepairDetail as IRepairDetail } from '../types';
import { 
  ArrowLeft, 
  History as HistoryIcon, 
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
  
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [replacingDevice, setReplacingDevice] = useState(false);
  const [updatingEdit, setUpdatingEdit] = useState(false);
  
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [deviceForm, setDeviceForm] = useState({
    old_serial: '',
    old_model: '',
    new_serial: '',
    new_model: '',
  });
  const [editForm, setEditForm] = useState({
    reporter: '',
    project_name: '',
    location: '',
    device_name: '',
    problem: '',
    priority: ''
  });

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // If it's SQLite format "YYYY-MM-DD HH:MM:SS", convert to ISO UTC
    if (dateStr.includes(' ') && !dateStr.includes('T')) {
      return new Date(dateStr.replace(' ', 'T') + 'Z');
    }
    return new Date(dateStr);
  };

  const fetchRepair = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await repairApi.getById(id);
      setRepair(data);
      setStatusForm({ status: data.status, note: '' });
      setEditForm({
        reporter: data.reporter,
        project_name: data.project_name || '',
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
    const timer = setTimeout(() => {
      fetchRepair();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const trimmedNote = statusForm.note.trim();
    if (trimmedNote.length > 1000) {
      notify('หมายเหตุยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)', 'error');
      return;
    }
    setUpdatingStatus(true);
    try {
      await repairApi.updateStatus(id, { 
        status: statusForm.status, 
        repair_note: trimmedNote, 
        note: trimmedNote,
        user: 'ช่างเทคนิค' 
      });
      notify('อัปเดตสถานะงานเรียบร้อยแล้ว');
      setShowStatusModal(false);
      fetchRepair();
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeviceReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const trimmedOldModel = deviceForm.old_model.trim();
    const trimmedOldSerial = deviceForm.old_serial.trim();
    const trimmedNewModel = deviceForm.new_model.trim();
    const trimmedNewSerial = deviceForm.new_serial.trim();

    if (!trimmedOldModel || !trimmedOldSerial || !trimmedNewModel || !trimmedNewSerial) {
      notify('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง', 'error');
      return;
    }

    if (trimmedOldModel.length > 100 || trimmedOldSerial.length > 100 || trimmedNewModel.length > 100 || trimmedNewSerial.length > 100) {
      notify('ข้อมูลรุ่นหรือ Serial Number ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }

    setReplacingDevice(true);
    try {
      await repairApi.replaceDevice(id, { 
        old_model: trimmedOldModel,
        old_serial: trimmedOldSerial,
        new_model: trimmedNewModel,
        new_serial: trimmedNewSerial,
        technician: 'ช่างเทคนิค' 
      });
      notify('บันทึกการเปลี่ยนอะไหล่เรียบร้อยแล้ว');
      setShowDeviceModal(false);
      fetchRepair();
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setReplacingDevice(false);
    }
  };

  const handleEditUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const trimmedReporter = editForm.reporter.trim();
    const trimmedProjectName = editForm.project_name.trim();
    const trimmedLocation = editForm.location.trim();
    const trimmedDeviceName = editForm.device_name.trim();
    const trimmedProblem = editForm.problem.trim();

    if (!trimmedReporter || !trimmedProjectName || !trimmedDeviceName || !trimmedProblem) {
      notify('กรุณากรอกข้อมูลให้ครบถ้วนในช่องที่จำเป็น', 'error');
      return;
    }

    if (trimmedReporter.length > 100) {
      notify('ชื่อผู้เบิกยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedProjectName.length > 100) {
      notify('ชื่อโครงการยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedLocation.length > 100) {
      notify('สถานที่ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedDeviceName.length > 100) {
      notify('ชื่ออุปกรณ์ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedProblem.length > 1000) {
      notify('อาการเสียยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)', 'error');
      return;
    }

    setUpdatingEdit(true);
    try {
      await repairApi.update(id, {
        reporter: trimmedReporter,
        project_name: trimmedProjectName,
        location: trimmedLocation,
        device_name: trimmedDeviceName,
        problem: trimmedProblem,
        priority: editForm.priority
      });
      notify('แก้ไขข้อมูลเรียบร้อยแล้ว');
      setShowEditModal(false);
      fetchRepair();
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setUpdatingEdit(false);
    }
  };

  const handleDelete = async () => {
    const isClaim = repair?.type === 'claim';
    const msg = isClaim 
      ? 'คุณต้องการลบรายการแจ้งเคลมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้'
      : 'คุณต้องการลบรายการแจ้งซ่อมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้';
    if (!id || !window.confirm(msg)) return;
    try {
      await repairApi.delete(id);
      notify(isClaim ? 'ลบรายการแจ้งเคลมสำเร็จ' : 'ลบรายการแจ้งซ่อมสำเร็จ');
      navigate(isClaim ? '/claim-history' : '/repairs');
    } catch {
      notify('เกิดข้อผิดพลาดในการลบรายการ', 'error');
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('pdf-print-template');
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้เปิด Pop-up window เพื่อพิมพ์ใบงาน\n(Allow pop-up in your browser)');
      return;
    }

    printWindow.document.write('<!DOC' + 'TYPE html>\n' + `
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบงาน - ${repair?.ticket_no || ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Sarabun:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body {
      font-family: 'Outfit', 'Sarabun', sans-serif;
      margin: 0; padding: 0;
      width: 210mm; height: 297mm;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }
    * { box-sizing: border-box; }
    #pdf-print-template {
      position: relative !important;
      left: 0 !important;
      top: 0 !important;
    }
  </style>
</head>
<body>
  ${element.outerHTML}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();

    // Wait for fonts/images to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 800);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner"></div>
      <p style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>กำลังโหลดรายละเอียด...</p>
    </div>
  );
  if (!repair) {
    const isClaim = window.location.pathname.includes('claim');
    return <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>ไม่พบข้อมูลรายการแจ้ง{isClaim ? 'เคลม' : 'ซ่อม'}</div>;
  }

  return (
    <div className="repair-detail">
      <PrintTemplate repair={repair} />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> ย้อนกลับ
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={18} style={{ marginRight: '6px' }} /> ลบรายการ
          </button>
          <button 
            className="btn btn-primary" 
            style={{ backgroundColor: '#dc2626' }} 
            onClick={handlePrint}
          >
            <FileText size={18} /> ปริ้นใบงาน
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', padding: '1.5rem', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>TICKET: {repair.ticket_no}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14}/> รับเรื่องเมื่อ: {parseDate(repair.received_at).toLocaleString('th-TH')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> บันทึกเมื่อ: {parseDate(repair.created_at).toLocaleString('th-TH')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={14}/> อัปเดตล่าสุด: {parseDate(repair.updated_at).toLocaleString('th-TH')}</div>
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

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <FileText color="var(--primary)" /> รายละเอียดการแจ้ง{repair.type === 'claim' ? 'เคลม' : 'ซ่อม'}
            </h3>
            <div className="form-grid">
              <div className="info-item">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  <User size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> ชื่อผู้เบิก / หน่วยงาน
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
                  <HistoryIcon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> โครงการ / งาน
                </label>
                <p style={{ fontWeight: 600 }}>{repair.project_name || '-'}</p>
              </div>
              <div className="info-item">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> สถานที่ / หน้างาน
                </label>
                <p style={{ fontWeight: 600 }}>{repair.location || '-'}</p>
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
            <p style={{ background: '#f1f5f9', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', lineHeight: '1.6' }}>
              {repair.problem}
            </p>
            </div>
            {repair.repair_note && (
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ color: '#15803d', fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '10px' }}>บันทึกการแก้ไขจากช่าง (Final Note)</label>
              <p style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 500 }}>
                {repair.repair_note}
              </p>
            </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <HistoryIcon color="var(--primary)" /> ประวัติการดำเนินการ (Activity Timeline)
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{parseDate(log.created_at).toLocaleString('th-TH')}</span>
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
                      src={`${UPLOAD_URL}/${img.file_path}`} 
                      crossOrigin="anonymous"
                      alt="repair evidence" 
                      style={{ width: '100%', height: '120px', objectFit: 'cover' }} 
                      onClick={() => window.open(`${UPLOAD_URL}/${img.file_path}`, '_blank')}
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
                      <Calendar size={14} /> {parseDate(dev.changed_at).toLocaleDateString('th-TH')}
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
            <h3><Settings size={20} color="var(--primary)" /> แก้ไขข้อมูลใบแจ้ง{repair.type === 'claim' ? 'เคลม' : 'ซ่อม'}</h3>
            <form onSubmit={handleEditUpdate}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>ชื่อผู้เบิก / หน่วยงาน</label>
                <input type="text" required maxLength={100} value={editForm.reporter} onChange={e => setEditForm({...editForm, reporter: e.target.value})} disabled={updatingEdit} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>โครงการ / งาน</label>
                <input type="text" required maxLength={100} value={editForm.project_name} onChange={e => setEditForm({...editForm, project_name: e.target.value})} disabled={updatingEdit} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>สถานที่ / หน้างาน</label>
                <input type="text" maxLength={100} value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} disabled={updatingEdit} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>อุปกรณ์ / รุ่น</label>
                <input type="text" required maxLength={100} value={editForm.device_name} onChange={e => setEditForm({...editForm, device_name: e.target.value})} disabled={updatingEdit} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>ความสำคัญ</label>
                <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})} disabled={updatingEdit}>
                  <option value="ปกติ">ปกติ</option>
                  <option value="ด่วน">ด่วน</option>
                  <option value="ด่วนมาก">ด่วนมาก</option>
                  <option value="วิกฤต">วิกฤต</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>อาการเสีย/ปัญหา</label>
                <textarea rows={3} required maxLength={1000} value={editForm.problem} onChange={e => setEditForm({...editForm, problem: e.target.value})} disabled={updatingEdit}></textarea>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)} disabled={updatingEdit}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={updatingEdit}>บันทึกการแก้ไข</button>
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
                <select value={statusForm.status} onChange={e => setStatusForm({...statusForm, status: e.target.value})} disabled={updatingStatus}>
                  <option value="รอดำเนินการ">รอดำเนินการ</option>
                  <option value="กำลังซ่อม">กำลังซ่อม</option>
                  <option value="รออะไหล่">รออะไหล่</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>บันทึกสรุปผล / หมายเหตุ</label>
                <textarea rows={4} maxLength={1000} value={statusForm.note} onChange={e => setStatusForm({...statusForm, note: e.target.value})} placeholder="ระบุรายละเอียดการดำเนินการ..." disabled={updatingStatus}></textarea>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowStatusModal(false)} disabled={updatingStatus}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={updatingStatus}>ยืนยันการบันทึก</button>
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
                    <input type="text" required placeholder="ระบุรุ่นที่ถอดออก" maxLength={100} value={deviceForm.old_model} onChange={e => setDeviceForm({...deviceForm, old_model: e.target.value})} disabled={replacingDevice} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Serial No.</label>
                    <input type="text" required placeholder="ระบุ Serial เดิม" maxLength={100} value={deviceForm.old_serial} onChange={e => setDeviceForm({...deviceForm, old_serial: e.target.value})} disabled={replacingDevice} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--success)' }}>ข้อมูลอุปกรณ์ใหม่</h4>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>รุ่นอุปกรณ์</label>
                    <input type="text" required placeholder="ระบุรุ่นที่ติดตั้งใหม่" maxLength={100} value={deviceForm.new_model} onChange={e => setDeviceForm({...deviceForm, new_model: e.target.value})} disabled={replacingDevice} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Serial No.</label>
                    <input type="text" required placeholder="ระบุ Serial ใหม่" maxLength={100} value={deviceForm.new_serial} onChange={e => setDeviceForm({...deviceForm, new_serial: e.target.value})} disabled={replacingDevice} />
                  </div>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDeviceModal(false)} disabled={replacingDevice}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={replacingDevice}>ยืนยันการเปลี่ยน</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairDetail;
