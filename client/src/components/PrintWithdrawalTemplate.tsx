/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
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
    };
  });
};

const ITEMS_PER_PAGE = 12;

const PrintWithdrawalTemplate: React.FC<Props> = ({ withdrawal, isPreview, companyId, logoId }) => {
  const { company, logo } = useCompanyData(companyId ?? null, logoId ?? null);

  const docNumber = `WD-${String(withdrawal.id || 0).padStart(6, '0')}`;
  const docDate = formatDateThai(parseDate(withdrawal.created_at));
  const printedAt = formatDateTimeThai(new Date());

  const items = normalizeItems(withdrawal);
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  // Pagination
  const pages: NormalizedItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const totalPages = pages.length;

  // Location: prefer station info, fall back to location text
  const locationText = withdrawal.station_name
    ? `${withdrawal.station_name}${withdrawal.station_area_name ? ' / ' + withdrawal.station_area_name : ''}`
    : (withdrawal.location || withdrawal.location_snapshot || '-');

  const columns: PdfTableColumn<NormalizedItem>[] = [
    {
      key: 'name',
      header: 'รายการอุปกรณ์ / Item',
      render: (row) => (
        <>
          <div style={{ fontWeight: 700 }}>{row.name}</div>
          {row.model && (
            <div style={{ fontSize: pdfTheme.size.small, color: pdfTheme.colors.textMuted, marginTop: '2px' }}>
              รุ่น: {row.model}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'sn',
      header: 'Serial Numbers',
      render: (row) => {
        if (!row.requires_sn || row.serial_numbers.length === 0) {
          return <span style={{ color: pdfTheme.colors.textLight, fontStyle: 'italic' }}>—</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {row.serial_numbers.map((sn, i) => (
              <span
                key={i}
                style={{
                  padding: '1px 6px',
                  borderRadius: pdfTheme.radius.sm,
                  background: pdfTheme.colors.bgAccent,
                  border: pdfTheme.border.light,
                  fontFamily: pdfTheme.fonts.mono,
                  fontSize: pdfTheme.size.micro,
                  fontWeight: 600,
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
        <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700, fontSize: pdfTheme.size.h3 }}>
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
      {pages.map((pageItems, pageIdx) => (
        <PdfPage
          key={pageIdx}
          isPreview={isPreview}
        >
          <PdfHeader
            docType="withdrawal"
            docNumber={docNumber}
            docDate={docDate}
            company={company}
            logo={logo}
            statusBadge={{ label: 'จ่ายอุปกรณ์แล้ว', tone: 'success' }}
          />

          {/* Headline info — only on first page */}
          {pageIdx === 0 && (
            <PdfInfoGrid
              title="ข้อมูลการเบิก"
              columns={2}
              fields={[
                { label: 'ผู้รับ', value: withdrawal.recipient || '-' },
                { label: 'ประเภทการเบิก', value: withdrawal.type || '-' },
                { label: 'ชื่อโครงการ / งาน', value: withdrawal.project_name || '-' },
                { label: 'สถานที่ปลายทาง', value: locationText },
                { label: 'จำนวนรายการรวม', value: `${items.length} รายการ (${totalQty} ชิ้นรวม)` },
                { label: 'หมายเหตุ', value: withdrawal.note || '-', span: 2 },
              ]}
            />
          )}

          <PdfTable
            docType="withdrawal"
            title={pageIdx === 0 ? 'รายการอุปกรณ์ที่เบิก' : `รายการอุปกรณ์ที่เบิก (ต่อหน้า ${pageIdx + 1})`}
            columns={columns}
            rows={pageItems}
            emptyMessage="ไม่มีรายการอุปกรณ์"
          />

          {/* Signatures — only on last page */}
          {pageIdx === totalPages - 1 && (
            <PdfSignatureBlock
              slots={[
                { role: 'ผู้เบิก', roleEn: 'Requester', name: withdrawal.recipient || undefined },
                { role: 'ผู้อนุมัติ', roleEn: 'Approved by' },
                { role: 'ผู้จ่ายอุปกรณ์', roleEn: 'Issued by' },
              ]}
            />
          )}

          <div style={{ marginTop: 'auto' }} />

          <PdfFooter
            docType="withdrawal"
            docNumber={docNumber}
            company={company}
            pageNumber={pageIdx + 1}
            totalPages={totalPages}
            printedAt={printedAt}
          />
        </PdfPage>
      ))}
    </div>
  );
};

export default PrintWithdrawalTemplate;
