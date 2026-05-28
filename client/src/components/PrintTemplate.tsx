import React from 'react';
import type { RepairDetail } from '../types';
import { UPLOAD_URL } from '../api';
import { 
  Hash, 
  User, 
  Calendar, 
  Laptop, 
  MapPin, 
  AlertCircle, 
  CheckCircle2,
  Wrench,
  FileText,
  Settings
} from 'lucide-react';

interface Props {
  repair: RepairDetail;
  isPreview?: boolean;
}

const PrintTemplate: React.FC<Props> = ({ repair, isPreview }) => {
  const brandDarkBlue = '#0a2540';
  const brandPrimaryBlue = '#0066cc';
  const brandLightBlue = '#f0f9ff';
  const brandBorderBlue = '#bae6fd';
  const textDark = '#1e293b';
  const textMuted = '#64748b';

  // Compact section header style
  const sectionHeader = (border: string, bg: string): React.CSSProperties => ({
    background: bg,
    padding: '4px 10px',
    borderBottom: `1px solid ${border}`,
    borderLeft: `3px solid ${brandPrimaryBlue}`,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  });

  // card wrapper
  const card: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#fff',
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes(' ') && !dateStr.includes('T')) {
      return new Date(dateStr.replace(' ', 'T') + 'Z');
    }
    return new Date(dateStr);
  };

  return (
    <div 
      id="pdf-print-template" 
      style={{ 
        width: '210mm', 
        height: '297mm',
        maxHeight: '297mm',
        padding: '10mm 12mm', 
        backgroundColor: 'white', 
        color: textDark,
        fontFamily: '"Sarabun", sans-serif',
        fontSize: '13px',
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? '0' : '-9999px',
        top: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflow: 'hidden'
      }}
    >
      {/* ═══ HEADER ═══ */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `3px solid ${brandPrimaryBlue}`,
        paddingBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            backgroundColor: brandLightBlue, 
            padding: '5px 6px', 
            borderRadius: '6px', 
            border: `1px solid ${brandBorderBlue}`,
            display: 'flex', alignItems: 'center',
          }}>
            <Wrench size={18} color={brandPrimaryBlue} />
          </div>
          <div>
            <h1 style={{ color: brandDarkBlue, fontSize: '16px', margin: 0, fontWeight: 800, lineHeight: 1.2 }}>
              {repair.type === 'claim' ? 'ใบรายงานการดำเนินการเคลมอุปกรณ์' : 'ใบรายงานการดำเนินการซ่อมและบำรุงรักษา'}
            </h1>
            <p style={{ margin: 0, fontSize: '9px', color: brandPrimaryBlue, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Repair &amp; Equipment Replacement System
            </p>
          </div>
        </div>
        <span style={{ 
          fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
          backgroundColor: repair.status === 'เสร็จสิ้น' ? '#dcfce7' : repair.status === 'กำลังซ่อม' ? '#e0f2fe' : repair.status === 'รออะไหล่' ? '#fef9c3' : '#f1f5f9',
          color: repair.status === 'เสร็จสิ้น' ? '#15803d' : repair.status === 'กำลังซ่อม' ? '#0066cc' : repair.status === 'รออะไหล่' ? '#ca8a04' : '#475569',
          border: `1px solid ${repair.status === 'เสร็จสิ้น' ? '#bbf7d0' : repair.status === 'กำลังซ่อม' ? '#bae6fd' : repair.status === 'รออะไหล่' ? '#fef08a' : '#cbd5e1'}`,
        }}>
          {repair.status}
        </span>
      </header>

      {/* ═══ INFO BAND ═══ */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: `1px solid ${brandBorderBlue}`,
        borderLeft: `4px solid ${brandPrimaryBlue}`,
        borderRadius: '6px',
        padding: '8px 12px',
      }}>
        {/* Col 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <Hash size={11} color={brandPrimaryBlue} />
            <span style={{ color: textMuted }}>เลขที่ใบงาน:</span>
            <strong style={{ color: brandDarkBlue, marginLeft: '2px' }}>{repair.ticket_no}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <FileText size={11} color={brandPrimaryBlue} />
            <span style={{ color: textMuted }}>ประเภทงาน:</span>
            <strong style={{ color: brandDarkBlue, marginLeft: '2px' }}>
              {repair.type === 'claim' ? 'เคลมอุปกรณ์' : 'ซ่อมและบำรุงรักษา'}
            </strong>
          </div>
        </div>
        {/* Col 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <User size={11} color={brandPrimaryBlue} />
            <span style={{ color: textMuted }}>ผู้แจ้ง:</span>
            <strong style={{ color: brandDarkBlue, marginLeft: '2px' }}>{repair.reporter}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <MapPin size={11} color={brandPrimaryBlue} />
            <span style={{ color: textMuted }}>สถานที่:</span>
            <strong style={{ color: brandDarkBlue, marginLeft: '2px' }}>{repair.location}</strong>
          </div>
        </div>
        {/* Col 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <Calendar size={11} color={brandPrimaryBlue} />
            <span style={{ color: textMuted }}>วันที่แจ้ง:</span>
            <strong style={{ color: brandDarkBlue, marginLeft: '2px' }}>
              {parseDate(repair.created_at).toLocaleDateString('th-TH')}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <AlertCircle size={11} color={brandPrimaryBlue} />
            <span style={{ color: textMuted }}>ความสำคัญ:</span>
            <span style={{ 
              marginLeft: '2px', fontWeight: 700,
              color: repair.priority === 'วิกฤต' || repair.priority === 'ด่วนมาก' ? '#dc2626' : repair.priority === 'ด่วน' ? '#ca8a04' : '#16a34a' 
            }}>
              {repair.priority}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ PROBLEM + SUMMARY (side by side) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Problem */}
        <div style={card}>
          <div style={sectionHeader(brandBorderBlue, 'linear-gradient(90deg,#f0f9ff,#fff)')}>
            <Laptop size={12} color={brandPrimaryBlue} />
            <strong style={{ fontSize: '11px', color: brandDarkBlue }}>รายละเอียดปัญหา</strong>
          </div>
          <div style={{ padding: '10px 12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px', boxSizing: 'border-box' }}>
            <p style={{ margin: 0 }}>
              <strong>อุปกรณ์/รุ่น:</strong> <span style={{ color: '#334155' }}>{repair.device_name}</span>
            </p>
            <div style={{ flex: 1, padding: '8px 10px', background: '#f8fafc', border: '1px dashed #bae6fd', borderRadius: '5px', minHeight: '75px', boxSizing: 'border-box' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '9px', color: textMuted, fontWeight: 600 }}>ปัญหาที่พบ/อาการเสีย:</p>
              <p style={{ margin: 0, lineHeight: '1.4', color: '#334155' }}>{repair.problem}</p>
            </div>
            <div style={{ flex: 1, padding: '8px 10px', background: '#f8fafc', border: '1px dashed #bae6fd', borderRadius: '5px', minHeight: '75px', boxSizing: 'border-box' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '9px', color: textMuted, fontWeight: 600 }}>สาเหตุของปัญหา (Cause of Problem):</p>
              <p style={{ margin: 0, lineHeight: '1.4', color: '#94a3b8' }}>........................................................................................................................</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={card}>
          <div style={{ ...sectionHeader('#bbf7d0', 'linear-gradient(90deg,#f0fdf4,#fff)'), borderLeft: '3px solid #16a34a' }}>
            <CheckCircle2 size={12} color="#16a34a" />
            <strong style={{ fontSize: '11px', color: '#14532d' }}>สรุปผลการดำเนินการ</strong>
          </div>
          <div style={{ padding: '10px 12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px', boxSizing: 'border-box' }}>
            <div style={{ flex: 1, padding: '8px 10px', background: '#f0fdf4', border: '1px dashed #bbf7d0', borderRadius: '5px', minHeight: '75px', boxSizing: 'border-box' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '9px', color: '#16a34a', fontWeight: 600 }}>ผลการดำเนินการ (Action taken):</p>
              <p style={{ margin: 0, lineHeight: '1.4', color: '#334155' }}>{repair.repair_note || '-'}</p>
            </div>
            <div style={{ flex: 1, padding: '8px 10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '5px', minHeight: '75px', boxSizing: 'border-box' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '9px', color: textMuted, fontWeight: 600 }}>ข้อเสนอแนะเพิ่มเติม (Suggestions):</p>
              <p style={{ margin: 0, lineHeight: '1.4', color: '#94a3b8' }}>........................................................................................................................</p>
            </div>
            <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: '6px', fontSize: '9px', color: textMuted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong>ผู้ดำเนินการ:</strong> <strong style={{ color: '#0f172a' }}>{repair.technician || '-'}</strong></span>
              <span><strong>วันที่เสร็จสิ้น:</strong> <strong style={{ color: '#0f172a' }}>{repair.status === 'เสร็จสิ้น' ? parseDate(repair.updated_at).toLocaleDateString('th-TH') : '-'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ REPLACEMENT TABLE ═══ */}
      <div style={card}>
        <div style={sectionHeader(brandBorderBlue, 'linear-gradient(90deg,#f0f9ff,#fff)')}>
          <Settings size={12} color={brandPrimaryBlue} />
          <strong style={{ fontSize: '11px', color: brandDarkBlue }}>รายการอะไหล่ที่เปลี่ยน</strong>
        </div>
        <div style={{ padding: '8px 10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f9ff' }}>
                <th style={{ border: '1px solid #e0f2fe', padding: '5px 8px', textAlign: 'center', color: '#0369a1', width: '6%' }}>ลำดับ</th>
                <th style={{ border: '1px solid #e0f2fe', padding: '5px 8px', textAlign: 'left', color: '#0369a1', width: '37%' }}>อุปกรณ์เดิม (ถอดออก)</th>
                <th style={{ border: '1px solid #e0f2fe', padding: '5px 8px', textAlign: 'left', color: '#0369a1', width: '37%' }}>อุปกรณ์ใหม่ (ติดตั้งทดแทน)</th>
                <th style={{ border: '1px solid #e0f2fe', padding: '5px 8px', textAlign: 'center', color: '#0369a1', width: '6%' }}>จำนวน</th>
                <th style={{ border: '1px solid #e0f2fe', padding: '5px 8px', textAlign: 'right', color: '#0369a1', width: '8%' }}>ราคา (บาท)</th>
                <th style={{ border: '1px solid #e0f2fe', padding: '5px 8px', textAlign: 'left', color: '#0369a1', width: '12%' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, idx) => {
                const dev = repair.devices && repair.devices[idx];
                return (
                  <tr key={idx} style={{ height: '24px' }}>
                    <td style={{ border: '1px solid #e0f2fe', padding: '3px 8px', color: '#64748b', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #e0f2fe', padding: '3px 8px', color: dev ? '#475569' : '#e2e8f0' }}>
                      {dev ? `${dev.old_model} / S/N: ${dev.old_serial}` : '.........................................................................................'}
                    </td>
                    <td style={{ border: '1px solid #e0f2fe', padding: '3px 8px', color: dev ? '#0f172a' : '#e2e8f0', fontWeight: dev ? 600 : 'normal' }}>
                      {dev ? `${dev.new_model} / S/N: ${dev.new_serial}` : '.........................................................................................'}
                    </td>
                    <td style={{ border: '1px solid #e0f2fe', padding: '3px 8px', color: '#475569', textAlign: 'center' }}>
                      {dev ? '1' : ''}
                    </td>
                    <td style={{ border: '1px solid #e0f2fe', padding: '3px 8px', color: '#475569', textAlign: 'right' }}>
                      {dev ? '-' : ''}
                    </td>
                    <td style={{ border: '1px solid #e0f2fe', padding: '3px 8px', color: '#475569' }}>
                      {dev ? '' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ IMAGES ═══ */}
      <div style={card}>
        <div style={sectionHeader(brandBorderBlue, 'linear-gradient(90deg,#f0f9ff,#fff)')}>
          <FileText size={12} color={brandPrimaryBlue} />
          <strong style={{ fontSize: '11px', color: brandDarkBlue }}>รูปภาพหลักฐาน</strong>
        </div>
        <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Array.from({ length: 4 }).map((_, idx) => {
            const img = repair.images && repair.images[idx];
            if (img) {
              const timestamp = parseDate(img.uploaded_at).getTime();
              return (
                <div 
                  key={img.id} 
                  style={{ 
                    border: '1px solid #bae6fd', padding: '4px', borderRadius: '6px',
                    backgroundColor: '#f8fafc', height: '195px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                  }}
                >
                  <img 
                    src={`${UPLOAD_URL}/${img.file_path}?t=${timestamp}`} 
                    crossOrigin="anonymous" 
                    alt={`evidence-${idx}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                </div>
              );
            } else {
              return (
                <div 
                  key={`empty-${idx}`} 
                  style={{ 
                    border: '1px dashed #cbd5e1', padding: '4px', borderRadius: '6px',
                    backgroundColor: '#f8fafc', height: '195px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    color: '#94a3b8', fontSize: '9px', gap: '6px'
                  }}
                >
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '50%', padding: '8px', backgroundColor: '#fff' }}>
                    <FileText size={16} color="#cbd5e1" />
                  </div>
                  <span>รูปภาพหลักฐาน {idx + 1}</span>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* ═══ SIGNATURES ═══ */}
      <div style={{ 
        marginTop: 'auto', 
        borderTop: '1px solid #e2e8f0', 
        paddingTop: '14px', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Column 1: ผู้แจ้งซ่อม / ผู้รับมอบงาน */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #94a3b8', width: '130px', margin: '0 auto 8px auto', height: '35px' }}></div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '11px', color: textDark }}>ลงชื่อ ............................................</p>
          <p style={{ margin: '3px 0 0 0', color: textMuted, fontSize: '10px' }}>({repair.reporter})</p>
          <p style={{ margin: '1px 0 0 0', color: textMuted, fontSize: '9px', fontWeight: 500 }}>ผู้แจ้งซ่อม / ผู้รับมอบงาน</p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '9px' }}>วันที่: ....../……/……</p>
        </div>

        {/* Column 2: ช่างผู้ซ่อม / ผู้ส่งมอบงาน */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #94a3b8', width: '130px', margin: '0 auto 8px auto', height: '35px' }}></div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '11px', color: textDark }}>ลงชื่อ ............................................</p>
          <p style={{ margin: '3px 0 0 0', color: textMuted, fontSize: '10px' }}>({repair.technician || '............................................'})</p>
          <p style={{ margin: '1px 0 0 0', color: textMuted, fontSize: '9px', fontWeight: 500 }}>ช่างผู้ดำเนินการ / ผู้ส่งมอบงาน</p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '9px' }}>วันที่: ....../……/……</p>
        </div>

        {/* Column 3: ผู้อนุมัติ / ผู้ตรวจรับ */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #94a3b8', width: '130px', margin: '0 auto 8px auto', height: '35px' }}></div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '11px', color: textDark }}>ลงชื่อ ............................................</p>
          <p style={{ margin: '3px 0 0 0', color: textMuted, fontSize: '10px' }}>(............................................)</p>
          <p style={{ margin: '1px 0 0 0', color: textMuted, fontSize: '9px', fontWeight: 500 }}>ผู้อนุมัติ / ผู้ตรวจรับ</p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '9px' }}>วันที่: ....../……/……</p>
        </div>
      </div>

      {/* ═══ SYSTEM NOTE ═══ */}
      <p style={{ margin: 0, fontSize: '8px', color: '#94a3b8', textAlign: 'center', letterSpacing: '0.3px' }}>
        เอกสารฉบับนี้ถูกสร้างและลงบันทึกในระบบจัดการงานซ่อมบำรุงและเปลี่ยนอะไหล่โดยอัตโนมัติ (Repair Tracking System)
      </p>
    </div>
  );
};

export default PrintTemplate;
