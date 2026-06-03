import React, { useEffect, useState } from 'react';
import { transactionApi } from '../api';
import { useApi } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDateTimeThai, formatDateThai, parseDate } from '../utils/formatDate';
import DatePicker from '../components/ui/DatePicker';
import PrintReturnTemplate from '../components/PrintReturnTemplate';
import { 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCcw, 
  User, 
  MapPin, 
  Briefcase,
  Inbox,
  LogIn,
  Check,
  ChevronRight,
  X,
  Trash,
  AlertOctagon,
  Timer,
  Clock,
  Activity,
  ArrowDownToLine,
  FileText,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import type { InventoryTransaction } from '../types';
import { useNotification } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';

const TransactionList: React.FC = () => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'inbound' | 'outbound' | 'pending_return' | 'overdue'>('all');

  const [colFilters, setColFilters] = useState({
    product_name: '',
    transaction_type: 'All',
    quantity: '',
    serial_number: '',
    condition: 'All',
    location: '',
    user_name: '',
    created_at: '',
    duration: '',
    project_name: ''
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

  const parseInputDate = (dateStr: string, isEnd: boolean): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isEnd) {
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
  };

  const getTabStyle = (tab: 'all' | 'inbound' | 'outbound' | 'pending_return' | 'overdue'): React.CSSProperties => {
    const isActive = activeTab === tab;
    
    let activeBorder = 'var(--primary)';
    let activeBg = 'var(--primary-light)';
    let activeText = 'var(--primary)';
    
    if (tab === 'inbound') {
      activeBorder = 'var(--success-border)';
      activeBg = 'var(--success-light)';
      activeText = 'var(--success)';
    } else if (tab === 'outbound') {
      activeBorder = 'var(--danger-border)';
      activeBg = 'var(--danger-light)';
      activeText = 'var(--danger)';
    } else if (tab === 'pending_return') {
      activeBorder = 'var(--warning-border)';
      activeBg = 'var(--warning-light)';
      activeText = 'var(--warning)';
    } else if (tab === 'overdue') {
      activeBorder = 'var(--danger-border)';
      activeBg = 'var(--danger-light)';
      activeText = 'var(--danger)';
    }
    
    return {
      padding: '8px 18px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: 600,
      border: '1px solid',
      borderColor: isActive ? activeBorder : 'var(--border)',
      backgroundColor: isActive ? activeBg : 'var(--bg-card)',
      color: isActive ? activeText : 'var(--text-muted)',
      cursor: 'pointer',
      transition: 'var(--transition-smooth)',
      outline: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    };
  };

  const getWithdrawalTypeBadge = (type?: string) => {
    if (!type) return null;
    let bg = 'var(--bg-app)';
    let color = 'var(--text-muted)';
    let border = 'var(--border)';

    const cleanType = type.replace('คืน: ', '');

    if (cleanType === 'ติดตั้งใหม่') {
      bg = 'var(--primary-light)';
      color = 'var(--primary)';
      border = 'var(--primary-light)';
    } else if (cleanType === 'ซ่อมแซม') {
      bg = 'var(--info-light)';
      color = 'var(--info)';
      border = 'var(--info-border)';
    } else if (cleanType === 'สำรองใช้งาน') {
      bg = 'var(--warning-light)';
      color = 'var(--warning)';
      border = 'var(--warning-border)';
    } else if (cleanType === 'ทดสอบ') {
      bg = 'var(--success-light)';
      color = 'var(--success)';
      border = 'var(--success-border)';
    }

    return (
      <span style={{
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {type}
      </span>
    );
  };

  const getTransactionTypeBadge = (t: InventoryTransaction) => {
    if (t.withdrawal_type) {
      return getWithdrawalTypeBadge(
        t.transaction_type === 'RETURN' ? `คืน: ${t.withdrawal_type}` : t.withdrawal_type
      );
    }
    
    switch (t.transaction_type) {
      case 'ADD_STOCK':
        return (
          <span style={{
            backgroundColor: 'var(--success-light)',
            color: 'var(--success)',
            border: '1px solid var(--success-border)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center'
          }}>
            นำเข้าสต็อก
          </span>
        );
      case 'WITHDRAW':
        return (
          <span style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            border: '1px solid var(--danger-border)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center'
          }}>
            เบิกอุปกรณ์
          </span>
        );
      case 'BORROW':
        return (
          <span style={{
            backgroundColor: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center'
          }}>
            ยืมอุปกรณ์
          </span>
        );
      case 'RETURN':
        return (
          <span style={{
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            border: '1px solid rgba(41, 182, 246, 0.15)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center'
          }}>
            คืนอุปกรณ์
          </span>
        );
      default:
        return null;
    }
  };

  const { data: transactionsData, loading, request: fetchTransactions } = useApi(transactionApi.getAll);
  const transactions: InventoryTransaction[] = transactionsData || [];
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returning, setReturning] = useState(false);
  const [returnImage, setReturnImage] = useState<File | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<InventoryTransaction | null>(null);
  const [returnFormData, setReturnFormData] = useState({
    user_name: '',
    condition: 'Good',
    note: ''
  });

  const isTransactionOverdue = (t: InventoryTransaction) => {
    if (t.status === 'RETURNED') return false;
    
    const isReturnable = t.transaction_type === 'BORROW' || 
      (t.transaction_type === 'WITHDRAW' && (t.withdrawal_type === 'ทดสอบ' || t.withdrawal_type === 'สำรองใช้งาน'));
      
    if (!isReturnable) return false;
    
    // Check if created_at is more than 7 days ago
    const createdDate = parseDate(t.created_at);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  };

  const getReturnTransaction = (tx: InventoryTransaction) => {
    if (tx.status !== 'RETURNED') return null;
    
    const candidates = transactions.filter(t => 
      t.transaction_type === 'RETURN' &&
      (
        (tx.withdrawal_id && t.withdrawal_id === tx.withdrawal_id) || 
        (tx.instance_id ? t.instance_id === tx.instance_id : t.inventory_id === tx.inventory_id)
      ) &&
      new Date(t.created_at) >= new Date(tx.created_at)
    );
    
    if (candidates.length === 0) return null;
    
    return candidates.reduce((oldest, current) => 
      new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
    , candidates[0]);
  };

  const getUsageDurationDays = (tx: InventoryTransaction, returnTx?: InventoryTransaction | null) => {
    const startDate = new Date(tx.created_at);
    const endDate = returnTx ? new Date(returnTx.created_at) : new Date();
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDurationBadge = (createdAtStr: string) => {
    const createdDate = parseDate(createdAtStr);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      return (
        <span 
          className="badge-overdue-pulse"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.75rem',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            transition: 'all 0.3s ease'
          }}
        >
          <AlertOctagon size={12} /> เกินกำหนด {diffDays} วัน
        </span>
      );
    }
    
    const daysLabel = diffDays === 0 ? 'ใช้งานวันนี้' : `ใช้งานแล้ว ${diffDays} วัน`;
    return (
      <span 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '0.75rem',
          color: '#4b5563',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb'
        }}
      >
        <Clock size={12} /> {daysLabel}
      </span>
    );
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('คุณต้องการลบรายการความเคลื่อนไหวนี้ใช่หรือไม่? การลบนี้จะไม่สามารถย้อนกลับได้ และจะไม่ส่งผลต่อจำนวนสต็อกปัจจุบัน')) return;

    try {
      setDeletingId(id);
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      await transactionApi.delete(id);
      notify('ลบรายการเรียบร้อยแล้ว');
      fetchTransactions();
    } catch (error) {
      setDeletingId(null);
      const errMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'เกิดข้อผิดพลาดในการลบรายการ';
      notify(errMsg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;

    const trimmedUser = returnFormData.user_name.trim();
    const trimmedNote = returnFormData.note.trim();

    if (!trimmedUser) {
      notify('กรุณากรอกชื่อผู้ส่งคืน', 'error');
      return;
    }

    if (trimmedUser.length > 100) {
      notify('ชื่อผู้คืนยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }

    if (trimmedNote.length > 1000) {
      notify('หมายเหตุยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)', 'error');
      return;
    }

    setReturning(true);
    try {
      const data = new FormData();
      data.append('inventory_id', selectedTransaction.inventory_id.toString());
      if (selectedTransaction.instance_id) data.append('instance_id', selectedTransaction.instance_id.toString());
      data.append('quantity', (selectedTransaction.quantity_borrowed || selectedTransaction.quantity_withdrawn).toString());
      data.append('user_name', trimmedUser);
      data.append('condition', returnFormData.condition);
      data.append('note', trimmedNote);
      data.append('transaction_id', selectedTransaction.id.toString());
      if (returnImage) data.append('image', returnImage);

      await transactionApi.return(data);
      notify('บันทึกการคืนอุปกรณ์เรียบร้อยแล้ว');
      setShowReturnModal(false);
      setReturnImage(null);
      fetchTransactions();
    } catch (error) {
      const errMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกการคืน';
      notify(errMsg, 'error');
    } finally {
      setReturning(false);
    }
  };

  const isReturnView = activeTab === 'pending_return' || activeTab === 'overdue';

  // Stats calculations
  const safeTransactions = transactions || [];
  const totalCount = safeTransactions.length;
  const activeLoans = safeTransactions.filter(t => 
    (t.transaction_type === 'BORROW' || (t.transaction_type === 'WITHDRAW' && (t.withdrawal_type === 'ทดสอบ' || t.withdrawal_type === 'สำรองใช้งาน'))) && t.status !== 'RETURNED'
  ).length;
  const overdueCount = safeTransactions.filter(isTransactionOverdue).length;
  const totalOutbound = safeTransactions.reduce((acc, t) => acc + (t.quantity_withdrawn || 0) + (t.quantity_borrowed || 0), 0);
  const totalInbound = safeTransactions.reduce((acc, t) => acc + (t.quantity_added || 0) + (t.quantity_returned || 0), 0);
  const inboundCount = safeTransactions.filter(t => t.transaction_type === 'ADD_STOCK' || t.transaction_type === 'RETURN').length;
  const outboundCount = safeTransactions.filter(t => t.transaction_type === 'WITHDRAW' || t.transaction_type === 'BORROW').length;

  const filteredTransactions = (transactions || []).filter(t => {
    const tDate = parseDate(t.created_at);
    if (startDate) {
      const start = parseInputDate(startDate, false);
      if (tDate < start) return false;
    }
    if (endDate) {
      const end = parseInputDate(endDate, true);
      if (tDate > end) return false;
    }

    const matchesSearch = 
      t.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.project_name && t.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.user_name && t.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.serial_number && t.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Check activeTab filter
    switch (activeTab) {
      case 'inbound':
        if (!(t.transaction_type === 'ADD_STOCK' || t.transaction_type === 'RETURN')) return false;
        break;
      case 'outbound':
        if (!(t.transaction_type === 'WITHDRAW' || t.transaction_type === 'BORROW')) return false;
        break;
      case 'pending_return':
        if (!((t.transaction_type === 'BORROW' || (t.transaction_type === 'WITHDRAW' && (t.withdrawal_type === 'ทดสอบ' || t.withdrawal_type === 'สำรองใช้งาน'))) && t.status !== 'RETURNED')) return false;
        break;
      case 'overdue':
        if (!isTransactionOverdue(t)) return false;
        break;
      case 'all':
      default:
        break;
    }

    // Column Filters
    if (colFilters.product_name && !t.product_name.toLowerCase().includes(colFilters.product_name.toLowerCase())) return false;
    
    if (colFilters.transaction_type !== 'All') {
      // Handle Return view mapped badge type vs normal ledger types
      const isReturnView = activeTab === 'pending_return' || activeTab === 'overdue';
      if (isReturnView) {
        const mappedType = t.withdrawal_type || 'ยืมอุปกรณ์';
        if (colFilters.transaction_type === 'BORROW' && mappedType !== 'ยืมอุปกรณ์') return false;
        if (colFilters.transaction_type === 'WITHDRAW' && mappedType === 'ยืมอุปกรณ์') return false;
      } else {
        if (t.transaction_type !== colFilters.transaction_type) return false;
      }
    }

    if (colFilters.quantity) {
      const isReturnView = activeTab === 'pending_return' || activeTab === 'overdue';
      const qtyVal = isReturnView 
        ? (t.quantity_borrowed || t.quantity_withdrawn || 0)
        : (t.quantity_added || t.quantity_returned || t.quantity_withdrawn || t.quantity_borrowed || 0);
      if (!qtyVal.toString().includes(colFilters.quantity)) return false;
    }

    if (colFilters.serial_number && (!t.serial_number || !t.serial_number.toLowerCase().includes(colFilters.serial_number.toLowerCase()))) return false;
    
    if (colFilters.condition !== 'All' && (!t.condition || t.condition !== colFilters.condition)) return false;

    if (colFilters.location) {
      const isReturnView = activeTab === 'pending_return' || activeTab === 'overdue';
      if (isReturnView) {
        const pName = (t.project_name || '').toLowerCase();
        const loc = (t.location || '').toLowerCase();
        if (!pName.includes(colFilters.location.toLowerCase()) && !loc.includes(colFilters.location.toLowerCase())) return false;
      } else {
        const loc = (t.location || '').toLowerCase();
        if (!loc.includes(colFilters.location.toLowerCase())) return false;
      }
    }

    if (colFilters.user_name && (!t.user_name || !t.user_name.toLowerCase().includes(colFilters.user_name.toLowerCase()))) return false;
    
    if (colFilters.created_at) {
      const formattedDate = formatDateThai(t.created_at).toLowerCase();
      if (!formattedDate.includes(colFilters.created_at.toLowerCase())) return false;
    }

    if (colFilters.project_name && (!t.project_name || !t.project_name.toLowerCase().includes(colFilters.project_name.toLowerCase()))) return false;

    return true;
  });

  // --- Transaction Grouping: pair RETURN sub-rows with their parent WITHDRAW/BORROW ---
  interface GroupedTransaction {
    parent: InventoryTransaction;
    child: InventoryTransaction | null;
  }

  const groupTransactions = (list: InventoryTransaction[]): GroupedTransaction[] => {
    // No grouping in these views - show all transactions individually
    if (isReturnView || activeTab === 'inbound') {
      return list.map(t => ({ parent: t, child: null }));
    }

    const allTransactions = transactions || [];
    const pairedIds = new Set<number>();
    const groups: GroupedTransaction[] = [];

    // list is already sorted by created_at DESC
    for (const t of list) {
      if (pairedIds.has(t.id)) continue;

      if (t.transaction_type === 'RETURN') {
        // Find parent and group here to keep at the top (the date of return)
        const parentTx = allTransactions.find(p => 
          (p.transaction_type === 'WITHDRAW' || p.transaction_type === 'BORROW') &&
          p.inventory_id === t.inventory_id &&
          (
            (t.withdrawal_id && p.withdrawal_id === t.withdrawal_id) ||
            (t.instance_id && p.instance_id === t.instance_id) ||
            (!t.instance_id && !t.withdrawal_id && p.inventory_id === t.inventory_id)
          ) &&
          new Date(p.created_at) <= new Date(t.created_at) &&
          !pairedIds.has(p.id)
        );

        if (parentTx) {
          pairedIds.add(parentTx.id);
          groups.push({ parent: parentTx, child: t });
        } else {
          groups.push({ parent: t, child: null });
        }
      } else if (t.transaction_type === 'WITHDRAW' || t.transaction_type === 'BORROW') {
        if (t.status === 'RETURNED') {
          // Find matching RETURN
          const returnTx = allTransactions.find(r => 
            r.transaction_type === 'RETURN' &&
            r.inventory_id === t.inventory_id &&
            (
              (t.withdrawal_id && r.withdrawal_id === t.withdrawal_id) ||
              (t.instance_id && r.instance_id === t.instance_id) ||
              (!t.instance_id && !t.withdrawal_id && r.inventory_id === t.inventory_id)
            ) &&
            new Date(r.created_at) >= new Date(t.created_at) &&
            !pairedIds.has(r.id)
          );

          if (returnTx) {
            pairedIds.add(returnTx.id);
            groups.push({ parent: t, child: returnTx });
          } else {
            groups.push({ parent: t, child: null });
          }
        } else {
          groups.push({ parent: t, child: null });
        }
      } else {
        // ADD_STOCK or other types
        groups.push({ parent: t, child: null });
      }
    }

    return groups;
  };

  // Filter out paired RETURNs from the main list before pagination
  const groupedAll = groupTransactions(filteredTransactions);
  const totalPages = Math.ceil((groupedAll.length || 0) / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = groupedAll.slice(indexOfFirstItem, indexOfLastItem);
  // Keep currentTransactions for backwards compatibility in isReturnView and empty checks
  const currentTransactions = currentGroups.map(g => g.parent);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ADD_STOCK': return <ArrowUpCircle size={18} color="var(--success)" />;
      case 'WITHDRAW': return <ArrowDownCircle size={18} color="var(--danger)" />;
      case 'BORROW': return <RefreshCcw size={18} color="var(--warning)" />;
      case 'RETURN': return <ArrowUpCircle size={18} color="var(--primary)" />;
      default: return <Inbox size={18} />;
    }
  };

  return (
    <div className="transaction-list-page" style={{ padding: '2rem 2.5rem', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeOutSlideLeft {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-20px); max-height: 0; padding-top: 0; padding-bottom: 0; margin: 0; border: none; }
        }
        .row-deleting {
          animation: fadeOutSlideLeft 0.4s forwards;
          pointer-events: none;
          background-color: var(--danger-light) !important;
        }
        .btn-delete:hover {
          color: var(--danger) !important;
          background-color: var(--danger-light) !important;
          border-color: var(--danger-border) !important;
        }
        
        .modern-table-row {
          transition: all 0.2s ease-in-out;
        }
        .modern-table-row:hover {
          background-color: var(--primary-light) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        
        .badge-qty-in {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--success);
          background-color: var(--success-light);
          border: 1px solid var(--success-border);
        }
        
        .badge-qty-out {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--danger);
          background-color: var(--danger-light);
          border: 1px solid var(--danger-border);
        }

        @keyframes pulse-red {
          0%, 100% {
            background-color: var(--danger-light);
            border-color: var(--danger-border);
          }
          50% {
            background-color: rgba(239, 68, 68, 0.18);
            border-color: rgba(239, 68, 68, 0.35);
          }
        }
         .badge-overdue-pulse {
          animation: pulse-red 2s infinite;
        }
        .sub-row {
          background-color: var(--primary-light);
          border-bottom: 1px solid var(--border);
        }
        .sub-row td {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
          font-size: 0.8rem !important;
        }
        .sub-row:hover {
          background-color: var(--primary-light) !important;
          opacity: 0.8;
        }
      `}</style>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-title">
          <h2>ประวัติความเคลื่อนไหวอุปกรณ์ (Ledger)</h2>
          <p>ติดตามการนำเข้า, เบิก และคืนอุปกรณ์ทั้งหมดในระบบ</p>
        </div>
      </div>

      <div className="transaction-list-layout">
        <main className="transaction-main-column">
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div 
          className={`stats-card card-all ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Activity size={20} />
          </div>
          <div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">รายการทั้งหมด</div>
          </div>
        </div>

        <div 
          className={`stats-card card-low ${activeTab === 'pending_return' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pending_return'); setCurrentPage(1); }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Timer size={20} />
          </div>
          <div>
            <div className="stat-value">{activeLoans}</div>
            <div className="stat-label">เบิกค้างส่งคืน</div>
          </div>
        </div>

        <div 
          className={`stats-card card-critical ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => { setActiveTab('overdue'); setCurrentPage(1); }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
            <AlertOctagon size={20} />
          </div>
          <div>
            <div className="stat-value">{overdueCount}</div>
            <div className="stat-label">เกินกำหนดส่งคืน</div>
          </div>
        </div>

        <div 
          className={`stats-card card-inbound ${activeTab === 'inbound' ? 'active' : ''}`}
          onClick={() => { setActiveTab('inbound'); setCurrentPage(1); }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
            <ArrowDownToLine size={20} />
          </div>
          <div>
            <div className="stat-value">{totalInbound}</div>
            <div className="stat-label">นำเข้า & คืนคลังทั้งหมด (ชิ้น)</div>
          </div>
        </div>

        <div 
          className={`stats-card card-outbound ${activeTab === 'outbound' ? 'active' : ''}`}
          onClick={() => { setActiveTab('outbound'); setCurrentPage(1); }}
        >
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
            <ArrowDownCircle size={20} />
          </div>
          <div>
            <div className="stat-value">{totalOutbound}</div>
            <div className="stat-label">เบิกออกทั้งหมด (ชิ้น)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Card */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search Bar */}
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
                backgroundColor: 'var(--bg-app)'
              }}
              placeholder="ค้นหาชื่ออุปกรณ์, S/N, โครงการ, หรือผู้ทำรายการ..." 
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
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  backgroundColor: '#fef2f2',
                  color: '#ef4444',
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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button style={getTabStyle('all')} onClick={() => { setActiveTab('all'); setCurrentPage(1); }}>
              ทั้งหมด ({totalCount})
            </button>
            <button style={getTabStyle('inbound')} onClick={() => { setActiveTab('inbound'); setCurrentPage(1); }}>
              นำเข้า & คืนของ ({inboundCount})
            </button>
            <button style={getTabStyle('outbound')} onClick={() => { setActiveTab('outbound'); setCurrentPage(1); }}>
              เบิกออก ({outboundCount})
            </button>
            <button style={getTabStyle('pending_return')} onClick={() => { setActiveTab('pending_return'); setCurrentPage(1); }}>
              ค้างส่งคืน ({activeLoans})
            </button>
            <button style={getTabStyle('overdue')} onClick={() => { setActiveTab('overdue'); setCurrentPage(1); }}>
              เกินกำหนด ({overdueCount})
            </button>
          </div>
        </div>
      </Card>
        </main>

      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="60px" />
          ))}
        </div>
      ) : (
        <>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container">
            <table className="data-table" style={{ minWidth: '1200px' }}>
              <thead>
                {isReturnView ? (
                  <>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ width: '18%', whiteSpace: 'nowrap' }}>อุปกรณ์</th>
                      <th style={{ width: '8%', textAlign: 'center', whiteSpace: 'nowrap' }}>ประเภท</th>
                      <th style={{ width: '6%', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวนค้าง</th>
                      <th style={{ width: '5%', whiteSpace: 'nowrap' }}>S/N</th>
                      <th style={{ width: '13%', textAlign: 'center', whiteSpace: 'nowrap' }}>ระยะเวลาใช้งาน</th>
                      <th style={{ width: '15%', whiteSpace: 'nowrap' }}>โครงการ & หน้างาน</th>
                      <th style={{ width: '11%', whiteSpace: 'nowrap' }}>ผู้เบิกไปใช้งาน</th>
                      <th style={{ width: '10%', whiteSpace: 'nowrap' }}>วันที่เบิก</th>
                      <th style={{ width: '14%', textAlign: 'right', whiteSpace: 'nowrap' }}>การจัดการ</th>
                    </tr>
                    <tr className="filter-row" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="ค้นหาอุปกรณ์..." 
                          style={filterInputStyle}
                          value={colFilters.product_name}
                          onChange={(e) => setColFilters({ ...colFilters, product_name: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <select
                          style={filterInputStyle}
                          value={colFilters.transaction_type}
                          onChange={(e) => setColFilters({ ...colFilters, transaction_type: e.target.value })}
                        >
                          <option value="All">ทั้งหมด</option>
                          <option value="BORROW">ยืมอุปกรณ์</option>
                          <option value="WITHDRAW">เบิกออก</option>
                        </select>
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="number" 
                          placeholder="จำนวน..." 
                          style={{ ...filterInputStyle, textAlign: 'center' }}
                          value={colFilters.quantity}
                          onChange={(e) => setColFilters({ ...colFilters, quantity: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="S/N..." 
                          style={filterInputStyle}
                          value={colFilters.serial_number}
                          onChange={(e) => setColFilters({ ...colFilters, serial_number: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}></th>
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
                          placeholder="ผู้เบิก..." 
                          style={filterInputStyle}
                          value={colFilters.user_name}
                          onChange={(e) => setColFilters({ ...colFilters, user_name: e.target.value })}
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
                      <th style={{ padding: '4px 8px' }}></th>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ width: '20%', whiteSpace: 'nowrap' }}>อุปกรณ์</th>
                      <th style={{ width: '8%', textAlign: 'center', whiteSpace: 'nowrap' }}>ประเภท</th>
                      <th style={{ width: '6%', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวน</th>
                      <th style={{ width: '8%', whiteSpace: 'nowrap' }}>S/N</th>
                      <th style={{ width: '6%', textAlign: 'center', whiteSpace: 'nowrap' }}>สภาพ</th>
                      <th style={{ width: '15%', whiteSpace: 'nowrap' }}>สถานที่/งาน</th>
                      <th style={{ width: '12%', whiteSpace: 'nowrap' }}>ผู้ทำรายการ</th>
                      <th style={{ width: '10%', whiteSpace: 'nowrap' }}>วันที่ (Modified)</th>
                      <th style={{ width: '15%', textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
                    </tr>
                    <tr className="filter-row" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="ค้นหาอุปกรณ์..." 
                          style={filterInputStyle}
                          value={colFilters.product_name}
                          onChange={(e) => setColFilters({ ...colFilters, product_name: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <select
                          style={filterInputStyle}
                          value={colFilters.transaction_type}
                          onChange={(e) => setColFilters({ ...colFilters, transaction_type: e.target.value })}
                        >
                          <option value="All">ทั้งหมด</option>
                          <option value="WITHDRAW">WITHDRAW</option>
                          <option value="RETURN">RETURN</option>
                          <option value="ADD_STOCK">ADD_STOCK</option>
                          <option value="BORROW">BORROW</option>
                        </select>
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="number" 
                          placeholder="จำนวน..." 
                          style={{ ...filterInputStyle, textAlign: 'center' }}
                          value={colFilters.quantity}
                          onChange={(e) => setColFilters({ ...colFilters, quantity: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="S/N..." 
                          style={filterInputStyle}
                          value={colFilters.serial_number}
                          onChange={(e) => setColFilters({ ...colFilters, serial_number: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <select
                          style={filterInputStyle}
                          value={colFilters.condition}
                          onChange={(e) => setColFilters({ ...colFilters, condition: e.target.value })}
                        >
                          <option value="All">ทั้งหมด</option>
                          <option value="New">New</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="Broken">Broken</option>
                        </select>
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="สถานที่/งาน..." 
                          style={filterInputStyle}
                          value={colFilters.location}
                          onChange={(e) => setColFilters({ ...colFilters, location: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="ผู้ทำรายการ..." 
                          style={filterInputStyle}
                          value={colFilters.user_name}
                          onChange={(e) => setColFilters({ ...colFilters, user_name: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="วันที่..." 
                          style={filterInputStyle}
                          value={colFilters.created_at}
                          onChange={(e) => setColFilters({ ...colFilters, created_at: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}></th>
                    </tr>
                  </>
                )}
              </thead>
              <tbody>
                {currentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      ไม่พบข้อมูลความเคลื่อนไหว
                    </td>
                  </tr>
                ) : (
                  currentGroups.map((group) => {
                    const t = group.parent;
                    const childTx = group.child;

                    // Helper to render a normal-view row
                    const renderNormalRow = (tx: InventoryTransaction, isSubRow = false) => (
                      <tr 
                        key={`${isSubRow ? 'sub-' : ''}${tx.id}`} 
                        className={`${deletingId === tx.id ? 'row-deleting' : ''} modern-table-row ${isSubRow ? 'sub-row' : ''}`}
                        style={{ 
                          opacity: (!isSubRow && tx.status === 'RETURNED') ? 0.85 : 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <td style={{ fontWeight: isSubRow ? 500 : 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, paddingLeft: isSubRow ? '20px' : '0' }}>
                            {isSubRow ? (
                              <span style={{ color: 'var(--primary)', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>↩</span>
                            ) : (
                              getTransactionIcon(tx.transaction_type)
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ 
                                whiteSpace: 'normal',
                                color: isSubRow ? 'var(--primary)' : undefined
                              }} title={tx.product_name}>
                                {isSubRow ? 'คืนอุปกรณ์' : tx.product_name}
                              </div>
                              {!isSubRow && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{tx.product_model || '-'}</div>}
                              {isSubRow && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{tx.product_name}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {getTransactionTypeBadge(tx)}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            {tx.quantity_added > 0 || tx.quantity_returned > 0 ? (
                              <span className="badge-qty-in">+{tx.quantity_added || tx.quantity_returned}</span>
                            ) : tx.quantity_withdrawn > 0 || tx.quantity_borrowed > 0 ? (
                              <span className="badge-qty-out">-{tx.quantity_withdrawn || tx.quantity_borrowed}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>-</span>
                            )}
                            {!isSubRow && tx.status === 'RETURNED' && (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                color: 'var(--success)', 
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                              }}>
                                ✓ คืนครบแล้ว
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{tx.serial_number || '-'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {tx.condition && (
                            <span className={`badge badge-${tx.condition.toLowerCase() === 'broken' ? 'danger' : 'success'}`} style={{ fontSize: '0.7rem' }}>
                              {tx.condition}
                            </span>
                          )}
                          {!tx.condition && '-'}
                        </td>
                        <td style={{ whiteSpace: 'normal' }}>
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '100%' }} title={tx.location || '-'}>
                              <MapPin size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} /> 
                              <span style={{ whiteSpace: 'normal' }}>{tx.location || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', maxWidth: '100%' }} title={tx.project_name || '-'}>
                              <Briefcase size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} /> 
                              <span style={{ whiteSpace: 'normal' }}>{tx.project_name || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, maxWidth: '100%' }} title={tx.user_name || '-'}>
                            <User size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'normal' }}>{tx.user_name || '-'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title={formatDateTimeThai(tx.created_at)}>
                          {formatDateThai(tx.created_at)}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', overflow: 'visible' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              icon={<ChevronRight size={14} />} 
                              onClick={() => {
                                setSelectedDetail(tx);
                                setShowDetailModal(true);
                              }}
                              title="ดูรายละเอียด"
                            />
                            {!isSubRow && (tx.transaction_type === 'BORROW' || (tx.transaction_type === 'WITHDRAW' && (tx.withdrawal_type === 'ทดสอบ' || tx.withdrawal_type === 'สำรองใช้งาน'))) && (
                              tx.status === 'RETURNED' ? (
                                <span style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px', 
                                  padding: '4px 10px', 
                                  borderRadius: '12px', 
                                  backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                                  border: '1px solid rgba(16, 185, 129, 0.15)',
                                  color: 'var(--success)', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 700 
                                }}>
                                  <Check size={12} /> คืนแล้ว
                                </span>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  icon={<LogIn size={14} />} 
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setReturnFormData({...returnFormData, user_name: ''});
                                    setShowReturnModal(true);
                                  }}
                                >
                                  คืนของ
                                </Button>
                              )
                            )}
                            <Button 
                              variant="danger" 
                              size="sm" 
                              icon={<Trash size={14} />} 
                              onClick={() => handleDelete(tx.id)}
                              title="ลบรายการ"
                            />
                          </div>
                        </td>
                      </tr>
                    );

                    // Helper to render return-view row (for pending_return / overdue tabs)
                    const renderReturnViewRow = (tx: InventoryTransaction) => (
                      <tr 
                        key={tx.id} 
                        className={`${deletingId === tx.id ? 'row-deleting' : ''} modern-table-row`}
                        style={{ 
                          opacity: tx.status === 'RETURNED' ? 0.75 : 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            {getTransactionIcon(tx.transaction_type)}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ 
                                whiteSpace: 'normal'
                              }} title={tx.product_name}>
                                {tx.product_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {tx.product_model || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {getWithdrawalTypeBadge(tx.withdrawal_type) || (
                            <span style={{
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ยืมอุปกรณ์
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span className="badge-qty-out">{tx.quantity_borrowed || tx.quantity_withdrawn} เครื่อง</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{tx.serial_number || '-'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {getDurationBadge(tx.created_at)}
                        </td>
                        <td style={{ whiteSpace: 'normal' }}>
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '100%' }} title={tx.project_name || '-'}>
                              <Briefcase size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} /> 
                              <span style={{ whiteSpace: 'normal' }}>{tx.project_name || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', maxWidth: '100%' }} title={tx.location || '-'}>
                              <MapPin size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} /> 
                              <span style={{ whiteSpace: 'normal' }}>{tx.location || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, maxWidth: '100%' }} title={tx.user_name || '-'}>
                            <User size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'normal' }}>{tx.user_name || '-'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title={formatDateTimeThai(tx.created_at)}>
                          {formatDateThai(tx.created_at)}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', overflow: 'visible' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              icon={<ChevronRight size={14} />} 
                              onClick={() => {
                                setSelectedDetail(tx);
                                setShowDetailModal(true);
                              }}
                              title="ดูรายละเอียด"
                            />
                            {tx.status === 'RETURNED' ? (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                padding: '4px 10px', 
                                borderRadius: '12px', 
                                backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                color: 'var(--success)', 
                                fontSize: '0.75rem', 
                                fontWeight: 700 
                              }}>
                                <Check size={12} /> คืนแล้ว
                              </span>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                icon={<LogIn size={14} />} 
                                onClick={() => {
                                  setSelectedTransaction(tx);
                                  setReturnFormData({...returnFormData, user_name: ''});
                                  setShowReturnModal(true);
                                }}
                              >
                                คืนของ
                              </Button>
                            )}
                            <Button 
                              variant="danger" 
                              size="sm" 
                              icon={<Trash size={14} />} 
                              onClick={() => handleDelete(tx.id)}
                              title="ลบรายการ"
                            />
                          </div>
                        </td>
                      </tr>
                    );

                    return isReturnView ? (
                      <React.Fragment key={t.id}>
                        {renderReturnViewRow(t)}
                      </React.Fragment>
                    ) : (
                      <React.Fragment key={t.id}>
                        {renderNormalRow(t, false)}
                        {childTx && renderNormalRow(childTx, true)}
                      </React.Fragment>
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

      {/* Detail Modal */}
      {showDetailModal && selectedDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--primary-light)', padding: '8px', borderRadius: '8px' }}>
                  {getTransactionIcon(selectedDetail.transaction_type)}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>รายละเอียดความเคลื่อนไหว</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDateTimeThai(selectedDetail.created_at)}</p>
                </div>
              </div>
              <Button variant="text" size="sm" icon={<X size={20} />} onClick={() => setShowDetailModal(false)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>อุปกรณ์ / รายการ</label>
                  <p style={{ margin: 0, fontWeight: 700 }}>{selectedDetail.product_name}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedDetail.product_model || '-'}</p>
                </div>
                
                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>ประเภทรายการ</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getTransactionIcon(selectedDetail.transaction_type)}
                    <span style={{ fontWeight: 600 }}>
                      {selectedDetail.transaction_type === 'ADD_STOCK' && 'นำเข้าสต็อก'}
                      {selectedDetail.transaction_type === 'WITHDRAW' && `เบิกอุปกรณ์${selectedDetail.withdrawal_type ? ` (${selectedDetail.withdrawal_type})` : ''}`}
                      {selectedDetail.transaction_type === 'BORROW' && 'ยืมอุปกรณ์'}
                      {selectedDetail.transaction_type === 'RETURN' && `คืนอุปกรณ์${selectedDetail.withdrawal_type ? ` (${selectedDetail.withdrawal_type})` : ''}`}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>จำนวน</label>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>
                    {selectedDetail.quantity_added || selectedDetail.quantity_returned || selectedDetail.quantity_withdrawn || selectedDetail.quantity_borrowed} ชิ้น
                  </p>
                </div>

                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>S/N และ สภาพ</label>
                  <p style={{ margin: 0, fontFamily: 'monospace' }}>S/N: {selectedDetail.serial_number || '-'}</p>
                  {selectedDetail.condition && (
                    <span className={`badge badge-${selectedDetail.condition.toLowerCase() === 'broken' ? 'danger' : 'success'}`} style={{ marginTop: '4px' }}>
                      {selectedDetail.condition}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>ผู้ทำรายการ</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} color="var(--text-muted)" />
                    <span style={{ fontWeight: 600 }}>{selectedDetail.user_name || '-'}</span>
                  </div>
                </div>

                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>สถานที่ / โครงการ</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span>{selectedDetail.location || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={14} color="var(--text-muted)" />
                    <span>{selectedDetail.project_name || '-'}</span>
                  </div>
                </div>

                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>หมายเหตุ (Notes)</label>
                  <div style={{ 
                    padding: '10px 14px', 
                    background: 'var(--bg-app)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    minHeight: '60px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedDetail.note || 'ไม่มีหมายเหตุเพิ่มเติม'}
                  </div>
                </div>
              </div>
            </div>

            {/* Return details and duration for returnable transactions */}
            {(() => {
              const isReturnable = selectedDetail.transaction_type === 'BORROW' || 
                (selectedDetail.transaction_type === 'WITHDRAW' && 
                 (selectedDetail.withdrawal_type === 'ทดสอบ' || selectedDetail.withdrawal_type === 'สำรองใช้งาน'));
              
              if (!isReturnable) return null;

              const returnTx = getReturnTransaction(selectedDetail);
              const durationDays = getUsageDurationDays(selectedDetail, returnTx);
              const isReturned = selectedDetail.status === 'RETURNED';
              
              const overdue = !isReturned && durationDays > 7;
              
              const startDate = parseDate(selectedDetail.created_at);
              const dueDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

              return (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isReturned ? '1px solid rgba(16, 185, 129, 0.15)' : overdue ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(245, 158, 11, 0.15)',
                  backgroundColor: isReturned ? 'rgba(16, 185, 129, 0.04)' : overdue ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem' }}>
                    {isReturned ? (
                      <>
                        <Check size={16} color="var(--success)" />
                        <span style={{ color: 'var(--success)' }}>คืนอุปกรณ์เรียบร้อยแล้ว</span>
                      </>
                    ) : overdue ? (
                      <>
                        <AlertOctagon size={16} color="#ef4444" className="badge-overdue-pulse" />
                        <span style={{ color: '#ef4444' }}>ยังไม่ส่งคืน (เกินกำหนดส่งคืน 7 วัน)</span>
                      </>
                    ) : (
                      <>
                        <Clock size={16} color="#f59e0b" />
                        <span style={{ color: '#d97706' }}>ยังไม่ส่งคืน (อยู่ในระยะเวลาทดสอบ/สำรอง)</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>วันที่เริ่มต้นเบิก: </span>
                      <span style={{ fontWeight: 700 }}>{formatDateTimeThai(startDate)}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>วันที่กำหนดส่งคืน: </span>
                      <span style={{ fontWeight: 700, color: overdue ? '#ef4444' : 'var(--text-main)' }}>
                        {formatDateTimeThai(dueDate)} (7 วัน)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '8px', marginTop: '4px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>ระยะเวลาใช้งาน: </span>
                      <span style={{ fontWeight: 700 }}>
                        {durationDays === 0 ? 'ใช้งานวันนี้' : `${durationDays} วัน`}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '4px' }}>
                        ({isReturned ? 'ตั้งแต่วันที่เบิกถึงวันส่งคืน' : 'นับตั้งแต่วันที่เบิก'})
                      </span>
                    </div>

                    {isReturned && returnTx ? (
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>วันที่ส่งคืน: </span>
                        <span>{formatDateTimeThai(returnTx.created_at)}</span>
                      </div>
                    ) : null}
                  </div>

                  {isReturned && returnTx && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '8px', marginTop: '4px' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>ผู้ส่งคืน: </span>
                        <span>{returnTx.user_name || '-'}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>สภาพตอนคืน: </span>
                        <span className={`badge badge-${returnTx.condition?.toLowerCase() === 'broken' ? 'danger' : 'success'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                          {returnTx.condition || 'Good'}
                        </span>
                      </div>
                    </div>
                  )}

                  {isReturned && returnTx && returnTx.note && (
                    <div style={{ fontSize: '0.85rem', borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>หมายเหตุการคืน: </span>
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>"{returnTx.note}"</span>
                    </div>
                  )}
                </div>
              );
            })()}
            
            <div className="modal-actions" style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              {(selectedDetail.transaction_type === 'RETURN' || (selectedDetail.status === 'RETURNED')) && (
                <Button 
                  type="button" 
                  variant="outline" 
                  icon={<FileText size={18} />} 
                  onClick={() => {
                    const printContent = document.getElementById('pdf-return-template');
                    if (printContent) {
                      const returnTx = selectedDetail.transaction_type === 'RETURN' ? selectedDetail : getReturnTransaction(selectedDetail);
                      if (returnTx) {
                        import('../utils/pdfGenerator').then(({ printElement }) => {
                          printElement('pdf-return-template', `Return_Receipt_${returnTx.id}.pdf`);
                        });
                      }
                    }
                  }}
                  style={{ flex: 1, borderColor: '#4f46e5', color: '#4f46e5' }}
                >
                  ปริ้นใบรับคืน (PDF)
                </Button>
              )}
              <Button type="button" variant="primary" onClick={() => setShowDetailModal(false)} style={{ flex: 1 }}>
                ปิดหน้าต่าง
              </Button>
            </div>
            
            {/* Hidden Print Template */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              {(selectedDetail.transaction_type === 'RETURN' || (selectedDetail.status === 'RETURNED')) && (
                 <PrintReturnTemplate 
                   transaction={selectedDetail.transaction_type === 'RETURN' ? selectedDetail : getReturnTransaction(selectedDetail)} 
                 />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <LogIn color="var(--primary)" size={24} />
              <div>
                <h3 style={{ margin: 0 }}>คืนอุปกรณ์จากรายการ{selectedTransaction.transaction_type === 'BORROW' ? 'ยืม' : 'เบิก'}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedTransaction.product_name} (S/N: {selectedTransaction.serial_number || '-'})</p>
              </div>
            </div>
            <form onSubmit={handleReturn}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="info-item">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>จำนวนที่คืน</label>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{selectedTransaction.quantity_borrowed || selectedTransaction.quantity_withdrawn} ชิ้น</p>
                </div>
                <div className="form-group">
                  <label>สภาพอุปกรณ์</label>
                  <select 
                    value={returnFormData.condition}
                    onChange={e => setReturnFormData({...returnFormData, condition: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  >
                    <option value="New">ใหม่ (New)</option>
                    <option value="Good">ดี (Good)</option>
                    <option value="Fair">พอใช้ (Fair)</option>
                    <option value="Broken">ชำรุด (Broken)</option>
                  </select>
                </div>
              </div>

              <Input 
                label="ผู้ส่งคืน"
                required
                maxLength={100}
                value={returnFormData.user_name}
                onChange={e => setReturnFormData({...returnFormData, user_name: e.target.value})}
                placeholder="ระบุชื่อผู้คืน..."
                disabled={returning}
              />

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  <ImageIcon size={16} color="var(--primary)" /> รูปภาพหลักฐานการคืน
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {returnImage ? (
                    <div className="image-preview-card" style={{ width: '120px', height: '120px' }}>
                      <img src={URL.createObjectURL(returnImage)} alt="preview" />
                      <button 
                        type="button" 
                        className="remove-btn" 
                        onClick={() => setReturnImage(null)} 
                        disabled={returning}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="image-uploader-box" style={{ width: '100%', height: '120px', cursor: returning ? 'not-allowed' : 'pointer', opacity: returning ? 0.6 : 1 }}>
                      <Upload size={24} style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>คลิกเพื่อเลือกรูปภาพหลักฐาน</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>รองรับไฟล์ JPG, PNG</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={e => setReturnImage(e.target.files ? e.target.files[0] : null)} 
                        disabled={returning} 
                      />
                    </label>
                  )}
                </div>
              </div>

              <TextArea 
                label="หมายเหตุการคืน"
                rows={2}
                maxLength={1000}
                value={returnFormData.note}
                onChange={e => setReturnFormData({...returnFormData, note: e.target.value})}
                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."
                disabled={returning}
              />

              <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '12px' }}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowReturnModal(false)} 
                  disabled={returning}
                  style={{ flex: 1, height: '48px', borderRadius: '12px', fontWeight: 600 }}
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  loading={returning} 
                  disabled={returning}
                  style={{ flex: 1, height: '48px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 4px 12px rgba(41, 182, 246, 0.3)' }}
                >
                  ยืนยันการคืนของ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
;
