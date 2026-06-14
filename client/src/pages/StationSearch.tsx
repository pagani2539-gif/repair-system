import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { stationApi, UPLOAD_URL } from '../api';
import { useApi } from '../hooks/useApi';
import { useNotification } from '../components/Layout';
import { Button } from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import type { Station, InventoryTransaction } from '../types';
import type { TableColumn, TableAction } from '../types/table.types';
import {
  MapPin,
  Tag,
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  History as HistoryIcon,
  Info,
  Activity,
  Globe,
  Navigation,
  RefreshCw,
  Search,
  Map as MapIcon,
  Wrench,
  X,
  User,
  Calendar,
  TrendingUp,
  Package,
  Shield,
  QrCode
} from 'lucide-react';
import { provincesByRegion, getRegionFromProvince } from '../utils/thaiProvinces';
import { formatDateTimeThai } from '../utils/formatDate';

type StationFormData = {
  name: string;
  station_type: string;
  custom_type: string;
  highway_no: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'BOTH' | 'NONE';
  region: string;
  province: string;
  responsible_person: string;
};

const EMPTY_FORM: StationFormData = {
  name: '', station_type: 'WEIGH_STATION', custom_type: '',
  highway_no: '', direction: 'INBOUND', region: '', province: '', responsible_person: ''
};

const REGIONS = ['ภาคเหนือ', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคกลาง', 'ภาคตะวันออก', 'ภาคตะวันตก', 'ภาคใต้', 'กรุงเทพและปริมณฑล'];
const STATION_TYPE_OPTIONS = [
  { value: 'WEIGH_STATION', label: 'ด่านชั่งหลัก (WIM)' },
  { value: 'CHECK_POINT', label: 'จุดตรวจน้ำหนัก (Check Point)' },
  { value: 'SPOT_CHECK', label: 'จุดจอดพักรถ (Spot Check)' },
  { value: 'OTHER', label: 'อื่นๆ (ระบุเอง)' }
];
import BaseDataTable from '../components/tables/BaseDataTable';
import TablePagination from '../components/tables/TablePagination';
import { useTableUrlState } from '../hooks/useTableUrlState';
import { useAuth } from '../contexts/AuthContext';

const StationSearch: React.FC = () => {
  const { notify, confirm } = useNotification();
  const { hasPermission } = useAuth();
  const flatProvinceOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: '-- เลือกจังหวัด --', value: '' }];
    Object.entries(provincesByRegion).forEach(([regionName, provinces]) => {
      provinces.forEach(p => {
        opts.push({ label: `${p} (${regionName})`, value: p });
      });
    });
    return opts;
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const { urlState, setTableState } = useTableUrlState(20);
  const [now] = useState(() => Date.now());

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedStationId = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : undefined;

  const [stations, setStations] = useState<Station[]>([]);
  const [stationModal, setStationModal] = useState<{ open: boolean; mode: 'create' | 'edit'; station: Station | null }>({ open: false, mode: 'create', station: null });
  const [formData, setFormData] = useState<StationFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ลบ error เมื่อผู้ใช้แก้ค่า
  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // เปลี่ยนค่าฟอร์ม + ล้าง error ของฟิลด์นั้น
  const updateField = <K extends keyof StationFormData>(field: K, value: StationFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearFieldError(field as string);
  };

  // เปลี่ยนจังหวัด — อนุมานภาคให้ผู้ใช้ตรวจสอบ
  const handleProvinceChange = (province: string) => {
    setFormData(prev => {
      const derivedRegion = getRegionFromProvince(province);
      return {
        ...prev,
        province,
        region: derivedRegion || prev.region
      };
    });
    clearFieldError('province');
    if (getRegionFromProvince(province)) clearFieldError('region');
  };
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrStation, setQrStation] = useState<Station | null>(null);

  const { data: details, loading: detailsLoading, request: fetchDetails } = useApi(stationApi.getDetails);

  const loadStations = useCallback(async () => {
    try {
      const list = await stationApi.getUniqueList();
      setStations(list);
    } catch {
      notify('ไม่สามารถโหลดรายชื่อสถานีได้', 'error');
    }
  }, [notify]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadStations]);

  useEffect(() => {
    if (selectedStationId) {
      fetchDetails({ station_id: selectedStationId });
    }
  }, [selectedStationId, fetchDetails]);

  const openCreateModal = () => {
    setFormData(EMPTY_FORM);
    setFieldErrors({});
    setStationModal({ open: true, mode: 'create', station: null });
  };

  const openEditModal = (st: Station) => {
    const isStandardType = STATION_TYPE_OPTIONS.some(o => o.value === st.station_type && o.value !== 'OTHER');
    setFormData({
      name: st.name,
      station_type: isStandardType ? st.station_type : 'OTHER',
      custom_type: isStandardType ? '' : st.station_type,
      highway_no: st.highway_no,
      direction: st.direction,
      region: st.region,
      province: st.province,
      responsible_person: st.responsible_person || ''
    });
    setFieldErrors({});
    setStationModal({ open: true, mode: 'edit', station: st });
  };

  const closeStationModal = () => {
    setStationModal({ open: false, mode: 'create', station: null });
    setFieldErrors({});
  };

  const handleStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = formData.station_type === 'OTHER' ? formData.custom_type.trim() : formData.station_type;

    // === Field-level validation ===
    const errors: Record<string, string> = {};

    const nameTrim = formData.name.trim();
    if (!nameTrim) errors.name = 'กรุณากรอกชื่อสถานี';
    else if (nameTrim.length < 3) errors.name = 'ชื่อสถานีสั้นเกินไป (อย่างน้อย 3 ตัวอักษร)';
    else if (nameTrim.length > 100) errors.name = 'ชื่อสถานียาวเกินไป (ไม่เกิน 100 ตัวอักษร)';

    if (!formData.station_type) errors.station_type = 'กรุณาเลือกประเภทสถานี';
    else if (formData.station_type === 'OTHER' && !formData.custom_type.trim()) errors.custom_type = 'กรุณาระบุประเภทสถานี';

    const responsibleTrim = formData.responsible_person.trim();
    if (!responsibleTrim) errors.responsible_person = 'กรุณาระบุชื่อผู้รับผิดชอบสถานี';
    else if (responsibleTrim.length < 2) errors.responsible_person = 'ชื่อผู้รับผิดชอบสั้นเกินไป (อย่างน้อย 2 ตัวอักษร)';
    else if (responsibleTrim.length > 100) errors.responsible_person = 'ชื่อผู้รับผิดชอบยาวเกินไป (ไม่เกิน 100 ตัวอักษร)';

    if (!formData.province.trim()) errors.province = 'กรุณาเลือกจังหวัด';
    if (!formData.region) errors.region = 'กรุณาเลือกภูมิภาค';

    const highwayTrim = formData.highway_no.trim();
    if (!highwayTrim) errors.highway_no = 'กรุณาระบุเส้นทางหลวง';
    else if (highwayTrim.length > 20) errors.highway_no = 'เส้นทางหลวงยาวเกินไป';

    if (!formData.direction) errors.direction = 'กรุณาเลือกทิศทาง';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      notify('กรุณาตรวจสอบและกรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    try {
      const payload = {
        name: nameTrim,
        station_type: finalType,
        highway_no: highwayTrim,
        direction: formData.direction,
        region: formData.region,
        province: formData.province.trim(),
        responsible_person: responsibleTrim
      };

      if (stationModal.mode === 'edit' && stationModal.station) {
        await stationApi.update(stationModal.station.id, payload);
        notify('อัปเดตข้อมูลสถานีเรียบร้อยแล้ว');
      } else {
        await stationApi.create(payload);
        notify('เพิ่มสถานีใหม่เรียบร้อยแล้ว');
      }

      closeStationModal();
      loadStations();
      if (selectedStationId) fetchDetails({ station_id: selectedStationId });
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      notify(error.response?.data?.error || error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced Filtering Logic
  const filteredData = useMemo(() => {
    return (stations || []).filter(st => {
      // Text Search
      if (urlState.search) {
        const s = urlState.search.toLowerCase();
        const matchText = st.name.toLowerCase().includes(s) || 
                          st.code.toLowerCase().includes(s) || 
                          st.province.toLowerCase().includes(s);
        if (!matchText) return false;
      }
      
      // Province Filter
      if (urlState.filters.province && urlState.filters.province !== 'All') {
        if (st.province !== urlState.filters.province) return false;
      }

      // Type Filter
      if (urlState.filters.type && urlState.filters.type !== 'All') {
        if (st.station_type !== urlState.filters.type) return false;
      }

      return true;
    }).sort((a, b) => b.id - a.id);
  }, [stations, urlState.search, urlState.filters]);

  // Derived filter options
  const provinces = useMemo(() => ['All', ...new Set(stations.map(s => s.province))].sort(), [stations]);
  const stationTypes = [
    { label: 'ทั้งหมด', value: 'All' },
    { label: 'ด่านชั่งหลัก (WIM)', value: 'WEIGH_STATION' },
    { label: 'จุดตรวจน้ำหนัก (Check Point)', value: 'CHECK_POINT' },
    { label: 'จุดจอดพักรถ (Spot Check)', value: 'SPOT_CHECK' }
  ];

  const handleDeleteStation = async (st: Station) => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบสถานี',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบสถานี "${st.name}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      variant: 'danger'
    });
    if (isConfirmed) {
      try {
        await stationApi.delete(st.id);
        notify('ลบสถานีสำเร็จ', 'success');
        loadStations();
      } catch (err) {
        const error = err as Error;
        notify(error.message || 'ไม่สามารถลบสถานีได้', 'error');
      }
    }
  };

  const indexOfLastItem = urlState.page * urlState.pageSize;
  const indexOfFirstItem = indexOfLastItem - urlState.pageSize;
  const paginatedData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const formatRelativeTime = (iso: string): string => {
    const diff = now - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'วันนี้';
    if (days === 1) return 'เมื่อวาน';
    if (days < 7) return `${days} วันที่แล้ว`;
    if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ก่อน`;
    if (days < 365) return `${Math.floor(days / 30)} เดือนก่อน`;
    return `${Math.floor(days / 365)} ปีก่อน`;
  };

  // Filter data by selected date range
  const filteredDetails = useMemo(() => {
    if (!details) return null;
    if (dateRange === 'all') {
      return {
        repairs: details.repairs || [],
        claims: details.claims || [],
        withdrawals: details.withdrawals || [],
        transactions: details.transactions || []
      };
    }
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const inRange = (iso: string) => new Date(iso).getTime() >= cutoff;
    return {
      repairs: (details.repairs || []).filter(r => inRange(r.created_at)),
      claims: (details.claims || []).filter(c => inRange(c.created_at)),
      withdrawals: (details.withdrawals || []).filter(w => inRange(w.created_at)),
      transactions: (details.transactions || []).filter(t => inRange(t.created_at))
    };
  }, [details, dateRange, now]);

  // Top 3 most broken devices in this station (within date range)
  const topBrokenDevices = useMemo(() => {
    if (!filteredDetails) return [];
    const counter = new Map<string, number>();
    filteredDetails.repairs.forEach(r => {
      if (r.device_name) counter.set(r.device_name, (counter.get(r.device_name) || 0) + 1);
    });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [filteredDetails]);

  const activeAssets = useMemo(() => {
    if (!details || !details.withdrawals) return [];
    const assetsMap = new Map<number, { id: number; name: string; model: string; quantity: number; image?: string; status: 'NORMAL' | 'REPAIRING' }>();
    details.withdrawals.forEach(w => {
      if (w.items) {
        w.items.forEach(item => {
          const invId = item.inventory_id;
          const existing = assetsMap.get(invId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            assetsMap.set(invId, {
              id: invId,
              name: item.item_name || 'ไม่ระบุชื่อพัสดุ',
              model: item.item_model || '—',
              quantity: item.quantity,
              image: item.item_image,
              status: 'NORMAL'
            });
          }
        });
      }
    });
    const activeRepairs = (details.repairs || []).filter(r => r.status !== 'เสร็จสิ้น');
    assetsMap.forEach(asset => {
      const isUnderRepair = activeRepairs.some(r => 
        r.device_name.toLowerCase().includes(asset.name.toLowerCase()) || 
        asset.name.toLowerCase().includes(r.device_name.toLowerCase())
      );
      if (isUnderRepair) {
        asset.status = 'REPAIRING';
      }
    });
    return Array.from(assetsMap.values());
  }, [details]);

  const columns: TableColumn<Station>[] = [
    { 
      id: 'code', header: 'รหัสสถานี', accessor: 'code', priority: 1, width: '140px',
      render: (val) => <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '8px' }}><Tag size={14} />{val}</div>
    },
    { 
      id: 'name', header: 'ชื่อสถานี / จุดตรวจ', accessor: 'name', priority: 1, width: 'auto',
      render: (val) => <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}><MapPin size={16} color="var(--danger)" />{val}</div>
    },
    { 
      id: 'province', header: 'จังหวัด', accessor: 'province', priority: 2, width: '150px',
      render: (val) => <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-muted)' }}><Globe size={14} />{val}</div>
    },
    {
      id: 'type', header: 'ประเภทหน่วยงาน', accessor: 'station_type', priority: 1, width: '220px',
      render: (val) => {
        const typeLabel = stationTypes.find(t => t.value === val)?.label || val;
        return <span className="badge glass-card" style={{ border: '1px solid var(--primary-light)', color: 'var(--primary)', fontWeight: 800 }}>{typeLabel}</span>;
      }
    },
    {
      id: 'responsible', header: 'ผู้รับผิดชอบ', accessor: 'responsible_person', priority: 2, width: '170px',
      render: (val) => {
        if (val && String(val).trim() !== '') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={13} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(val)}>{val}</span>
            </div>
          );
        }
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', background: 'var(--danger-light)', color: 'var(--danger)',
            borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800
          }} title="กรุณากดแก้ไขเพื่อระบุผู้รับผิดชอบ">
            ⚠ ยังไม่ระบุ
          </span>
        );
      }
    },
    { id: 'status', header: 'สถานะระบบ', accessor: () => 'ปกติ', priority: 1, width: '120px', align: 'center', render: () => <span className="badge badge-success" style={{ width: '100px', textAlign: 'center', fontWeight: 800 }}>พร้อมใช้งาน</span> }
  ];

  const actions: TableAction<Station>[] = [
    { id: 'view', label: 'เจาะลึกข้อมูล', icon: <HistoryIcon size={14} />, onClick: (st) => navigate(`/stations?id=${st.id}&q=${encodeURIComponent(st.name)}`) },
    { id: 'edit', label: 'แก้ไขข้อมูล', icon: <Pencil size={14} />, onClick: openEditModal, hidden: () => !hasPermission('manage.stations') },
    { id: 'delete', label: 'ลบทิ้ง', icon: <Trash2 size={14} />, variant: 'danger', onClick: handleDeleteStation, hidden: () => !hasPermission('delete.stations') }
  ];

  const renderDetailDrawer = useCallback((st: Station) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
      <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'linear-gradient(135deg, var(--primary-light), transparent)' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '18px', color: 'var(--danger)', boxShadow: 'var(--elevation-2)' }}><MapPin size={40} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px' }}>ข้อมูลสรุปของสถานี</div>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{st.name}</h3>
          <p style={{ margin: '4px 0 6px', color: 'var(--text-muted)', fontWeight: 700 }}>รหัสประจำสถานี: {st.code}</p>
          {st.created_at && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, background: 'rgba(255,255,255,0.5)', padding: '3px 10px', borderRadius: '6px' }}>
              <Calendar size={12} /> สร้างเมื่อ {formatDateTimeThai(st.created_at)}
            </div>
          )}
        </div>
      </div>

      <section>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>
          <Info size={20} color="var(--primary)" /> รายละเอียดเชิงเทคนิค
        </h4>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={18} color="var(--text-muted)" />
              <span style={{ fontWeight: 600 }}>จังหวัด / ภูมิภาค</span>
            </div>
            <span style={{ fontWeight: 800 }}>{st.province} ({st.region})</span>
          </div>
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Navigation size={18} color="var(--text-muted)" />
              <span style={{ fontWeight: 600 }}>เส้นทางทางหลวง / ทิศทาง</span>
            </div>
            <span style={{ fontWeight: 800 }}>ทล.{st.highway_no} ({st.direction})</span>
          </div>
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={18} color="var(--text-muted)" />
              <span style={{ fontWeight: 600 }}>รูปแบบสถานี</span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{st.station_type}</span>
          </div>
          {/* ผู้รับผิดชอบ */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={18} color="var(--text-muted)" />
              <span style={{ fontWeight: 600 }}>ผู้รับผิดชอบสถานี</span>
            </div>
            {st.responsible_person && st.responsible_person.trim() !== '' ? (
              <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{st.responsible_person}</span>
            ) : (
              <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.85rem' }}>⚠ ยังไม่ระบุ</span>
            )}
          </div>
          {/* เปิดใช้งานเมื่อ */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={18} color="var(--text-muted)" />
              <span style={{ fontWeight: 600 }}>เปิดใช้งานเมื่อ</span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
              {st.created_at ? formatDateTimeThai(st.created_at) : '— ไม่ระบุ —'}
            </span>
          </div>
        </div>
      </section>

      <section>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>
          <HistoryIcon size={20} color="var(--primary)" /> สถิติย้อนหลัง (Snapshot)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
           <Card className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>เคสซ่อมสะสม</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>0</div>
           </Card>
           <Card className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>ยอดเบิกพัสดุ</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>0</div>
           </Card>
        </div>
      </section>

      <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Button 
          variant="primary" 
          style={{ flex: 1, padding: '16px', borderRadius: '16px', fontSize: '1rem' }} 
          onClick={() => navigate(`/stations?id=${st.id}&q=${encodeURIComponent(st.name)}`)} 
          icon={<HistoryIcon size={20} />}
        >
          เปิดแฟ้มข้อมูล 360 องศา
        </Button>
      </div>
    </div>
  ), [navigate]);

  return (
    <div className="station-page" style={{ padding: 'var(--main-padding)', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>
      {!selectedStationId ? (
        <>
          <div className="page-header" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '6px' }}>
                <MapIcon size={20} />
                <span style={{ fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Asset Location Hub</span>
              </div>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>บริหารจัดการสถานีและจุดตรวจ</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '1.05rem', fontWeight: 500 }}>
                สืบค้นข้อมูลพัสดุและประวัติการซ่อมบำรุงรายสถานีทั่วประเทศ
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
               <button className="btn btn-outline" onClick={loadStations} title="รีเฟรชข้อมูล"><RefreshCw size={20} /></button>
               {hasPermission('manage.stations') && (
                 <button className="btn btn-primary" onClick={openCreateModal}><Plus size={20} /> เพิ่มหน่วยงานใหม่</button>
               )}
            </div>
          </div>

          <Card className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '20px', overflow: 'visible' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', gap: '1.5rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>ค้นหาอัจฉริยะ</label>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    className="form-control" 
                    style={{ paddingLeft: '44px', height: '48px', borderRadius: '12px' }} 
                    placeholder="ชื่อสถานี, รหัสย่อ, หรือจังหวัด..."
                    value={urlState.search}
                    onChange={(e) => setTableState({ search: e.target.value, page: 1 })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>กรองตามจังหวัด</label>
                <Select
                  value={urlState.filters.province || 'All'}
                  options={provinces.map(p => ({ label: p === 'All' ? 'ทุกจังหวัด' : p, value: p }))}
                  onChange={(val) => setTableState({ filters: { ...urlState.filters, province: String(val) }, page: 1 })}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>ประเภทหน่วยงาน</label>
                <Select
                  value={urlState.filters.type || 'All'}
                  options={stationTypes.map(t => ({ label: t.label, value: t.value }))}
                  onChange={(val) => setTableState({ filters: { ...urlState.filters, type: String(val) }, page: 1 })}
                  style={{ width: '100%' }}
                />
              </div>
              <button 
                className="btn btn-outline" 
                style={{ height: '48px', borderRadius: '12px', width: '100%' }}
                onClick={() => setTableState({ search: '', page: 1, filters: {} })}
              >
                ล้าง
              </button>
            </div>
          </Card>

          <BaseDataTable
            columns={columns}
            data={paginatedData}
            state={{ loading: false, error: null, empty: paginatedData.length === 0 }}
            actions={actions}
            onRowClick={(st) => navigate(`/stations?id=${st.id}&q=${encodeURIComponent(st.name)}`)}
            drawerTitle={(st) => st.name}
            renderDetailDrawer={renderDetailDrawer}
            mobileConfig={{ title: (s) => s.name, subtitle: (s) => s.code, statusBadge: () => <span className="badge badge-success">ปกติ</span> }}
          />
          <TablePagination config={{ page: urlState.page, pageSize: urlState.pageSize, totalItems: filteredData.length }} onPageChange={(p) => setTableState({ page: p })} onPageSizeChange={(s) => setTableState({ pageSize: s, page: 1 })} />
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
           <button onClick={() => navigate('/stations')} className="btn btn-outline" style={{ alignSelf: 'flex-start', border: 'none', background: 'var(--primary-light)', padding: '10px 20px', borderRadius: '12px', fontWeight: 800 }}>
             <ArrowLeft size={18} /> <span style={{ marginLeft: '8px' }}>ย้อนกลับไปรายชื่อสถานี</span>
           </button>

           {detailsLoading && (
             <div style={{ textAlign: 'center', padding: '5rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1.5rem auto', width: 48, height: 48, borderWidth: '5px' }}></div>
                <h3 style={{ fontWeight: 800, color: 'var(--text-muted)' }}>กำลังดึงข้อมูลแฟ้มประวัติสถานี...</h3>
             </div>
           )}

           {details && filteredDetails && !detailsLoading && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* === STATION DOSSIER HEADER === */}
                <div style={{
                  position: 'relative',
                  borderRadius: '22px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f172a 100%)',
                  boxShadow: '0 18px 40px -20px rgba(15, 23, 42, 0.45)',
                }}>
                  {/* Grid overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                    pointerEvents: 'none',
                  }} />
                  {/* Gradient beam */}
                  <div style={{
                    position: 'absolute', top: '-30%', right: '-10%',
                    width: '60%', height: '180%',
                    background: 'radial-gradient(ellipse at center, rgba(41, 182, 246, 0.22), transparent 65%)',
                    pointerEvents: 'none',
                  }} />

                  <div style={{ position: 'relative', padding: '1.75rem 2.25rem 1.5rem' }}>
                    {/* Live tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                      <span style={{
                        position: 'relative',
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--primary)',
                        boxShadow: '0 0 0 0 rgba(41, 182, 246, 0.7)',
                        animation: 'station-pulse 2s infinite',
                      }} />
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 800,
                        letterSpacing: '0.22em', textTransform: 'uppercase',
                        color: 'var(--primary)',
                       }}>แฟ้มข้อมูลสถานี</span>
                      <span style={{
                        height: '12px', width: '1px',
                        background: 'rgba(255,255,255,0.18)',
                      }} />
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        color: '#94a3b8',
                        fontFamily: "'JetBrains Mono', 'Consolas', 'Menlo', monospace",
                      }}>// ตรวจวัดสถานะสด</span>
                    </div>

                    {/* Code + Name & Actions Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                      <div style={{ flex: 1, minWidth: '285px' }}>
                        <div style={{
                          fontFamily: "'JetBrains Mono', 'Consolas', 'Menlo', monospace",
                          fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700,
                          letterSpacing: '0.1em', marginBottom: '6px',
                        }}>
                          {details.station.code}
                        </div>
                        <h1 style={{
                          margin: 0, color: 'white',
                          fontSize: 'clamp(1.7rem, 3.6vw, 2.55rem)',
                          fontWeight: 800, lineHeight: 1.05,
                          letterSpacing: '-0.03em',
                        }}>
                          {details.station.name}
                        </h1>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => navigate(`/new?station_id=${details.station.id}`)}
                          style={{ borderRadius: '10px', fontSize: '0.75rem', padding: '8px 16px', color: '#0f172a', fontWeight: 800 }}
                        >
                          <Plus size={12} /> แจ้งซ่อมด่วน
                        </button>
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => navigate(`/withdrawal?station_id=${details.station.id}`)}
                          style={{ borderRadius: '10px', fontSize: '0.75rem', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800 }}
                        >
                          <Plus size={12} /> เบิกพัสดุลงด่าน
                        </button>
                        <button 
                          type="button"
                          className="btn btn-outline btn-sm" 
                          onClick={() => {
                            setQrStation(details.station);
                            setQrModalOpen(true);
                          }}
                          style={{ borderRadius: '10px', fontSize: '0.75rem', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: 800 }}
                        >
                          <QrCode size={12} style={{ marginRight: '4px' }} /> คิวอาร์โค้ด
                        </button>
                      </div>
                    </div>

                    {/* Metadata pills */}
                    <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'จังหวัด', value: details.station.province },
                        { label: 'ทางหลวง', value: `ทล.${details.station.highway_no}` },
                        { label: 'ทิศทาง', value: details.station.direction },
                      ].map((tag, i) => (
                        <div key={i} style={{
                          display: 'inline-flex', alignItems: 'baseline', gap: '8px',
                          padding: '5px 12px',
                          borderRadius: '7px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.74rem',
                        }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em' }}>{tag.label}</span>
                          <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{tag.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Time window segmented control */}
                    <div style={{
                      marginTop: '1.5rem', paddingTop: '1.25rem',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                    }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 800,
                        color: '#94a3b8',
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                      }}>ช่วงเวลา ▸</span>
                      <div style={{
                        display: 'flex', gap: '3px',
                        background: 'rgba(0,0,0,0.35)',
                        padding: '3px',
                        borderRadius: '9px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        {([
                          { val: '7d', label: '7 วัน' },
                          { val: '30d', label: '30 วัน' },
                          { val: '90d', label: '90 วัน' },
                          { val: 'all', label: 'ทั้งหมด' }
                        ] as const).map(opt => {
                          const active = dateRange === opt.val;
                          return (
                            <button
                              key={opt.val}
                              onClick={() => setDateRange(opt.val)}
                              style={{
                                padding: '6px 16px',
                                borderRadius: '7px',
                                border: 'none',
                                background: active ? 'var(--primary)' : 'transparent',
                                color: active ? '#0f172a' : '#cbd5e1',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                minWidth: '62px',
                                boxShadow: active ? '0 4px 14px -4px rgba(41, 182, 246, 0.6)' : 'none',
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* === UNIFIED TELEMETRY STRIP — Activity + Counters + Top Broken === */}
                {(() => {
                   const nowVal = now;
                   const oneDay = 24 * 60 * 60 * 1000;
                   const buckets = Array.from({ length: 7 }, () => 0);
                   const dayLabels: string[] = [];
                   for (let i = 6; i >= 0; i--) {
                     const d = new Date(nowVal - i * oneDay);
                     dayLabels.push(d.toLocaleDateString('th-TH', { weekday: 'narrow' }));
                   }
                   filteredDetails.transactions.forEach((tx: InventoryTransaction) => {
                     const t = new Date(tx.created_at).getTime();
                     const diffDays = Math.floor((nowVal - t) / oneDay);
                     if (diffDays >= 0 && diffDays < 7) buckets[6 - diffDays] += 1;
                   });
                  const maxBucket = Math.max(1, ...buckets);
                  const totalActivity = filteredDetails.transactions.length;
                  const sparklinePoints = buckets.map((v, i) => {
                    const x = (i / 6) * 280;
                    const y = 60 - (v / maxBucket) * 55;
                    return `${x},${y}`;
                  }).join(' ');
                  const lastBucket = buckets[6];
                  const prevBucket = buckets[5];
                  const dailyDelta = lastBucket - prevBucket;

                  const counters = [
                    { label: 'งานซ่อม', val: filteredDetails.repairs.length, color: 'var(--primary)', unit: 'ครั้ง', icon: <Wrench size={20} /> },
                    { label: 'งานเคลม', val: filteredDetails.claims.length, color: 'var(--warning)', unit: 'ครั้ง', icon: <Shield size={20} /> },
                    { label: 'การเบิก', val: filteredDetails.withdrawals.length, color: 'var(--success)', unit: 'รายการ', icon: <Package size={20} /> },
                  ];

                  return (
                    <div style={{
                      position: 'relative',
                      borderRadius: '20px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      boxShadow: '0 4px 24px -8px rgba(15, 23, 42, 0.08)',
                    }}>
                      {/* Section label strip */}
                      <div style={{
                        padding: '12px 22px',
                        background: 'linear-gradient(90deg, var(--bg-app), transparent)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '10px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Activity size={13} color="var(--primary)" />
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 800,
                            letterSpacing: '0.22em', textTransform: 'uppercase',
                            color: 'var(--text-main)',
                          }}>ภาพรวมสถิติสถานี</span>
                        </div>
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 700,
                          color: 'var(--text-muted)',
                          fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                          letterSpacing: '0.08em',
                        }}>
                          {dateRange === 'all' ? 'ข้อมูลทั้งหมด' : dateRange === '7d' ? '7 วันล่าสุด' : dateRange === '30d' ? '30 วันล่าสุด' : '90 วันล่าสุด'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.3fr' }}>
                        {/* Cell 1: Activity sparkline */}
                        <div style={{
                          padding: '1.5rem 1.5rem',
                          borderRight: '1px solid var(--border)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          textAlign: 'center',
                        }}>
                          {/* Icon container */}
                          <div style={{
                            width: '42px', height: '42px',
                            borderRadius: '50%',
                            background: 'rgba(41, 182, 246, 0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)',
                            marginBottom: '4px',
                          }}>
                            <Activity size={20} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 800,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.16em', textTransform: 'uppercase',
                            }}>ความเคลื่อนไหวรวม</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '2px 7px', borderRadius: '5px',
                              background: dailyDelta >= 0 ? 'var(--success-light)' : 'var(--danger-light)',
                              color: dailyDelta >= 0 ? 'var(--success)' : 'var(--danger)',
                              fontSize: '0.62rem', fontWeight: 800,
                            }}>
                              <TrendingUp size={9} style={dailyDelta < 0 ? { transform: 'scaleY(-1)' } : undefined} />
                              {dailyDelta >= 0 ? '+' : ''}{dailyDelta}
                            </span>
                          </div>
                          <div style={{
                            fontSize: 'clamp(2.6rem, 4.5vw, 3.6rem)',
                            fontWeight: 900, lineHeight: 0.9,
                            letterSpacing: '-0.04em',
                            color: 'var(--text-main)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>{totalActivity}</div>
                          <svg viewBox="0 0 280 60" width="100%" height="46" preserveAspectRatio="none" style={{ display: 'block', marginTop: '4px' }}>
                            <defs>
                              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <polygon points={`0,60 ${sparklinePoints} 280,60`} fill="url(#sparkGrad)" />
                            <polyline points={sparklinePoints} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                            {buckets.map((v, i) => {
                              const x = (i / 6) * 280;
                              const y = 60 - (v / maxBucket) * 55;
                              return <circle key={i} cx={x} cy={y} r={i === 6 ? 3.5 : 2} fill="var(--primary)" />;
                            })}
                          </svg>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", width: '100%' }}>
                            {dayLabels.map((d, i) => <span key={i}>{d}</span>)}
                          </div>
                        </div>

                        {/* Cells 2-4: Counters */}
                        {counters.map((k, i) => (
                          <div key={i} style={{
                            padding: '1.5rem 1.25rem',
                            borderRight: '1px solid var(--border)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            textAlign: 'center',
                          }}>
                            {/* Top accent stripe */}
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0,
                              height: '2px', background: k.color, opacity: 0.7,
                            }} />
                            {/* Icon container */}
                            <div style={{
                              width: '42px', height: '42px',
                              borderRadius: '50%',
                              background: `${k.color}15`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: k.color,
                              marginBottom: '10px'
                            }}>
                              {k.icon}
                            </div>
                            <div>
                              <div style={{
                                fontSize: '0.62rem', fontWeight: 800,
                                color: 'var(--text-muted)',
                                letterSpacing: '0.16em', textTransform: 'uppercase',
                              }}>{k.label}</div>
                              <div style={{
                                fontSize: 'clamp(2.4rem, 4vw, 3.2rem)',
                                fontWeight: 900, lineHeight: 1,
                                letterSpacing: '-0.04em',
                                color: k.color,
                                fontVariantNumeric: 'tabular-nums',
                                marginTop: '6px',
                              }}>{k.val}</div>
                            </div>
                            <div style={{
                              fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600,
                              marginTop: '6px',
                            }}>
                              {k.unit}
                            </div>
                          </div>
                        ))}

                        {/* Cell 5: Top Broken Devices */}
                        <div style={{
                          padding: '1.5rem 1.5rem',
                          display: 'flex', flexDirection: 'column',
                          gap: '8px',
                          position: 'relative',
                        }}>
                          <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            height: '2px', background: 'var(--danger)', opacity: 0.7,
                          }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wrench size={12} color="var(--danger)" />
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 800,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.16em', textTransform: 'uppercase',
                            }}>อุปกรณ์พังบ่อย</span>
                          </div>
                          {topBrokenDevices.length === 0 ? (
                            <div style={{
                              flex: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--text-muted)',
                              fontSize: '0.72rem', fontWeight: 600,
                              fontStyle: 'italic',
                              padding: '0.5rem',
                              border: '1px dashed var(--border)',
                              borderRadius: '8px',
                              marginTop: '4px',
                            }}>
                              ยังไม่มีงานซ่อม
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                              {topBrokenDevices.slice(0, 3).map((d, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                                  <span style={{
                                    width: 20, height: 20, borderRadius: '5px',
                                    background: i === 0 ? 'var(--danger)' : i === 1 ? 'var(--warning)' : 'var(--text-muted)',
                                    color: 'white',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}>
                                    {i + 1}
                                  </span>
                                  <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                                  <span style={{
                                    fontSize: '0.7rem', fontWeight: 800, color: 'var(--danger)',
                                    fontVariantNumeric: 'tabular-nums',
                                  }}>×{d.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* === ACTIVE ASSETS AT STATION === */}
                <div style={{
                  position: 'relative',
                  borderRadius: '20px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 24px -8px rgba(15, 23, 42, 0.08)',
                }}>
                  <div style={{
                    padding: '12px 22px',
                    background: 'linear-gradient(90deg, var(--bg-app), transparent)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Package size={13} color="var(--primary)" />
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 800,
                        letterSpacing: '0.22em', textTransform: 'uppercase',
                        color: 'var(--text-main)',
                      }}>อุปกรณ์ประจำการ ณ สถานี (Active Assets)</span>
                    </div>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700,
                      color: 'var(--text-muted)',
                      fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                      letterSpacing: '0.08em',
                    }}>
                      {activeAssets.length} รายการ
                    </span>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    {activeAssets.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '3rem 1.5rem',
                        border: '2px dashed var(--border)',
                        borderRadius: '16px',
                        background: 'repeating-linear-gradient(135deg, transparent, transparent 8px, var(--bg-app) 8px, var(--bg-app) 9px)',
                      }}>
                        <Package size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                        <h4 style={{ margin: '0 0 6px 0', fontWeight: 800, fontSize: '0.95rem' }}>ยังไม่มีอุปกรณ์ติดตั้งประจำด่านนี้</h4>
                        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>
                          เมื่อมีการทำเรื่องเบิกพัสดุลงด่านนี้ รายการพัสดุจะถูกลงบันทึกเป็นอุปกรณ์ประจำด่านโดยอัตโนมัติ
                        </p>
                        <button
                          onClick={() => navigate(`/withdrawal?station_id=${details.station.id}`)}
                          className="btn btn-outline btn-sm"
                          style={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}
                        >
                          เบิกพัสดุลงด่านทันที
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {activeAssets.map((asset) => (
                          <div key={asset.id} style={{
                            display: 'flex', gap: '12px',
                            padding: '12px',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            alignItems: 'center',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}>
                            {/* Image Thumbnail */}
                            <div style={{
                              width: '54px', height: '54px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {asset.image ? (
                                <img src={`${UPLOAD_URL}/uploads/${asset.image}`} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <Package size={22} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                              )}
                            </div>

                            {/* Details */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={asset.name}>
                                {asset.name}
                              </h4>
                              <p style={{ margin: '2px 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                รุ่น/โมเดล: {asset.model}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px' }}>
                                  จำนวน: {asset.quantity}
                                </span>
                                {asset.status === 'REPAIRING' ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    fontSize: '0.68rem', fontWeight: 800,
                                    color: 'var(--danger)', background: 'var(--danger-light)',
                                    padding: '2px 8px', borderRadius: '4px',
                                  }}>
                                    ⚠️ ส่งซ่อม
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    fontSize: '0.68rem', fontWeight: 800,
                                    color: 'var(--success)', background: 'var(--success-light)',
                                    padding: '2px 8px', borderRadius: '4px',
                                  }}>
                                    ✓ ปกติ
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* === ACTIVITY LOG — 4 channel feed === */}
                {(() => {
                  const channels = [
                    {
                      code: 'RPR', label: 'งานซ่อม', color: 'var(--primary)', bgTint: 'var(--primary-light)',
                      count: filteredDetails.repairs.length,
                      navigate: () => navigate('/repairs'),
                      empty: 'ไม่มีงานซ่อม',
                      icon: <Wrench size={24} style={{ opacity: 0.4, marginBottom: '6px', color: 'var(--primary)' }} />,
                      cta: 'แจ้งซ่อมด่วนที่นี่',
                      ctaAction: () => navigate(`/new?station_id=${details.station.id}`),
                      items: filteredDetails.repairs.slice(0, 6).map(item => ({
                        id: item.id,
                        code: item.ticket_no,
                        title: item.device_name,
                        subtitle: item.reporter,
                        time: item.created_at,
                        extra: (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span className={`badge badge-priority-${item.priority === 'วิกฤต' ? 'critical' : item.priority === 'ด่วนมาก' ? 'urgent' : item.priority === 'ด่วน' ? 'high' : 'normal'}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{item.priority}</span>
                            <span className={`badge badge-${item.status}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{item.status}</span>
                          </div>
                        ),
                        href: `/repairs/${item.id}`,
                      })),
                    },
                    {
                      code: 'CLM', label: 'งานเคลม', color: 'var(--warning)', bgTint: 'var(--warning-light)',
                      count: filteredDetails.claims.length,
                      navigate: () => navigate('/claim-history'),
                      empty: 'ไม่มีงานเคลม',
                      icon: <Shield size={24} style={{ opacity: 0.4, marginBottom: '6px', color: 'var(--warning)' }} />,
                      cta: 'แจ้งเคลมพัสดุที่นี่',
                      ctaAction: () => navigate(`/claim?station_id=${details.station.id}`),
                      items: filteredDetails.claims.slice(0, 6).map(item => ({
                        id: item.id,
                        code: item.ticket_no,
                        title: item.device_name,
                        subtitle: item.reporter,
                        time: item.created_at,
                        extra: <span className={`badge badge-${item.status}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{item.status === 'กำลังซ่อม' ? 'กำลังเคลม' : item.status}</span>,
                        href: `/claim-history/${item.id}`,
                      })),
                    },
                    {
                      code: 'WTD', label: 'การเบิก', color: 'var(--success)', bgTint: 'var(--success-light)',
                      count: filteredDetails.withdrawals.length,
                      navigate: () => navigate('/withdrawal-history'),
                      empty: 'ไม่มีการเบิก',
                      icon: <Package size={24} style={{ opacity: 0.4, marginBottom: '6px', color: 'var(--success)' }} />,
                      cta: 'ทำรายการเบิกที่นี่',
                      ctaAction: () => navigate(`/withdrawal?station_id=${details.station.id}`),
                      items: filteredDetails.withdrawals.slice(0, 6).map(item => {
                        const itemCount = item.items?.length || (item.items_summary ? item.items_summary.split(',').length : 0);
                        return {
                          id: item.id,
                          code: `WD-${item.id.toString().padStart(6, '0')}`,
                          title: `${itemCount} รายการ`,
                          subtitle: item.recipient,
                          time: item.created_at,
                          extra: <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '1px 7px', borderRadius: '4px', background: 'var(--success-light)', color: 'var(--success)' }}>{item.type}</span>,
                          href: `/withdrawal/${item.id}`,
                        };
                      }),
                    },
                    {
                      code: 'TXN', label: 'ความเคลื่อนไหว', color: 'var(--info)', bgTint: 'var(--info-light)',
                      count: filteredDetails.transactions.length,
                      navigate: () => navigate('/transactions'),
                      empty: 'ไม่มีความเคลื่อนไหว',
                      icon: <Activity size={24} style={{ opacity: 0.4, marginBottom: '6px', color: 'var(--info)' }} />,
                      cta: 'ดูประวัติคลังพัสดุ',
                      ctaAction: () => navigate('/inventory'),
                      items: filteredDetails.transactions.slice(0, 6).map(tx => {
                        const isIn = tx.transaction_type === 'ADD_STOCK' || tx.transaction_type === 'RETURN';
                        const qty = tx.quantity_added || tx.quantity_withdrawn || tx.quantity_borrowed || tx.quantity_returned || 0;
                        const accent = isIn ? 'var(--success)' : 'var(--danger)';
                        return {
                          id: tx.id,
                          code: `${isIn ? '+' : '−'}${qty}`,
                          codeColor: accent,
                          title: tx.product_name,
                          subtitle: tx.user_name || 'ระบบ',
                          time: tx.created_at,
                          extra: <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '1px 7px', borderRadius: '4px', background: `${accent}1a`, color: accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>{isIn ? 'IN' : 'OUT'}</span>,
                          href: null as string | null,
                        };
                      }),
                    },
                  ];

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                      {channels.map((ch, ci) => (
                        <div key={ci} style={{
                          background: 'var(--bg-card)',
                          borderRadius: '16px',
                          border: '1px solid var(--border)',
                          overflow: 'hidden',
                          display: 'flex', flexDirection: 'column',
                          boxShadow: '0 2px 12px -4px rgba(15, 23, 42, 0.05)',
                        }}>
                          {/* Channel header */}
                          <div style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--border)',
                            background: `linear-gradient(180deg, ${ch.bgTint}, transparent)`,
                            position: 'relative',
                          }}>
                            {/* Accent top stripe */}
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0,
                              height: '3px', background: ch.color,
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  fontSize: '0.58rem', fontWeight: 800,
                                  padding: '3px 7px', borderRadius: '5px',
                                  background: ch.color, color: 'white',
                                  letterSpacing: '0.15em',
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}>{ch.code}</span>
                                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                  {ch.label}
                                </h4>
                              </div>
                              <span style={{
                                fontSize: '0.7rem', fontWeight: 800,
                                color: ch.color,
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {ch.count}
                              </span>
                            </div>
                          </div>

                          {/* Log entries */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {ch.items.length === 0 ? (
                              <div style={{
                                flex: 1,
                                minHeight: '220px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '0.78rem', fontWeight: 600,
                                background: 'repeating-linear-gradient(135deg, transparent, transparent 8px, var(--bg-app) 8px, var(--bg-app) 9px)',
                                padding: '1.5rem',
                                textAlign: 'center',
                              }}>
                                {ch.icon}
                                <span style={{
                                  padding: '4px 10px',
                                  background: 'var(--bg-card)',
                                  borderRadius: '8px',
                                  border: '1px dashed var(--border)',
                                  fontStyle: 'italic',
                                  marginBottom: '8px',
                                  display: 'inline-block',
                                }}>
                                  — {ch.empty} —
                                </span>
                                {ch.cta && (
                                  <button
                                    onClick={ch.ctaAction}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: ch.color,
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      padding: '2px 6px',
                                    }}
                                  >
                                    {ch.cta}
                                  </button>
                                )}
                              </div>
                            ) : (
                              ch.items.map((it: { id: number | string; code: string; codeColor?: string; title: string; subtitle: string; time: string; extra?: React.ReactNode; href: string | null }, idx: number) => {
                                const isLast = idx === ch.items.length - 1;
                                return (
                                  <div
                                    key={it.id}
                                    onClick={it.href ? () => { if (it.href) navigate(it.href); } : undefined}
                                    style={{
                                      padding: '11px 14px',
                                      borderBottom: isLast ? 'none' : '1px solid var(--border)',
                                      cursor: it.href ? 'pointer' : 'default',
                                      transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (it.href) e.currentTarget.style.background = 'var(--bg-app)'; }}
                                    onMouseLeave={e => { if (it.href) e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    {/* Top row: code + time */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <span style={{
                                        fontSize: '0.68rem', fontWeight: 800,
                                        color: it.codeColor || ch.color,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        letterSpacing: '0.04em',
                                      }}>{it.code}</span>
                                      <span style={{
                                        fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700,
                                        fontFamily: "'JetBrains Mono', monospace",
                                      }}>{formatRelativeTime(it.time)}</span>
                                    </div>
                                    {/* Title */}
                                    <div style={{
                                      fontSize: '0.82rem', fontWeight: 700,
                                      color: 'var(--text-main)',
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      marginBottom: it.extra ? '6px' : '2px',
                                    }}>{it.title}</div>
                                    {/* Extra badges */}
                                    {it.extra}
                                    {/* Subtitle (reporter/recipient/user) */}
                                    {it.subtitle && (
                                      <div style={{
                                        marginTop: '6px',
                                        fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>
                                        <span style={{ opacity: 0.55, marginRight: '4px' }}>›</span>{it.subtitle}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Footer "ดูทั้งหมด" */}
                          {ch.count > 0 && (
                            <button
                              onClick={ch.navigate}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                borderTop: '1px solid var(--border)',
                                padding: '10px',
                                fontSize: '0.7rem', fontWeight: 800,
                                color: ch.color,
                                cursor: 'pointer',
                                letterSpacing: '0.05em',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = ch.bgTint}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              ดูทั้งหมด →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
         </div>
      )}

      {/* Station Create/Edit Modal — แบบฟอร์มละเอียด บังคับกรอกทุกฟิลด์ + field-level validation */}
      {stationModal.open && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={closeStationModal}>
          <div className="modal-content" style={{ maxWidth: '620px', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {stationModal.mode === 'edit' ? <Pencil size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                {stationModal.mode === 'edit' ? 'แก้ไขข้อมูลสถานี' : 'เพิ่มสถานีใหม่'}
              </h3>
              <button className="close-btn" onClick={closeStationModal}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              ⚠️ กรอกข้อมูลให้ครบทุกช่อง — สถานีเป็นข้อมูลแม่บทที่ใช้ในทุกการเบิก/ซ่อม/เคลม
            </p>
            <form onSubmit={handleStationSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem 0' }}>

                {/* ชื่อสถานี */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ชื่อสถานี / จุดติดตั้ง <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder="เช่น ด่านชั่งบางปะอิน"
                    maxLength={100}
                    autoFocus
                    style={fieldErrors.name ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {fieldErrors.name && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.name}</p>
                  )}
                </div>

                {/* ประเภทสถานี */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ประเภทสถานี <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <Select
                    value={formData.station_type}
                    options={STATION_TYPE_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
                    onChange={val => {
                      updateField('station_type', String(val));
                      if (val !== 'OTHER') updateField('custom_type', '');
                    }}
                    style={fieldErrors.station_type ? { border: '1.5px solid var(--danger)' } : undefined}
                  />
                  {fieldErrors.station_type && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.station_type}</p>
                  )}
                  {formData.station_type === 'OTHER' && (
                    <>
                      <input
                        type="text"
                        className="form-control"
                        style={{ marginTop: '8px', ...(fieldErrors.custom_type ? { borderColor: 'var(--danger)' } : {}) }}
                        placeholder="ระบุประเภทเอง เช่น จุดตรวจศุลกากร"
                        value={formData.custom_type}
                        onChange={e => updateField('custom_type', e.target.value)}
                        maxLength={50}
                      />
                      {fieldErrors.custom_type && (
                        <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.custom_type}</p>
                      )}
                    </>
                  )}
                </div>

                {/* ผู้รับผิดชอบสถานี (NEW) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>
                    ผู้รับผิดชอบสถานี <span style={{ color: 'var(--danger)' }}>*</span>
                    <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>(ระบุชื่อผู้ดูแลเพื่อติดตามรับผิดชอบ)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.responsible_person}
                    onChange={e => updateField('responsible_person', e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    maxLength={100}
                    style={fieldErrors.responsible_person ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {fieldErrors.responsible_person && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.responsible_person}</p>
                  )}
                </div>

                {/* จังหวัด — dropdown grouped by region */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>จังหวัด <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <Select
                    value={formData.province}
                    options={flatProvinceOptions}
                    onChange={val => handleProvinceChange(String(val))}
                    style={fieldErrors.province ? { border: '1.5px solid var(--danger)' } : undefined}
                  />
                  {fieldErrors.province && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.province}</p>
                  )}
                  {formData.province && getRegionFromProvince(formData.province) && !fieldErrors.province && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                      ✓ ระบบเลือกภูมิภาค: <strong>{getRegionFromProvince(formData.province)}</strong> ให้อัตโนมัติ
                    </p>
                  )}
                </div>

                {/* ภูมิภาค */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ภูมิภาค <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <Select
                    value={formData.region}
                    options={[{ label: '-- เลือกภูมิภาค --', value: '' }, ...REGIONS.map(r => ({ label: r, value: r }))] }
                    onChange={val => updateField('region', String(val))}
                    style={fieldErrors.region ? { border: '1.5px solid var(--danger)' } : undefined}
                  />
                  {fieldErrors.region && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.region}</p>
                  )}
                </div>

                {/* ทางหลวง + ทิศทาง */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>เส้นทางหลวง <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.highway_no}
                      onChange={e => updateField('highway_no', e.target.value)}
                      placeholder="เช่น 1, 32, 41"
                      maxLength={20}
                      style={fieldErrors.highway_no ? { borderColor: 'var(--danger)' } : undefined}
                    />
                    {fieldErrors.highway_no && (
                      <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.highway_no}</p>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>ทิศทาง <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <Select
                      value={formData.direction}
                      options={[
                        { label: 'ขาเข้า (INBOUND)', value: 'INBOUND' },
                        { label: 'ขาออก (OUTBOUND)', value: 'OUTBOUND' },
                        { label: '2 ทาง (BOTH)', value: 'BOTH' },
                        { label: 'ไม่ระบุ (NONE)', value: 'NONE' }
                      ]}
                      onChange={val => updateField('direction', val as StationFormData['direction'])}
                      style={fieldErrors.direction ? { border: '1.5px solid var(--danger)' } : undefined}
                    />
                    {fieldErrors.direction && (
                      <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.direction}</p>
                    )}
                  </div>
                </div>

                {/* รวม error message */}
                {Object.keys(fieldErrors).length > 0 && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, padding: '10px 12px', background: 'var(--danger-light)', borderRadius: '8px' }}>
                    ⚠️ มีข้อมูล {Object.keys(fieldErrors).length} ช่องที่ต้องแก้ไข — โปรดตรวจสอบช่องที่ขีดเส้นแดง
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                  <Button type="button" variant="outline" style={{ flex: 1 }} onClick={closeStationModal} disabled={isSaving}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" variant="primary" style={{ flex: 1 }} disabled={isSaving}>
                    {isSaving ? 'กำลังบันทึก...' : stationModal.mode === 'edit' ? 'บันทึกการแก้ไข' : 'เพิ่มสถานี'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Sticker Modal */}
      {qrModalOpen && qrStation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '400px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            color: '#ffffff',
            position: 'relative'
          }}>
            <button 
              onClick={() => setQrModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff', textAlign: 'center' }}>
              QR Code ประจำสถานี
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '24px', textAlign: 'center' }}>
              สแกนด้วยสมาร์ทโฟนเพื่อแจ้งซ่อมด่วนที่ด่านนี้
            </p>

            <div id="station-qr-sticker" style={{
              background: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
              marginBottom: '24px',
              color: '#0f172a'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '6px', textAlign: 'center', letterSpacing: '0.05em' }}>
                {qrStation.code || `STN-${qrStation.id}`}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '14px', textAlign: 'center' }}>
                {qrStation.name} ({qrStation.direction})
              </div>
              
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/new?station_id=${qrStation.id}`)}`} 
                alt={`QR Code for ${qrStation.name}`}
                style={{ width: '200px', height: '200px', display: 'block' }}
              />

              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '12px', wordBreak: 'break-all', textAlign: 'center' }}>
                {`${window.location.origin}/new?station_id=${qrStation.id}`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setQrModalOpen(false)}
                className="btn btn-outline"
                style={{
                  flex: 1,
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff'
                }}
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  const printContent = document.getElementById('station-qr-sticker');
                  if (printContent) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(
                        '<html>' +
                          '<head>' +
                            '<title>Print QR Sticker - ' + qrStation.name + '</title>' +
                            '<style>' +
                              'body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: "Inter", "Segoe UI", sans-serif; }' +
                              '.sticker { border: 2px solid #000; padding: 25px; border-radius: 15px; text-align: center; width: 280px; }' +
                              '.code { font-size: 22px; font-weight: bold; margin-bottom: 5px; }' +
                              '.name { font-size: 15px; color: #333; margin-bottom: 15px; }' +
                              '.url { font-size: 10px; color: #666; margin-top: 10px; word-break: break-all; }' +
                            '</style>' +
                          '</head>' +
                          '<body>' +
                            '<div class="sticker">' +
                              '<div class="code">' + (qrStation.code || ('STN-' + qrStation.id)) + '</div>' +
                              '<div class="name">' + qrStation.name + ' (' + qrStation.direction + ')</div>' +
                              '<img src="' + (printContent.querySelector('img')?.src || '') + '" width="200" height="200" />' +
                              '<div class="url">' + window.location.origin + '/new?station_id=' + qrStation.id + '</div>' +
                            '</div>' +
                            '<script>' +
                              'window.onload = function() {' +
                                'window.print();' +
                                'setTimeout(function() { window.close(); }, 500);' +
                              '};' +
                            '</script>' +
                          '</body>' +
                        '</html>'
                      );
                      printWindow.document.close();
                    }
                  }
                }}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'var(--primary)',
                  color: '#0f172a'
                }}
              >
                พิมพ์สติกเกอร์
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StationSearch;
