import React, { useEffect, useState } from 'react';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDateTimeThai, parseDate } from '../utils/formatDate';
import DatePicker from '../components/ui/DatePicker';
import type { Repair } from '../types';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  Trash, 
  AlertTriangle, 
  UserCheck, 
  MapPin, 
  User, 
  CheckCircle2,
  Hourglass,
  Clock,
  Inbox,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  PauseCircle
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const ClaimList: React.FC = () => {
  const { notify } = useNotification();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const itemsPerPage = viewMode === 'table' ? 15 : 9;

  const [colFilters, setColFilters] = useState({
    ticket_no: '',
    received_at: '',
    device_name: '',
    problem: '',
    location: '',
    status: 'All'
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

  const [filters, setFilters] = useState({
    status: 'All',
    search: '',
    priority: 'All',
    location: 'All',
    sortBy: 'newest'
  });

  const [locations, setLocations] = useState<string[]>([]);
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const allClaims = await repairApi.getAll({ type: 'claim' });
        const locSet = new Set<string>();
        allClaims.forEach(c => {
          if (c.location) locSet.add(c.location);
        });
        setLocations(Array.from(locSet));
      } catch (err) {
        console.error('Failed to load locations:', err);
      }
    };
    loadLocations();
  }, []);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const parseInputDate = (dateStr: string, isEnd: boolean): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isEnd) {
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
  };

  const { data: claims = [], loading: listLoading, request: fetchClaims } = useApi(
    async (params: { status?: string; search?: string; priority?: string; location?: string; sortBy?: string }) => 
      await repairApi.getAll({ 
        status: params.status, 
        search: params.search, 
        priority: params.priority,
        location: params.location,
        sortBy: params.sortBy,
        type: 'claim' 
      })
  );

  const { data: stats, loading: statsLoading, request: fetchStats } = useApi(repairApi.getStats);

  const [showModal, setShowModal] = useState<{ id: number, type: 'receive' | 'complete' | 'hold' } | null>(null);
  const [modalData, setModalData] = useState({ technician: '', note: '' });

  const fetchData = React.useCallback(async () => {
    try {
      await Promise.all([
        fetchClaims(filters),
        fetchStats()
      ]);
      setCurrentPage(1);
    } catch {
      notify('ไม่สามารถโหลดข้อมูลรายการเคลมได้', 'error');
    }
  }, [filters, fetchClaims, fetchStats, notify]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData, location]);

  const filteredClaims = (claims || []).filter(c => {
    const cDate = parseDate(c.received_at || c.created_at);
    if (startDate) {
      const start = parseInputDate(startDate, false);
      if (cDate < start) return false;
    }
    if (endDate) {
      const end = parseInputDate(endDate, true);
      if (cDate > end) return false;
    }

    // Column Filters
    if (colFilters.ticket_no && !c.ticket_no.toLowerCase().includes(colFilters.ticket_no.toLowerCase())) return false;
    if (colFilters.received_at) {
      const formattedDate = formatDateTimeThai(c.received_at).toLowerCase();
      if (!formattedDate.includes(colFilters.received_at.toLowerCase())) return false;
    }
    if (colFilters.device_name && !c.device_name.toLowerCase().includes(colFilters.device_name.toLowerCase())) return false;
    if (colFilters.problem && !c.problem.toLowerCase().includes(colFilters.problem.toLowerCase())) return false;
    if (colFilters.location && c.location && !c.location.toLowerCase().includes(colFilters.location.toLowerCase())) return false;
    if (colFilters.status !== 'All' && c.status !== colFilters.status) return false;

    return true;
  });

  const totalPages = Math.ceil((filteredClaims.length || 0) / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClaims = filteredClaims.slice(indexOfFirstItem, indexOfLastItem);

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
    } catch {
      notify('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('คุณต้องการลบรายการเคลมนี้จริงหรือไม่?')) {
      try {
        await repairApi.delete(id);
        notify('ลบรายการสำเร็จ');
        fetchData();
      } catch {
        notify('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
      }
    }
  };

  return (
    <div className="repair-board" style={{ padding: '2rem 2.5rem', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div className="page-title">
          <h2>กระดานติดตามสถานะงานเคลม</h2>
          <p>ติดตามและจัดการรายการเคลมอุปกรณ์ที่ส่งเข้าศูนย์บริการเพื่อตรวจเช็คและรับของทดแทน</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle buttons */}
          <div style={{ display: 'flex', background: 'var(--border)', padding: '4px', borderRadius: '10px', height: '42px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => { setViewMode('grid'); setCurrentPage(1); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
                fontWeight: 700,
                fontSize: '0.85rem',
                gap: '6px',
                height: '100%',
                outline: 'none'
              }}
            >
              <LayoutGrid size={16} /> แบบการ์ด
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('table'); setCurrentPage(1); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'table' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
                fontWeight: 700,
                fontSize: '0.85rem',
                gap: '6px',
                height: '100%',
                outline: 'none'
              }}
            >
              <List size={16} /> แบบตาราง
            </button>
          </div>
          <Link to="/claim" className="btn btn-primary" style={{ padding: '12px 24px' }}>
            <Plus size={20} /> แจ้งเคลมใหม่
          </Link>
          <Link to="/new" className="btn btn-outline" style={{ padding: '12px 24px' }}>
            <Plus size={20} /> แจ้งซ่อมใหม่
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsLoading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="90px" />
          ))
        ) : (
          [
            { label: 'งานทั้งหมด', val: stats.claim.total, icon: Inbox, statusVal: 'All' },
            { label: 'รอดำเนินการ', val: stats.claim.pending, icon: AlertTriangle, statusVal: 'รอดำเนินการ' },
            { label: 'กำลังเคลม', val: stats.claim.in_progress, icon: RefreshCw, statusVal: 'กำลังซ่อม' },
            { label: 'รออะไหล่/ศูนย์', val: stats.claim.on_hold, icon: Hourglass, statusVal: 'รออะไหล่' },
            { label: 'เคลมเสร็จสิ้น', val: stats.claim.completed, icon: CheckCircle2, statusVal: 'เสร็จสิ้น' }
          ].map((s, i) => (
            <Card 
              key={i} 
              onClick={() => setFilters({...filters, status: s.statusVal})}
              style={{ 
                borderColor: filters.status === s.statusVal 
                  ? (i === 0 ? 'var(--primary)' : i === 1 ? 'var(--danger)' : i === 2 ? 'var(--warning)' : i === 3 ? 'var(--info)' : i === 4 ? 'var(--success)' : 'var(--primary)')
                  : 'var(--border)',
                backgroundColor: filters.status === s.statusVal 
                  ? (i === 0 ? 'var(--primary-light)' : i === 1 ? 'var(--danger-light)' : i === 2 ? 'var(--warning-light)' : i === 3 ? 'var(--info-light)' : i === 4 ? 'var(--success-light)' : 'var(--primary-light)')
                  : 'var(--bg-card)',
                cursor: 'pointer'
              }}
            >
              <div className="stat-icon-wrapper" style={{ 
                color: i === 0 ? 'var(--primary)' : i === 1 ? 'var(--danger)' : i === 2 ? 'var(--warning)' : i === 3 ? 'var(--info)' : i === 4 ? 'var(--success)' : 'var(--primary)', 
                background: i === 0 ? 'var(--primary-light)' : i === 1 ? 'var(--danger-light)' : i === 2 ? 'var(--warning-light)' : i === 3 ? 'var(--info-light)' : i === 4 ? 'var(--success-light)' : 'var(--primary-light)', 
                opacity: filters.status === s.statusVal ? 1 : 0.85 
              }}>
                <s.icon size={24} />
              </div>
              <div>
                <div className="stat-value">{s.val || 0}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Search Filter Card */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="search-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={20} className="search-icon" style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="search-input"
              style={{ paddingLeft: '48px' }}
              placeholder="ค้นหา (เลขที่ใบงาน, อุปกรณ์, ผู้แจ้ง, สถานที่)..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              onKeyUp={(e) => e.key === 'Enter' && fetchData()}
            />
          </div>

          {/* Advanced Dropdown Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            borderTop: '1px solid var(--border)', 
            paddingTop: '1.25rem' 
          }}>
            {/* Location Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>สถานที่:</span>
              <select
                value={filters.location}
                onChange={(e) => { setFilters({...filters, location: e.target.value}); setCurrentPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-app)',
                  fontFamily: 'inherit',
                  minWidth: '120px'
                }}
              >
                <option value="All">ทั้งหมด</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Priority Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ความสำคัญ:</span>
              <select
                value={filters.priority}
                onChange={(e) => { setFilters({...filters, priority: e.target.value}); setCurrentPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-app)',
                  fontFamily: 'inherit',
                  minWidth: '100px'
                }}
              >
                <option value="All">ทั้งหมด</option>
                <option value="ปกติ">ปกติ</option>
                <option value="ด่วน">ด่วน</option>
                <option value="ด่วนมาก">ด่วนมาก</option>
                <option value="วิกฤต">วิกฤต</option>
              </select>
            </div>

            {/* Sort By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>เรียงตาม:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => { setFilters({...filters, sortBy: e.target.value}); setCurrentPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-app)',
                  fontFamily: 'inherit',
                  minWidth: '150px'
                }}
              >
                <option value="newest">แจ้งเข้าใหม่สุด</option>
                <option value="oldest">แจ้งเข้าเก่าสุด</option>
                <option value="priority">ความสำคัญสูงสุด</option>
              </select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            borderTop: '1px solid var(--border)', 
            paddingTop: '1.25rem',
            paddingBottom: '0.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>เริ่มต้น:</span>
              <DatePicker 
                value={startDate}
                onChange={(val) => { setStartDate(val); setCurrentPage(1); }}
                placeholder="เลือกวันเริ่มต้น"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>สิ้นสุด:</span>
              <DatePicker 
                value={endDate}
                onChange={(val) => { setEndDate(val); setCurrentPage(1); }}
                placeholder="เลือกวันสิ้นสุด"
              />
            </div>
            {(startDate || endDate || filters.priority !== 'All' || filters.location !== 'All' || filters.sortBy !== 'newest') && (
              <button
                type="button"
                onClick={() => { 
                  setStartDate(''); 
                  setEndDate(''); 
                  setFilters({ ...filters, priority: 'All', location: 'All', sortBy: 'newest' }); 
                  setCurrentPage(1); 
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--danger-border)',
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                <X size={14} /> ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Main List - Grid Layout vs Table Layout */}
      {listLoading ? (
        viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height="250px" />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height="50px" />
            ))}
          </div>
        )
      ) : currentClaims.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Inbox size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
          <p>ไม่พบข้อมูลรายการแจ้งเคลมในหมวดหมู่นี้</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="status-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {currentClaims.map((claim: Repair) => (
            <Card key={claim.id} className="repair-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', padding: '1.5rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                      CLAIM: {claim.ticket_no}
                    </span>
                    {claim.is_read === 0 && (
                      <span className="badge" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderColor: 'var(--danger-border)', padding: '2px 6px', fontSize: '0.65rem' }}>ใหม่</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={claim.device_name}>
                    <Link to={`/claim-history/${claim.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {claim.device_name}
                    </Link>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <span className={`badge badge-${claim.status}`} style={{ fontSize: '0.7rem' }}>{claim.status}</span>
                </div>
              </div>

              {/* Body */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flex: 1 }}>
                  <AlertTriangle size={14} style={{ marginTop: '3px', color: 'var(--primary)', flexShrink: 0 }} />
                  <p className="line-clamp-2" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.4 }} title={claim.problem}>
                    {claim.problem}
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={claim.location}>
                    <MapPin size={14} color="var(--danger)" style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{claim.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`ผู้แจ้ง: ${claim.reporter}`}>
                    <User size={14} color="var(--primary)" style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>ผู้แจ้ง: {claim.reporter}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Clock size={14} color="var(--primary)" style={{ flexShrink: 0 }} /> <span>{formatDateTimeThai(claim.received_at)}</span>
                  </div>
                </div>

                {claim.technician && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`ผู้ประสานงาน: ${claim.technician}`}>
                    <UserCheck size={14} style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>ช่าง: {claim.technician}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                {claim.status === 'รอดำเนินการ' && (
                  <Button variant="primary" size="sm" onClick={() => setShowModal({ id: claim.id, type: 'receive' })} style={{ flex: 1, padding: '8px' }}>
                    รับงานเคลม
                  </Button>
                )}
                {claim.status === 'กำลังซ่อม' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowModal({ id: claim.id, type: 'hold' })} style={{ flex: 1, padding: '8px' }}>
                      รออะไหล่
                    </Button>
                    <Button variant="primary" size="sm" style={{ backgroundColor: 'var(--success)', color: '#fff', flex: 1, padding: '8px' }} onClick={() => setShowModal({ id: claim.id, type: 'complete' })}>
                      ปิดงานเคลม
                    </Button>
                  </>
                )}
                {claim.status === 'รออะไหล่' && (
                  <Button variant="primary" size="sm" onClick={() => setShowModal({ id: claim.id, type: 'receive' })} style={{ flex: 1, padding: '8px' }}>
                    ดำเนินการต่อ
                  </Button>
                )}
                <Link to={`/claim-history/${claim.id}`} className="btn btn-outline" style={{ padding: '8px' }} title="ดูรายละเอียด" aria-label={`ดูรายละเอียดงานเคลม ${claim.ticket_no}`}>
                  <ChevronRight size={18} />
                </Link>
                <Button variant="danger" style={{ padding: '8px' }} onClick={() => handleDelete(claim.id)} title="ลบ" aria-label={`ลบงานเคลม ${claim.ticket_no}`}>
                  <Trash size={18} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '14%', whiteSpace: 'nowrap' }}>เลขที่ใบงาน</th>
                  <th style={{ width: '18%', whiteSpace: 'nowrap' }}>วันที่แจ้ง</th>
                  <th style={{ width: '14%', whiteSpace: 'nowrap' }}>อุปกรณ์</th>
                  <th style={{ width: '18%', whiteSpace: 'nowrap' }}>อาการชำรุด</th>
                  <th style={{ width: '11%', whiteSpace: 'nowrap' }}>สถานที่</th>
                  <th style={{ width: '10%', whiteSpace: 'nowrap' }}>สถานะ</th>
                  <th style={{ width: '15%', textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
                </tr>
                <tr className="filter-row" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="text" 
                      placeholder="ค้นหาเลขที่งาน..." 
                      style={filterInputStyle}
                      value={colFilters.ticket_no}
                      onChange={(e) => setColFilters({ ...colFilters, ticket_no: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="text" 
                      placeholder="วันที่..." 
                      style={filterInputStyle}
                      value={colFilters.received_at}
                      onChange={(e) => setColFilters({ ...colFilters, received_at: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="text" 
                      placeholder="อุปกรณ์..." 
                      style={filterInputStyle}
                      value={colFilters.device_name}
                      onChange={(e) => setColFilters({ ...colFilters, device_name: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="text" 
                      placeholder="อาการ..." 
                      style={filterInputStyle}
                      value={colFilters.problem}
                      onChange={(e) => setColFilters({ ...colFilters, problem: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <input 
                      type="text" 
                      placeholder="สถานที่..." 
                      style={filterInputStyle}
                      value={colFilters.location}
                      onChange={(e) => setColFilters({ ...colFilters, location: e.target.value })}
                    />
                  </th>
                  <th style={{ padding: '4px 8px' }}>
                    <select
                      style={filterInputStyle}
                      value={colFilters.status}
                      onChange={(e) => setColFilters({ ...colFilters, status: e.target.value })}
                    >
                      <option value="All">ทั้งหมด</option>
                      <option value="รอดำเนินการ">รอดำเนินการ</option>
                      <option value="กำลังเคลม">กำลังเคลม</option>
                      <option value="รออะไหล่">รออะไหล่</option>
                      <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                    </select>
                  </th>
                  <th style={{ padding: '4px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {currentClaims.map((claim: Repair) => (
                  <tr key={claim.id} style={{ opacity: claim.status === 'เสร็จสิ้น' ? 0.8 : 1 }}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', overflow: 'visible' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {claim.ticket_no}
                        {claim.is_read === 0 && <span className="badge" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderColor: 'var(--danger-border)', padding: '1px 4px', fontSize: '0.6rem' }}>ใหม่</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', overflow: 'visible' }}>{formatDateTimeThai(claim.received_at)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }} title={claim.device_name}>
                      <div className="line-clamp-1">{claim.device_name}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} title={claim.problem}>
                      <div className="line-clamp-1">{claim.problem}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }} title={claim.location}>
                      <div className="line-clamp-1">{claim.location}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${claim.status}`} style={{ fontSize: '0.65rem' }}>{claim.status}</span>
                    </td>
                    <td style={{ textAlign: 'right', overflow: 'visible', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {claim.status === 'รอดำเนินการ' && (
                          <Button variant="primary" size="sm" onClick={() => setShowModal({ id: claim.id, type: 'receive' })} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            รับงานเคลม
                          </Button>
                        )}
                        {claim.status === 'กำลังซ่อม' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setShowModal({ id: claim.id, type: 'hold' })} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                              รออะไหล่
                            </Button>
                            <Button variant="primary" size="sm" style={{ backgroundColor: 'var(--success)', color: '#fff', padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setShowModal({ id: claim.id, type: 'complete' })}>
                              ปิดงานเคลม
                            </Button>
                          </>
                        )}
                        {claim.status === 'รออะไหล่' && (
                          <Button variant="primary" size="sm" onClick={() => setShowModal({ id: claim.id, type: 'receive' })} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            ดำเนินการต่อ
                          </Button>
                        )}
                        <Link to={`/claim-history/${claim.id}`} className="btn btn-outline" style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="ดูรายละเอียด" aria-label={`ดูรายละเอียดงานเคลม ${claim.ticket_no}`}>
                          <ChevronRight size={16} />
                        </Link>
                        <Button variant="danger" size="sm" style={{ padding: '4px 8px' }} onClick={() => handleDelete(claim.id)} title="ลบ" aria-label={`ลบงานเคลม ${claim.ticket_no}`}>
                          <Trash size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2.5rem' }}>
          <Button 
            variant="outline" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ก่อนหน้า
          </Button>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>หน้า {currentPage} จาก {totalPages}</span>
          <Button 
            variant="outline" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}

      {/* Workflow Modal Dialog */}
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
              {(showModal.type === 'receive' || !(claims || []).find(r => r.id === showModal.id)?.technician) && (
                <Input 
                  label="ชื่อช่างผู้รับงาน"
                  required
                  placeholder="กรอกชื่อช่าง..."
                  value={modalData.technician}
                  onChange={e => setModalData({...modalData, technician: e.target.value})}
                />
              )}
              {showModal.type === 'complete' && (
                <TextArea 
                  label="บันทึกการเคลม (Claim Note)"
                  required
                  rows={3}
                  placeholder="สรุปผลการส่งเคลม..."
                  value={modalData.note}
                  onChange={e => setModalData({...modalData, note: e.target.value})}
                />
              )}
              {showModal.type === 'hold' && (
                <TextArea 
                  label="เหตุผลที่ระงับงาน"
                  required
                  rows={2}
                  placeholder="เช่น รออะไหล่จากบริษัท..."
                  value={modalData.note}
                  onChange={e => setModalData({...modalData, note: e.target.value})}
                />
              )}
              <div className="modal-actions">
                <Button type="button" variant="outline" onClick={() => setShowModal(null)}>ยกเลิก</Button>
                <Button type="submit" variant="primary">บันทึกข้อมูล</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimList;
