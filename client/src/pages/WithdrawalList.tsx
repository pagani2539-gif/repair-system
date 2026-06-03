import React, { useEffect, useState } from 'react';
import { withdrawalApi } from '../api';
import { useNotification } from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDateTimeThai, formatDateThai, parseDate } from '../utils/formatDate';
import DatePicker from '../components/ui/DatePicker';
import { 
  Search, 
  Calendar, 
  User, 
  ChevronRight,
  Trash,
  Plus,
  Boxes,
  X,
  Printer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PrintWithdrawalTemplate from '../components/PrintWithdrawalTemplate';
import { printElement } from '../utils/pdfGenerator';
import type { Withdrawal } from '../types';

const WithdrawalList: React.FC = () => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [colFilters, setColFilters] = useState({
    id: '',
    recipient: '',
    project_name: '',
    location: '',
    type: 'All',
    items_summary: '',
    created_at: ''
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [printingWithdrawal, setPrintingWithdrawal] = useState<Withdrawal | null>(null);
  const [isPrintLoading, setIsPrintLoading] = useState<number | null>(null);

  const handlePrint = async (wId: number) => {
    setIsPrintLoading(wId);
    try {
      const detail = await withdrawalApi.getById(wId);
      setPrintingWithdrawal(detail);
      notify('กำลังดาวน์โหลดเอกสาร PDF...');
    } catch {
      notify('ไม่สามารถดึงข้อมูลเพื่อพิมพ์ใบเบิกได้', 'error');
    } finally {
      setIsPrintLoading(null);
    }
  };

  useEffect(() => {
    if (printingWithdrawal) {
      const timer = setTimeout(() => {
        printElement('pdf-withdrawal-template', `ใบเบิกอุปกรณ์ - WD-${printingWithdrawal.id.toString().padStart(6, '0')}`);
        setPrintingWithdrawal(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printingWithdrawal]);

  const parseInputDate = (dateStr: string, isEnd: boolean): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isEnd) {
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
  };

  const { data: withdrawals = [], loading, request: fetchWithdrawals } = useApi(withdrawalApi.getAll);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('คุณต้องการลบประวัติการเบิกนี้ใช่หรือไม่? ระบบจะทำการคืนสต็อกอุปกรณ์ทั้งหมดในรายการนี้ให้โดยอัตโนมัติ')) return;
    
    try {
      await withdrawalApi.delete(id);
      notify('ลบประวัติและคืนสต็อกเรียบร้อยแล้ว');
      fetchWithdrawals();
    } catch {
      notify('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
  };

  const filteredWithdrawals = (withdrawals || []).filter(w => {
    const wDate = parseDate(w.created_at);
    if (startDate) {
      const start = parseInputDate(startDate, false);
      if (wDate < start) return false;
    }
    if (endDate) {
      const end = parseInputDate(endDate, true);
      if (wDate > end) return false;
    }

    const matchesSearch = w.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.items_summary && w.items_summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      w.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.project_name && w.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.location && w.location.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Column Filters
    if (colFilters.id && !`WD-${w.id.toString().padStart(6, '0')}`.toLowerCase().includes(colFilters.id.toLowerCase())) return false;
    if (colFilters.created_at) {
      const formattedDate = formatDateThai(w.created_at).toLowerCase();
      if (!formattedDate.includes(colFilters.created_at.toLowerCase())) return false;
    }
    if (colFilters.recipient && !w.recipient.toLowerCase().includes(colFilters.recipient.toLowerCase())) return false;
    if (colFilters.project_name && (!w.project_name || !w.project_name.toLowerCase().includes(colFilters.project_name.toLowerCase()))) return false;
    if (colFilters.location && (!w.location || !w.location.toLowerCase().includes(colFilters.location.toLowerCase()))) return false;
    if (colFilters.type !== 'All' && w.type !== colFilters.type) return false;
    
    if (colFilters.items_summary) {
      const itemCountStr = (w.items_summary ? w.items_summary.split(',').length : 0).toString();
      const summaryText = (w.items_summary || '').toLowerCase();
      if (!itemCountStr.includes(colFilters.items_summary) && !summaryText.includes(colFilters.items_summary.toLowerCase())) return false;
    }

    return true;
  });

  const totalPages = Math.ceil((filteredWithdrawals.length || 0) / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWithdrawals = filteredWithdrawals.slice(indexOfFirstItem, indexOfLastItem);

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'ติดตั้งใหม่':
        return 'badge-withdrawal-install';
      case 'ซ่อมแซม':
        return 'badge-withdrawal-repair';
      case 'สำรองใช้งาน':
        return 'badge-withdrawal-backup';
      case 'ทดสอบ':
        return 'badge-withdrawal-test';
      default:
        return 'badge-withdrawal-custom';
    }
  };

  return (
    <div className="withdrawal-list-page" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div className="page-title">
          <h2>ประวัติการเบิกอุปกรณ์</h2>
          <p>ตรวจสอบรายการเบิกอุปกรณ์ย้อนหลังทั้งหมดในระบบคลังพัสดุ</p>
        </div>
        <Link to="/withdrawal">
          <Button variant="primary" icon={<Plus size={20} style={{ marginRight: '8px' }} />}>
            ทำการเบิกใหม่
          </Button>
        </Link>
      </div>

      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="search-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} className="search-icon" style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="search-input"
              style={{ 
                paddingLeft: '44px', 
                height: '42px', 
                width: '100%', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-md)', 
                outline: 'none',
                fontSize: '0.95rem',
                backgroundColor: 'var(--bg-app)',
                transition: 'all 0.2s ease'
              }}
              placeholder="ค้นหาชื่อผู้เบิก, รายการอุปกรณ์, หรือประเภท..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>เริ่มต้น:</span>
              <DatePicker 
                value={startDate}
                onChange={(val) => { setStartDate(val); setCurrentPage(1); }}
                placeholder="เลือกวันเริ่มต้น"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>สิ้นสุด:</span>
              <DatePicker 
                value={endDate}
                onChange={(val) => { setEndDate(val); setCurrentPage(1); }}
                placeholder="เลือกวันสิ้นสุด"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
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

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="70px" />
          ))}
        </div>
      ) : (
        <>
          <Card style={{ padding: 0 }}>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '10%', whiteSpace: 'nowrap' }}>เลขที่ใบเบิก</th>
                    <th style={{ width: '12%', whiteSpace: 'nowrap' }}>วันที่เบิก</th>
                    <th style={{ width: '14%', whiteSpace: 'nowrap' }}>ผู้เบิก / หน่วยงาน</th>
                    <th style={{ width: '15%', whiteSpace: 'nowrap' }}>โครงการ / งาน</th>
                    <th style={{ width: '15%', whiteSpace: 'nowrap' }}>สถานที่</th>
                    <th style={{ width: '11%', whiteSpace: 'nowrap' }}>ประเภท</th>
                    <th style={{ width: '11%', whiteSpace: 'nowrap' }}>รายการอุปกรณ์</th>
                    <th style={{ width: '12%', textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
                  </tr>
                  <tr className="filter-row" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <th style={{ padding: '4px 8px' }}>
                      <input 
                        type="text" 
                        placeholder="เลขใบเบิก..." 
                        style={filterInputStyle}
                        value={colFilters.id}
                        onChange={(e) => setColFilters({ ...colFilters, id: e.target.value })}
                      />
                    </th>
                    <th style={{ padding: '4px 8px' }}>
                      <input 
                        type="text" 
                        placeholder="วันที่เบิก..." 
                        style={filterInputStyle}
                        value={colFilters.created_at}
                        onChange={(e) => setColFilters({ ...colFilters, created_at: e.target.value })}
                      />
                    </th>
                    <th style={{ padding: '4px 8px' }}>
                      <input 
                        type="text" 
                        placeholder="ผู้เบิก..." 
                        style={filterInputStyle}
                        value={colFilters.recipient}
                        onChange={(e) => setColFilters({ ...colFilters, recipient: e.target.value })}
                      />
                    </th>
                    <th style={{ padding: '4px 8px' }}>
                      <input 
                        type="text" 
                        placeholder="โครงการ..." 
                        style={filterInputStyle}
                        value={colFilters.project_name}
                        onChange={(e) => setColFilters({ ...colFilters, project_name: e.target.value })}
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
                        value={colFilters.type}
                        onChange={(e) => setColFilters({ ...colFilters, type: e.target.value })}
                      >
                        <option value="All">ทั้งหมด</option>
                        <option value="ติดตั้งใหม่">ติดตั้งใหม่</option>
                        <option value="ซ่อมแซม">ซ่อมแซม</option>
                        <option value="สำรองใช้งาน">สำรองใช้งาน</option>
                        <option value="ทดสอบ">ทดสอบ</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                    </th>
                    <th style={{ padding: '4px 8px' }}>
                      <input 
                        type="text" 
                        placeholder="ค้นหาอุปกรณ์..." 
                        style={filterInputStyle}
                        value={colFilters.items_summary}
                        onChange={(e) => setColFilters({ ...colFilters, items_summary: e.target.value })}
                      />
                    </th>
                    <th style={{ padding: '4px 8px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {currentWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        ไม่พบข้อมูลประวัติการเบิกอุปกรณ์
                      </td>
                    </tr>
                  ) : (
                    currentWithdrawals.map((w) => {
                      const itemCount = w.items_summary ? w.items_summary.split(',').length : 0;
                      
                      return (
                        <tr key={w.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>WD-{w.id.toString().padStart(6, '0')}</td>
                          <td title={formatDateTimeThai(w.created_at)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                              <Calendar size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                              {formatDateThai(w.created_at)}
                            </div>
                          </td>
                          <td title={w.recipient}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              <User size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                              {w.recipient}
                            </div>
                          </td>
                          <td title={w.project_name || '-'}>{w.project_name || '-'}</td>
                          <td title={w.location || '-'}>{w.location || '-'}</td>
                          <td>
                            <span className={`badge ${getBadgeClass(w.type)}`}>
                              {w.type}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px', 
                                  padding: '4px 10px', 
                                  background: 'var(--primary-light)', 
                                  color: 'var(--primary)', 
                                  borderRadius: '20px', 
                                  fontSize: '0.8rem', 
                                  fontWeight: 700,
                                  cursor: 'help',
                                  border: '1px solid rgba(41, 182, 246, 0.1)',
                                  width: 'fit-content'
                                }}
                                title={w.items_summary}
                              >
                                <Boxes size={14} />
                                {itemCount} รายการ
                              </div>
                              {w.items_missing_sn && w.items_missing_sn > 0 ? (
                                <Link to={`/withdrawal/${w.id}`} style={{ textDecoration: 'none' }}>
                                  <div 
                                    className="btn-blink-alert"
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '4px', 
                                      backgroundColor: 'var(--danger)',
                                      color: 'white', 
                                      padding: '4px 10px',
                                      borderRadius: '20px',
                                      fontSize: '0.7rem', 
                                      fontWeight: 700,
                                      marginTop: '6px',
                                      border: '1px solid var(--danger-border)'
                                    }}
                                  >
                                    <X size={12} strokeWidth={3} /> ต้องระบุ S/N
                                  </div>
                                </Link>
                              ) : null}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap', overflow: 'visible' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                icon={<Printer size={16} />} 
                                loading={isPrintLoading === w.id}
                                onClick={() => handlePrint(w.id)} 
                                title="พิมพ์ใบเบิก (PDF)" 
                              />
                              <Link to={`/withdrawal/${w.id}`}>
                                <Button variant="outline" size="sm" icon={<ChevronRight size={16} />} title="ดูรายละเอียด" />
                              </Link>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                icon={<Trash size={16} />} 
                                onClick={() => handleDelete(w.id)} 
                                title="ลบรายการและคืนสต็อก" 
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                ก่อนหน้า
              </Button>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>หน้า {currentPage} จาก {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                ถัดไป
              </Button>
            </div>
          )}
        </>
      )}
      {printingWithdrawal && (
        <PrintWithdrawalTemplate withdrawal={printingWithdrawal} />
      )}
    </div>
  );
};

export default WithdrawalList;
