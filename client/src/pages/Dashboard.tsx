import React, { useEffect, useState } from 'react';
import { repairApi } from '../api';
import type { RepairStats, Repair } from '../types';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  Search, 
  Plus, 
  Layers,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<RepairStats | null>(null);
  const [recentRepairs, setRecentRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, repairsData] = await Promise.all([
          repairApi.getStats(),
          repairApi.getAll({ search: '' })
        ]);
        setStats(statsData.repair);
        setRecentRepairs(repairsData.slice(0, 8));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRepairs = recentRepairs.filter(r => 
    r.ticket_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reporter.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner"></div>
      <p style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>กำลังเตรียมข้อมูลหลังบ้าน...</p>
    </div>
  );

  return (
    <div className="dashboard-container" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '2.5rem' }}>
        <div className="page-title">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>แผงควบคุมระบบ</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>ยินดีต้อนรับกลับมา, ตรวจสอบภาพรวมงานซ่อมทั้งหมดของคุณ</p>
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
          { label: 'งานซ่อมทั้งหมด', val: stats?.total, icon: Layers, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'รอดำเนินการ', val: stats?.pending, icon: AlertCircle, color: '#ef4444', bg: '#fef2f2' },
          { label: 'กำลังดำเนินการ', val: stats?.in_progress, icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'รออะไหล่', val: stats?.on_hold, icon: PauseCircle, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'เสร็จสิ้นแล้ว', val: stats?.completed, icon: CheckCircle2, color: '#10b981', bg: '#f0fdf4' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
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


      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>รายการล่าสุดทั้งหมด</h3>
          <div className="search-container" style={{ marginLeft: 'auto' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="search-input"
              placeholder="ค้นหาเลขตั๋ว, อุปกรณ์, ผู้แจ้ง..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '16px' }}>เลขที่ใบงาน</th>
                <th style={{ padding: '16px' }}>ประเภท</th>
                <th style={{ padding: '16px' }}>รายละเอียดอุปกรณ์</th>
                <th style={{ padding: '16px' }}>สถานะ</th>
                <th style={{ padding: '16px' }}>ลำดับความสำคัญ</th>
                <th style={{ padding: '16px' }}>สถานที่</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>ดูรายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepairs.map((repair) => (
                <tr key={repair.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontWeight: 700 }}>{repair.ticket_no}</td>
                  <td style={{ padding: '16px' }}>
                     <span style={{ 
                       padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                       background: repair.type === 'claim' ? '#fff1f2' : '#f0f9ff',
                       color: repair.type === 'claim' ? '#e11d48' : '#0369a1'
                     }}>
                       {repair.type === 'claim' ? 'เคลมอุปกรณ์' : 'ซ่อมบำรุง'}
                     </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600 }}>{repair.device_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{repair.problem}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge badge-${repair.status}`}>{repair.status}</span>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{repair.priority}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{repair.location}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <Link to={`/repairs/${repair.id}`} className="btn btn-outline" style={{ padding: '6px 12px' }}>
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
