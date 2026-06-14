/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { UPLOAD_URL } from '../api';
import { useCompanyData } from '../hooks/useCompanyData';
import { pdfTheme } from './pdf/pdfTheme';
import PdfPage from './pdf/PdfPage';
import PdfHeader from './pdf/PdfHeader';
import PdfFooter from './pdf/PdfFooter';
import PdfInfoGrid from './pdf/PdfInfoGrid';
import PdfTable, { type PdfTableColumn } from './pdf/PdfTable';
import PdfSignatureBlock from './pdf/PdfSignatureBlock';

interface Props {
  withdrawal: any;
  isPreview?: boolean;
  companyId?: number | null;
  logoId?: number | null;
}

interface NormalizedItem {
  name: string;
  model: string;
  quantity: number;
  serial_numbers: string[];
  requires_sn: boolean;
  image: string;
}

const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes(' ') && !dateStr.includes('T')) {
    return new Date(dateStr.replace(' ', 'T') + 'Z');
  }
  return new Date(dateStr);
};

const formatDateThai = (date: Date): string => {
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTimeThai = (date: Date): string => {
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ' ' + date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const normalizeItems = (withdrawal: any): NormalizedItem[] => {
  const raw = withdrawal.items_detail || withdrawal.items || [];
  return raw.map((item: any) => {
    const snField = item.serial_numbers;
    const sns: string[] = Array.isArray(snField)
      ? snField
      : (typeof snField === 'string' && snField.trim() ? snField.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    return {
      name: item.item_name || item.name || '-',
      model: item.item_model || item.model || '',
      quantity: Number(item.quantity) || 0,
      serial_numbers: sns,
      requires_sn: item.requires_sn === 1 || sns.length > 0,
      image: item.item_image || item.image_path || '',
    };
  });
};

const PrintWithdrawalTemplate: React.FC<Props> = ({ withdrawal, isPreview, companyId, logoId }) => {
  const { company, logo } = useCompanyData(companyId ?? null, logoId ?? null);

  const docNumber = `WD-${String(withdrawal.id || 0).padStart(6, '0')}`;
  const docDate = formatDateThai(parseDate(withdrawal.created_at));
  const printedAt = formatDateTimeThai(new Date());

  const items = normalizeItems(withdrawal);
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  let derivedAreaName = withdrawal.station_area_name;
  if (!derivedAreaName && withdrawal.station_name && withdrawal.location_snapshot && withdrawal.location_snapshot.startsWith(withdrawal.station_name)) {
    const suffix = withdrawal.location_snapshot.slice(withdrawal.station_name.length).trim();
    if (suffix.startsWith('-')) {
      derivedAreaName = suffix.slice(1).trim();
    }
  }

  const locationText = withdrawal.station_name
    ? `${withdrawal.station_name}${derivedAreaName ? ' / ' + derivedAreaName : ''}`
    : (withdrawal.location || withdrawal.location_snapshot || '-');

  const columns: PdfTableColumn<NormalizedItem>[] = [
    {
      key: 'name',
      header: 'รายการอุปกรณ์',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            flexShrink: 0,
            border: pdfTheme.border.light,
            borderRadius: pdfTheme.radius.sm,
            background: pdfTheme.colors.bgSubtle,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {row.image && (
              <img
                src={`${UPLOAD_URL}/uploads/${row.image}`}
                alt=""
                crossOrigin="anonymous"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{row.name}</div>
            {row.model && (
              <div style={{ fontSize: pdfTheme.size.small, color: pdfTheme.colors.textMuted, marginTop: '1px' }}>
                รุ่น: {row.model}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'sn',
      header: 'หมายเลขเครื่อง (S/N)',
      render: (row) => {
        if (!row.requires_sn || row.serial_numbers.length === 0) {
          return <span style={{ color: pdfTheme.colors.textLight, fontStyle: 'italic' }}>—</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {row.serial_numbers.map((sn, i) => (
              <span
                key={i}
                style={{
                  padding: '1px 5px',
                  borderRadius: pdfTheme.radius.sm,
                  background: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                  fontFamily: pdfTheme.fonts.mono,
                  fontSize: pdfTheme.size.micro,
                  fontWeight: 700,
                }}
              >
                {sn}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'qty',
      header: 'จำนวน',
      width: '80px',
      align: 'center',
      render: (row) => (
        <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700, fontSize: pdfTheme.size.docNumber }}>
          {row.quantity}
        </span>
      ),
    },
  ];

  return (
    <div
      id="pdf-withdrawal-template"
      style={{
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? 'auto' : '-99999px',
        top: isPreview ? 'auto' : 0,
      }}
    >
      <PdfPage isPreview={isPreview}>
        <PdfHeader
          docType="withdrawal"
          docNumber={docNumber}
          docDate={docDate}
          company={company}
          logo={logo}
          showCompany={false}
          statusBadge={{ label: 'จ่ายอุปกรณ์แล้ว', tone: 'success' }}
        />

        <PdfInfoGrid
          title="ข้อมูลการเบิก"
          columns={2}
          docType="withdrawal"
          fields={[
            { label: 'ผู้เบิก / ผู้รับ', value: withdrawal.recipient || '-' },
            { label: 'ประเภทการเบิก', value: withdrawal.type || '-' },
            { label: 'ชื่อโครงการ / งาน', value: withdrawal.project_name || '-' },
            { label: 'สถานที่ปลายทาง', value: locationText },
            { label: 'จำนวนรายการรวม', value: `${items.length} รายการ (${totalQty} ชิ้นรวม)` },
            { label: 'หมายเหตุ', value: withdrawal.note || '-', span: 2 },
          ]}
        />

        <PdfTable
          docType="withdrawal"
          title="รายการอุปกรณ์ที่เบิก"
          columns={columns}
          rows={items}
          emptyMessage="ไม่มีรายการอุปกรณ์"
        />

        <div style={{ marginTop: 'auto' }} />

        <PdfSignatureBlock
          slots={[
            { role: 'ผู้เบิก', name: withdrawal.recipient || undefined },
            { role: 'ผู้อนุมัติ' },
            { role: 'ผู้จ่ายอุปกรณ์' },
          ]}
        />

        <PdfFooter
          docType="withdrawal"
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

export default PrintWithdrawalTemplate;
