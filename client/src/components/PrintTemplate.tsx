import React from 'react';
import type { RepairDetail } from '../types';
import { UPLOAD_URL } from '../api';
import { 
  User, 
  Calendar, 
  Laptop, 
  CheckCircle2,
  FileText,
  QrCode
} from 'lucide-react';

interface Props {
  repair: RepairDetail;
  isPreview?: boolean;
}

const PrintTemplate: React.FC<Props> = ({ repair, isPreview }) => {
  const isClaim = repair.type === 'claim';
  
  // Dashboard Theme Palette
  const primaryColor = isClaim ? '#ea580c' : '#0284c7'; // Dark Orange vs Sky Blue
  const accentColor = isClaim ? '#f97316' : '#0ea5e9'; // Orange vs Light Blue
  const lightBgColor = isClaim ? '#fff7ed' : '#f0f9ff'; // Warm Amber vs Ice Blue
  const textDark = '#0f172a';
  const textMuted = '#64748b';
  const borderColor = '#e2e8f0'; // Modern soft border
  
  const cardStyle = {
    border: `1px solid ${borderColor}`,
    borderRadius: '10px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    overflow: 'hidden'
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes(' ') && !dateStr.includes('T')) {
      return new Date(dateStr.replace(' ', 'T') + 'Z');
    }
    return new Date(dateStr);
  };

  const dateObj = parseDate(repair.created_at);
  const devices = repair.devices || [];

  return (
    <div 
      id="pdf-print-template" 
      style={{ 
        width: '210mm',
        padding: '12mm', 
        backgroundColor: 'white', 
        color: textDark,
        fontFamily: '"Sarabun", sans-serif',
        fontSize: '12px',
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? '0' : '-9999px',
        top: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Top Gradient Accent Band */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: '6px', 
        backgroundImage: `linear-gradient(90deg, ${primaryColor}, ${accentColor})` 
      }} />

      {/* ═══ HEADER (Dashboard Style) ═══ */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `2px solid ${borderColor}`,
        paddingBottom: '14px',
        marginTop: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: lightBgColor, 
            padding: '8px', 
            borderRadius: '10px', 
            border: `1.5px solid ${accentColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Laptop size={24} color={primaryColor} />
          </div>
          <div>
            <h1 style={{ color: textDark, fontSize: '18px', margin: 0, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.3px' }}>
              CMA - CENTRAL MAINTENANCE & ASSET
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '10.5px', color: primaryColor, fontWeight: 700 }}>
              ระบบบริหารจัดการงานซ่อมบำรุงและพัสดุอุปกรณ์
            </p>
            <p style={{ margin: '1px 0 0 0', fontSize: '8.5px', color: textMuted }}>
              Ref. Document — For internal use only | ใช้ภายในองค์กรเท่านั้น
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: 800, 
            color: textDark, 
            letterSpacing: '0.3px',
            backgroundColor: lightBgColor,
            border: `1px solid ${borderColor}`,
            padding: '4px 12px',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            {isClaim ? 'ใบคำขอเคลมประกันสินค้า' : 'ใบสั่งงานซ่อมบำรุงรักษา'}
          </div>
          <div style={{ marginTop: '5px' }}>
            <span style={{ 
              backgroundColor: '#f1f5f9', 
              color: textDark, 
              padding: '2px 8px', 
              borderRadius: '20px', 
              fontSize: '10px', 
              fontWeight: 700, 
              border: `1px solid ${borderColor}`
            }}>
              เลขที่: {repair.ticket_no}
            </span>
          </div>
        </div>
      </header>

      {/* ═══ INFO GRID (KPI Dashboard Cards) ═══ */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '12px'
      }}>
        {/* Card 1: Document Info */}
        <div style={{ 
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '10px 12px',
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={13} color={accentColor} />
            <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>ข้อมูลเอกสาร</span>
          </div>
          <div style={{ fontSize: '10px', color: textDark }}>
            <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>ประเภทเอกสาร:</span>
            <strong>{isClaim ? 'เคลมประกัน / ส่งศูนย์' : 'ซ่อมบำรุง / ปรับปรุง'}</strong>
          </div>
          <div style={{ fontSize: '10px', color: textDark }}>
            <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>โครงการ / งาน:</span>
            <strong>{repair.project_name || '-'}</strong>
          </div>
        </div>

        {/* Card 2: User & Location */}
        <div style={{ 
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '10px 12px',
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={13} color={accentColor} />
            <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>ผู้รับผิดชอบ & หน้างาน</span>
          </div>
          <div style={{ fontSize: '10px', color: textDark }}>
            <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>ผู้เบิก / หน่วยงาน:</span>
            <strong>{repair.reporter}</strong>
          </div>
          <div style={{ fontSize: '10px', color: textDark }}>
            <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>สถานที่ / หน้างาน:</span>
            <strong>{repair.location || '-'}</strong>
          </div>
        </div>

        {/* Card 3: Priority & Schedule */}
        <div style={{ 
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '10px 12px',
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} color={accentColor} />
            <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>ความสำคัญ & วันเวลา</span>
          </div>
          <div style={{ fontSize: '10px', color: textDark }}>
            <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>วันที่แจ้งข้อมูล:</span>
            <strong>{dateObj.toLocaleDateString('th-TH')}</strong>
          </div>
          <div style={{ fontSize: '10px', color: textDark }}>
            <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>ระดับความสำคัญ:</span>
            <span style={{ 
              color: repair.priority === 'วิกฤต' || repair.priority === 'ด่วนมาก' ? '#ef4444' : textDark,
              fontWeight: 800
            }}>
              {repair.priority}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ PROBLEM + RESOLUTION (Dashboard style double cards) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', pageBreakInside: 'avoid' }}>
        {/* Problem Card */}
        <div style={cardStyle}>
          <div style={{ 
            background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
            borderBottom: `1px solid ${borderColor}`, 
            padding: '6px 12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Laptop size={13} color={primaryColor} />
              <strong style={{ fontSize: '10.5px', color: textDark }}>รายละเอียดอุปกรณ์และอาการเสีย</strong>
            </div>
            <span style={{ fontSize: '8px', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Issue Details</span>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '135px', boxSizing: 'border-box' }}>
            <div>
              <span style={{ color: textMuted, fontSize: '8.5px', display: 'block' }}>เครื่อง / อุปกรณ์ / รุ่น:</span>
              <div style={{ fontSize: '11px', fontWeight: 800, color: primaryColor }}>{repair.device_name}</div>
            </div>
            <div style={{ 
              border: `1.5px dashed ${borderColor}`, 
              borderRadius: '6px', 
              padding: '8px', 
              backgroundColor: '#fafafa', 
              flex: 1 
            }}>
              <span style={{ color: textMuted, fontSize: '8px', display: 'block', fontWeight: 700 }}>อาการเสียที่ตรวจพบ:</span>
              <div style={{ fontSize: '10px', color: textDark, lineHeight: 1.35, whiteSpace: 'pre-line' }}>{repair.problem}</div>
            </div>
          </div>
        </div>

        {/* Resolution Card */}
        <div style={cardStyle}>
          <div style={{ 
            background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
            borderBottom: `1px solid ${borderColor}`, 
            padding: '6px 12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} color={primaryColor} />
              <strong style={{ fontSize: '10.5px', color: textDark }}>สรุปผลการซ่อมบำรุงรักษา</strong>
            </div>
            <span style={{ 
              fontSize: '8.5px', 
              fontWeight: 800, 
              color: repair.status === 'เสร็จสิ้น' ? '#10b981' : '#f97316',
              backgroundColor: repair.status === 'เสร็จสิ้น' ? '#ecfdf5' : '#fff7ed',
              padding: '1px 6px',
              borderRadius: '10px',
              border: `1px solid ${repair.status === 'เสร็จสิ้น' ? '#d1fae5' : '#ffedd5'}`
            }}>{repair.status}</span>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '135px', boxSizing: 'border-box' }}>
            <div style={{ 
              border: `1.5px dashed ${borderColor}`, 
              borderRadius: '6px', 
              padding: '8px', 
              backgroundColor: '#fcfcfc', 
              flex: 1 
            }}>
              <span style={{ color: textMuted, fontSize: '8px', display: 'block', fontWeight: 700 }}>การแก้ไข / บันทึกช่าง:</span>
              <div style={{ fontSize: '10px', color: textDark, lineHeight: 1.35, whiteSpace: 'pre-line' }}>{repair.repair_note || '-'}</div>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.2fr 0.8fr', 
              gap: '6px', 
              fontSize: '9.5px', 
              borderTop: `1px solid ${borderColor}`, 
              paddingTop: '6px' 
            }}>
              <div>
                <span style={{ color: textMuted, fontSize: '8px' }}>ช่างผู้ซ่อม/ผู้ดูแล:</span>
                <div style={{ fontWeight: 800, color: textDark }}>{repair.technician || '-'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: textMuted, fontSize: '8px' }}>ผู้ประเมินผล:</span>
                <div style={{ fontWeight: 800, color: primaryColor }}>{repair.reporter}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ REPLACEMENT PARTS TABLE (Dashboard Clean style) ═══ */}
      <div style={{ ...cardStyle, pageBreakInside: 'avoid' }}>
        <div style={{ 
          background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
          borderBottom: `1px solid ${borderColor}`, 
          padding: '6px 12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px' 
        }}>
          <FileText size={13} color={primaryColor} />
          <strong style={{ fontSize: '10.5px', color: textDark }}>บันทึกรายการอะไหล่ / อุปกรณ์ที่ติดตั้งทดแทน</strong>
        </div>
        <div style={{ padding: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: primaryColor, color: '#fff' }}>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '8%', borderRadius: '4px 0 0 4px', fontWeight: 700 }}>ลำดับ</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', width: '43%', fontWeight: 700 }}>อุปกรณ์เดิม (ถอดออก)</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', width: '43%', fontWeight: 700 }}>อุปกรณ์ใหม่ (ติดตั้งแทน)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '6%', borderRadius: '0 4px 4px 0', fontWeight: 700 }}>จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, idx) => {
                const item = devices[idx];
                return (
                  <tr 
                    key={idx} 
                    style={{ 
                      height: '24px',
                      backgroundColor: idx % 2 === 1 ? '#f8fafc' : 'transparent',
                      borderBottom: `1px solid ${borderColor}`
                    }}
                  >
                    <td style={{ padding: '3px 8px', textAlign: 'center', color: textMuted, fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '3px 8px', color: item ? textDark : '#cbd5e1' }}>
                      {item ? `${item.old_model} (S/N: ${item.old_serial})` : '.........................................................................................'}
                    </td>
                    <td style={{ padding: '3px 8px', color: item ? textDark : '#cbd5e1', fontWeight: item ? 700 : 'normal' }}>
                      {item ? `${item.new_model} (S/N: ${item.new_serial})` : '.........................................................................................'}
                    </td>
                    <td style={{ padding: '3px 8px', textAlign: 'center', color: primaryColor, fontWeight: 800 }}>
                      {item ? '1' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ EVIDENCE IMAGES GRID (ตารางกรอบรูป Dashboard Infographic) ═══ */}
      <div style={{ ...cardStyle, pageBreakInside: 'avoid' }}>
        <div style={{ 
          background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
          borderBottom: `1px solid ${borderColor}`, 
          padding: '6px 12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px' 
        }}>
          <FileText size={13} color={primaryColor} />
          <strong style={{ fontSize: '10.5px', color: textDark }}>ตารางภาพถ่ายหลักฐานประกอบอาการเสีย / หลักฐานการซ่อมเคลม</strong>
        </div>
        <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Array.from({ length: 4 }).map((_, idx) => {
            const img = repair.images && repair.images[idx];
            if (img) {
              const timestamp = parseDate(img.uploaded_at).getTime();
              return (
                <div 
                  key={img.id} 
                  style={{ 
                    border: `1.5px solid ${borderColor}`, 
                    padding: '4px', 
                    borderRadius: '8px',
                    backgroundColor: '#fcfcfc', 
                    height: '115px',
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    position: 'relative',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <img 
                    src={`${UPLOAD_URL}/uploads/${img.file_path}?t=${timestamp}`} 
                    crossOrigin="anonymous" 
                    alt={`evidence-${idx}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                  <span style={{
                    position: 'absolute',
                    bottom: '6px',
                    right: '6px',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#fff',
                    fontSize: '7.5px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontWeight: 700
                  }}>
                    รูปที่ {idx + 1}
                  </span>
                </div>
              );
            } else {
              return (
                <div 
                  key={`empty-${idx}`} 
                  style={{ 
                    border: `1.5px dashed ${borderColor}`, 
                    borderRadius: '8px',
                    backgroundColor: '#fafafa', 
                    height: '115px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    color: '#94a3b8', 
                    fontSize: '9px', 
                    gap: '6px'
                  }}
                >
                  <div style={{ 
                    border: '1.5px solid #f1f5f9', 
                    borderRadius: '50%', 
                    padding: '6px', 
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText size={13} color="#cbd5e1" />
                  </div>
                  <span style={{ fontSize: '8px', fontWeight: 600 }}>กรอบรูปภาพหลักฐาน {idx + 1}</span>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* ═══ SIGNATURES (Digital Stamp Boxes) ═══ */}
      <div style={{ 
        marginTop: '8px',
        pageBreakInside: 'avoid',
        borderTop: `1.5px solid ${borderColor}`, 
        paddingTop: '14px', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Sign 1 */}
        <div style={{ 
          border: `1.5px dashed ${borderColor}`, 
          borderRadius: '8px', 
          backgroundColor: '#fafafa', 
          padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ borderBottom: `1px solid ${textMuted}`, width: '130px', margin: '4px auto 8px auto', height: '22px' }}></div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '10px', color: textDark }}>ลงชื่อ ............................................</p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '8.5px' }}>({repair.reporter})</p>
          <p style={{ margin: '1px 0 0 0', color: primaryColor, fontSize: '8.5px', fontWeight: 800 }}>
            {isClaim ? 'ผู้ประสานงานจัดส่งเคลม' : 'ผู้แจ้งซ่อม / ผู้รับมอบงาน'}
          </p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '7.5px' }}>วันที่: ....../……/……</p>
        </div>

        {/* Sign 2 */}
        <div style={{ 
          border: `1.5px dashed ${borderColor}`, 
          borderRadius: '8px', 
          backgroundColor: '#fafafa', 
          padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ borderBottom: `1px solid ${textMuted}`, width: '130px', margin: '4px auto 8px auto', height: '22px' }}></div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '10px', color: textDark }}>ลงชื่อ ............................................</p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '8.5px' }}>({repair.technician || '............................................'})</p>
          <p style={{ margin: '1px 0 0 0', color: primaryColor, fontSize: '8.5px', fontWeight: 800 }}>
            {isClaim ? 'เจ้าหน้าที่จัดส่งเคลม' : 'ช่างผู้ดำเนินการ / ผู้ส่งมอบงาน'}
          </p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '7.5px' }}>วันที่: ....../……/……</p>
        </div>

        {/* Sign 3 */}
        <div style={{ 
          border: `1.5px dashed ${borderColor}`, 
          borderRadius: '8px', 
          backgroundColor: '#fafafa', 
          padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ borderBottom: `1px solid ${textMuted}`, width: '130px', margin: '4px auto 8px auto', height: '22px' }}></div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '10px', color: textDark }}>ลงชื่อ ............................................</p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '8.5px' }}>( .......................................... )</p>
          <p style={{ margin: '1px 0 0 0', color: primaryColor, fontSize: '8.5px', fontWeight: 800 }}>
            {isClaim ? 'ผู้อนุมัติรับเครื่องเคลม' : 'ผู้อนุมัติ / ผู้ตรวจรับ'}
          </p>
          <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '7.5px' }}>วันที่: ....../……/……</p>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginTop: '10px', 
        borderTop: `1px solid ${borderColor}`, 
        paddingTop: '6px' 
      }}>
        <p style={{ margin: 0, fontSize: '8.5px', color: '#94a3b8', letterSpacing: '0.3px' }}>
          พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')} | ระบบบริหารจัดการ INDIANA Maintenance System Pro
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1' }}>
          <QrCode size={18} color={accentColor} />
          <div style={{ fontSize: '7.5px', lineHeight: 1.1, textAlign: 'left', color: textMuted }}>
            แสกนตรวจสอบ<br/>ข้อมูลงานซ่อมออนไลน์
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrintTemplate;
