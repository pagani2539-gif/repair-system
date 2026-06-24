import React, { useEffect, useState, useMemo } from 'react';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Check,
  Wrench,
  Inbox,
  ShoppingBag,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  HardDrive,
  AlertCircle,
  Calendar,
  Package,
  Clock,
  RefreshCw,
  Crown,
  Shield,
  MapPin,
  ChevronRight,
  // New Icons for Consistency
  Sliders,
  Boxes,
  PackageCheck,
  Hourglass,
  FileSignature,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Counter from '../components/ui/Counter';
import type { RepairLog, InventoryTransaction } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const chartTooltipStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  color: 'var(--text-main)',
  padding: '10px 14px'
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="dash-section-title boot-animate">
    <span className="dash-section-icon">{icon}</span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.3 }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{subtitle}</div>}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { notify } = useNotification();
  const { data, loading, request: fetchStats } = useApi(
    async (params?: { startDate?: string; endDate?: string }) =>
      await repairApi.getDashboardStats(params)
  );
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  // จำตัวกรองช่วงเวลาไว้ใน localStorage (กลับมาหน้าเดิมแล้วยังอยู่)
  const [quickFilter, setQuickFilter] = useState<string>(() => {
    try { return localStorage.getItem('dashboard_quick_filter') || 'all'; } catch { return 'all'; }
  });
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    try { return localStorage.getItem('dashboard_auto_refresh') === '1'; } catch { return false; }
  });

  const computeRange = (filterType: string): { startDate: string; endDate: string } => {
    const end = new Date();
    if (filterType === 'all') return { startDate: '', endDate: '' };
    const start = new Date();
    if (filterType === '7_days') start.setDate(end.getDate() - 7);
    else if (filterType === '30_days') start.setDate(end.getDate() - 30);
    else if (filterType === '90_days') start.setDate(end.getDate() - 90);
    const toYYYYMMDD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return { startDate: toYYYYMMDD(start), endDate: toYYYYMMDD(end) };
  };

  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>(() => computeRange(quickFilter));

  useEffect(() => {
    const load = async () => {
      try {
        const params: { startDate?: string; endDate?: string } = {};
        if (dateRange.startDate) params.startDate = dateRange.startDate;
        if (dateRange.endDate) params.endDate = dateRange.endDate;
        await fetchStats(params);
        setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
      } catch {
        notify('ไม่สามารถโหลดข้อมูลสถิติได้', 'error');
      }
    };
    load();
  }, [fetchStats, notify, dateRange, refreshTick]);

  // Auto-refresh ทุก 60 วินาที (เปิด/ปิดได้)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => setRefreshTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleQuickFilterChange = (filterType: string) => {
    setQuickFilter(filterType);
    try { localStorage.setItem('dashboard_quick_filter', filterType); } catch { /* ignore */ }
    setDateRange(computeRange(filterType));
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => {
      const next = !prev;
      try { localStorage.setItem('dashboard_auto_refresh', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const operationalPulse = useMemo(() => {
    if (!data) return [];

    const repairEvents = (data.recentLogs || []).map((log: RepairLog & { ticket_no: string; device_name: string }) => ({
      id: `rep-${log.id}`,
      title: log.ticket_no,
      subtitle: `${log.device_name} · ${log.action}`,
      user: log.user,
      time: log.created_at,
      icon: <Wrench size={14} />,
      color: 'var(--primary)'
    }));

    const stockEvents = (data.inventory?.recentTransactions || []).map((tx: InventoryTransaction & { product_name: string }) => ({
      id: `stk-${tx.id}`,
      title: tx.product_name,
      subtitle: `${tx.transaction_type === 'ADD_STOCK' ? 'นำเข้า' : tx.transaction_type === 'WITHDRAW' ? 'เบิกจ่าย' : tx.transaction_type === 'RETURN' ? 'คืน' : 'ปรับปรุง'} · ${tx.quantity_added || tx.quantity_withdrawn || tx.quantity_returned || tx.quantity_borrowed} ชิ้น`,
      user: tx.user_name || 'ระบบ',
      time: tx.created_at,
      icon: tx.transaction_type === 'ADD_STOCK' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />,
      color: tx.transaction_type === 'ADD_STOCK' ? 'var(--success)' : 'var(--danger)'
    }));

    return [...repairEvents, ...stockEvents]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 7);
  }, [data]);

  const {
    kpis = { total: 0, pending: 0, in_progress: 0, completed: 0, critical_stock: 0 },
    purchaseOrders = { pending_po: 0 },
    analysis = { mostBroken: [], overdue: [], monthlyTrend: [] },
    technicians = [],
    inventory = { criticalItems: [], topUsed: [], leastUsed: [] },
    stockMovements = [],
    withdrawalBreakdown = [],
    people = { topRecipients: [], pendingReturns: [], pendingReturnsCount: 0 },
    supervisors = [],
    unassignedStationsCount = 0,
    claimsKpis = { total: 0, pending: 0, in_progress: 0, completed: 0 },
    inventoryConditions = []
  } = data || {};

  const conditions = useMemo(() => {
    return {
      New: (inventoryConditions || []).find(c => c.condition === 'New')?.count || 0,
      Good: (inventoryConditions || []).find(c => c.condition === 'Good')?.count || 0,
      Fair: (inventoryConditions || []).find(c => c.condition === 'Fair')?.count || 0,
      Broken: (inventoryConditions || []).find(c => c.condition === 'Broken')?.count || 0,
    };
  }, [inventoryConditions]);

  const totalInstances = useMemo(() => {
    return Object.values(conditions).reduce((a, b) => a + b, 0);
  }, [conditions]);

  const totalWithdrawals = useMemo(
    () => (withdrawalBreakdown || []).reduce((a: number, b: { name: string; count: number }) => a + (b.count || 0), 0),
    [withdrawalBreakdown]
  );

  const warehouseHealth = useMemo(() => {
    const criticalCount = kpis.critical_stock || 0;
    const score = Math.max(0, 100 - (criticalCount * 10));
    return {
      score,
      label: score > 90 ? 'สมบูรณ์เยี่ยม' : score > 70 ? 'ปกติ' : score > 40 ? 'ควรเฝ้าระวัง' : 'วิกฤต',
      color: score > 90 ? '#10b981' : score > 70 ? 'var(--primary)' : score > 40 ? '#f59e0b' : '#ef4444'
    };
  }, [kpis.critical_stock]);

  if (loading || !data) {
    return (
      <div style={{ padding: 'var(--main-padding)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="bento-grid" style={{ gap: '1.25rem' }}>
          <Skeleton height="90px" variant="rect" className="dash-span-12" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="110px" variant="rect" className="dash-span-2" />)}
          <Skeleton height="300px" variant="rect" className="dash-span-8" />
          <Skeleton height="300px" variant="rect" className="dash-span-4" />
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i + 6} height="240px" variant="rect" className="dash-span-4" />)}
        </div>
      </div>
    );
  }

  const statusPieData = [
    { name: 'รอดำเนินการ', value: kpis.pending, color: '#ef4444' },
    { name: 'กำลังซ่อม', value: kpis.in_progress, color: '#f59e0b' },
    { name: 'เสร็จสิ้น', value: kpis.completed, color: '#10b981' },
  ];

  // KPI strip (compact, 6 ตัว)
  const kpiCards = [
    { label: 'งานแจ้งซ่อม', value: kpis.total, icon: Sliders, color: 'var(--primary)', bg: 'var(--primary-light)', to: '/repairs', alert: false },
    { label: 'กำลังซ่อม', value: kpis.in_progress, icon: Sliders, color: 'var(--warning)', bg: 'var(--warning-light)', to: '/repairs?status=กำลังซ่อม', alert: kpis.in_progress > 0 },
    { label: 'พัสดุวิกฤต', value: kpis.critical_stock, icon: ShieldAlert, color: 'var(--danger)', bg: 'var(--danger-light)', to: '/inventory', alert: kpis.critical_stock > 0 },
    { label: 'ใบเบิกทั้งหมด', value: totalWithdrawals, icon: PackageCheck, color: 'var(--success)', bg: 'var(--success-light)', to: '/withdrawal', alert: false },
    { label: 'ค้างคืน', value: people.pendingReturnsCount, icon: Hourglass, color: '#d97706', bg: 'rgba(217,119,6,0.1)', to: '/pending-returns', alert: people.pendingReturnsCount > 0 },
    { label: 'PO รอรับ', value: purchaseOrders.pending_po || 0, icon: FileSignature, color: 'var(--primary)', bg: 'var(--primary-light)', to: '/purchase-orders', alert: false },
  ];

  return (
    <div className="dashboard-page" style={{ padding: '0 0 3rem 0', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'var(--main-padding)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header (compact) */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '2px' }}>
              <Activity size={16} />
              <span style={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.7rem' }}>ศูนย์ปฏิบัติการหลัก</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>แผงควบคุมการบริหารจัดการ</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '2px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>สรุปคลังพัสดุและศูนย์ซ่อมบำรุง · อัปเดต {lastUpdated} น.</span>
              {autoRefresh && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', background: 'var(--success-light)', border: '1px solid var(--success-border)', padding: '1px 8px', borderRadius: '999px' }}>
                  <span className="live-dot" /> LIVE
                </span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-outline"
              onClick={toggleAutoRefresh}
              title={autoRefresh ? 'ปิดอัปเดตอัตโนมัติ' : 'เปิดอัปเดตอัตโนมัติ (ทุก 60 วินาที)'}
              aria-label="สลับอัปเดตอัตโนมัติ"
              aria-pressed={autoRefresh}
              style={{
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                ...(autoRefresh ? { borderColor: 'var(--success)', color: 'var(--success)', background: 'var(--success-light)' } : {})
              }}
            >
              <Activity size={15} /> <span>อัตโนมัติ</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setRefreshTick(t => t + 1)}
              title="รีเฟรชข้อมูล"
              aria-label="รีเฟรชข้อมูล"
              style={{ borderRadius: '10px', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={16} style={loading ? { animation: 'spin 0.8s linear infinite' } : undefined} />
            </button>

            <div style={{ position: 'relative', zIndex: 50 }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{ borderRadius: '10px', padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Calendar size={16} />
                <span>
                  {quickFilter === 'all' ? 'ข้อมูลทั้งหมด' :
                   quickFilter === '7_days' ? 'ย้อนหลัง 7 วัน' :
                   quickFilter === '30_days' ? 'ย้อนหลัง 30 วัน' :
                   quickFilter === '90_days' ? 'ย้อนหลัง 90 วัน' : 'ช่วงเวลาที่เลือก'}
                </span>
              </button>

              {showFilterDropdown && (
                <>
                  <div
                    onClick={() => setShowFilterDropdown(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: -1, cursor: 'default' }}
                  />
                  <div className="glass-card" style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '180px',
                    borderRadius: '12px',
                    padding: '6px',
                    boxShadow: 'var(--glass-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)'
                  }}>
                    {[
                      { label: 'ข้อมูลทั้งหมด', value: 'all' },
                      { label: 'ย้อนหลัง 7 วัน', value: '7_days' },
                      { label: 'ย้อนหลัง 30 วัน', value: '30_days' },
                      { label: 'ย้อนหลัง 90 วัน', value: '90_days' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleQuickFilterChange(opt.value);
                          setShowFilterDropdown(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: quickFilter === opt.value ? 'var(--primary-light)' : 'transparent',
                          color: quickFilter === opt.value ? 'var(--primary)' : 'var(--text-main)',
                          fontSize: '0.82rem',
                          fontWeight: quickFilter === opt.value ? 800 : 600,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          width: '100%'
                        }}
                        className="dropdown-item-hover"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bento-grid" style={{ gap: '1.25rem' }}>
          {/* ============ Zone: ภาพรวม ============ */}

          {/* Warehouse Health (hero) */}
          <Card className={`glass-card boot-animate stagger-0 dash-span-12 ${warehouseHealth.score <= 40 ? 'led-breathe-danger' : warehouseHealth.score <= 70 ? 'led-breathe-warning' : ''}`} style={{ padding: '1.5rem 1.75rem', background: `linear-gradient(135deg, ${warehouseHealth.color}10, transparent)`, border: `1px solid ${warehouseHealth.color}80` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width="84" height="84" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bg-app)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={warehouseHealth.color} strokeWidth="12" strokeDasharray="339.29" strokeDashoffset={339.29 * (1 - warehouseHealth.score / 100)} strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: warehouseHealth.color }}>
                    <Counter end={warehouseHealth.score} suffix="%" />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800 }}>
                  สภาวะคลัง: <span style={{ color: warehouseHealth.color }}>{warehouseHealth.label}</span>
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', fontWeight: 500, margin: 0 }}>
                  {warehouseHealth.score > 70
                    ? `คลังพร้อมใช้งานสูง พบรายการวิกฤต ${kpis.critical_stock} รายการ`
                    : `ต้องเร่งจัดการ! พัสดุวิกฤต ${kpis.critical_stock} รายการ ควรออกใบสั่งซื้อ (PO) ทันที`}
                </p>
                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> วิกฤต {kpis.critical_stock}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> รอซ่อม {kpis.in_progress}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} /> ค้างคืน {people.pendingReturnsCount}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                <Link to="/inventory" style={{ textDecoration: 'none' }}>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'space-between', padding: '10px 16px', background: warehouseHealth.color, fontSize: '0.85rem' }}>
                    <span>จัดการสต็อกวิกฤต</span><ArrowUpRight size={16} />
                  </button>
                </Link>
                <Link to="/purchase-orders" style={{ textDecoration: 'none' }}>
                  <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'space-between', padding: '10px 16px', border: `1px solid ${warehouseHealth.color}40`, fontSize: '0.85rem' }}>
                    <span>ออกใบสั่งซื้อ (PO)</span><ShoppingBag size={16} />
                  </button>
                </Link>
              </div>
            </div>
          </Card>

          {/* KPI strip */}
          {kpiCards.map((k, i) => (
            <Link key={i} to={k.to} className="boot-animate stagger-1 dash-span-2" style={{ textDecoration: 'none' }}>
              <Card className={`glass-card kpi-tile ${k.alert ? 'led-breathe-danger' : ''}`} style={{ height: '100%', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, background: k.bg, color: k.color, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <k.icon size={18} />
                  </div>
                  <ArrowUpRight size={15} className="kpi-tile-arrow" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 800, lineHeight: 1.1, color: k.alert ? k.color : 'var(--text-main)', fontFamily: 'Outfit' }}>
                    <Counter end={k.value} />
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {k.label}
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {/* ============ Zone: งานซ่อมและการเคลม ============ */}
          <SectionHeader icon={<Sliders size={17} />} title="งานซ่อมและการเคลม" subtitle="สถานะงานซ่อม ตั๋วเคลม และงานค้างเกินกำหนด" />

          {/* Status pie */}
          <Card className="glass-card boot-animate stagger-2 dash-span-4" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800 }}>สัดส่วนสถานะงานซ่อม</h3>
            <div style={{ position: 'relative', height: '170px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={6} dataKey="value" animationBegin={200} animationDuration={1100}>
                    {statusPieData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-muted)', fontWeight: 800 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'Outfit', lineHeight: 1 }}>
                  <Counter end={kpis.total} />
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '3px' }}>งานทั้งหมด</div>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {statusPieData.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-app)', borderRadius: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />{item.name}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Claims stats */}
          <Card className="glass-card boot-animate stagger-2 dash-span-4" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>สถิติใบส่งเคลมอุปกรณ์</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ประกัน / เคลมภายนอก (Claim Tickets)</p>
              </div>
              <Inbox size={18} color="var(--primary)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { name: 'ตั๋วส่งเคลมทั้งหมด', value: claimsKpis?.total || 0, color: 'var(--text-main)', bg: 'var(--bg-app)' },
                { name: 'รอดำเนินการ', value: claimsKpis?.pending || 0, color: 'var(--danger)', bg: 'var(--danger-light)' },
                { name: 'กำลังดำเนินการเคลม', value: claimsKpis?.in_progress || 0, color: 'var(--warning)', bg: 'var(--warning-light)' },
                { name: 'เคลมสำเร็จเสร็จสิ้น', value: claimsKpis?.completed || 0, color: 'var(--success)', bg: 'var(--success-light)' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: item.bg, borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.color }}>{item.name}</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Overdue jobs (SLA) */}
          <Card className={`glass-card boot-animate stagger-2 dash-span-4 ${(analysis.overdue?.length || 0) > 0 ? 'led-breathe-danger' : ''}`} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: (analysis.overdue?.length || 0) > 0 ? 'var(--danger)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> งานค้างเกินกำหนด (SLA)
              </h3>
              <span style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.68rem',
                fontWeight: 800,
                background: (analysis.overdue?.length || 0) > 0 ? 'var(--danger-light)' : 'var(--bg-app)',
                color: (analysis.overdue?.length || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: (analysis.overdue?.length || 0) > 0 ? '1px solid var(--danger-border)' : '1px solid var(--border)'
              }}>
                {(analysis.overdue?.length || 0) > 0 && (
                  <span className="pulse-dot" style={{ position: 'relative', top: 'auto', right: 'auto', display: 'inline-block', width: 6, height: 6, padding: 0 }} />
                )}
                {analysis.overdue?.length || 0} รายการ
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysis.overdue?.length > 0 ? analysis.overdue.slice(0, 5).map((job: { id?: number; ticket_no: string; device_name: string; reporter: string; created_at: string; days_over: number }, i: number) => {
                // SLA progress percentage (3 days or more = 100%)
                const slaProgress = Math.min(100, Math.round((job.days_over / 3) * 100));
                return (
                  <Link key={i} to={job.id ? `/repairs/${job.id}` : '/repairs'} className="dash-row-link" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-app)', borderRadius: '10px', border: '1px solid var(--border)', transition: 'all 0.2s ease', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', flexShrink: 0 }}>
                      <svg width="30" height="30" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="var(--danger)"
                          strokeWidth="3"
                          strokeDasharray="94.2"
                          strokeDashoffset={94.2 * (1 - slaProgress / 100)}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', fontSize: '0.68rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'Outfit' }}>
                        {job.days_over}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{job.ticket_no} · {job.device_name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>โดย {job.reporter}</div>
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: 'var(--danger)',
                      background: 'var(--danger-light)',
                      border: '1px solid var(--danger-border)',
                      padding: '2px 6px',
                      borderRadius: '5px',
                      whiteSpace: 'nowrap'
                    }}>
                      Overdue
                    </span>
                    <ChevronRight size={15} className="dash-row-chevron" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Link>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Check size={16} /> ไม่มีงานค้างเกินกำหนด
                </div>
              )}
            </div>
          </Card>

          {/* Most broken */}
          <Card className="glass-card boot-animate stagger-3 dash-span-6" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>สุขภาพอุปกรณ์</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ส่งซ่อมบ่อยที่สุด 5 อันดับ</p>
              </div>
              <HardDrive size={18} color="var(--primary)" />
            </div>
            <div style={{ height: '200px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.mostBroken} layout="vertical" margin={{ left: -20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-main)', fontSize: 10, fontWeight: 700 }} width={90} />
                  <Tooltip cursor={{ fill: 'var(--primary-light)' }} contentStyle={chartTooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-muted)', fontWeight: 800 }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16} animationDuration={1000}>
                    {analysis.mostBroken.map((_entry: { name: string; count: number }, index: number) => (
                      <Cell key={index} fill={index === 0 ? 'var(--danger)' : index < 3 ? 'var(--primary)' : '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Technicians workload */}
          <Card className="glass-card boot-animate stagger-3 dash-span-6" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>ภาระงานช่าง</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>การกระจายงานในทีมเทคนิค</p>
              </div>
              <Users size={18} color="var(--primary)" />
            </div>
            <div style={{ height: '200px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={technicians} layout="vertical" margin={{ left: -20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-main)', fontSize: 10, fontWeight: 700 }} width={70} />
                  <Tooltip cursor={{ fill: 'var(--primary-light)' }} contentStyle={chartTooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-muted)', fontWeight: 800 }} />
                  <Bar dataKey="active" stackId="a" fill="var(--warning)" name="กำลังทำ" barSize={15} animationDuration={1000} />
                  <Bar dataKey="completed" stackId="a" fill="var(--success)" name="เสร็จแล้ว" radius={[0, 6, 6, 0]} barSize={15} animationDuration={1200} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '10px', fontWeight: 700 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ============ Zone: คลังพัสดุ ============ */}
          <SectionHeader icon={<Boxes size={17} />} title="คลังพัสดุ" subtitle="ความเคลื่อนไหวสต็อก สภาพอุปกรณ์ และรายการที่ต้องจับตา" />

          {/* Stock movement chart */}
          <Card className="glass-card boot-animate stagger-2 dash-span-8" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>ความเคลื่อนไหวสต็อกพัสดุ</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>นำเข้า vs เบิกออก ย้อนหลัง 6 เดือน</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-app)', padding: '6px 12px', borderRadius: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '3px', background: 'var(--primary)' }} /> นำเข้า
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '3px', background: '#94a3b8' }} /> เบิกออก
                </span>
              </div>
            </div>
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockMovements.length > 0 ? stockMovements : []}>
                  <defs>
                    <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={30} />
                  <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: 'var(--text-main)' }} labelStyle={{ color: 'var(--text-muted)', fontWeight: 800 }} />
                  <Area type="monotone" dataKey="added" name="นำเข้า" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorAdded)" animationDuration={1400} />
                  <Area type="monotone" dataKey="withdrawn" name="เบิกจ่าย" stroke="#94a3b8" strokeWidth={2.5} fillOpacity={0} strokeDasharray="6 6" animationDuration={1600} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Critical stock */}
          <Card className="glass-card boot-animate stagger-2 dash-span-4" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>พัสดุวิกฤต</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ต่ำกว่าเกณฑ์ Min Stock</p>
              </div>
              <AlertCircle size={18} color="var(--danger)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inventory.criticalItems?.length > 0 ? inventory.criticalItems.map((item: { name: string; quantity: number; min_stock: number }, i: number) => (
                <Link key={i} to="/inventory" className="dash-row-link" style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '10px 12px', background: 'var(--danger-light)', borderRadius: '10px', border: '1px solid var(--danger-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{item.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 800, color: 'var(--danger)', fontSize: '0.82rem' }}>
                      {item.quantity}/{item.min_stock}
                      <ChevronRight size={14} className="dash-row-chevron" />
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '100%', transform: `scaleX(${Math.min(1, item.quantity / item.min_stock)})`, transformOrigin: 'left', background: 'var(--danger)', borderRadius: '10px', transition: 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  </div>
                </Link>
              )) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Check size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                  <div>สต็อกเพียงพอทุกรายการ</div>
                </div>
              )}
            </div>
          </Card>

          {/* Inventory conditions */}
          <Card className="glass-card boot-animate stagger-3 dash-span-4" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>สภาพอุปกรณ์ในคลัง</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>คัดแยกตามคุณภาพสินค้า (Instances)</p>
              </div>
              <Shield size={18} color="var(--primary)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'สภาพใหม่ (New)', count: conditions.New, color: 'var(--primary)' },
                { name: 'สภาพดี (Good)', count: conditions.Good, color: 'var(--success)' },
                { name: 'สภาพพอใช้ (Fair)', count: conditions.Fair, color: 'var(--warning)' },
                { name: 'ชำรุดชั่วคราว (Broken)', count: conditions.Broken, color: 'var(--danger)' }
              ].map((item, i) => {
                const percent = totalInstances ? Math.round((item.count / totalInstances) * 100) : 0;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                      <span>{item.name}</span>
                      <span>{item.count} ชิ้น ({percent}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percent}%`, background: item.color, borderRadius: '10px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top used items */}
          <Card className="glass-card boot-animate stagger-3 dash-span-4" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShoppingBag size={16} color="var(--primary)" /> พัสดุที่ใช้บ่อย Top 5
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {inventory.topUsed?.length > 0 ? inventory.topUsed.slice(0, 5).map((item: { name: string; count: number }, i: number) => (
                <Link key={i} to="/inventory" className="dash-row-link" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 9px', background: 'var(--bg-app)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 24, height: 24, background: 'var(--bg-card)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: 'var(--primary)', boxShadow: 'var(--elevation-1)', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{item.count} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ชิ้น</span></div>
                </Link>
              )) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ไม่มีข้อมูลการใช้งาน</div>
              )}
            </div>
          </Card>

          {/* Dead stock */}
          <Card className="glass-card boot-animate stagger-3 dash-span-4" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>พัสดุไม่มีการเคลื่อนไหว</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Dead Stock (นิ่งเกิน 90 วัน)</p>
              </div>
              <AlertCircle size={18} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inventory.leastUsed?.length > 0 ? (inventory.leastUsed as Array<{ name: string; days_idle: number | null }>).map((item, i: number) => (
                <Link key={i} to="/inventory" className="dash-row-link" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-app)', borderRadius: '10px', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 24, height: 24, background: '#cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: 'white', flexShrink: 0 }}>
                    !
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {item.days_idle == null ? 'ไม่เคยเคลื่อนไหว' : `นิ่ง ${item.days_idle} วัน`}
                  </div>
                </Link>
              )) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
                  ไม่มีสินค้าค้างสต็อก
                </div>
              )}
            </div>
          </Card>

          {/* ============ Zone: บุคลากรและการเบิกจ่าย ============ */}
          <SectionHeader icon={<Users size={17} />} title="บุคลากรและการเบิกจ่าย" subtitle="ผู้รับผิดชอบด่าน อุปกรณ์ค้างคืน และผู้เบิกบ่อย" />

          {/* Supervisors */}
          <Card className="glass-card boot-animate stagger-2 dash-span-8" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>ภาระงานและผู้รับผิดชอบด่าน</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ด่านในความดูแลและจำนวนงานซ่อมที่กำลังดำเนินการ
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', fontWeight: 800, background: 'var(--bg-app)', padding: '6px 12px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>ด่านไม่มีผู้ดูแล:</span>
                <span style={{ color: (unassignedStationsCount || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {unassignedStationsCount || 0} ด่าน
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {supervisors && supervisors.length > 0 ? (
                supervisors.map((sup, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-app)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    title={sup.stations_list}
                    className="dashboard-list-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: sup.active_repairs > 0 ? 'var(--warning-light)' : 'var(--primary-light)',
                        color: sup.active_repairs > 0 ? 'var(--warning)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        flexShrink: 0
                      }}>
                        <Shield size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>{sup.name}</span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            padding: '2px 6px',
                            borderRadius: '6px'
                          }}>
                            ดูแล {sup.station_count} ด่าน
                          </span>
                        </div>
                        <div style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: 500
                        }}>
                          <MapPin size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                          {sup.stations_list || '-'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, marginLeft: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: sup.active_repairs > 0 ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {sup.active_repairs}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>งานซ่อมค้าง</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ยังไม่มีข้อมูลผู้รับผิดชอบด่าน
                </div>
              )}
            </div>
          </Card>

          {/* Pending returns */}
          <Card className={`glass-card boot-animate stagger-2 dash-span-4 ${people.pendingReturnsCount > 0 ? 'led-breathe-warning' : ''}`} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>อุปกรณ์ค้างคืน</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ยืม/ทดสอบ ที่ยังไม่ได้คืน</p>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, background: people.pendingReturnsCount > 0 ? 'rgba(217,119,6,0.12)' : 'var(--bg-app)', color: people.pendingReturnsCount > 0 ? '#d97706' : 'var(--text-muted)', padding: '3px 8px', borderRadius: '6px' }}>
                {people.pendingReturnsCount} ค้าง
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(people.pendingReturns || []).length > 0 ? people.pendingReturns.map((r: { name: string; product_name: string; serial_number?: string; transaction_type: string; withdrawal_type?: string; days_out: number }, i: number) => {
                const urgent = r.days_out >= 14;
                return (
                  <Link key={i} to="/pending-returns" className="dash-row-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg-app)', borderRadius: '8px', border: `1px solid ${urgent ? 'var(--danger-border)' : 'var(--warning-border)'}`, textDecoration: 'none', color: 'inherit' }}>
                    <Package size={15} color={urgent ? 'var(--danger)' : '#d97706'} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name || 'ไม่ระบุ'}{r.serial_number ? ` · S/N ${r.serial_number}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, color: urgent ? 'var(--danger)' : '#d97706', fontWeight: 800, fontSize: '0.85rem' }}>
                      {r.days_out} วัน
                    </div>
                    <ChevronRight size={15} className="dash-row-chevron" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Link>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Check size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                  <div>ไม่มีอุปกรณ์ค้างคืน</div>
                </div>
              )}
            </div>
          </Card>

          {/* Top recipients (leaderboard) */}
          <Card className="glass-card boot-animate stagger-3 dash-span-4" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>ผู้เบิกบ่อยที่สุด</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>5 อันดับผู้เบิกอุปกรณ์สูงสุด</p>
              </div>
              <Crown size={18} color="#d97706" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {(people.topRecipients || []).length > 0 ? people.topRecipients.map((p: { name: string; count: number; items: number; last_withdrawal: string }, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: i === 0 ? 'rgba(217,119,6,0.07)' : 'var(--bg-app)', borderRadius: '10px', border: i === 0 ? '1px solid rgba(217,119,6,0.2)' : '1px solid transparent' }}>
                  <div style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', background: i === 0 ? '#d97706' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--bg-card)', color: i < 3 ? '#fff' : 'var(--text-muted)', boxShadow: 'var(--elevation-1)' }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{p.items} ชิ้น · {p.count} ใบเบิก</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>{p.count}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>ครั้ง</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <div>ยังไม่มีข้อมูลผู้เบิก</div>
                </div>
              )}
            </div>
          </Card>

          {/* Recent activity */}
          <Card className="glass-card boot-animate stagger-4 dash-span-8" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--primary)" /> กิจกรรมล่าสุด
              </h3>
              <Link to="/transactions" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '8px' }}>ดูทั้งหมด →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {operationalPulse.length > 0 ? operationalPulse.map((event) => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.7rem', background: 'var(--bg-app)', borderRadius: '8px', border: `1px solid ${event.color}40` }} className="dashboard-list-row">
                  <div style={{ width: 26, height: 26, borderRadius: '8px', backgroundColor: 'var(--bg-card)', color: event.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>{event.icon}</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 }}>{event.title}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {event.subtitle}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{event.user}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                      {timeAgo(event.time)}
                    </span>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ยังไม่มีกิจกรรมในช่วงเวลานี้
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
