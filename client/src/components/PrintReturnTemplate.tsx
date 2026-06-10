/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { InventoryTransaction } from '../types';
import { useCompanyData } from '../hooks/useCompanyData';
import { pdfTheme } from './pdf/pdfTheme';
import PdfPage from './pdf/PdfPage';
import PdfHeader from './pdf/PdfHeader';
import PdfFooter from './pdf/PdfFooter';
import PdfInfoGrid from './pdf/PdfInfoGrid';
import PdfSignatureBlock from './pdf/PdfSignatureBlock';

interface Props {
  transaction: InventoryTransaction;
  isPreview?: boolean;
  companyId?: number | null;
  logoId?: number | null;
}

const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes(' ') && !dateStr.includes('T')) {
    return new Date(dateStr.replace(' ', 'T') + 'Z');
  }
  return new Date(dateStr);
};

const formatDateThai = (date: Date): string => {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTimeThai = (date: Date): string => {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    + ' ' + date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const conditionLabel = (condition?: string): string => {
  switch (condition) {
    case 'Good':         return 'ใช้งานได้ปกติ (Good)';
    case 'Minor Damage': return 'ชำรุดเล็กน้อย (Minor Damage)';
    case 'Damaged':      return 'ชำรุด (Damaged)';
    case 'Broken':       return 'เสีย / ใช้งานไม่ได้ (Broken)';
    default:             return condition || '-';
  }
};

const conditionTone = (condition?: string): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (condition === 'Good') return 'success';
  if (condition === 'Minor Damage') return 'warning';
  if (condition === 'Damaged' || condition === 'Broken') return 'danger';
  return 'neutral';
};

const PrintReturnTemplate: React.FC<Props> = ({ transaction, isPreview, companyId, logoId }) => {
  const { company, logo } = useCompanyData(companyId ?? null, logoId ?? null);

  const docNumber = `RT-${String(transaction.id || 0).padStart(6, '0')}`;
  const docDate = formatDateThai(parseDate(transaction.created_at));
  const printedAt = formatDateTimeThai(new Date());
  const quantity = transaction.quantity_returned || 1;

  const sourceWithdrawalNo = transaction.withdrawal_id
    ? `WD-${String(transaction.withdrawal_id).padStart(6, '0')}`
    : '-';

  const locationText = transaction.station_name
    ? `${transaction.station_name}${transaction.station_area_name ? ' / ' + transaction.station_area_name : ''}`
    : (transaction.location || '-');

  return (
    <div
      id="pdf-return-template"
      style={{
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? 'auto' : '-99999px',
        top: isPreview ? 'auto' : 0,
      }}
    >
      <PdfPage isPreview={isPreview}>
        <PdfHeader
          docType="return"
          docNumber={docNumber}
          docDate={docDate}
          company={company}
          logo={logo}
          statusBadge={{ label: 'รับคืนเข้าคลังแล้ว', tone: 'success' }}
        />

        <PdfInfoGrid
          title="ข้อมูลการคืนอุปกรณ์"
          columns={2}
          fields={[
            { label: 'ผู้คืนอุปกรณ์', value: transaction.user_name || '-' },
            { label: 'อ้างอิงใบเบิกเลขที่', value: (
              <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700, color: pdfTheme.accents.withdrawal }}>
                {sourceWithdrawalNo}
              </span>
            ) },
            { label: 'ชื่อโครงการ / งาน', value: transaction.project_name || '-' },
            { label: 'สถานที่ที่ใช้งาน', value: locationText },
            { label: 'หมายเหตุการคืน', value: transaction.note || '-', span: 2 },
          ]}
        />

        <PdfInfoGrid
          title="รายการอุปกรณ์ที่คืน"
          columns={2}
          fields={[
            { label: 'ชื่ออุปกรณ์', value: transaction.product_name || '-', span: 2 },
            { label: 'รุ่น / Model', value: transaction.product_model || '-' },
            { label: 'จำนวน', value: (
              <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700, fontSize: pdfTheme.size.docNumber }}>
                {quantity} ชิ้น
              </span>
            ) },
            { label: 'Serial Number', value: transaction.serial_number ? (
              <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700 }}>{transaction.serial_number}</span>
            ) : '— ไม่ระบุ —', span: 2 },
            { label: 'สภาพอุปกรณ์ที่คืน', value: (
              <span style={{
                display: 'inline-block',
                padding: '3px 12px',
                borderRadius: pdfTheme.radius.sm,
                background: conditionTone(transaction.condition) === 'success' ? '#d1fae5'
                  : conditionTone(transaction.condition) === 'warning' ? '#fef3c7'
                  : conditionTone(transaction.condition) === 'danger' ? '#fee2e2'
                  : pdfTheme.colors.bgAccent,
                color: conditionTone(transaction.condition) === 'success' ? '#065f46'
                  : conditionTone(transaction.condition) === 'warning' ? '#78350f'
                  : conditionTone(transaction.condition) === 'danger' ? '#7f1d1d'
                  : pdfTheme.colors.textMuted,
                fontWeight: 700,
                fontSize: pdfTheme.size.body,
              }}>
                {conditionLabel(transaction.condition)}
              </span>
            ), span: 2 },
          ]}
        />

        <PdfSignatureBlock
          slots={[
            { role: 'ผู้คืนอุปกรณ์', roleEn: 'Returned by', name: transaction.user_name || undefined },
            { role: 'ผู้ตรวจสอบสภาพ', roleEn: 'Inspector' },
            { role: 'ผู้รับเข้าคลัง', roleEn: 'Received by Stock' },
          ]}
        />

        <div style={{ marginTop: 'auto' }} />

        <PdfFooter
          docType="return"
          docNumber={docNumber}
          company={company}
          pageNumber={1}
          totalPages={1}
          printedAt={printedAt}
        />
      </PdfPage>
    </div>
  );
};

export default PrintReturnTemplate;
