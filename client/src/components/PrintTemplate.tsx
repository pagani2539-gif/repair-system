/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { RepairDetail } from '../types';
import { useCompanyData } from '../hooks/useCompanyData';
import { pdfTheme, docLabels } from './pdf/pdfTheme';
import PdfPage from './pdf/PdfPage';
import PdfHeader from './pdf/PdfHeader';
import PdfFooter from './pdf/PdfFooter';
import PdfInfoGrid from './pdf/PdfInfoGrid';
import PdfTable, { type PdfTableColumn } from './pdf/PdfTable';
import PdfSignatureBlock from './pdf/PdfSignatureBlock';

interface Props {
  repair: RepairDetail;
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

const statusToTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (status === 'เสร็จสิ้น') return 'success';
  if (status === 'รอดำเนินการ') return 'warning';
  if (status === 'รออะไหล่') return 'danger';
  return 'neutral';
};

const PrintTemplate: React.FC<Props> = ({ repair, isPreview, companyId, logoId }) => {
  const { company, logo } = useCompanyData(companyId ?? null, logoId ?? null);

  const isClaim = repair.type === 'claim';
  const docType = isClaim ? 'claim' : 'repair';
  const prefix = docLabels[docType].prefix;
  const docNumber = repair.ticket_no || `${prefix}-${String(repair.id || 0).padStart(6, '0')}`;
  const docDate = formatDateThai(parseDate(repair.created_at));
  const printedAt = formatDateTimeThai(new Date());

  const locationText = repair.station_name
    ? `${repair.station_name}${repair.station_area_name ? ' / ' + repair.station_area_name : ''}`
    : (repair.location || repair.location_snapshot || '-');

  const devices = repair.devices || [];

  const deviceColumns: PdfTableColumn<typeof devices[0]>[] = [
    {
      key: 'old',
      header: 'อุปกรณ์เดิม / Old Device',
      render: (row) => (
        <>
          <div style={{ fontWeight: 700 }}>{row.old_model || '-'}</div>
          {row.old_serial && (
            <div style={{ fontFamily: pdfTheme.fonts.mono, fontSize: pdfTheme.size.small, color: pdfTheme.colors.textMuted, marginTop: '2px' }}>
              S/N: {row.old_serial}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'new',
      header: 'อุปกรณ์ใหม่ / New Device',
      render: (row) => (
        <>
          <div style={{ fontWeight: 700 }}>{row.new_model || '-'}</div>
          {row.new_serial && (
            <div style={{ fontFamily: pdfTheme.fonts.mono, fontSize: pdfTheme.size.small, color: pdfTheme.colors.textMuted, marginTop: '2px' }}>
              S/N: {row.new_serial}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'changed_by',
      header: 'ผู้เปลี่ยน',
      width: '110px',
      render: (row) => row.changed_by || '-',
    },
    {
      key: 'changed_at',
      header: 'วันที่เปลี่ยน',
      width: '120px',
      align: 'center',
      render: (row) => row.changed_at ? formatDateThai(parseDate(row.changed_at)) : '-',
    },
  ];

  const priorityTone: Record<string, { bg: string; text: string }> = {
    'ปกติ':    { bg: '#dbeafe', text: '#1e40af' },
    'ด่วน':    { bg: '#fef3c7', text: '#78350f' },
    'ด่วนมาก': { bg: '#fee2e2', text: '#7f1d1d' },
    'วิกฤต':   { bg: '#fecaca', text: '#7f1d1d' },
  };
  const priorityColors = priorityTone[repair.priority] || priorityTone['ปกติ'];

  return (
    <div
      id="pdf-print-template"
      style={{
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? 'auto' : '-99999px',
        top: isPreview ? 'auto' : 0,
      }}
    >
      <PdfPage isPreview={isPreview}>
        <PdfHeader
          docType={docType}
          docNumber={docNumber}
          docDate={docDate}
          company={company}
          logo={logo}
          statusBadge={{ label: repair.status, tone: statusToTone(repair.status) }}
        />

        <PdfInfoGrid
          title={isClaim ? 'ข้อมูลการเคลม' : 'ข้อมูลการแจ้งซ่อม'}
          columns={2}
          fields={[
            { label: 'ผู้แจ้ง', value: repair.reporter || '-' },
            {
              label: 'ความเร่งด่วน',
              value: (
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: pdfTheme.radius.sm,
                  background: priorityColors.bg,
                  color: priorityColors.text,
                  fontWeight: 700,
                  fontSize: pdfTheme.size.small,
                }}>
                  {repair.priority}
                </span>
              ),
            },
            { label: 'ชื่อโครงการ / งาน', value: repair.project_name || '-' },
            { label: 'สถานที่', value: locationText },
            { label: 'อุปกรณ์ที่แจ้ง', value: repair.device_name || '-', span: 2 },
            { label: 'อาการ / รายละเอียดปัญหา', value: repair.problem || '-', span: 2 },
          ]}
        />

        <PdfInfoGrid
          title="สถานะการดำเนินการ"
          columns={2}
          fields={[
            { label: 'ผู้รับผิดชอบ / ช่าง', value: repair.technician || '— ยังไม่ได้มอบหมาย —' },
            { label: 'วันที่รับเรื่อง', value: repair.received_at ? formatDateThai(parseDate(repair.received_at)) : '-' },
            { label: 'หมายเหตุการซ่อม / ผลการดำเนินการ', value: repair.repair_note || '— ยังไม่มีบันทึก —', span: 2 },
          ]}
        />

        {devices.length > 0 && (
          <PdfTable
            docType={docType}
            title="ประวัติการเปลี่ยนอุปกรณ์"
            columns={deviceColumns}
            rows={devices}
            emptyMessage="ไม่มีการเปลี่ยนอุปกรณ์"
            showRowNumber
          />
        )}

        <PdfSignatureBlock
          slots={[
            { role: 'ผู้แจ้ง', roleEn: 'Reporter', name: repair.reporter || undefined },
            { role: isClaim ? 'ผู้อนุมัติเคลม' : 'ผู้อนุมัติซ่อม', roleEn: 'Approved by' },
            { role: isClaim ? 'ผู้ดำเนินการเคลม' : 'ช่างผู้ดำเนินการ', roleEn: isClaim ? 'Claim Officer' : 'Technician', name: repair.technician || undefined },
          ]}
        />

        <div style={{ marginTop: 'auto' }} />

        <PdfFooter
          docType={docType}
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

export default PrintTemplate;
