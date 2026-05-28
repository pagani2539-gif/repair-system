import React, { useEffect, useState } from 'react';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import type { Repair, RepairStatsResponse } from '../types';
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
  PauseCircle,
  Clock,
  Layers
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const ClaimList: React.FC = () => {
  const { notify } = useNotification();
  const [claims, setClaims] = useState<Repair[]>([]);
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

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes(' ') && !dateStr.includes('T')) {
      return new Date(dateStr.replace(' ', 'T') + 'Z');
    }
    return new Date(dateStr);
  };

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [claimData, statsData] = await Promise.all([
        repairApi.getAll({ 
          status: filters.status, 
          search: filters.search, 
          type: 'claim' 
        }),
        repairApi.getStats()
      ]);
      setClaims(claimData);
      setStats(statsData);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching claims:', error);
      notify('ไม่สามารถโหลดข้อมูลรายการเคลมได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  const totalPages = Math.ceil(claims.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClaims = claims.slice(indexOfFirstItem, indexOfLastItem);

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
    <div className="repair-board" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '2.5rem' }}>
        <div className="page-title">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>กระดานติดตามสถานะงานเคลม</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>ติดตามและจัดการรายการเคลมอุปกรณ์ที่ส่งเข้าศูนย์บริการเพื่อตรวจเช็คและรับของทดแทน</p>
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

      <div className="stats-grid">
        {[
          { label: 'งานทั้งหมด', val: stats?.claim.total, icon: Layers, statusVal: 'All' },
          { label: 'รอดำเนินการ', val: stats?.claim.pending, icon: AlertCircle, statusVal: 'รอดำเนินการ' },
          { label: 'กำลังเคลม', val: stats?.claim.in_progress, icon: Clock, statusVal: 'กำลังซ่อม' },
          { label: 'รออะไหล่/ศูนย์', val: stats?.claim.on_hold, icon: PauseCircle, statusVal: 'รออะไหล่' },
          { label: 'เคลมเสร็จสิ้น', val: stats?.claim.completed, icon: CheckCircle2, statusVal: 'เสร็จสิ้น' }
        ].map((s, i) => (
          <div 
            key={i} 
            className="card" 
            style={{ 
              border: filters.status === s.statusVal ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              borderLeftWidth: '4px',
              borderLeftColor: i === 0 ? 'var(--primary)' : i === 1 ? 'var(--danger)' : i === 2 ? 'var(--warning)' : i === 3 ? 'var(--info)' : 'var(--success)',
              boxShadow: filters.status === s.statusVal ? 'var(--shadow-glow)' : 'var(--shadow-sm)'
            }}
            onClick={() => setFilters({...filters, status: s.statusVal})}
          >
            <div className="stat-icon-wrapper">
              <s.icon size={24} />
            </div>
            <div>
              <div className="stat-value">{s.val || 0}</div>
              <div className="stat-label">{s.label}</div>
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
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>กำลังดึงข้อมูลงานเคลม...</p>
        </div>
      ) : (
        <>
          <div className="status-board">
            {currentClaims.length === 0 ? (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>ไม่พบข้อมูลรายการแจ้งเคลมในหมวดหมู่นี้</p>
              </div>
            ) : (
              currentClaims.map((claim) => (
                <div key={claim.id} className="card repair-card">
                  <div className="repair-card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>
                          CLAIM TICKET: {claim.ticket_no}
                        </span>
                        <Link to={`/repairs/${claim.id}`} style={{ fontWeight: 800, textDecoration: 'none', color: 'var(--text-main)', fontSize: '1.1rem', marginTop: '2px', display: 'block' }}>
                          {claim.device_name}
                        </Link>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {claim.is_read === 0 && (
                          <span className="badge" style={{ backgroundColor: '#dc2626', color: 'white' }}>ใหม่</span>
                        )}
                        <span className={`badge badge-${claim.status}`}>{claim.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="repair-card-body">
                    <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <AlertCircle size={16} style={{ marginTop: '4px', color: 'var(--primary)' }} />
                      <div>
                         <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เหตุผลการเคลม:</strong>
                         <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: '4px 0 0 0' }}>{claim.problem}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 500 }}>
                      <MapPin size={16} color="var(--danger)" />
                      <span style={{ fontSize: '0.9rem' }}>{claim.location}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} /> ผู้แจ้ง: {claim.reporter}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} /> รับเรื่อง: {parseDate(claim.received_at).toLocaleString('th-TH')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ClipboardList size={14} /> บันทึก: {parseDate(claim.created_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                    {claim.technician && (
                      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                        <UserCheck size={16} /> ช่างผู้ประสานงาน: {claim.technician}
                      </div>
                    )}
                  </div>

                  <div className="repair-card-footer">
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
                        <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #047857 100%)', color: 'white', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }} onClick={() => setShowModal({ id: claim.id, type: 'complete' })}>
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
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }} onClick={() => handleDelete(claim.id)} title="ลบ">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
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
