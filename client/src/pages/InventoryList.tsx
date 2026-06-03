import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { inventoryApi, UPLOAD_URL } from '../api';
import { useNotification } from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import type { InventoryItem } from '../types';
import { 
  Boxes, 
  Search, 
  Plus, 
  Trash, 
  Pencil, 
  Image as ImageIcon,
  Check,
  XCircle,
  LayoutGrid,
  List,
  Tag,
  X,
  Zap,
  Upload
} from 'lucide-react';
import { ProvideSnModal } from '../components/ProvideSnModal';

const InventoryList: React.FC = () => {
  const { notify, refreshUnreadCounts } = useNotification();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const itemsPerPage = 20; 

  const [showModal, setShowModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [snInputMode, setSnInputMode] = useState<'individual' | 'bulk'>('individual');

  const [invSnModal, setInvSnModal] = useState<{
    isOpen: boolean;
    item: InventoryItem | null;
    existingSns: string[];
  }>({
    isOpen: false,
    item: null,
    existingSns: []
  });

  const [formData, setFormData] = useState({
    name: '',
    model: '',
    description: '',
    quantity: 0,
    min_stock: 10,
    requires_sn: 1
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'low' | 'normal'>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const filterParam = searchParams.get('filter');
    if (filterParam === 'critical' || filterParam === 'low' || filterParam === 'normal') {
      return filterParam;
    }
    return 'all';
  });

  const [advancedFilters, setAdvancedFilters] = useState({
    stockStatus: 'All', // 'All', 'OutOfStock', 'LowStock', 'OptimalStock'
    model: 'All',
    sortBy: 'name-asc' // 'name-asc', 'name-desc', 'stock-desc', 'stock-asc', 'newest'
  });

  const [colFilters, setColFilters] = useState({
    name: '',
    model: '',
    description: '',
    quantity: '',
    stockStatus: 'All'
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

  const { data: items = [], loading: listLoading, request: fetchItems } = useApi(inventoryApi.getAll);
  const { data: stats, loading: statsLoading, request: fetchStats } = useApi(inventoryApi.getStats);

  const uniqueModels = React.useMemo(() => {
    const modelsSet = new Set<string>();
    (items || []).forEach(item => {
      if (item.model) modelsSet.add(item.model);
    });
    return Array.from(modelsSet).sort();
  }, [items]);

  const filteredItems = (items || []).filter(item => {
    // 1. Box Filters
    if (activeFilter === 'critical') {
      if (item.quantity >= 10) return false;
    } else if (activeFilter === 'low') {
      if (item.quantity < 10 || item.quantity >= 20) return false;
    } else if (activeFilter === 'normal') {
      if (item.quantity < 40) return false;
    }

    // 2. Stock Status Dropdown
    if (advancedFilters.stockStatus === 'OutOfStock') {
      if (item.quantity > 0) return false;
    } else if (advancedFilters.stockStatus === 'LowStock') {
      if (item.quantity >= item.min_stock || item.quantity === 0) return false;
    } else if (advancedFilters.stockStatus === 'OptimalStock') {
      if (item.quantity < item.min_stock) return false;
    }

    // 3. Model Dropdown
    if (advancedFilters.model !== 'All') {
      if (item.model !== advancedFilters.model) return false;
    }

    // Column Filters
    if (colFilters.name && !item.name.toLowerCase().includes(colFilters.name.toLowerCase())) return false;
    if (colFilters.model && (!item.model || !item.model.toLowerCase().includes(colFilters.model.toLowerCase()))) return false;
    if (colFilters.description && (!item.description || !item.description.toLowerCase().includes(colFilters.description.toLowerCase()))) return false;
    if (colFilters.quantity && !item.quantity.toString().includes(colFilters.quantity)) return false;
    
    if (colFilters.stockStatus !== 'All') {
      const quantity = item.quantity;
      if (colFilters.stockStatus === 'หมดสต๊อก' && quantity >= 1) return false;
      if (colFilters.stockStatus === 'วิกฤต' && (quantity < 1 || quantity >= 10)) return false;
      if (colFilters.stockStatus === 'ใกล้หมด' && (quantity < 10 || quantity >= 20)) return false;
      if (colFilters.stockStatus === 'พร้อมใช้งาน' && quantity < 40) return false;
      if (colFilters.stockStatus === 'ปกติ' && (quantity < 20 || quantity >= 40)) return false;
    }

    return true;
  }).sort((a, b) => {
    // 4. Sorting
    if (advancedFilters.sortBy === 'name-asc') {
      return a.name.localeCompare(b.name, 'th');
    }
    if (advancedFilters.sortBy === 'name-desc') {
      return b.name.localeCompare(a.name, 'th');
    }
    if (advancedFilters.sortBy === 'stock-desc') {
      return b.quantity - a.quantity;
    }
    if (advancedFilters.sortBy === 'stock-asc') {
      return a.quantity - b.quantity;
    }
    if (advancedFilters.sortBy === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    return 0;
  });

  const totalPages = Math.ceil((filteredItems.length || 0) / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const fetchData = useCallback(async () => {
    try {
      await Promise.all([
        fetchItems({ search }),
        fetchStats()
      ]);
      setCurrentPage(1);
    } catch {
      notify('ไม่สามารถโหลดข้อมูลอุปกรณ์ได้', 'error');
    }
  }, [search, fetchItems, fetchStats, notify]);

  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get('filter') || 'all';
  const [prevFilter, setPrevFilter] = useState('all');
  if (prevFilter !== filterParam) {
    setPrevFilter(filterParam);
    if (filterParam === 'all' || filterParam === 'critical' || filterParam === 'low' || filterParam === 'normal') {
      setActiveFilter(filterParam);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        model: item.model || '',
        description: item.description || '',
        quantity: item.quantity,
        min_stock: item.min_stock,
        requires_sn: item.requires_sn
      });
      setSerialNumbers([]);
      setSnInputMode('individual');
      setImagePreview(item.image_path ? `${UPLOAD_URL}/uploads/${item.image_path}` : null);
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        model: '',
        description: '',
        quantity: 0,
        min_stock: 10,
        requires_sn: 1
      });
      setSerialNumbers([]);
      setSnInputMode('individual');
      setImagePreview(null);
    }
    setSelectedImage(null);
    setShowModal(true);
  };

  const handleOpenInvSnModal = async (item: InventoryItem) => {
    try {
      const instances = await inventoryApi.getInstances(item.id);
      const sns = instances.map(i => i.serial_number).filter((s): s is string => !!s);
      setInvSnModal({
        isOpen: true,
        item: item,
        existingSns: sns
      });
    } catch {
      notify('ไม่สามารถดึงข้อมูล Serial Numbers ได้', 'error');
    }
  };

  const handleQuantityChange = (val: number) => {
    const newQty = Math.max(0, val);
    setFormData({ ...formData, quantity: newQty });
    
    // Shrink array if new quantity is less than current length
    setSerialNumbers(prev => prev.slice(0, newQty));

    // Auto switch mode
    if (newQty > 10) {
      setSnInputMode('bulk');
    } else if (newQty > 0 && newQty <= 10) {
      setSnInputMode('individual');
    }
  };

  const handleSnChange = (index: number, value: string) => {
    setSerialNumbers(prev => {
      const next = [...prev];
      // Ensure array is large enough if we skip indexes
      while (next.length <= index) next.push('');
      next[index] = value;
      return next;
    });
  };

  const handleBulkSnChange = (text: string) => {
    const lines = text.split('\n');
    setSerialNumbers(lines.slice(0, formData.quantity));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedModel = formData.model.trim();
    const trimmedDescription = formData.description.trim();
    const qty = Math.max(0, Math.floor(formData.quantity) || 0);
    const minStk = Math.max(0, Math.floor(formData.min_stock) || 0);

    if (!trimmedName) {
      notify('กรุณากรอกชื่ออุปกรณ์', 'error');
      return;
    }

    if (trimmedName.length > 100) {
      notify('ชื่ออุปกรณ์ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedModel.length > 100) {
      notify('รุ่นอุปกรณ์ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedDescription.length > 1000) {
      notify('รายละเอียดอุปกรณ์ยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)', 'error');
      return;
    }

    setSaving(true);
    const data = new FormData();
    data.append('name', trimmedName);
    data.append('model', trimmedModel);
    data.append('description', trimmedDescription);
    data.append('quantity', qty.toString());
    data.append('min_stock', minStk.toString());
    data.append('requires_sn', formData.requires_sn.toString());
    
    // Add serial numbers
    const validSns = serialNumbers.map(sn => sn.trim()).filter(sn => sn !== '');
    if (validSns.length > 0) {
      data.append('serial_numbers', JSON.stringify(validSns));
    }

    if (selectedImage) {
      data.append('image', selectedImage);
    }

    try {
      if (editingItem) {
        await inventoryApi.update(editingItem.id, data);
        notify('อัปเดตข้อมูลอุปกรณ์เรียบร้อยแล้ว');
      } else {
        await inventoryApi.create(data);
        notify('เพิ่มอุปกรณ์ใหม่เข้าสู่ระบบเรียบร้อยแล้ว');
      }
      setShowModal(false);
      fetchData();
      refreshUnreadCounts();
    } catch {
      notify('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async (id: number) => {
    if (confirm('คุณต้องการลบอุปกรณ์นี้ออกจากระบบจริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      try {
        await inventoryApi.delete(id);
        notify('ลบอุปกรณ์เรียบร้อยแล้ว');
        fetchData();
        refreshUnreadCounts();
      } catch {
        notify('ไม่สามารถลบอุปกรณ์ได้ อาจมีการใช้งานอยู่ในประวัติการเบิก', 'error');
      }
    }
  };

  const getStockStatusColor = (quantity: number) => {
    if (quantity < 10) return '#ef4444';
    if (quantity < 20) return '#f59e0b';
    if (quantity >= 40) return '#10b981';
    return '#3b82f6';
  };

  const getStockStatusBadge = (quantity: number) => {
    const badgeStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`,
      padding: '2px 6px',
      borderRadius: '20px',
      fontSize: '0.6rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap'
    });

    if (quantity < 1) return <span style={badgeStyle('#fee2e2', '#ef4444', '#fecaca')}>หมดสต๊อก</span>;
    if (quantity < 10) return <span style={badgeStyle('#fee2e2', '#ef4444', '#fecaca')}>วิกฤต</span>;
    if (quantity < 20) return <span style={badgeStyle('#fef3c7', '#d97706', '#fde68a')}>ใกล้หมด</span>;
    if (quantity >= 40) return <span style={badgeStyle('#d1fae5', '#10b981', '#a7f3d0')}>พร้อมใช้งาน</span>;
    return <span style={badgeStyle('#e0f7fa', '#29b6f6', '#b2ebf2')}>ปกติ</span>;
  };

  return (
    <div className="inventory-page" style={{ padding: '2rem 2.5rem', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-title">
          <h2>จัดการอุปกรณ์และสต็อก</h2>
          <p>เพิ่ม แก้ไข และติดตามจำนวนอุปกรณ์คงเหลือในระบบ</p>
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
          <Button variant="primary" style={{ padding: '12px 24px' }} onClick={() => handleOpenModal()}>
            <Plus size={20} /> เพิ่มอุปกรณ์ใหม่
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="70px" />
          ))
        ) : (
          <>
            <div 
              className={`stats-card card-all ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
            >
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Boxes size={22} />
              </div>
              <div>
                <div className="stat-value">{stats.total_items || 0}</div>
                <div className="stat-label">อุปกรณ์ทั้งหมด</div>
              </div>
            </div>

            <div 
              className={`stats-card card-critical ${activeFilter === 'critical' ? 'active' : ''}`}
              onClick={() => { setActiveFilter('critical'); setCurrentPage(1); }}
            >
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                <XCircle size={22} />
              </div>
              <div>
                <div className="stat-value">{stats.critical || 0}</div>
                <div className="stat-label">หมดสต๊อก</div>
              </div>
            </div>

            <div 
              className={`stats-card card-low ${activeFilter === 'low' ? 'active' : ''}`}
              onClick={() => { setActiveFilter('low'); setCurrentPage(1); }}
            >
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                <Zap size={22} />
              </div>
              <div>
                <div className="stat-value">{stats.warning || 0}</div>
                <div className="stat-label">ใกล้หมด</div>
              </div>
            </div>

            <div 
              className={`stats-card card-normal ${activeFilter === 'normal' ? 'active' : ''}`}
              onClick={() => { setActiveFilter('normal'); setCurrentPage(1); }}
            >
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <Check size={22} />
              </div>
              <div>
                <div className="stat-value">{stats.optimal || 0}</div>
                <div className="stat-label">พร้อมใช้งาน</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="search-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} className="search-icon" style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="search-input"
              style={{ paddingLeft: '44px', height: '40px' }}
              placeholder="ค้นหาชื่อ, รุ่น หรือพิมพ์คำภาษาไทยที่อยู่ในคำอธิบาย..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            {/* Stock Status Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>สถานะสต็อก:</span>
              <select
                value={advancedFilters.stockStatus}
                onChange={(e) => { setAdvancedFilters({...advancedFilters, stockStatus: e.target.value}); setCurrentPage(1); }}
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
                  minWidth: '140px'
                }}
              >
                <option value="All">ทั้งหมด</option>
                <option value="OptimalStock">สต็อกปกติ (พร้อมใช้งาน)</option>
                <option value="LowStock">สินค้าใกล้หมด (Low Stock)</option>
                <option value="OutOfStock">สินค้าหมด (Out of Stock)</option>
              </select>
            </div>

            {/* Model Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>รุ่น/โมเดล:</span>
              <select
                value={advancedFilters.model}
                onChange={(e) => { setAdvancedFilters({...advancedFilters, model: e.target.value}); setCurrentPage(1); }}
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
                  minWidth: '120px',
                  maxWidth: '200px'
                }}
              >
                <option value="All">ทั้งหมด</option>
                {uniqueModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Sort By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>เรียงตาม:</span>
              <select
                value={advancedFilters.sortBy}
                onChange={(e) => { setAdvancedFilters({...advancedFilters, sortBy: e.target.value}); setCurrentPage(1); }}
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
                  minWidth: '160px'
                }}
              >
                <option value="name-asc">ชื่อพัสดุ (ก - ฮ)</option>
                <option value="name-desc">ชื่อพัสดุ (ฮ - ก)</option>
                <option value="stock-desc">จำนวนสต็อก (มาก ไป น้อย)</option>
                <option value="stock-asc">จำนวนสต็อก (น้อย ไป มาก)</option>
                <option value="newest">อัปเดตล่าสุด</option>
              </select>
            </div>

            {/* Reset Button */}
            {(advancedFilters.stockStatus !== 'All' || advancedFilters.model !== 'All' || advancedFilters.sortBy !== 'name-asc' || activeFilter !== 'all' || search !== '') && (
              <button
                type="button"
                onClick={() => {
                  setAdvancedFilters({
                    stockStatus: 'All',
                    model: 'All',
                    sortBy: 'name-asc'
                  });
                  setActiveFilter('all');
                  setSearch('');
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
                  fontFamily: 'inherit',
                  marginLeft: 'auto'
                }}
              >
                <X size={14} /> ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Grid Card Layout vs Table Layout */}
      {listLoading ? (
        viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height="260px" />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height="50px" />
            ))}
          </div>
        )
      ) : (
        <>
          {currentItems.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              padding: '4rem 2rem', 
              textAlign: 'center', 
              color: 'var(--text-muted)',
              width: '100%'
            }}>
              <Boxes size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <p style={{ fontSize: '1rem', fontWeight: 500 }}>
                {search ? 'ไม่พบข้อมูลอุปกรณ์ตามคำค้นหา' : 'ไม่พบอุปกรณ์ในสถานะนี้'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {currentItems.map((item) => (
                <div key={item.id} className="inventory-card" style={{ display: 'flex', flexDirection: 'column', padding: '0', height: '100%', overflow: 'hidden', position: 'relative' }}>
                  {/* Action overlay - fixed position */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '8px', 
                    right: '8px', 
                    display: 'flex', 
                    gap: '6px',
                    zIndex: 2
                  }}>
                    <button 
                      type="button"
                      className="card-action-btn card-action-btn-primary" 
                      title="จัดการ Serial Numbers"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInvSnModal(item);
                      }}
                    >
                      <Tag size={16} />
                    </button>
                    <button 
                      type="button"
                      className="card-action-btn" 
                      title="แก้ไข"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(item);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      type="button"
                      className="card-action-btn-danger" 
                      title="ลบ"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <Trash size={16} />
                    </button>
                  </div>

                  {/* Top: Image (Full width) */}
                  <div className="inventory-image-container" style={{ width: '100%', height: '140px', flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                    {item.image_path ? (
                      <img 
                        src={`${UPLOAD_URL}/uploads/${item.image_path}`} 
                        alt={item.name} 
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={32} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <div className="line-clamp-2" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.2 }} title={item.name}>
                      {item.name}
                    </div>
                    <div className="line-clamp-1" style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }} title={item.model}>
                      {item.model || '-'}
                    </div>
                    
                    {/* Description */}
                    <p className="line-clamp-1" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '4px 0 0 0', opacity: 0.7 }}>
                      {item.description || '-'}
                    </p>

                    {/* Bottom Area (Fixed to bottom) */}
                    <div style={{ 
                      marginTop: 'auto', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderTop: '1px solid var(--border)',
                      paddingTop: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ 
                          fontSize: '1rem', 
                          fontWeight: 800, 
                          color: getStockStatusColor(item.quantity),
                          lineHeight: 1
                        }}>
                          {item.quantity}
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)' }}>ชิ้น</span>
                      </div>
                      {getStockStatusBadge(item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card style={{ padding: 0 }}>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '6%', whiteSpace: 'nowrap' }}>รูปภาพ</th>
                      <th style={{ width: '24%', whiteSpace: 'nowrap' }}>ชื่ออุปกรณ์</th>
                      <th style={{ width: '18%', whiteSpace: 'nowrap' }}>รุ่น / แบรนด์</th>
                      <th style={{ width: '22%', whiteSpace: 'nowrap' }}>คำอธิบาย</th>
                      <th style={{ width: '10%', whiteSpace: 'nowrap' }}>จำนวนคงเหลือ</th>
                      <th style={{ width: '10%', whiteSpace: 'nowrap' }}>สถานะสต็อก</th>
                      <th style={{ width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
                    </tr>
                    <tr className="filter-row" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <th style={{ padding: '4px 8px' }}></th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="ค้นหาชื่อ..." 
                          style={filterInputStyle}
                          value={colFilters.name}
                          onChange={(e) => setColFilters({ ...colFilters, name: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="รุ่น/แบรนด์..." 
                          style={filterInputStyle}
                          value={colFilters.model}
                          onChange={(e) => setColFilters({ ...colFilters, model: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="คำอธิบาย..." 
                          style={filterInputStyle}
                          value={colFilters.description}
                          onChange={(e) => setColFilters({ ...colFilters, description: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <input 
                          type="number" 
                          placeholder="คงเหลือ..." 
                          style={{ ...filterInputStyle, textAlign: 'center' }}
                          value={colFilters.quantity}
                          onChange={(e) => setColFilters({ ...colFilters, quantity: e.target.value })}
                        />
                      </th>
                      <th style={{ padding: '4px 8px' }}>
                        <select
                          style={filterInputStyle}
                          value={colFilters.stockStatus}
                          onChange={(e) => setColFilters({ ...colFilters, stockStatus: e.target.value })}
                        >
                          <option value="All">ทั้งหมด</option>
                          <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                          <option value="ปกติ">ปกติ</option>
                          <option value="ใกล้หมด">ใกล้หมด</option>
                          <option value="วิกฤต">วิกฤต</option>
                          <option value="หมดสต๊อก">หมดสต๊อก</option>
                        </select>
                      </th>
                      <th style={{ padding: '4px 8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                            {item.image_path ? (
                              <img 
                                src={`${UPLOAD_URL}/uploads/${item.image_path}`} 
                                alt={item.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <ImageIcon size={20} color="#cbd5e1" />
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }} title={item.name}>
                          <div className="line-clamp-1">{item.name}</div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#64748b' }} title={item.model}>
                          <div className="line-clamp-1">{item.model || '-'}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} title={item.description}>
                          <div className="line-clamp-1">{item.description || '-'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ 
                              fontSize: '1.05rem', 
                              fontWeight: 800, 
                              color: getStockStatusColor(item.quantity)
                            }}>
                              {item.quantity}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ชิ้น</span>
                          </div>
                        </td>
                        <td>{getStockStatusBadge(item.quantity)}</td>
                        <td style={{ textAlign: 'right', overflow: 'visible', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              icon={<Zap size={16} />} 
                              title="จัดการ Serial Numbers"
                              onClick={() => handleOpenInvSnModal(item)}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              icon={<Pencil size={16} />} 
                              title="แก้ไข"
                              onClick={() => handleOpenModal(item)}
                            />
                            <Button 
                              variant="danger" 
                              size="sm" 
                              icon={<Trash size={16} />} 
                              title="ลบ"
                              onClick={() => handleDelete(item.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Pagination */}
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
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{currentPage} / {totalPages}</span>
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

      {/* Item Modal Dialog */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <h3>{editingItem ? 'แก้ไขข้อมูลอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '2rem' }}>
                <div>
                  <Input 
                    label="ชื่ออุปกรณ์"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="เช่น จอ Monitor, Keyboard, RAM..."
                    disabled={saving}
                  />
                  <Input 
                    label="รุ่น / แบรนด์"
                    maxLength={100}
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                    placeholder="เช่น Dell UltraSharp, Logitech G Pro..."
                    disabled={saving}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <ImageIcon size={16} color="var(--primary)" /> รูปภาพอุปกรณ์
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {imagePreview ? (
                      <div className="image-preview-card" style={{ width: '140px', height: '140px' }}>
                        <img src={imagePreview} alt="preview" />
                        <button 
                          type="button" 
                          className="remove-btn" 
                          onClick={() => { setSelectedImage(null); setImagePreview(null); }} 
                          disabled={saving}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="image-uploader-box" style={{ width: '100%', height: '140px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                        <Upload size={24} style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>คลิกเพื่อเลือกรูปภาพ</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>รองรับไฟล์ JPG, PNG</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={handleImageChange} 
                          disabled={saving} 
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <Input 
                  label="จำนวนคงเหลือเริ่มต้น"
                  type="number"
                  required
                  min="0"
                  value={formData.quantity}
                  onChange={e => handleQuantityChange(parseInt(e.target.value) || 0)}
                  disabled={saving}
                />
                <Input 
                  label="จำนวนขั้นต่ำ (แจ้งเตือน)"
                  type="number"
                  required
                  min="1"
                  value={formData.min_stock}
                  onChange={e => setFormData({...formData, min_stock: parseInt(e.target.value) || 10})}
                  disabled={saving}
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', background: 'var(--primary-light)', padding: '12px', borderRadius: '10px', marginBottom: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  id="requires_sn" 
                  checked={formData.requires_sn === 1}
                  onChange={e => setFormData({...formData, requires_sn: e.target.checked ? 1 : 0})}
                  style={{ width: '20px', height: '20px', cursor: saving ? 'not-allowed' : 'pointer' }}
                  disabled={saving}
                />
                <label htmlFor="requires_sn" style={{ margin: 0, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: 'var(--primary)' }}>
                  สินค้านี้ต้องติดตามด้วย Serial Number (S/N)
                </label>
              </div>

              {/* Serial Numbers Section */}
              {formData.quantity > 0 && !editingItem && formData.requires_sn === 1 && (
                <div className="form-group" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      หมายเลข Serial Number ({serialNumbers.filter(s => s.trim()).length}/{formData.quantity})
                    </label>
                    <div style={{ display: 'flex', background: 'var(--border)', padding: '2px', borderRadius: '6px' }}>
                      <button 
                        type="button"
                        onClick={() => setSnInputMode('individual')}
                        style={{ 
                          padding: '4px 8px', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                          background: snInputMode === 'individual' ? 'var(--bg-card)' : 'transparent',
                          color: 'var(--text-main)',
                          fontWeight: snInputMode === 'individual' ? 700 : 500,
                          boxShadow: snInputMode === 'individual' ? 'var(--shadow-sm)' : 'none'
                        }}
                      >
                        กรอกแยกช่อง
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSnInputMode('bulk')}
                        style={{ 
                          padding: '4px 8px', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                          background: snInputMode === 'bulk' ? 'var(--bg-card)' : 'transparent',
                          color: 'var(--text-main)',
                          fontWeight: snInputMode === 'bulk' ? 700 : 500,
                          boxShadow: snInputMode === 'bulk' ? 'var(--shadow-sm)' : 'none'
                        }}
                      >
                        วางข้อความ
                      </button>
                    </div>
                  </div>

                  {snInputMode === 'individual' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {Array.from({ length: formData.quantity }).map((_, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          <input 
                            type="text"
                            placeholder={`S/N #${idx + 1}`}
                            value={serialNumbers[idx] || ''}
                            onChange={(e) => handleSnChange(idx, e.target.value)}
                            style={{ 
                              width: '100%', padding: '8px 12px', fontSize: '0.8rem', border: '1px solid var(--border)', 
                              background: 'var(--bg-card)', color: 'var(--text-main)',
                              borderRadius: '6px', outline: 'none'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <textarea 
                        placeholder="วาง Serial Numbers ที่นี่ (1 หมายเลขต่อ 1 บรรทัด)"
                        value={serialNumbers.join('\n')}
                        onChange={(e) => handleBulkSnChange(e.target.value)}
                        rows={6}
                        style={{ 
                          width: '100%', padding: '10px', fontSize: '0.85rem', border: '1px solid var(--border)', 
                          background: 'var(--bg-card)', color: 'var(--text-main)',
                          borderRadius: '6px', outline: 'none', fontFamily: 'monospace'
                        }}
                      />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        * ระบบจะรับข้อมูลสูงสุด {formData.quantity} บรรทัดตามจำนวนที่ระบุไว้
                      </p>
                    </div>
                  )}
                </div>
              )}

              <TextArea 
                label="คำอธิบาย / รายละเอียดเพิ่มเติม"
                rows={3}
                maxLength={1000}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="รายละเอียดสเปก หรือข้อมูลเพิ่มเติม (สามารถใส่ชื่อเรียกภาษาไทยเพื่อให้ค้นหาเจอได้ง่าย)..."
                disabled={saving}
              />

              <div className="modal-actions">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>ยกเลิก</Button>
                <Button type="submit" variant="primary" loading={saving} disabled={saving}>
                  {editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มอุปกรณ์'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProvideSnModal 
        isOpen={invSnModal.isOpen}
        onClose={() => setInvSnModal({ ...invSnModal, isOpen: false })}
        onSuccess={() => fetchData()}
        title={`จัดการ Serial Numbers: ${invSnModal.item?.name}`}
        totalQuantity={invSnModal.item?.quantity || 0}
        existingSns={invSnModal.existingSns}
        onSubmit={async (newSns) => {
          if (invSnModal.item) {
            await inventoryApi.addSerialNumbers(invSnModal.item.id, newSns);
          }
        }}
      />
    </div>
  );
};

export default InventoryList;
