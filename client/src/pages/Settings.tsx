import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { useNotification } from '../components/Layout';
import { settingsApi, UPLOAD_URL } from '../api';
import type { Company, CompanyLogo } from '../types';
import {
  Building2,
  Save,
  Image as ImageIcon,
  Upload,
  Trash2,
  Star,
  StarOff,
  Loader2,
  Settings as SettingsIcon,
  Plus,
  Check,
  X
} from 'lucide-react';

const emptyCompany = (): Company => ({
  id: 0,
  name_th: '',
  name_en: '',
  name_short: '',
  address: '',
  phone: '',
  email: '',
  tax_id: '',
  website: '',
  is_default: 0,
});

const Settings: React.FC = () => {
  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Company>(emptyCompany());
  const [isCreating, setIsCreating] = useState(false);

  const [logos, setLogos] = useState<CompanyLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const list = await settingsApi.getCompanies();
      setCompanies(list);
      if (list.length > 0 && selectedId === null) {
        const defaultCompany = list.find((c) => c.is_default === 1) || list[0];
        setSelectedId(defaultCompany.id);
        setForm(defaultCompany);
      }
    } catch {
      notify('ไม่สามารถโหลดข้อมูลบริษัทได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedId]);

  const fetchLogos = useCallback(async (companyId: number) => {
    try {
      const list = await settingsApi.getLogos(companyId);
      setLogos(list);
    } catch {
      notify('ไม่สามารถโหลดโลโก้ได้', 'error');
    }
  }, [notify]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (selectedId && !isCreating) {
      fetchLogos(selectedId);
    } else {
      setLogos([]);
    }
  }, [selectedId, isCreating, fetchLogos]);

  const handleSelectCompany = (company: Company) => {
    setSelectedId(company.id);
    setForm(company);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedId(null);
    setForm(emptyCompany());
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    if (companies.length > 0) {
      const target = companies.find((c) => c.is_default === 1) || companies[0];
      setSelectedId(target.id);
      setForm(target);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_th.trim()) {
      notify('กรุณาระบุชื่อบริษัท (ภาษาไทย)', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const result = await settingsApi.createCompany(form);
        notify('เพิ่มบริษัทเรียบร้อย');
        setIsCreating(false);
        setSelectedId(result.id);
        const list = await settingsApi.getCompanies();
        setCompanies(list);
        const newCompany = list.find((c) => c.id === result.id);
        if (newCompany) setForm(newCompany);
      } else if (selectedId) {
        await settingsApi.updateCompany(selectedId, form);
        notify('บันทึกข้อมูลบริษัทเรียบร้อย');
        await fetchCompanies();
      }
    } catch {
      notify('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedId) return;
    if (companies.length <= 1) {
      notify('ต้องมีบริษัทอย่างน้อย 1 อันในระบบ', 'error');
      return;
    }
    if (!window.confirm(`ลบบริษัท "${form.name_th}" ใช่หรือไม่?\n(โลโก้ทั้งหมดของบริษัทนี้จะถูกลบด้วย)`)) return;
    try {
      await settingsApi.deleteCompany(selectedId);
      notify('ลบบริษัทเรียบร้อย');
      setSelectedId(null);
      await fetchCompanies();
    } catch {
      notify('ไม่สามารถลบได้', 'error');
    }
  };

  const handleSetDefaultCompany = async () => {
    if (!selectedId) return;
    try {
      await settingsApi.setDefaultCompany(selectedId);
      notify('ตั้งเป็นบริษัทหลักเรียบร้อย');
      await fetchCompanies();
    } catch {
      notify('ไม่สามารถตั้งค่าได้', 'error');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;

    if (!file.type.startsWith('image/')) {
      notify('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('ไฟล์ต้องไม่เกิน 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('label', file.name.replace(/\.[^.]+$/, ''));
      formData.append('company_id', String(selectedId));
      await settingsApi.uploadLogo(formData);
      notify('อัปโหลดโลโก้สำเร็จ');
      await fetchLogos(selectedId);
    } catch {
      notify('อัปโหลดล้มเหลว', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetDefaultLogo = async (id: number) => {
    if (!selectedId) return;
    try {
      await settingsApi.setDefaultLogo(id);
      notify('ตั้งเป็นโลโก้หลักของบริษัทแล้ว');
      await fetchLogos(selectedId);
    } catch {
      notify('ไม่สามารถตั้งค่าได้', 'error');
    }
  };

  const handleDeleteLogo = async (id: number, label: string) => {
    if (!selectedId) return;
    if (!window.confirm(`ลบโลโก้ "${label}" ใช่หรือไม่?`)) return;
    try {
      await settingsApi.deleteLogo(id);
      notify('ลบโลโก้เรียบร้อย');
      await fetchLogos(selectedId);
    } catch {
      notify('ไม่สามารถลบได้', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={32} className="spinner" /> กำลังโหลด...
      </div>
    );
  }

  const selectedCompany = companies.find((c) => c.id === selectedId);
  const hasSelection = selectedId !== null || isCreating;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-title">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SettingsIcon size={28} color="var(--primary)" />
            ตั้งค่าระบบ
          </h2>
          <p>จัดการบริษัทและโลโก้สำหรับเอกสาร PDF — รองรับหลายบริษัท เลือกใช้ตอนปริ้นได้</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* ============ LEFT: Company List ============ */}
        <Card style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem' }}>
              <Building2 size={18} color="var(--primary)" />
              บริษัท ({companies.length})
            </h3>
            <Button variant="primary" icon={<Plus size={14} />} onClick={handleStartCreate} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              เพิ่ม
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {companies.map((company) => {
              const isActive = company.id === selectedId && !isCreating;
              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => handleSelectCompany(company)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: isActive ? 'var(--primary-light)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {company.name_th || '(ไม่มีชื่อ)'}
                    </span>
                    {company.is_default === 1 && (
                      <span style={{
                        fontSize: '0.65rem',
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}>
                        <Star size={9} fill="white" /> หลัก
                      </span>
                    )}
                  </div>
                  {company.name_en && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {company.name_en}
                    </span>
                  )}
                </button>
              );
            })}

            {isCreating && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '2px dashed var(--primary)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--primary)',
              }}>
                <Plus size={14} /> บริษัทใหม่ (ยังไม่บันทึก)
              </div>
            )}
          </div>
        </Card>

        {/* ============ RIGHT: Selected Company Detail ============ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {!hasSelection ? (
            <Card style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Building2 size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div>เลือกบริษัทจากรายการด้านซ้าย หรือกด "เพิ่ม" เพื่อสร้างใหม่</div>
            </Card>
          ) : (
            <>
              {/* Company Info Form */}
              <Card style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.15rem' }}>
                    <Building2 size={20} color="var(--primary)" />
                    {isCreating ? 'เพิ่มบริษัทใหม่' : 'ข้อมูลบริษัท'}
                  </h3>
                  {!isCreating && selectedCompany && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {selectedCompany.is_default !== 1 && (
                        <Button variant="outline" icon={<Star size={14} />} onClick={handleSetDefaultCompany} style={{ fontSize: '0.8rem' }}>
                          ตั้งเป็นหลัก
                        </Button>
                      )}
                      <Button variant="outline" icon={<Trash2 size={14} />} onClick={handleDeleteCompany} style={{ fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                        ลบบริษัทนี้
                      </Button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSave}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                      <Input
                        label="ชื่อบริษัท (ไทย)"
                        required
                        value={form.name_th}
                        onChange={(e) => setForm({ ...form, name_th: e.target.value })}
                        placeholder="บริษัท ตัวอย่าง จำกัด"
                      />
                      <Input
                        label="ชื่อย่อ (ใช้ในเมนู)"
                        value={form.name_short || ''}
                        onChange={(e) => setForm({ ...form, name_short: e.target.value })}
                        placeholder="ABC"
                      />
                    </div>
                    <Input
                      label="ชื่อบริษัท (อังกฤษ)"
                      value={form.name_en}
                      onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                      placeholder="Example Co., Ltd."
                    />
                    <TextArea
                      label="ที่อยู่"
                      rows={3}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="123 ถนน... แขวง... เขต... กรุงเทพฯ 10000"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Input
                        label="เบอร์โทรศัพท์"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="02-xxx-xxxx"
                      />
                      <Input
                        label="อีเมล"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="info@example.com"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Input
                        label="เลขประจำตัวผู้เสียภาษี"
                        value={form.tax_id}
                        onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                        placeholder="0-0000-00000-00-0"
                      />
                      <Input
                        label="เว็บไซต์"
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="www.example.com"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {isCreating && (
                      <Button type="button" variant="outline" icon={<X size={16} />} onClick={handleCancelCreate}>
                        ยกเลิก
                      </Button>
                    )}
                    <Button type="submit" variant="primary" icon={isCreating ? <Check size={16} /> : <Save size={16} />} loading={saving}>
                      {isCreating ? 'สร้างบริษัท' : 'บันทึกข้อมูล'}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Logos Manager — only show for saved companies */}
              {!isCreating && selectedId !== null && (
                <Card style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.15rem' }}>
                      <ImageIcon size={20} color="var(--primary)" />
                      โลโก้ของบริษัทนี้ ({logos.length})
                    </h3>
                    <Button
                      variant="primary"
                      icon={<Upload size={16} />}
                      onClick={() => fileInputRef.current?.click()}
                      loading={uploading}
                      disabled={uploading}
                    >
                      อัปโหลดโลโก้
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1.25rem' }}>
                    โลโก้ของแต่ละบริษัทแยกกัน — โลโก้ที่ติดดาว = ค่าเริ่มต้นของบริษัทนี้ (ไฟล์ &le; 5MB)
                  </p>

                  {logos.length === 0 ? (
                    <div style={{
                      border: '2px dashed var(--border)',
                      borderRadius: '12px',
                      padding: '3rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}>
                      <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <div style={{ fontSize: '0.9rem' }}>ยังไม่มีโลโก้สำหรับบริษัทนี้</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>คลิกปุ่ม "อัปโหลดโลโก้" เพื่อเริ่มต้น</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                      {logos.map((logo) => (
                        <div
                          key={logo.id}
                          style={{
                            border: logo.is_default ? '2px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: 'var(--bg-card)',
                            position: 'relative',
                          }}
                        >
                          {logo.is_default === 1 && (
                            <div style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              background: 'var(--primary)',
                              color: 'white',
                              fontSize: '0.65rem',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              zIndex: 1,
                            }}>
                              <Star size={10} fill="white" /> ค่าเริ่มต้น
                            </div>
                          )}
                          <div style={{
                            width: '100%',
                            height: '120px',
                            background: 'var(--bg-app)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                          }}>
                            <img
                              src={`${UPLOAD_URL}/uploads/${logo.file_path}`}
                              alt={logo.label}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div style={{ padding: '8px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {logo.label}
                          </div>
                          <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                            <button
                              type="button"
                              disabled={logo.is_default === 1}
                              onClick={() => handleSetDefaultLogo(logo.id)}
                              style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                background: 'transparent',
                                cursor: logo.is_default === 1 ? 'default' : 'pointer',
                                color: logo.is_default === 1 ? 'var(--text-muted)' : 'var(--primary)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                              }}
                              title={logo.is_default === 1 ? 'นี่คือโลโก้ค่าเริ่มต้น' : 'ตั้งเป็นค่าเริ่มต้น'}
                            >
                              {logo.is_default === 1 ? <Star size={12} fill="currentColor" /> : <StarOff size={12} />}
                              {logo.is_default === 1 ? 'หลัก' : 'ตั้งหลัก'}
                            </button>
                            <div style={{ width: '1px', background: 'var(--border)' }} />
                            <button
                              type="button"
                              onClick={() => handleDeleteLogo(logo.id, logo.label)}
                              style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--danger)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                              }}
                              title="ลบโลโก้"
                            >
                              <Trash2 size={12} /> ลบ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
