/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { 
  User, 
  Calendar, 
  Package, 
  FileText,
  QrCode,
  CheckCircle2
} from 'lucide-react';
import { UPLOAD_URL } from '../api';

interface Props {
  withdrawal: any;
  isPreview?: boolean;
}

const PrintWithdrawalTemplate: React.FC<Props> = ({ withdrawal, isPreview }) => {
  // Inventory Theme: Teal & Emerald
  const primaryColor = '#0d9488'; // Teal
  const accentColor = '#10b981'; // Emerald
  const lightBgColor = '#f0fdf4'; // Soft Mint
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

  const withdrawalDate = parseDate(withdrawal.created_at);
  const itemsList = withdrawal.items_detail 
    ? withdrawal.items_detail.map((item: any) => ({
        name: item.name || '',
        model: item.model || '',
        quantity: item.quantity,
        image: item.image_path || item.item_image,
        serial_numbers: item.serial_numbers 
      }))
    : (withdrawal.items 
        ? withdrawal.items.map((item: any) => ({
            name: item.item_name || item.name || '',
            model: item.item_model || item.model || '',
            quantity: item.quantity,
            image: item.item_image || item.image_path,
            serial_numbers: typeof item.serial_numbers === 'string' 
              ? item.serial_numbers.split(', ') 
              : item.serial_numbers 
          }))
        : []);
  
  // ═══ CHUNKING LOGIC: 10 items per page ═══
  const ITEMS_PER_PAGE = 10;
  const pages = [];
  for (let i = 0; i < itemsList.length; i += ITEMS_PER_PAGE) {
    pages.push(itemsList.slice(i, i + ITEMS_PER_PAGE));
  }
  // If no items, at least show one empty page
  if (pages.length === 0) pages.push([]);

  return (
    <div 
      id="pdf-withdrawal-template" 
      style={{ 
        width: '210mm',
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? '0' : '-9999px',
        top: 0,
        backgroundColor: 'white',
        boxSizing: 'border-box'
      }}
    >
      {pages.map((pageItems, pageIdx) => (
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
            borderBottom: isPreview && pageIdx < pages.length - 1 ? '5px dashed #ccc' : 'none',
            marginBottom: isPreview ? '20px' : '0'
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
                 ใบเบิกพัสดุและอุปกรณ์พัสดุ
               </div>
               <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                 <span style={{ 
                   backgroundColor: '#f1f5f9', 
                   color: textDark, 
                   padding: '2px 8px', 
                   borderRadius: '20px', 
                   fontSize: '10px', 
                   fontWeight: 700, 
                   border: `1px solid ${borderColor}`
                 }}>
                   เลขที่: WD-{withdrawal.id ? withdrawal.id.toString().padStart(6, '0') : 'XXXXXX'}
                 </span>
                 <span style={{ fontSize: '9px', color: textMuted, fontWeight: 700 }}>
                   หน้า {pageIdx + 1} / {pages.length}
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
            {/* Card 1: Documents */}
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
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>ประเภทการเบิก:</span>
                <strong>{withdrawal.type}</strong>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>โครงการ / งาน:</span>
                <strong>{withdrawal.project_name || '-'}</strong>
              </div>
            </div>

            {/* Card 2: Recipient */}
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
                <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>ผู้ทำรายการ & สถานที่</span>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>ผู้เบิก / หน่วยงาน:</span>
                <strong>{withdrawal.recipient}</strong>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>สถานที่ / หน้างาน:</span>
                <strong>{withdrawal.location || '-'}</strong>
              </div>
            </div>

            {/* Card 3: Date & Handler */}
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
                <span style={{ color: textMuted, fontSize: '9px', fontWeight: 600 }}>วันเวลา & เจ้าหน้าที่</span>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>วันที่ทำรายการ:</span>
                <strong>{withdrawalDate.toLocaleDateString('th-TH')}</strong>
              </div>
              <div style={{ fontSize: '10px', color: textDark }}>
                <span style={{ display: 'block', color: textMuted, fontSize: '8px' }}>เจ้าหน้าที่ผู้จ่าย:</span>
                <strong>ฝ่ายคลังพัสดุกลาง</strong>
              </div>
            </div>
          </div>

          {/* ═══ ITEMS TABLE (Dashboard Clean Style) ═══ */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
              borderBottom: `1px solid ${borderColor}`, 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Package size={13} color={primaryColor} />
                <strong style={{ fontSize: '10.5px', color: textDark }}>รายการอุปกรณ์ที่เบิกจ่าย (Items List)</strong>
              </div>
              <span style={{ fontSize: '8px', color: textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Withdrawal Items</span>
            </div>
            <div style={{ padding: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: primaryColor, color: '#fff' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '8%', borderRadius: '4px 0 0 4px', fontWeight: 700 }}>ลำดับ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '12%', fontWeight: 700 }}>รูปภาพ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '40%', fontWeight: 700 }}>รายการพัสดุ / S/N</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '25%', fontWeight: 700 }}>รุ่น (Model)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '15%', borderRadius: '0 4px 4px 0', fontWeight: 700 }}>จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item: any, idx: number) => {
                    const globalIdx = (pageIdx * ITEMS_PER_PAGE) + idx;
                    return (
                      <tr 
                        key={idx}
                        style={{
                          backgroundColor: idx % 2 === 1 ? '#f8fafc' : 'transparent',
                          borderBottom: `1px solid ${borderColor}`
                        }}
                      >
                        <td style={{ padding: '5px 8px', color: textMuted, textAlign: 'center', fontWeight: 700 }}>{globalIdx + 1}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          {item.image ? (
                            <img 
                              src={`${UPLOAD_URL}/uploads/${item.image}`} 
                              alt={item.name} 
                              crossOrigin="anonymous"
                              style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px', border: `1.5px solid ${borderColor}` }} 
                            />
                          ) : (
                            <div style={{ width: '32px', height: '32px', background: '#fafafa', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: `1.5px dashed ${borderColor}` }}>
                              <Package size={14} color="#cbd5e1" />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '5px 8px', color: textDark }}>
                          <strong style={{ fontSize: '11px', color: textDark }}>{item.name}</strong>
                          {item.serial_numbers && (Array.isArray(item.serial_numbers) ? item.serial_numbers.some((s: string) => s.trim()) : item.serial_numbers.trim()) && (
                            <div style={{ fontSize: '9px', fontWeight: 600, color: primaryColor, marginTop: '2px' }}>
                              S/N: {Array.isArray(item.serial_numbers) ? item.serial_numbers.filter((s: string) => s.trim()).join(', ') : item.serial_numbers}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '5px 8px', color: textDark }}>
                          {item.model || '-'}
                        </td>
                        <td style={{ padding: '5px 8px', color: primaryColor, textAlign: 'center', fontWeight: 800 }}>
                          {item.quantity} ชิ้น
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ NOTES & CERTIFICATION (Last Page Only) ═══ */}
          {pageIdx === pages.length - 1 ? (
            <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1.2fr', 
               gap: '10px',
               marginTop: '4px',
               width: '100%',
               boxSizing: 'border-box'
            }}>
              {/* Box 1: หมายเหตุเพิ่มเติม */}
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', 
                  borderBottom: `1px solid ${borderColor}`, 
                  padding: '4px 10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <FileText size={12} color={primaryColor} />
                  <strong style={{ fontSize: '10px', color: textDark }}>หมายเหตุเพิ่มเติม</strong>
                </div>
                <div style={{ padding: '6px 10px', flex: 1, fontSize: '9.5px', color: textDark, minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                  {withdrawal.note || '-'}
                </div>
              </div>
              {/* Box 2: การรับรองรายการ */}
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', border: `1.5px solid ${primaryColor}40` }}>
                <div style={{ 
                  background: lightBgColor, 
                  borderBottom: `1.5px solid ${primaryColor}30`, 
                  padding: '4px 10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <CheckCircle2 size={12} color={primaryColor} />
                  <strong style={{ fontSize: '10px', color: textDark }}>การรับรองรายการเบิกพัสดุ</strong>
                </div>
                <div style={{ padding: '6px 10px', flex: 1, fontSize: '9px', lineHeight: 1.35, color: '#065f46', minHeight: '32px', display: 'flex', alignItems: 'center', background: '#ecfdf5' }}>
                  ผู้เบิกและผู้อนุมัติได้รับการรับรองว่า การเบิกจ่ายพัสดุดังกล่าวเป็นไปเพื่อดำเนินงานในโครงการที่ระบุไว้จริง และได้รับการตรวจสอบสภาพอุปกรณ์ก่อนส่งมอบเรียบร้อยแล้ว
                </div>
              </div>
            </div>
          ) : (
            // Spacing placeholder for non-last pages to keep layout balanced
            <div style={{ height: '48px' }} />
          )}

          {/* ═══ SIGNATURES (Digital Stamp Boxes) ═══ */}
          <div style={{ 
            marginTop: 'auto', // PUSH TO BOTTOM OF THE A4 PAGE
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
              <p style={{ margin: '2px 0 0 0', color: textMuted, fontSize: '8.5px' }}>({withdrawal.recipient || '............................................'})</p>
              <p style={{ margin: '1px 0 0 0', color: accentColor, fontSize: '8.5px', fontWeight: 800 }}>ผู้รับอุปกรณ์ / ผู้เบิก</p>
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
              <p style={{ margin: '1px 0 0 0', color: accentColor, fontSize: '8.5px', fontWeight: 800 }}>หัวหน้าแผนก / ผู้อนุมัติ</p>
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
              <p style={{ margin: '1px 0 0 0', color: accentColor, fontSize: '8.5px', fontWeight: 800 }}>เจ้าหน้าที่คลังพัสดุ</p>
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
              พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')} | ระบบจัดการสต็อก CMA Maintenance Pro
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
              <QrCode size={18} color={primaryColor} />
              <div style={{ fontSize: '7.5px', lineHeight: 1.15, textAlign: 'left', color: textMuted, fontWeight: 600 }}>
                สแกนตรวจสอบ<br/>ข้อมูลงานเบิกออนไลน์
              </div>
            </div>
          </footer>
        </div>
      ))}
    </div>
  );
};

export default PrintWithdrawalTemplate;
