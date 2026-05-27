import React, { useEffect, useState } from 'react';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import type { Repair, RepairStatsResponse } from '../types';
import { 
  AlertCircle, 
  Search, 
  UserCheck, 
  Plus, 
  Layers, 
  Clock, 
  PauseCircle, 
  CheckCircle2,
  MapPin,
  User,
  Trash2,
  Eye
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const RepairList: React.FC = () => {
  const { notify } = useNotification();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [stats, setStats] = useState<RepairStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'All',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const location = useLocation();

  const [showModal, setShowModal] = useState<{ id: number, type: 'receive' | 'complete' | 'hold' } | null>(null);
  const [modalData, setModalData] = useState({ technician: '', note: '' });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [repairData, statsData] = await Promise.all([
        repairApi.getAll({ ...filters, type: 'repair' }),
        repairApi.getStats()
      ]);
      setRepairs(repairData);
      setStats(statsData);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching repairs:', error);
      notify('ไม่สามารถโหลดข้อมูลได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  const totalPages = Math.ceil(repairs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRepairs = repairs.slice(indexOfFirstItem, indexOfLastItem);

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
      
      notify(status === 'เสร็จสิ้น' ? '🎉 บันทึกการซ่อมเสร็จสิ้นเรียบร้อยแล้ว!' : `เปลี่ยนสถานะเป็น "${status}" เรียบร้อยแล้ว`);

      setShowModal(null);
      setModalData({ technician: '', note: '' });
      fetchData();
    } catch (error) {
      notify('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('คุณต้องการลบรายการนี้จริงหรือไม่?')) {
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
    <div className="repair-board" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '2.5rem' }}>
        <div className="page-title">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>กระดานติดตามสถานะงานซ่อม</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>จัดการและติดตามความคืบหน้าของงานซ่อมทั้งหมดในระบบ</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <Link to="/claim" className="btn btn-outline" style={{ padding: '12px 24px' }}>
            <Plus size={20} /> แจ้งเคลมใหม่
          </Link>
          <Link to="/new" className="btn btn-primary" style={{ padding: '12px 24px' }}>
            <Plus size={20} /> แจ้งซ่อมใหม่
          </Link>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'งานทั้งหมด', val: stats?.repair.total, icon: Layers, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'รอดำเนินการ', val: stats?.repair.pending, icon: AlertCircle, color: '#ef4444', bg: '#fef2f2' },
          { label: 'กำลังซ่อม', val: stats?.repair.in_progress, icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'รออะไหล่', val: stats?.repair.on_hold, icon: PauseCircle, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'เสร็จสิ้น', val: stats?.repair.completed, icon: CheckCircle2, color: '#10b981', bg: '#f0fdf4' }
        ].map((s, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }} onClick={() => setFilters({...filters, status: s.label === 'งานทั้งหมด' ? 'All' : s.label})}>
            <div style={{ background: s.bg, color: s.color, padding: '12px', borderRadius: '12px' }}>
              <s.icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.val || 0}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="ค้นหา (ตั๋ว, อุปกรณ์, ผู้แจ้ง, สถานที่)..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            onKeyUp={(e) => e.key === 'Enter' && fetchData()}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <div className="status-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {currentRepairs.length === 0 ? (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Layers size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>ไม่พบข้อมูลรายการแจ้งซ่อมในหมวดหมู่นี้</p>
            </div>
          ) : (
            currentRepairs.map((repair) => (
              <div key={repair.id} className="card repair-card" style={{ padding: '1.5rem' }}>
                <div className="repair-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>TICKET: {repair.ticket_no}</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px' }}>{repair.device_name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {repair.is_read === 0 && <span className="badge" style={{ backgroundColor: '#ef4444', color: 'white' }}>ใหม่</span>}
                    <span className={`badge badge-${repair.status}`}>{repair.status}</span>
                  </div>
                </div>
                <div className="repair-card-body" style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>{repair.problem}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <MapPin size={16} color="var(--danger)" /> {repair.location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <User size={16} /> {repair.reporter}
                  </div>
                </div>
                <div className="repair-card-footer" style={{ display: 'flex', gap: '3px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  {repair.status === 'รอดำเนินการ' && (
                    <button className="btn btn-primary" onClick={() => setShowModal({ id: repair.id, type: 'receive' })}>
                      รับงาน
                    </button>
                  )}
                  {repair.status === 'กำลังซ่อม' && (
                    <>
                      <button className="btn btn-outline" onClick={() => setShowModal({ id: repair.id, type: 'hold' })}>
                        รออะไหล่
                      </button>
                      <button className="btn btn-primary" style={{ backgroundColor: '#10b981' }} onClick={() => setShowModal({ id: repair.id, type: 'complete' })}>
                        ปิดงาน
                      </button>
                    </>
                  )}
                  {repair.status === 'รออะไหล่' && (
                    <button className="btn btn-primary" onClick={() => setShowModal({ id: repair.id, type: 'receive' })}>
                      ดำเนินการต่อ
                    </button>
                  )}
                  <Link to={`/repairs/${repair.id}`} className="btn btn-outline" title="ดูรายละเอียด">
                    <Eye size={18} />
                  </Link>
                  <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: '#fee2e2' }} onClick={() => handleDelete(repair.id)} title="ลบ">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button 
            className="btn btn-outline" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ก่อนหน้า
          </button>
          <span style={{ fontWeight: 600 }}>หน้า {currentPage} จาก {totalPages}</span>
          <button 
            className="btn btn-outline" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            ถัดไป
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {showModal.type === 'receive' ? <UserCheck color="var(--primary)" /> : 
               showModal.type === 'complete' ? <CheckCircle2 color="var(--success)" /> : <PauseCircle color="var(--warning)" />}
              {showModal.type === 'receive' ? 'รับมอบหมายงานซ่อม' : 
               showModal.type === 'complete' ? 'ปิดงาน / ซ่อมเสร็จสิ้น' : 'ระงับงานชั่วคราว'}
            </h3>
            <form onSubmit={handleWorkflow}>
              {(showModal.type === 'receive' || !repairs.find(r => r.id === showModal.id)?.technician) && (
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
                  <label>บันทึกการแก้ไข (Repair Note)</label>
                  <textarea 
                    required 
                    rows={3} 
                    placeholder="สรุปการแก้ไขปัญหา..."
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
                    placeholder="เช่น รออะไหล่, ติดปัญหาหน้างาน..."
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

export default RepairList;
