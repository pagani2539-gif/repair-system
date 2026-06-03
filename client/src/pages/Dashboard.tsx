import React, { useEffect, useState } from 'react';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { Skeleton } from '../components/ui/Skeleton';
import { 
  TrendingUp,
  Check,
  Activity,
  Users,
  Clock,
  BarChart3,
  AlertTriangle,
  Wrench,
  History,
  ShieldAlert,
  ChevronRight,
  ArrowUpRight,
  ShoppingBag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid, 
  Legend, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area 
} from 'recharts';
import { formatDateThai as formatDate, formatDateTimeThai } from '../utils/formatDate';
import DatePicker from '../components/ui/DatePicker';
import type { InventoryTransaction, Withdrawal, PurchaseOrder } from '../types';

const COLORS = ['#29b6f6', '#10b981', '#f59e0b', '#7c3aed', '#ec4899', '#3b82f6'];

// --- CountUp Animation Component ---
const CountUp: React.FC<{ end: number; duration?: number; delay?: number }> = ({ end, duration = 1200, delay = 0 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    const startTimeout = setTimeout(() => {
      const animate = (time: number) => {
        if (!startTime) startTime = time;
        const progress = Math.min((time - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4); // Quartic ease out
        setCount(Math.floor(easeOut * end));
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };
      animationFrame = requestAnimationFrame(animate);
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(animationFrame);
    };
  }, [end, duration, delay]);
  return <>{count.toLocaleString()}</>;
};

// --- Styled Bento Card Component ---
const StyledCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; style?: React.CSSProperties; delay?: number }> = ({ title, icon, children, action, style, delay = 0 }) => (
  <div 
    className="dashboard-styled-card"
    style={{
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '28px',
      padding: '1.75rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.025), 0 1px 3px rgba(0, 0, 0, 0.015)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      animation: 'revealUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
      animationDelay: `${delay}ms`,
      ...style
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ 
          width: '42px', height: '42px', borderRadius: '14px', 
          background: 'var(--primary-light)', 
          color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

interface KPICardProps {
  title: string;
  value: number;
  subText?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  delay: number;
  danger?: boolean;
  to?: string;
}

// --- KPI Card Component ---
const KPICard: React.FC<KPICardProps> = ({ title, value, subText, icon: Icon, delay, danger, to }) => {
  const content = (
    <div 
      className="dashboard-kpi-card"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '28px',
        padding: '1.5rem',
        border: danger ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex', alignItems: 'center', gap: '1.5rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.025), 0 1px 3px rgba(0, 0, 0, 0.015)',
        position: 'relative', overflow: 'hidden',
        animation: 'revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${delay}ms`,
        height: '100%'
      }}
    >
      <div 
        className="kpi-icon-container"
        style={{ 
          width: '60px', height: '60px', borderRadius: '18px', 
          background: danger ? 'var(--danger-light)' : 'var(--primary-light)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          color: danger ? 'var(--danger)' : 'var(--primary)', 
          flexShrink: 0
        }}
      >
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.01em' }}>{title}</div>
        <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1, marginTop: '2px', letterSpacing: '-0.04em' }}>
          <CountUp end={value} delay={delay} />
        </div>
        {subText && (
          <div style={{ 
            fontSize: '0.75rem', marginTop: '6px', 
            color: danger || subText.includes('ต่ำ') || subText.includes('เกิน') || subText.includes('รอดำเนินการ') ? 'var(--danger)' : 'var(--success)', 
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' 
          }}>
             {subText}
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {content}
      </Link>
    );
  }

  return content;
};

const Dashboard: React.FC = () => {
  const { notify } = useNotification();
  const { data, loading, request: fetchStats } = useApi(
    async (params?: { startDate?: string; endDate?: string }) => 
      await repairApi.getDashboardStats(params)
  );
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const setQuickFilter = (type: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const format = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    
    const todayStr = format(today);

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 6); // Includes today
      setStartDate(format(lastWeek));
      setEndDate(todayStr);
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(format(firstDay));
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const isFilterActive = (type: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const format = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    const todayStr = format(today);

    if (type === 'all') return !startDate && !endDate;
    if (type === 'today') return startDate === todayStr && endDate === todayStr;
    if (type === 'week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 6);
      return startDate === format(lastWeek) && endDate === todayStr;
    }
    if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return startDate === format(firstDay) && endDate === todayStr;
    }
    return false;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoaded(false);
        await fetchStats({ startDate, endDate });
        setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
        setTimeout(() => setIsLoaded(true), 150);
      } catch {
        notify('ไม่สามารถโหลดข้อมูลสถิติได้', 'error');
      }
    };
    load();
  }, [fetchStats, notify, startDate, endDate]);

  if (loading || !data) {
    return (
      <div style={{ padding: 'var(--main-padding)', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--bg-app)', minHeight: '100vh' }}>
        <div className="responsive-grid grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="140px" variant="rect" style={{ borderRadius: '28px' }} />)}
        </div>
        <div className="responsive-grid grid-cols-2">
          <Skeleton height="400px" variant="rect" style={{ borderRadius: '28px' }} />
          <Skeleton height="400px" variant="rect" style={{ borderRadius: '28px' }} />
        </div>
      </div>
    );
  }

  const { 
    kpis = { total: 0, pending: 0, in_progress: 0, completed: 0, critical_stock: 0 }, 
    recentJobs = [], 
    technicians = [], 
    inventory = { topUsed: [], leastUsed: [], criticalItems: [], recentTransactions: [], recentWithdrawals: [] }, 
    analysis = { mostBroken: [], overdue: [], monthlyTrend: [] }, 
    withdrawalBreakdown = [], 
    stockMovements = [],
    purchaseOrders = { total_po: 0, pending_po: 0, received_po: 0, total_spent: 0, recentPurchaseOrders: [] }
  } = data || {};

  return (
    <div style={{ 
      padding: 'var(--main-padding)', display: 'flex', flexDirection: 'column', gap: '2.5rem', 
      background: 'var(--bg-app)', minHeight: '100vh', width: '100%', maxWidth: '1480px', margin: '0 auto'
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 100, flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 style={{ 
            fontSize: 'var(--h2-font-size)', fontWeight: 900, color: 'var(--text-main)', 
            display: 'flex', alignItems: 'center', gap: '16px', letterSpacing: '-0.04em', margin: 0
          }}>
             <div style={{ 
               padding: '12px', background: 'var(--primary)', borderRadius: '16px', 
               display: 'flex', boxShadow: '0 10px 25px -10px rgba(41, 182, 246, 0.4)' 
             }}>
               <Activity size={28} color="#ffffff" strokeWidth={2.5} />
             </div>
             ภาพรวมระบบ
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '10px', fontWeight: 600 }}>
             ระบบบริหารจัดการงานซ่อมและคลังอุปกรณ์ · อัปเดต {lastUpdated} น.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '18px', border: '1px solid var(--border)', boxShadow: '0 4px 15px -5px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
            <button 
              className={`btn-filter ${isFilterActive('all') ? 'btn-filter-active' : 'btn-filter-inactive'}`}
              onClick={() => setQuickFilter('all')}
            >
              ทั้งหมด
            </button>
            <button 
              className={`btn-filter ${isFilterActive('today') ? 'btn-filter-active' : 'btn-filter-inactive'}`}
              onClick={() => setQuickFilter('today')}
            >
              วันนี้
            </button>
            <button 
              className={`btn-filter ${isFilterActive('week') ? 'btn-filter-active' : 'btn-filter-inactive'}`}
              onClick={() => setQuickFilter('week')}
            >
              7 วันล่าสุด
            </button>
            <button 
              className={`btn-filter ${isFilterActive('month') ? 'btn-filter-active' : 'btn-filter-inactive'}`}
              onClick={() => setQuickFilter('month')}
            >
              เดือนนี้
            </button>
          </div>

          {/* Custom Date Range */}
          <div style={{ 
            display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '18px', border: '1px solid var(--border)', boxShadow: '0 4px 15px -5px rgba(0,0,0,0.05)', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>กำหนดเอง:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DatePicker 
                value={startDate} 
                onChange={setStartDate} 
                placeholder="เริ่มต้น" 
              />
              <span style={{ color: '#cbd5e1', fontWeight: 900 }}>-</span>
              <DatePicker 
                value={endDate} 
                onChange={setEndDate} 
                placeholder="สิ้นสุด" 
              />
            </div>
            {(!isFilterActive('all') && !isFilterActive('today') && !isFilterActive('week') && !isFilterActive('month')) && (
              <button
                type="button"
                onClick={() => setQuickFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                ล้าง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- PRIORITY 1: INVENTORY (คลังอุปกรณ์) --- */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.75rem' }}>
          <div style={{ width: '8px', height: '32px', background: 'var(--primary)', borderRadius: '4px' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>คลังอุปกรณ์</h3>
          <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
        </div>

        <div className="responsive-grid grid-cols-3" style={{ marginBottom: '1.75rem' }}>
          <KPICard title="อุปกรณ์ใกล้หมด" value={kpis.critical_stock} subText={kpis.critical_stock > 0 ? `ควรสั่งซื้อเพิ่ม ${kpis.critical_stock} รายการ` : 'สต็อกปกติ'} icon={AlertTriangle} danger={kpis.critical_stock > 0} delay={0} to="/inventory?filter=critical" />
          <KPICard title="ความเคลื่อนไหววันนี้" value={inventory.recentTransactions?.length || 0} subText="รายการเคลื่อนไหววันนี้" icon={History} delay={150} to="/transactions" />
          <KPICard title="อุปกรณ์ยอดนิยม" value={inventory.topUsed.length || 0} subText="รายการที่ถูกใช้งานบ่อย" icon={TrendingUp} delay={300} to="/inventory" />
        </div>

        <div className="dashboard-main-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <StyledCard title="ความเคลื่อนไหวล่าสุด" icon={<Activity size={22} />} action={<Link to="/transactions" className="link-hover-shift">ดูทั้งหมด <ChevronRight size={16} /></Link>} delay={400}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(inventory.recentTransactions || []).slice(0, 3).map((t: InventoryTransaction) => (
                  <div key={t.id} className="dashboard-list-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 12px', borderRadius: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ 
                      fontSize: '0.65rem', padding: '5px 10px', borderRadius: '10px', 
                      background: t.transaction_type === 'WITHDRAW' ? 'var(--warning-light)' : t.transaction_type === 'ADD_STOCK' ? 'var(--success-light)' : 'var(--primary-light)',
                      color: t.transaction_type === 'WITHDRAW' ? 'var(--warning)' : t.transaction_type === 'ADD_STOCK' ? 'var(--success)' : 'var(--primary)',
                      fontWeight: 900, flexShrink: 0, letterSpacing: '0.04em'
                    }}>
                      {t.transaction_type === 'WITHDRAW' ? 'เบิกอุปกรณ์' : 
                       t.transaction_type === 'ADD_STOCK' ? 'นำเข้าสต็อก' : 
                       t.transaction_type === 'BORROW' ? 'ยืมอุปกรณ์' : 
                       t.transaction_type === 'RETURN' ? 'คืนอุปกรณ์' : t.transaction_type}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{t.product_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>โดย {t.user_name} · {formatDateTimeThai(t.created_at)}</div>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)' }}>
                      {t.quantity_added > 0 ? `+${t.quantity_added}` : `-${t.quantity_withdrawn || t.quantity_borrowed || 0}`}
                    </div>
                  </div>
                ))}
                {(!inventory.recentTransactions || inventory.recentTransactions.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontWeight: 600 }}>ไม่มีรายการเคลื่อนไหว</div>
                )}
              </div>
            </StyledCard>

            <StyledCard title="รายการอุปกรณ์สต็อกต่ำกว่าเกณฑ์" icon={<AlertTriangle size={22} />} action={<Link to="/inventory?filter=critical" className="link-hover-shift">ดูทั้งหมด <ChevronRight size={16} /></Link>} delay={500}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(inventory.criticalItems || []).slice(0, 3).map((item) => (
                  <div key={item.name} className="dashboard-list-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 12px', borderRadius: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ 
                      fontSize: '0.65rem', padding: '5px 10px', borderRadius: '10px', 
                      background: 'var(--danger-light)',
                      color: 'var(--danger)',
                      fontWeight: 900, flexShrink: 0, letterSpacing: '0.04em'
                    }}>
                      วิกฤต
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>คงเหลือ {item.quantity} ชิ้น · เกณฑ์ขั้นต่ำ {item.min_stock} ชิ้น</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 900 }}>
                      ขาดอีก {item.min_stock - item.quantity} ชิ้น
                    </div>
                  </div>
                ))}
                {(!inventory.criticalItems || inventory.criticalItems.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontWeight: 600 }}>ไม่มีอุปกรณ์ที่สต็อกต่ำกว่าเกณฑ์</div>
                )}
              </div>
            </StyledCard>
          </div>

          <div className="dashboard-right-column">
            <StyledCard title="ใบเบิกล่าสุด" icon={<ArrowUpRight size={22} />} action={<Link to="/withdrawal-history" className="link-hover-shift">ดูทั้งหมด <ChevronRight size={16} /></Link>} delay={600}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(inventory.recentWithdrawals || []).slice(0, 3).map((w: Withdrawal) => (
                  <div key={w.id} className="dashboard-list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '18px', background: 'var(--bg-app)' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{w.recipient}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>{w.project_name || 'งานทั่วไป'} · {formatDate(w.created_at)}</div>
                    </div>
                    <ChevronRight size={20} color="var(--border-hover)" />
                  </div>
                ))}
              </div>
            </StyledCard>
            
            <StyledCard title="อุปกรณ์เบิกมากสุด" icon={<TrendingUp size={22} />} delay={800}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {inventory.topUsed.slice(0, 3).map((item) => (
                  <div key={item.name} className="dashboard-list-row" style={{ padding: '8px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 900 }}>{item.count} ครั้ง</span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--border)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ 
                        position: 'absolute',
                        top: 0, left: 0, bottom: 0, right: 0,
                        background: 'var(--primary)', 
                        borderRadius: '5px',
                        transform: isLoaded ? `scaleX(${item.count / (inventory.topUsed[0]?.count || 1)})` : 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s'
                      }}></div>
                    </div>
                  </div>
                ))}
               </div>
            </StyledCard>
          </div>
        </div>

        <div className="responsive-grid grid-cols-2" style={{ marginTop: '1.75rem' }}>
          {/* Withdrawal Reasons breakdown (Donut Pie Chart) */}
          <StyledCard title="สัดส่วนจุดประสงค์การเบิกพัสดุ" icon={<TrendingUp size={22} />} delay={850}>
            {(!withdrawalBreakdown || withdrawalBreakdown.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontWeight: 600 }}>ไม่มีข้อมูลการเบิกพัสดุ</div>
            ) : (
              <div className="dashboard-chart-split" style={{ marginTop: '10px' }}>
                <div className="chart-panel" style={{ height: '260px', minHeight: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={withdrawalBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="name"
                        stroke="none"
                      >
                        {withdrawalBreakdown.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-lg)',
                          fontSize: '13px', 
                          fontWeight: 700,
                          color: 'var(--text-main)'
                        }}
                        itemStyle={{ color: 'var(--text-main)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {withdrawalBreakdown.map((item, idx) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</span>
                      <span style={{ color: 'var(--text-main)', marginLeft: 'auto', flexShrink: 0 }}>{item.count} ครั้ง</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </StyledCard>

          {/* Stock movements trend area chart */}
          <StyledCard title="แนวโน้มการทำรายการพัสดุ (6 เดือนย้อนหลัง)" icon={<TrendingUp size={22} />} delay={950}>
            {(!stockMovements || stockMovements.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontWeight: 600 }}>ไม่มีข้อมูลการเคลื่อนไหวพัสดุ</div>
            ) : (
              <div style={{ height: '220px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stockMovements}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorWithdrawn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBorrowed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#29b6f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#29b6f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.split('-')[1] + '/' + v.split('-')[0].substring(2)} tick={{ fill: 'var(--text-muted)', fontWeight: 700 }} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontWeight: 700 }} />
                    <Tooltip
                      contentStyle={{ 
                        borderRadius: '16px', 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)', 
                        boxShadow: 'var(--shadow-lg)', 
                        fontSize: '13px', 
                        padding: '15px', 
                        fontWeight: 700,
                        color: 'var(--text-main)'
                      }}
                      itemStyle={{ color: 'var(--text-main)' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }} />
                    <Area type="monotone" dataKey="added" stroke="#10b981" fillOpacity={1} fill="url(#colorAdded)" strokeWidth={2} name="นำเข้า (+)" />
                    <Area type="monotone" dataKey="withdrawn" stroke="#ea580c" fillOpacity={1} fill="url(#colorWithdrawn)" strokeWidth={2} name="เบิกจ่าย (-)" />
                    <Area type="monotone" dataKey="borrowed" stroke="#29b6f6" fillOpacity={1} fill="url(#colorBorrowed)" strokeWidth={2} name="ยืมพัสดุ (-)" />
                    <Area type="monotone" dataKey="returned" stroke="#7c3aed" fillOpacity={1} fill="url(#colorReturned)" strokeWidth={2} name="คืนพัสดุ (+)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </StyledCard>
        </div>
      </section>

      {/* --- PRIORITY 2: REPAIRS (งานซ่อมแซมและเคลม) --- */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.75rem' }}>
          <div style={{ width: '8px', height: '32px', background: 'var(--primary)', borderRadius: '4px' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>งานซ่อมแซมและเคลม</h3>
          <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
        </div>

        <div className="responsive-grid grid-cols-4" style={{ marginBottom: '1.75rem' }}>
          <KPICard title="งานทั้งหมด" value={kpis.total} subText="รับแจ้งเข้าสู่ระบบ" icon={Wrench} delay={450} to="/repairs" />
          <KPICard title="รอดำเนินการ" value={kpis.pending} subText={`ด่วน ${kpis.pending > 2 ? 2 : kpis.pending} รายการ`} icon={Clock} delay={600} to="/repairs?status=รอดำเนินการ" />
          <KPICard title="กำลังดำเนินการ" value={kpis.in_progress} subText="อยู่ระหว่างซ่อม/เคลม" icon={Wrench} delay={750} to="/repairs?status=กำลังซ่อม" />
          <KPICard title="เสร็จสิ้น" value={kpis.completed} subText="ปิดงานเรียบร้อย" icon={Check} delay={900} to="/repairs?status=เสร็จสิ้น" />
        </div>

        <div className="responsive-grid grid-cols-2">
          <StyledCard title="งานซ่อม/เคลมล่าสุด" icon={<ShieldAlert size={22} />} action={<Link to="/repairs" className="link-hover-shift">ดูทั้งหมด <ChevronRight size={16} /></Link>} delay={1000}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {recentJobs.slice(0, 4).map((job) => (
                <div key={job.id} className="dashboard-list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '16px', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ 
                      fontSize: '0.65rem', padding: '4px 10px', borderRadius: '8px', 
                      background: job.type === 'claim' ? '#fff1f2' : '#f0f9ff', 
                      color: job.type === 'claim' ? '#e11d48' : '#0288d1',
                      fontWeight: 900, textTransform: 'uppercase'
                    }}>
                      {job.type === 'claim' ? 'เคลม' : 'ซ่อม'}
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{job.device_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>{job.reporter} · {formatDate(job.created_at)}</div>
                    </div>
                  </div>
                  <span className={`badge badge-${job.status}`} style={{ height: 'fit-content', fontSize: '0.75rem', fontWeight: 800, padding: '5px 12px', borderRadius: '10px' }}>{job.status}</span>
                </div>
              ))}
            </div>
          </StyledCard>

          <StyledCard title="แนวโน้มงานซ่อม" icon={<BarChart3 size={22} />} delay={1200}>
            <div style={{ height: '200px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.monthlyTrend}>
                  <defs>
                    <linearGradient id="repairActiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={1}/>
                      <stop offset="100%" stopColor="var(--primary-hover)" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="repairNormalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary-light)" stopOpacity={1}/>
                      <stop offset="100%" stopColor="var(--primary-light)" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.split('-')[1]} tick={{ fill: 'var(--text-muted)', fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '20px', 
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)', 
                      boxShadow: 'var(--shadow-lg)', 
                      fontSize: '13px', 
                      padding: '15px', 
                      fontWeight: 700,
                      color: 'var(--text-main)'
                    }}
                    cursor={{ fill: 'var(--bg-app)' }}
                    itemStyle={{ color: 'var(--text-main)' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={28}>
                    {analysis.monthlyTrend.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === analysis.monthlyTrend.length - 1 ? 'url(#repairActiveGrad)' : 'url(#repairNormalGrad)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="responsive-grid grid-cols-3" style={{ marginTop: '25px', background: 'var(--bg-app)', padding: '15px', borderRadius: '22px', border: '1px solid var(--border)' }}>
              {[
                { label: 'เฉลี่ยต่อเดือน', val: Math.round(analysis.monthlyTrend.reduce((a, b) => a + b.count, 0) / (analysis.monthlyTrend.length || 1)) },
                { label: 'สูงสุด', val: Math.max(...analysis.monthlyTrend.map(t => t.count), 0), color: 'var(--primary)' },
                { label: 'เดือนนี้', val: analysis.monthlyTrend[analysis.monthlyTrend.length - 1]?.count || 0 }
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color || 'var(--text-main)', marginTop: '4px' }}>
                    <CountUp end={s.val} delay={1000} />
                  </div>
                </div>
              ))}
            </div>
          </StyledCard>
        </div>

        <div style={{ marginTop: '1.75rem' }}>
          <StyledCard title="ภาระงานและการปฏิบัติงานของช่าง" icon={<Users size={22} />} delay={1400}>
            {(!technicians || technicians.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontWeight: 700 }}>ยังไม่มีข้อมูลช่างปฏิบัติงาน</div>
            ) : (
              <div style={{ height: '240px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={technicians}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="techCompletedGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--success-light)" />
                        <stop offset="100%" stopColor="var(--success)" />
                      </linearGradient>
                      <linearGradient id="techActiveGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--primary-light)" />
                        <stop offset="100%" stopColor="var(--primary)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontWeight: 700 }} />
                    <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-main)', fontWeight: 800 }} width={75} />
                    <Tooltip
                      contentStyle={{ 
                        borderRadius: '16px', 
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)', 
                        boxShadow: 'var(--shadow-lg)', 
                        fontSize: '13px', 
                        padding: '15px', 
                        fontWeight: 700,
                        color: 'var(--text-main)'
                      }}
                      itemStyle={{ color: 'var(--text-main)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={32} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }} 
                    />
                    <Bar dataKey="completed" stackId="a" fill="url(#techCompletedGrad)" radius={[0, 6, 6, 0]} barSize={14} name="ซ่อมเสร็จสิ้น" />
                    <Bar dataKey="active" stackId="a" fill="url(#techActiveGrad)" radius={[0, 6, 6, 0]} barSize={14} name="กำลังซ่อม" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </StyledCard>
        </div>
      </section>

      {/* --- PRIORITY 3: PURCHASE ORDERS (การจัดซื้อและจัดหาพัสดุ) --- */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.75rem', marginTop: '1rem' }}>
          <div style={{ width: '8px', height: '32px', background: 'var(--primary)', borderRadius: '4px' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>การสั่งซื้อและจัดหาพัสดุ</h3>
          <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
        </div>

        <div className="responsive-grid grid-cols-3" style={{ marginBottom: '1.75rem' }}>
          <KPICard 
            title="งบประมาณจัดซื้อสะสม" 
            value={purchaseOrders.total_spent || 0} 
            subText="เฉพาะใบสั่งซื้อที่ตรวจรับสินค้าแล้ว" 
            icon={ShoppingBag} 
            
            delay={100} 
            to="/purchase-orders" 
          />
          <KPICard 
            title="ใบสั่งซื้อรอดำเนินการ" 
            value={purchaseOrders.pending_po || 0} 
            subText="อยู่ระหว่างจัดซื้อ/รออนุมัติ" 
            icon={Clock} 
            delay={250} 
            to="/purchase-orders?status=Pending" 
          />
          <KPICard 
            title="ใบสั่งซื้อที่รับของแล้ว" 
            value={purchaseOrders.received_po || 0} 
            subText="นำสินค้าเข้าคลังสำเร็จ" 
            icon={Check} 
            delay={400} 
            to="/purchase-orders?status=Received" 
          />
        </div>

        <div style={{ marginTop: '1.75rem' }}>
          <StyledCard 
            title="ใบสั่งซื้อล่าสุด" 
            icon={<ShoppingBag size={22} />} 
            action={<Link to="/purchase-orders" className="link-hover-shift">ดูทั้งหมด <ChevronRight size={16} /></Link>} 
            delay={500}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {(purchaseOrders.recentPurchaseOrders || []).map((po: PurchaseOrder & { total_cost?: number; total_items?: number }) => (
                <div key={po.id} className="dashboard-list-row" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px', borderRadius: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ 
                    fontSize: '0.65rem', padding: '5px 10px', borderRadius: '10px', 
                    background: po.status === 'Received' ? 'var(--success-light)' : po.status === 'Cancelled' ? 'var(--danger-light)' : 'var(--warning-light)',
                    color: po.status === 'Received' ? 'var(--success)' : po.status === 'Cancelled' ? 'var(--danger)' : 'var(--warning)',
                    fontWeight: 900, flexShrink: 0, letterSpacing: '0.04em'
                  }}>
                    {po.status === 'Draft' ? 'แบบร่าง' :
                     po.status === 'Pending' ? 'รอรับของ' :
                     po.status === 'Approved' ? 'อนุมัติแล้ว' :
                     po.status === 'Received' ? 'รับของแล้ว' :
                     po.status === 'Cancelled' ? 'ยกเลิก' : po.status}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{po.po_no}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>
                      ผู้สั่ง: {po.ordered_by || po.created_by} · {po.project_name || 'งานทั่วไป'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)' }}>
                      ฿{(po.total_cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {po.total_items || 0} ชิ้น
                    </div>
                  </div>
                </div>
              ))}
              {(!purchaseOrders.recentPurchaseOrders || purchaseOrders.recentPurchaseOrders.length === 0) && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontWeight: 600 }}>ไม่มีประวัติการสั่งซื้อ</div>
              )}
            </div>
          </StyledCard>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;