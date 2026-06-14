import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { stationApi } from '../../api';
import type { Station, StationArea } from '../../types';
import { MapPin, Sliders } from 'lucide-react';
import { useNotification } from '../Layout';
import { provincesByRegion, getRegionFromProvince } from '../../utils/thaiProvinces';

interface StationSelectorProps {
  selectedStationId?: number;
  selectedAreaId?: number;
  onChange: (data: {
    stationId: number | undefined;
    stationName: string;
    areaId?: number | undefined;
    areaName?: string;
  }) => void;
  required?: boolean;
  showArea?: boolean;
}

// provincesByRegion / allThailandProvinces / getRegionFromProvince / getProvincesForRegion
// ย้ายไปอยู่ที่ utils/thaiProvinces.ts แล้ว (shared กับ StationSearch.tsx)

import Select from './Select';

const StationSelector: React.FC<StationSelectorProps> = ({
  selectedStationId,
  selectedAreaId,
  onChange,
  required = false,
  showArea = false
}) => {
  const { notify } = useNotification();
  const [stations, setStations] = useState<Station[]>([]);
  const [areas, setAreas] = useState<StationArea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [highwayFilter, setHighwayFilter] = useState<string>('');



  // Add Station Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addStationType, setAddStationType] = useState<string>('WEIGH_STATION');
  const [customStationType, setCustomStationType] = useState<string>('');
  const [addHighwayNo, setAddHighwayNo] = useState('');
  const [addDirection, setAddDirection] = useState<'INBOUND' | 'OUTBOUND' | 'BOTH' | 'NONE'>('INBOUND');
  const [addRegion, setAddRegion] = useState('');
  const [addProvince, setAddProvince] = useState('');
  const [addResponsiblePerson, setAddResponsiblePerson] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // field-level validation errors (ข้อความสีแดงใต้แต่ละช่อง)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Add Area Modal States
  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false);
  const [addAreaName, setAddAreaName] = useState('');
  const [isSubmittingArea, setIsSubmittingArea] = useState(false);
  const [submitAreaError, setSubmitAreaError] = useState<string | null>(null);

  const openAddModal = () => {
    setAddRegion(regionFilter || '');
    setAddHighwayNo(highwayFilter || '');
    setAddName('');
    setAddProvince('');
    setAddStationType('WEIGH_STATION');
    setCustomStationType('');
    setAddDirection('INBOUND');
    setAddResponsiblePerson('');
    setFieldErrors({});
    setIsAddModalOpen(true);
  };

  // ลบ error ของ field เมื่อผู้ใช้แก้ค่า
  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // เปลี่ยนภาค
  const handleAddRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAddRegion(e.target.value);
    clearFieldError('region');
  };

  // เปลี่ยนจังหวัด — ช่วยอนุมานภาคให้ผู้ใช้ (แต่ต้องตรวจสอบและกรอกภาคต่อ)
  const handleAddProvinceChange = (val: string) => {
    setAddProvince(val);
    clearFieldError('province');
    const derivedRegion = getRegionFromProvince(val);
    if (derivedRegion) {
      setAddRegion(derivedRegion);
      clearFieldError('region');
    }
  };

  // Load all stations once
  useEffect(() => {
    const loadStations = async () => {
      try {
        setLoading(true);
        const list = await stationApi.getUniqueList({ status: 1 });
        setStations(list);
        
        // If there's an initial selected station, sync filters
        if (selectedStationId) {
          const matched = list.find(st => st.id === selectedStationId);
          if (matched) {
            setRegionFilter(matched.region);
            setHighwayFilter(matched.highway_no);
          }
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load stations:', err);
        setError('ไม่สามารถโหลดรายชื่อสถานีได้');
      } finally {
        setLoading(false);
      }
    };
    loadStations();
  }, [selectedStationId]);

  // Load areas when selectedStationId changes
  useEffect(() => {
    const loadAreas = async () => {
      if (!showArea || !selectedStationId) {
        setAreas([]);
        return;
      }
      try {
        const areaList = await stationApi.getAreas(selectedStationId);
        setAreas(areaList);
      } catch (err) {
        console.error('Failed to load station areas:', err);
      }
    };
    loadAreas();
  }, [selectedStationId, showArea]);

  // Unique lists for cascading dropdowns
  const regions = useMemo(() => {
    return ['ภาคเหนือ', 'ภาคกลาง', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคตะวันออก', 'ภาคตะวันตก', 'ภาคใต้'];
  }, []);

  const highways = useMemo(() => {
    let filtered = stations;
    if (regionFilter) {
      filtered = filtered.filter(st => st.region === regionFilter);
    }
    const unique = new Set(filtered.map(st => st.highway_no));
    return Array.from(unique).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
  }, [stations, regionFilter]);

  const filteredStationsList = useMemo(() => {
    let list = stations;
    if (regionFilter) {
      list = list.filter(st => st.region === regionFilter);
    }
    if (highwayFilter) {
      list = list.filter(st => st.highway_no === highwayFilter);
    }
    return list;
  }, [stations, regionFilter, highwayFilter]);

  const handleRegionSelect = (val: string | number) => {
    setRegionFilter(String(val));
    setHighwayFilter('');
    onChange({ stationId: undefined, stationName: '', areaId: undefined, areaName: '' });
  };

  const handleHighwaySelect = (val: string | number) => {
    setHighwayFilter(String(val));
    onChange({ stationId: undefined, stationName: '', areaId: undefined, areaName: '' });
  };

  const handleStationSelect = (val: string | number) => {
    const idVal = val ? parseInt(String(val), 10) : undefined;
    if (idVal === undefined) {
      onChange({ stationId: undefined, stationName: '', areaId: undefined, areaName: '' });
      return;
    }
    
    const matched = stations.find(st => st.id === idVal);
    if (matched) {
      // Trigger onChange
      onChange({
        stationId: matched.id,
        stationName: matched.name,
        areaId: undefined,
        areaName: ''
      });
    }
  };

  const handleAreaSelect = (val: string | number) => {
    if (!selectedStationId) return;
    
    const matchedStation = stations.find(st => st.id === selectedStationId);
    const idVal = val ? parseInt(String(val), 10) : undefined;
    
    if (idVal === undefined || isNaN(idVal)) {
      onChange({
        stationId: selectedStationId,
        stationName: matchedStation?.name || '',
        areaId: undefined,
        areaName: ''
      });
      return;
    }

    const matchedArea = areas.find(a => a.id === idVal);
    onChange({
      stationId: selectedStationId,
      stationName: matchedStation?.name || '',
      areaId: matchedArea?.id,
      areaName: matchedArea?.name
    });
  };

  const openAddAreaModal = () => {
    setAddAreaName('');
    setSubmitAreaError(null);
    setIsAddAreaModalOpen(true);
  };

  const handleAddAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStationId) {
      setSubmitAreaError('กรุณาเลือกสถานีก่อน');
      return;
    }
    const trimmed = addAreaName.trim();
    if (!trimmed) {
      setSubmitAreaError('กรุณากรอกชื่อพื้นที่ย่อย');
      return;
    }
    if (trimmed.length > 100) {
      setSubmitAreaError('ชื่อพื้นที่ย่อยยาวเกินไป (ไม่เกิน 100 ตัวอักษร)');
      return;
    }

    setIsSubmittingArea(true);
    setSubmitAreaError(null);

    try {
      const newArea = await stationApi.createArea(selectedStationId, trimmed);
      notify('เพิ่มพื้นที่ย่อยใหม่เรียบร้อยแล้ว');

      // Reload area list + auto-select the new area
      setAreas(prev => [...prev, newArea].sort((a, b) => a.name.localeCompare(b.name, 'th')));

      const matchedStation = stations.find(st => st.id === selectedStationId);
      onChange({
        stationId: selectedStationId,
        stationName: matchedStation?.name || '',
        areaId: newArea.id,
        areaName: newArea.name
      });

      setIsAddAreaModalOpen(false);
    } catch (err: unknown) {
      console.error('Failed to create station area:', err);
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      const errMsg = errorObj.response?.data?.error || errorObj.message || 'เกิดข้อผิดพลาดในการสร้างพื้นที่ย่อย';
      setSubmitAreaError(errMsg);
    } finally {
      setIsSubmittingArea(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // === Field-level validation ===
    const errors: Record<string, string> = {};

    const nameTrim = addName.trim();
    if (!nameTrim) errors.name = 'กรุณากรอกชื่อสถานี';
    else if (nameTrim.length < 3) errors.name = 'ชื่อสถานีสั้นเกินไป (อย่างน้อย 3 ตัวอักษร)';
    else if (nameTrim.length > 100) errors.name = 'ชื่อสถานียาวเกินไป (ไม่เกิน 100 ตัวอักษร)';

    if (!addStationType) errors.station_type = 'กรุณาเลือกประเภทสถานี';
    else if (addStationType === 'OTHER' && !customStationType.trim()) errors.custom_type = 'กรุณาระบุประเภทสถานี';

    const responsibleTrim = addResponsiblePerson.trim();
    if (!responsibleTrim) errors.responsible_person = 'กรุณาระบุชื่อผู้รับผิดชอบสถานี';
    else if (responsibleTrim.length < 2) errors.responsible_person = 'ชื่อผู้รับผิดชอบสั้นเกินไป (อย่างน้อย 2 ตัวอักษร)';
    else if (responsibleTrim.length > 100) errors.responsible_person = 'ชื่อผู้รับผิดชอบยาวเกินไป (ไม่เกิน 100 ตัวอักษร)';

    if (!addProvince.trim()) errors.province = 'กรุณาเลือกจังหวัด';
    if (!addRegion) errors.region = 'กรุณาเลือกภูมิภาค';

    const highwayTrim = addHighwayNo.trim();
    if (!highwayTrim) errors.highway_no = 'กรุณาระบุทางหลวงหมายเลข';
    else if (highwayTrim.length > 20) errors.highway_no = 'ทางหลวงหมายเลขยาวเกินไป';

    if (!addDirection) errors.direction = 'กรุณาเลือกทิศทาง';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      notify('กรุณาตรวจสอบและกรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const newStation = await stationApi.create({
        name: nameTrim,
        station_type: addStationType === 'OTHER' ? customStationType.trim() : addStationType,
        highway_no: highwayTrim,
        direction: addDirection,
        region: addRegion,
        province: addProvince.trim(),
        responsible_person: responsibleTrim
      });

      notify('เพิ่มสถานีใหม่เข้าสู่ระบบเรียบร้อยแล้ว');
      
      // Update local stations list
      setStations(prev => [...prev, newStation]);
      
      // Sync filters with new station
      setRegionFilter(newStation.region);
      setHighwayFilter(newStation.highway_no);
      
      // Select the new station
      onChange({
        stationId: newStation.id,
        stationName: newStation.name,
        areaId: undefined,
        areaName: ''
      });
      
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      console.error('Failed to create station:', err);
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      const errMsg = errorObj.response?.data?.error || errorObj.message || 'เกิดข้อผิดพลาดในการสร้างสถานี';
      notify(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WEIGH_STATION': return 'สถานีหลัก';
      case 'CHECK_POINT': return 'จุดตรวจ';
      case 'SPOT_CHECK': return 'Spot Check';
      default: return type;
    }
  };

  if (loading && stations.length === 0) {
    return (
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
        <div style={{ flex: 1, minWidth: '150px' }} className="skeleton-container">
          <div style={{ height: '38px', borderRadius: '10px', background: 'var(--border)', animation: 'pulse 1.5s infinite' }}></div>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }} className="skeleton-container">
          <div style={{ height: '38px', borderRadius: '10px', background: 'var(--border)', animation: 'pulse 1.5s infinite' }}></div>
        </div>
        <div style={{ flex: 2, minWidth: '220px' }} className="skeleton-container">
          <div style={{ height: '38px', borderRadius: '10px', background: 'var(--border)', animation: 'pulse 1.5s infinite' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>{error}</div>}
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
        {/* Region Dropdown */}
        <Select
          value={regionFilter}
          options={[{ label: '-- กรองภูมิภาค (ทุกภาค) --', value: '' }, ...regions.map(r => ({ label: r, value: r }))] }
          placeholder="-- กรองภูมิภาค (ทุกภาค) --"
          onChange={handleRegionSelect}
          style={{ flex: 1, minWidth: '180px' }}
        />

        {/* Highway Number Dropdown */}
        <Select
          value={highwayFilter}
          options={[{ label: '-- กรองเลขทางหลวง (ทั้งหมด) --', value: '' }, ...highways.map(h => ({ label: `ทางหลวงหมายเลข ${h}`, value: h }))] }
          placeholder="-- กรองเลขทางหลวง (ทั้งหมด) --"
          onChange={handleHighwaySelect}
          style={{ flex: 1, minWidth: '180px' }}
        />

        {/* Station Select */}
        <div style={{ flex: 2, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Select
            value={selectedStationId || ''}
            options={[{ label: `-- เลือกจุดตรวจ/สถานีควบคุมน้ำหนัก ${required ? '*' : ''} --`, value: '' }, ...filteredStationsList.map(st => ({ label: `[${getTypeLabel(st.station_type)}] ${st.name} (ทล.${st.highway_no})`, value: st.id }))] }
            placeholder={`-- เลือกจุดตรวจ/สถานีควบคุมน้ำหนัก ${required ? '*' : ''} --`}
            onChange={handleStationSelect}
            icon={<MapPin size={16} style={{ color: selectedStationId ? 'var(--primary)' : 'var(--text-muted)', marginRight: '2px' }} />}
            style={{ width: '100%' }}
          />
          <button
            type="button"
            onClick={openAddModal}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              marginTop: '2px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          >
            ➕ ไม่พบสถานี? คลิกเพื่อเพิ่มสถานีใหม่
          </button>
        </div>
      </div>

      {/* Optional Cascading Area Select */}
      {showArea && selectedStationId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
          <Select
            value={selectedAreaId || ''}
            options={[
              {
                label: areas.length === 0
                  ? '-- ยังไม่มีพื้นที่ย่อย — คลิกปุ่มด้านล่างเพื่อเพิ่ม --'
                  : '-- เลือกพื้นที่ย่อย / ช่องทางชาร์จ / เซนเซอร์ --',
                value: ''
              },
              ...areas.map(a => ({ label: a.name, value: a.id }))
            ]}
            placeholder={
              areas.length === 0
                ? '-- ยังไม่มีพื้นที่ย่อย — คลิกปุ่มด้านล่างเพื่อเพิ่ม --'
                : '-- เลือกพื้นที่ย่อย / ช่องทางชาร์จ / เซนเซอร์ --'
            }
            onChange={handleAreaSelect}
            icon={<Sliders size={16} style={{ color: selectedAreaId ? 'var(--info)' : 'var(--text-muted)', marginRight: '2px' }} />}
            style={{ width: '100%' }}
          />
          <button
            type="button"
            onClick={openAddAreaModal}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--info)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              marginTop: '2px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          >
            ➕ ไม่พบพื้นที่ย่อย? คลิกเพื่อเพิ่ม
          </button>
        </div>
      )}

      {/* Add Area Modal */}
      {isAddAreaModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-content" style={{ maxWidth: '460px', width: '90%', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 800 }}>
              ➕ เพิ่มพื้นที่ย่อยใหม่
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              เพิ่มจุด/พื้นที่ย่อยภายในสถานี <strong style={{ color: 'var(--primary)' }}>{stations.find(s => s.id === selectedStationId)?.name || ''}</strong> เช่น "ช่องทางขาเข้า", "ห้องควบคุม", "เซนเซอร์ A1"
            </p>

            <form onSubmit={handleAddAreaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>ชื่อพื้นที่ย่อย *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={100}
                  placeholder="เช่น ห้องควบคุม, ช่องทางขาเข้า, เซนเซอร์ A1"
                  value={addAreaName}
                  onChange={(e) => setAddAreaName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
              </div>

              {submitAreaError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, padding: '8px 12px', background: 'var(--danger-light)', borderRadius: '6px' }}>
                  ⚠️ {submitAreaError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddAreaModalOpen(false)}
                  disabled={isSubmittingArea}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingArea}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'var(--info, var(--primary))', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', opacity: isSubmittingArea ? 0.7 : 1 }}
                >
                  {isSubmittingArea ? 'กำลังบันทึก...' : 'บันทึกพื้นที่ย่อย'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Station Modal */}
      {isAddModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>
              ➕ เพิ่มสถานี / จุดติดตั้งใหม่
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              ⚠️ กรอกข้อมูลให้ครบทุกช่อง — สถานีคือข้อมูลแม่บทที่ใช้ในทุกการเบิก/ซ่อม/เคลม
            </p>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* ชื่อสถานี */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  ชื่อสถานี / จุดติดตั้ง <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={150}
                  placeholder="เช่น ด่านชั่งน้ำหนัก แม่ใจ (ขาออก)"
                  value={addName}
                  onChange={(e) => { setAddName(e.target.value); clearFieldError('name'); }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.name ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                {fieldErrors.name && (
                  <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.name}</p>
                )}
              </div>

              {/* ประเภทสถานี */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  ประเภทสถานี <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={addStationType}
                  onChange={(e) => {
                    setAddStationType(e.target.value);
                    if (e.target.value !== 'OTHER') setCustomStationType('');
                    clearFieldError('station_type');
                    clearFieldError('custom_type');
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.station_type ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="WEIGH_STATION">สถานีควบคุมน้ำหนักหลัก</option>
                  <option value="CHECK_POINT">จุดตรวจ (Check Point)</option>
                  <option value="SPOT_CHECK">จุดสุ่มตรวจ (Spot Check)</option>
                  <option value="OTHER">อื่นๆ (ระบุด้วยตัวเอง)</option>
                </select>
                {fieldErrors.station_type && (
                  <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.station_type}</p>
                )}
                {addStationType === 'OTHER' && (
                  <>
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="ระบุประเภทเอง เช่น จุดตรวจศุลกากร"
                      value={customStationType}
                      onChange={(e) => { setCustomStationType(e.target.value); clearFieldError('custom_type'); }}
                      style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.custom_type ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                    {fieldErrors.custom_type && (
                      <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.custom_type}</p>
                    )}
                  </>
                )}
              </div>

              {/* ผู้รับผิดชอบสถานี (NEW) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  ผู้รับผิดชอบสถานี <span style={{ color: 'var(--danger)' }}>*</span>
                  <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>(ระบุชื่อผู้ดูแลเพื่อติดตามรับผิดชอบ)</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={addResponsiblePerson}
                  onChange={(e) => { setAddResponsiblePerson(e.target.value); clearFieldError('responsible_person'); }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.responsible_person ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                {fieldErrors.responsible_person && (
                  <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.responsible_person}</p>
                )}
              </div>

              {/* จังหวัด — dropdown grouped */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  จังหวัด <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={addProvince}
                  onChange={(e) => handleAddProvinceChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.province ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="">-- เลือกจังหวัด --</option>
                  {Object.entries(provincesByRegion).map(([regionName, provinces]) => (
                    <optgroup key={regionName} label={regionName}>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                  ))}
                </select>
                {fieldErrors.province && (
                  <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.province}</p>
                )}
                {addProvince && getRegionFromProvince(addProvince) && !fieldErrors.province && (
                  <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                    ✓ ระบบเลือกภูมิภาค: <strong>{getRegionFromProvince(addProvince)}</strong> ให้อัตโนมัติ (ตรวจสอบในช่องด้านล่าง)
                  </p>
                )}
              </div>

              {/* ภูมิภาค */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  ภูมิภาค <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={addRegion}
                  onChange={handleAddRegionChange}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.region ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="">-- เลือกภูมิภาค --</option>
                  <option value="ภาคเหนือ">ภาคเหนือ</option>
                  <option value="ภาคตะวันออกเฉียงเหนือ">ภาคตะวันออกเฉียงเหนือ</option>
                  <option value="ภาคกลาง">ภาคกลาง</option>
                  <option value="ภาคตะวันออก">ภาคตะวันออก</option>
                  <option value="ภาคตะวันตก">ภาคตะวันตก</option>
                  <option value="ภาคใต้">ภาคใต้</option>
                </select>
                {fieldErrors.region && (
                  <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.region}</p>
                )}
              </div>

              {/* ทางหลวง + ทิศทาง */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    ทางหลวงหมายเลข <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="เช่น 1, 117, 304"
                    value={addHighwayNo}
                    onChange={(e) => { setAddHighwayNo(e.target.value); clearFieldError('highway_no'); }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.highway_no ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                  {fieldErrors.highway_no && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.highway_no}</p>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    ทิศทาง <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    value={addDirection}
                    onChange={(e) => { setAddDirection(e.target.value as 'INBOUND' | 'OUTBOUND' | 'BOTH' | 'NONE'); clearFieldError('direction'); }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: fieldErrors.direction ? '1.5px solid var(--danger)' : '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    <option value="INBOUND">ขาเข้า (INBOUND)</option>
                    <option value="OUTBOUND">ขาออก (OUTBOUND)</option>
                    <option value="BOTH">สองทิศทาง (BOTH)</option>
                    <option value="NONE">ไม่มีทิศทาง (NONE)</option>
                  </select>
                  {fieldErrors.direction && (
                    <p style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>⚠ {fieldErrors.direction}</p>
                  )}
                </div>
              </div>

              {/* แจ้งเตือนรวมถ้ามี error */}
              {Object.keys(fieldErrors).length > 0 && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, padding: '10px 12px', background: 'var(--danger-light)', borderRadius: '8px' }}>
                  ⚠️ มีข้อมูล {Object.keys(fieldErrors).length} ช่องที่ต้องแก้ไข — โปรดตรวจสอบช่องที่ขีดเส้นแดง
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสถานีใหม่'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StationSelector;
