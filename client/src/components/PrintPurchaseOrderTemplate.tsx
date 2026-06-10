/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { PurchaseOrder, PurchaseOrderItem } from '../types';
import { useCompanyData } from '../hooks/useCompanyData';
import { pdfTheme } from './pdf/pdfTheme';
import PdfPage from './pdf/PdfPage';
import PdfHeader from './pdf/PdfHeader';
import PdfFooter from './pdf/PdfFooter';
import PdfInfoGrid from './pdf/PdfInfoGrid';
import PdfTable, { type PdfTableColumn } from './pdf/PdfTable';
import PdfSignatureBlock from './pdf/PdfSignatureBlock';

interface Props {
  po: PurchaseOrder;
  isPreview?: boolean;
  companyId?: number | null;
  logoId?: number | null;
}

const parseDate = (dateStr?: string): Date => {
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

const statusInfo = (status: string): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } => {
  switch (status) {
    case 'Draft':     return { label: 'แบบร่าง', tone: 'neutral' };
    case 'Pending':   return { label: 'รออนุมัติ / รอรับของ', tone: 'warning' };
    case 'Approved':  return { label: 'อนุมัติแล้ว', tone: 'success' };
    case 'Received':  return { label: 'รับของเข้าคลังแล้ว', tone: 'success' };
    case 'Cancelled': return { label: 'ยกเลิก', tone: 'danger' };
    default:          return { label: status || '-', tone: 'neutral' };
  }
};

const ITEMS_PER_PAGE = 14;

const PrintPurchaseOrderTemplate: React.FC<Props> = ({ po, isPreview, companyId, logoId }) => {
  const { company, logo } = useCompanyData(companyId ?? null, logoId ?? null);

  const docNumber = po.po_no || `PO-${String(po.id || 0).padStart(6, '0')}`;
  const docDate = formatDateThai(parseDate(po.created_at));
  const printedAt = formatDateTimeThai(new Date());
  const status = statusInfo(po.status);

  const items: PurchaseOrderItem[] = po.items || [];
  const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const pages: PurchaseOrderItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);
  const totalPages = pages.length;

  const itemColumns: PdfTableColumn<PurchaseOrderItem>[] = [
    {
      key: 'name',
      header: 'รายการสินค้า / Item',
      render: (row) => (
        <>
          <div style={{ fontWeight: 700 }}>{row.item_name || '-'}</div>
          {row.item_model && (
            <div style={{ fontSize: pdfTheme.size.small, color: pdfTheme.colors.textMuted, marginTop: '2px' }}>
              รุ่น: {row.item_model}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'qty',
      header: 'จำนวนที่สั่ง',
      width: '90px',
      align: 'center',
      render: (row) => (
        <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700, fontSize: pdfTheme.size.h3 }}>
          {row.quantity}
        </span>
      ),
    },
    {
      key: 'received',
      header: 'รับแล้ว',
      width: '80px',
      align: 'center',
      render: (row) => {
        const received = row.received_quantity || 0;
        const isComplete = received >= row.quantity;
        return (
          <span style={{
            fontFamily: pdfTheme.fonts.mono,
            fontWeight: 700,
            color: isComplete ? pdfTheme.accents.repair : pdfTheme.colors.textMuted,
          }}>
            {received}
          </span>
        );
      },
    },
  ];

  // Vendor info (if provided)
  const hasVendor = po.company_name || po.vendor_address || po.vendor_phone;

  return (
    <div
      id="pdf-po-template"
      style={{
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? 'auto' : '-99999px',
        top: isPreview ? 'auto' : 0,
      }}
    >
      {pages.map((pageItems, pageIdx) => (
        <PdfPage key={pageIdx} isPreview={isPreview}>
          <PdfHeader
            docType="purchase"
            docNumber={docNumber}
            docDate={docDate}
            company={company}
            logo={logo}
            statusBadge={status}
          />

          {pageIdx === 0 && (
            <>
              {/* Buyer + Order info */}
              <PdfInfoGrid
                title="ข้อมูลการสั่งซื้อ"
                columns={2}
                fields={[
                  { label: 'ผู้สั่งซื้อ', value: po.ordered_by || po.created_by || '-' },
                  { label: 'แผนก / หน่วยงาน', value: po.buyer_department || '-' },
                  { label: 'เบอร์ติดต่อ', value: po.buyer_phone || '-' },
                  { label: 'อีเมล', value: po.buyer_email || '-' },
                  { label: 'ชื่อโครงการ / งาน', value: po.project_name || '-', span: 2 },
                  { label: 'จำนวนรายการรวม', value: `${items.length} รายการ (${totalQty} ชิ้นรวม)`, span: 2 },
                  { label: 'หมายเหตุ', value: po.note || '-', span: 2 },
                ]}
              />

              {/* Vendor info — only if any vendor field present */}
              {hasVendor && (
                <PdfInfoGrid
                  title="ผู้ขาย / Vendor"
                  columns={2}
                  fields={[
                    { label: 'ชื่อบริษัท / ผู้ขาย', value: po.company_name || '-', span: 2 },
                    { label: 'ที่อยู่', value: po.vendor_address || '-', span: 2 },
                    { label: 'ผู้ติดต่อ', value: po.vendor_contact_person || '-' },
                    { label: 'เบอร์โทร', value: po.vendor_phone || '-' },
                    { label: 'เลขประจำตัวผู้เสียภาษี', value: po.vendor_tax_id || '-', span: 2 },
                  ]}
                />
              )}
            </>
          )}

          <PdfTable
            docType="purchase"
            title={pageIdx === 0 ? 'รายการสินค้าที่สั่งซื้อ' : `รายการสินค้า (ต่อหน้า ${pageIdx + 1})`}
            columns={itemColumns}
            rows={pageItems}
            emptyMessage="ไม่มีรายการสั่งซื้อ"
          />

          {pageIdx === totalPages - 1 && (
            <PdfSignatureBlock
              slots={[
                { role: 'ผู้สั่งซื้อ', roleEn: 'Ordered by', name: po.ordered_by || po.created_by || undefined },
                { role: 'ผู้อนุมัติสั่งซื้อ', roleEn: 'Approved by' },
                { role: 'ผู้รับสินค้า', roleEn: 'Received by' },
              ]}
            />
          )}

          <div style={{ marginTop: 'auto' }} />

          <PdfFooter
            docType="purchase"
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

export default PrintPurchaseOrderTemplate;
