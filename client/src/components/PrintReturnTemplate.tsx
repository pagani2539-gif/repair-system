/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { 
  User, 
  Calendar, 
  Package, 
  FileText,
  QrCode,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { UPLOAD_URL } from '../api';

interface Props {
  transaction: any;
  isPreview?: boolean;
}

const PrintReturnTemplate: React.FC<Props> = ({ transaction, isPreview }) => {
  // Return Theme: Indigo & Violet
  const primaryColor = '#4f46e5'; // Indigo
  const accentColor = '#6366f1'; // Violet
  const lightBgColor = '#f5f3ff'; // Soft Lavender
  const textDark = '#0f172a';
  const textMuted = '#64748b';
  const borderColor = '#e2e8f0'; // Modern soft border

  const cardStyle: React.CSSProperties = {
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

  const returnDate = parseDate(transaction.created_at);
  const pages = [1]; 

  return (
    <div 
      id="pdf-return-template" 
      style={{ 
        width: '210mm',
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? '0' : '-9999px',
        top: 0,
        backgroundColor: 'white',
        boxSizing: 'border-box'
      }}
    >
      {pages.map((_, pageIdx) => (
        <div 
          key={pageIdx}
          className="print-page"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            padding: '12mm', 
            backgroundColor: 'white', 
            color: textDark,
            fontFamily: '"Sarabun", sans-serif',
            fontSize: '12px',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pageBreakAfter: 'always',
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
            paddingBottom: '10px',
            marginTop: '4px'
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
                <Package size={24} color={primaryColor} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
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
                 ใบรับคืนพัสดุและอุปกรณ์
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
                   เลขที่: RT-{transaction.id ? transaction.id.toString().padStart(6, '0') : 'XXXXXX'}
                 </span>
               </div>
            </div>
          </header>

          {/* ═══ INFO GRID (KPI Dashboard Cards) ═══ */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '10px',
          }}>
            {/* Card 1: Document Info */}
            <div style={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '8px 10px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} color={accentColor} />
                <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>ข้อมูลเอกสาร</span>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>ประเภทรายการ:</span>
                <strong>คืนอุปกรณ์{transaction.withdrawal_type ? ` (${transaction.withdrawal_type})` : ''}</strong>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>โครงการ / งาน:</span>
                <strong>{transaction.project_name || '-'}</strong>
              </div>
            </div>

            {/* Card 2: Returnee */}
            <div style={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '8px 10px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color={accentColor} />
                <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>ผู้ส่งคืน & สถานที่</span>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>ผู้ส่งคืน:</span>
                <strong>{transaction.user_name}</strong>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>หน้างาน:</span>
                <strong>{transaction.location || '-'}</strong>
              </div>
            </div>

            {/* Card 3: Return Timeline */}
            <div style={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '8px 10px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} color={accentColor} />
                <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>วันเวลาที่คืนพัสดุ</span>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>วันที่คืน:</span>
                <strong>{returnDate.toLocaleDateString('th-TH')}</strong>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>เวลาที่คืน:</span>
                <strong>{returnDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</strong>
              </div>
            </div>
          </div>

          {/* ═══ ITEM + EVIDENCE (Dashboard cards side by side) ═══ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
              {/* Item Details Card */}
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
                  borderBottom: `1px solid ${borderColor}`, 
                  padding: '6px 12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px'
                }}>
                  <Package size={13} color={primaryColor} />
                  <strong style={{ fontSize: '10.5px', color: textDark }}>รายละเอียดอุปกรณ์ที่รับคืน</strong>
                </div>
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div>
                    <span style={{ color: textMuted, fontSize: '8.5px', display: 'block' }}>ชื่ออุปกรณ์ / รายการ:</span>
                    <strong style={{ fontSize: '13px', color: primaryColor }}>{transaction.product_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: textMuted, fontSize: '8.5px', display: 'block' }}>รุ่น (Model):</span>
                    <strong style={{ fontSize: '11px', color: textDark }}>{transaction.product_model || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: textMuted, fontSize: '8.5px', display: 'block' }}>Serial Number:</span>
                    <strong style={{ fontSize: '11px', fontFamily: 'monospace', color: textDark }}>{transaction.serial_number || '-'}</strong>
                  </div>
                  <div style={{ 
                    marginTop: 'auto', 
                    padding: '6px 10px', 
                    background: lightBgColor, 
                    borderRadius: '6px', 
                    border: `1.5px solid ${accentColor}30`, 
                    textAlign: 'center' 
                  }}>
                    <span style={{ color: textMuted, fontSize: '8px', display: 'block', fontWeight: 600 }}>จำนวนที่รับคืน:</span>
                    <strong style={{ fontSize: '16px', color: primaryColor }}>{transaction.quantity_returned} ชิ้น</strong>
                  </div>
                </div>
              </div>

              {/* Evidence Image Card */}
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
                  borderBottom: `1px solid ${borderColor}`, 
                  padding: '6px 12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px'
                }}>
                  <ImageIcon size={13} color={primaryColor} />
                  <strong style={{ fontSize: '10.5px', color: textDark }}>รูปภาพหลักฐานตอนรับคืน</strong>
                </div>
                <div style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px', backgroundColor: '#fcfcfc', flex: 1 }}>
                  {transaction.return_image ? (
                    <img 
                      src={`${UPLOAD_URL}/uploads/${transaction.return_image}`} 
                      alt="Return" 
                      crossOrigin="anonymous"
                      style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '6px', border: `1.5px solid ${borderColor}` }} 
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
                      <ImageIcon size={36} strokeWidth={1} style={{ marginBottom: '6px' }} />
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 600 }}>ไม่มีรูปภาพหลักฐานประกอบ</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Condition & Notes Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '10px' }}>
              {/* Condition Card */}
              <div style={cardStyle}>
                <div style={{
                  background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
                  borderBottom: `1px solid ${borderColor}`, 
                  padding: '6px 12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px'
                }}>
                  <CheckCircle2 size={13} color={primaryColor} />
                  <strong style={{ fontSize: '10.5px', color: textDark }}>สภาพอุปกรณ์รับคืน</strong>
                </div>
                <div style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ 
                    display: 'inline-block', 
                    padding: '4px 16px', 
                    borderRadius: '20px', 
                    backgroundColor: transaction.condition === 'Broken' ? '#fee2e2' : '#ecfdf5',
                    color: transaction.condition === 'Broken' ? '#ef4444' : '#10b981',
                    border: `1.5px solid ${transaction.condition === 'Broken' ? '#fecaca' : '#d1fae5'}`,
                    fontWeight: 800, 
                    fontSize: '13px'
                  }}>
                    {transaction.condition === 'Broken' ? 'ชำรุดเสียหาย' : 'สภาพปกติพร้อมใช้'}
                  </div>
                </div>
              </div>

              {/* Notes Card */}
              <div style={cardStyle}>
                <div style={{
                  background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
                  borderBottom: `1px solid ${borderColor}`, 
                  padding: '6px 12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px'
                }}>
                  <FileText size={13} color={primaryColor} />
                  <strong style={{ fontSize: '10.5px', color: textDark }}>หมายเหตุการรับคืน</strong>
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ 
                    padding: '6px 10px', 
                    border: `1.5px dashed ${borderColor}`, 
                    borderRadius: '6px', 
                    fontSize: '10.5px', 
                    fontStyle: 'italic', 
                    backgroundColor: '#fafafa',
                    minHeight: '24px' 
                  }}>
                    "{transaction.note || 'ไม่มีหมายเหตุเพิ่มเติม'}"
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SIGNATURES (Digital Stamp Boxes) ═══ */}
          <div style={{ 
            marginTop: '6px',
            pageBreakInside: 'avoid',
            borderTop: `1.5px solid ${borderColor}`, 
            paddingTop: '10px', 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Sign 1 */}
            <div style={{ 
              border: `1.5px dashed ${borderColor}`, 
              borderRadius: '8px', 
              backgroundColor: '#fafafa', 
              padding: '8px',
              textAlign: 'center'
            }}>
              <div style={{ borderBottom: `1px solid ${textMuted}`, width: '130px', margin: '2px auto 6px auto', height: '18px' }}></div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '10px', color: textDark }}>ลงชื่อ ............................................</p>
              <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '8.5px' }}>({transaction.user_name || '............................................'})</p>
              <p style={{ margin: '1px 0 0 0', color: accentColor, fontSize: '8.5px', fontWeight: 800 }}>ผู้ส่งคืนอุปกรณ์</p>
              <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '7.5px' }}>วันที่: ....../……/……</p>
            </div>

            {/* Sign 2 */}
            <div style={{ 
              border: `1.5px dashed ${borderColor}`, 
              borderRadius: '8px', 
              backgroundColor: '#fafafa', 
              padding: '8px',
              textAlign: 'center'
            }}>
              <div style={{ borderBottom: `1px solid ${textMuted}`, width: '130px', margin: '2px auto 6px auto', height: '18px' }}></div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '10px', color: textDark }}>ลงชื่อ ............................................</p>
              <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '8.5px' }}>( .......................................... )</p>
              <p style={{ margin: '1px 0 0 0', color: accentColor, fontSize: '8.5px', fontWeight: 800 }}>เจ้าหน้าที่ผู้ตรวจรับคืน</p>
              <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '7.5px' }}>วันที่: ....../……/……</p>
            </div>

            {/* Sign 3 */}
            <div style={{ 
              border: `1.5px dashed ${borderColor}`, 
              borderRadius: '8px', 
              backgroundColor: '#fafafa', 
              padding: '8px',
              textAlign: 'center'
            }}>
              <div style={{ borderBottom: `1px solid ${textMuted}`, width: '130px', margin: '2px auto 6px auto', height: '18px' }}></div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '10px', color: textDark }}>ลงชื่อ ............................................</p>
              <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '8.5px' }}>( .......................................... )</p>
              <p style={{ margin: '1px 0 0 0', color: accentColor, fontSize: '8.5px', fontWeight: 800 }}>หัวหน้าหน่วยงาน / ผู้อนุมัติรับคืน</p>
              <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '7.5px' }}>วันที่: ....../……/……</p>
            </div>
          </div>

          {/* ═══ FOOTER ═══ */}
          <footer style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '4px', 
            borderTop: `1px solid ${borderColor}`, 
            paddingTop: '6px' 
          }}>
            <p style={{ margin: 0, fontSize: '8.5px', color: '#94a3b8', letterSpacing: '0.3px' }}>
              พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')} | ระบบจัดการพัสดุ CMA Maintenance Pro
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
              <QrCode size={18} color={primaryColor} />
              <div style={{ fontSize: '7.5px', lineHeight: 1.15, textAlign: 'left', color: textMuted, fontWeight: 600 }}>
                สแกนตรวจสอบ<br/>ข้อมูลงานคืนออนไลน์
              </div>
            </div>
          </footer>
        </div>
      ))}
    </div>
  );
};

export default PrintReturnTemplate;
