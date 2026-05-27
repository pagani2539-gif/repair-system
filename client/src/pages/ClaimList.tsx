import React, { useEffect, useState } from 'react';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import type { Repair } from '../types';
import { 
  Search, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  MapPin, 
  User, 
  Trash2, 
  Eye, 
  ClipboardList,
  CheckCircle2,
  PauseCircle
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const ClaimList: React.FC = () => {
  const { notify } = useNotification();
  const [claims, setClaims] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: ''
  });
  const location = useLocation();

  const [showModal, setShowModal] = useState<{ id: number, type: 'receive' | 'complete' | 'hold' } | null>(null);
  const [modalData, setModalData] = useState({ technician: '', note: '' });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await repairApi.getAll({ ...filters, type: 'claim' });
      setClaims(data);
    } catch (error) {
      console.error('Error fetching claims:', error);
      notify('ไม่สามารถโหลดข้อมูลรายการเคลมได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData, location]);

  const handleWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showModal) return;

    let status = '';
    if (showModal.type === 'receive') status = 'กำลังซ่อม';
    if (showModal.type === 'complete') status = 'เสร็จสิ้น';
    if (showModal.type === 'hold') status = 'รออะไหล่';

    try {
      await repairApi.updateStatus(showModal.id, {
        status,
        user: modalData.technician || 'ช่างเทคนิค',
        technician: modalData.technician,
        repair_note: modalData.note,
        note: modalData.note
      });
      
      notify(status === 'เสร็จสิ้น' ? '🎉 บันทึกการเคลมเสร็จสิ้นเรียบร้อยแล้ว!' : `เปลี่ยนสถานะเป็น "${status}" เรียบร้อยแล้ว`);

      setShowModal(null);
      setModalData({ technician: '', note: '' });
      fetchData();
    } catch (error) {
      notify('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('คุณต้องการลบรายการเคลมนี้จริงหรือไม่?')) {
      try {
        await repairApi.delete(id);
        notify('ลบรายการสำเร็จ');
        fetchData();
      } catch (error) {
        notify('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
      }
    }
  };

  return (
    <div className="repair-board">
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '2rem' }}>
        <div className="page-title">
          <h2>ประวัติการส่งเคลมอุปกรณ์</h2>
          <p>ติดตามและจัดการรายการเคลมอุปกรณ์ที่ส่งเข้าศูนย์บริการ</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <Link to="/claim" className="btn btn-outline">
            <Plus size={18} /> แจ้งเคลมใหม่
          </Link>
          <Link to="/new" className="btn btn-primary">
            <Plus size={18} /> แจ้งซ่อมใหม่
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="search-container" style={{ maxWidth: '500px' }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="ค้นหา (เลขตั๋ว, ชื่ออุปกรณ์, ผู้แจ้ง, สถานที่)..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            onKeyUp={(e) => e.key === 'Enter' && fetchData()}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>กำลังดึงข้อมูลงานเคลม...</p>
        </div>
      ) : (
        <>
          <div className="status-board">
            {claims.length === 0 ? (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                <ClipboardList size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                <p style={{ fontSize: '1.1rem' }}>ไม่พบข้อมูลรายการแจ้งเคลม</p>
              </div>
            ) : (
              claims.map((claim) => (
                <div key={claim.id} className="card repair-card">
                  <div className="repair-card-header">
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, marginBottom: '4px' }}>
                        CLAIM TICKET: {claim.ticket_no}
                      </span>
                      <Link to={`/repairs/${claim.id}`} style={{ fontWeight: 800, textDecoration: 'none', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                        {claim.device_name}
                      </Link>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {claim.is_read === 0 && (
                        <span className="badge" style={{ backgroundColor: '#ef4444', color: 'white' }}>ใหม่</span>
                      )}
                      <span className={`badge badge-${claim.status}`}>{claim.status}</span>
                    </div>
                  </div>
                  
                  <div className="repair-card-body">
                    <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <AlertCircle size={16} style={{ marginTop: '4px', color: 'var(--primary)' }} />
                      <div>
                         <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เหตุผลการเคลม:</strong>
                         <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{claim.problem}</p>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <MapPin size={16} color="var(--danger)" />
                      <span style={{ fontSize: '0.9rem' }}>{claim.location}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} /> {claim.reporter}
                      </div>
                      <span>{new Date(claim.created_at).toLocaleDateString('th-TH')}</span>
                    </div>
                    {claim.technician && (
                      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                        <UserCheck size={16} /> ช่างผู้ประสานงาน: {claim.technician}
                      </div>
                    )}
                  </div>

                  <div className="repair-card-footer" style={{ display: 'flex', gap: '3px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    {claim.status === 'รอดำเนินการ' && (
                      <button className="btn btn-primary" onClick={() => setShowModal({ id: claim.id, type: 'receive' })}>
                        รับงานเคลม
                      </button>
                    )}
                    {claim.status === 'กำลังซ่อม' && (
                      <>
                        <button className="btn btn-outline" onClick={() => setShowModal({ id: claim.id, type: 'hold' })}>
                          รออะไหล่
                        </button>
                        <button className="btn btn-primary" style={{ backgroundColor: '#10b981' }} onClick={() => setShowModal({ id: claim.id, type: 'complete' })}>
                          ปิดงานเคลม
                        </button>
                      </>
                    )}
                    {claim.status === 'รออะไหล่' && (
                      <button className="btn btn-primary" onClick={() => setShowModal({ id: claim.id, type: 'receive' })}>
                        ดำเนินการต่อ
                      </button>
                    )}
                    <Link to={`/repairs/${claim.id}`} className="btn btn-outline" title="ดูรายละเอียด">
                      <Eye size={18} />
                    </Link>
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: '#fee2e2' }} onClick={() => handleDelete(claim.id)} title="ลบ">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               {showModal.type === 'receive' ? <UserCheck color="var(--primary)" /> : 
                showModal.type === 'complete' ? <CheckCircle2 color="var(--success)" /> : <PauseCircle color="var(--warning)" />}
               {showModal.type === 'receive' ? 'รับมอบหมายงานเคลม' : 
                showModal.type === 'complete' ? 'ปิดงาน / เคลมเสร็จสิ้น' : 'ระงับงานชั่วคราว'}
            </h3>
            <form onSubmit={handleWorkflow}>
              {(showModal.type === 'receive' || !claims.find(r => r.id === showModal.id)?.technician) && (
                <div className="form-group">
                  <label>ชื่อช่างผู้รับงาน</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="กรอกชื่อช่าง..."
                    value={modalData.technician}
                    onChange={e => setModalData({...modalData, technician: e.target.value})}
                  />
                </div>
              )}
              {showModal.type === 'complete' && (
                <div className="form-group">
                  <label>บันทึกการเคลม (Claim Note)</label>
                  <textarea 
                    required 
                    rows={3} 
                    placeholder="สรุปผลการส่งเคลม..."
                    value={modalData.note}
                    onChange={e => setModalData({...modalData, note: e.target.value})}
                  ></textarea>
                </div>
              )}
              {showModal.type === 'hold' && (
                <div className="form-group">
                  <label>เหตุผลที่ระงับงาน</label>
                  <textarea 
                    required 
                    rows={2} 
                    placeholder="เช่น รออะไหล่จากบริษัท..."
                    value={modalData.note}
                    onChange={e => setModalData({...modalData, note: e.target.value})}
                  ></textarea>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimList;
