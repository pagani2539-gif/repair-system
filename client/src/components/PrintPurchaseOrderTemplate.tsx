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
    case 'Pending':   return { label: 'รออนุมัติ', tone: 'warning' };
    case 'Approved':  return { label: 'อนุมัติแล้ว', tone: 'success' };
    case 'Received':  return { label: 'รับของเข้าคลังแล้ว', tone: 'success' };
    case 'Cancelled': return { label: 'ยกเลิก', tone: 'danger' };
    default:          return { label: status || '-', tone: 'neutral' };
  }
};

const PrintPurchaseOrderTemplate: React.FC<Props> = ({ po, isPreview, companyId, logoId }) => {
  const { company, logo } = useCompanyData(companyId ?? null, logoId ?? null);

  const docNumber = po.po_no || `PO-${String(po.id || 0).padStart(6, '0')}`;
  const docDate = formatDateThai(parseDate(po.created_at));
  const printedAt = formatDateTimeThai(new Date());
  const status = statusInfo(po.status);

  const items: PurchaseOrderItem[] = po.items || [];

  const itemColumns: PdfTableColumn<PurchaseOrderItem>[] = [
    {
      key: 'name',
      header: 'รายการสินค้า',
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
        <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700, fontSize: pdfTheme.size.docNumber }}>
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
      <PdfPage isPreview={isPreview}>
        <PdfHeader
          docType="purchase"
          docNumber={docNumber}
          docDate={docDate}
          company={company}
          logo={logo}
          statusBadge={status}
        />

        {/* Side-by-side Buyer & Vendor info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '12px',
          margin: 0,
        }}>
          {/* Buyer Info */}
          <PdfInfoGrid
            title="ข้อมูลการสั่งซื้อ"
            columns={1}
            docType="purchase"
            fields={[
              { label: 'ผู้สั่งซื้อ', value: po.ordered_by || po.created_by || '-' },
              { label: 'แผนก / หน่วยงาน', value: po.buyer_department || '-' },
              { label: 'เบอร์ติดต่อ / อีเมล', value: `${po.buyer_phone || '-'} / ${po.buyer_email || '-'}` },
              { label: 'ชื่อโครงการ / งาน', value: po.project_name || '-' },
            ]}
          />

          {/* Vendor Info */}
          {hasVendor ? (
            <PdfInfoGrid
              title="ผู้ขาย"
              columns={1}
              docType="purchase"
              fields={[
                { label: 'ชื่อบริษัท / ผู้ขาย', value: `${po.company_name || '-'} (${po.vendor_contact_person || '-'})` },
                { label: 'ที่อยู่', value: po.vendor_address || '-' },
                { label: 'เบอร์โทร / เลขประจำตัวผู้เสียภาษี', value: `${po.vendor_phone || '-'} / ${po.vendor_tax_id || '-'}` },
                { label: 'หมายเหตุ', value: po.note || '-' },
              ]}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: pdfTheme.border.light,
              borderRadius: pdfTheme.radius.md,
              padding: '12px',
              background: pdfTheme.colors.bgSubtle,
              color: pdfTheme.colors.textMuted,
              fontSize: pdfTheme.size.body,
              height: '100%',
            }}>
              — ไม่มีข้อมูลผู้ขาย —
            </div>
          )}
        </div>

        <PdfTable
          docType="purchase"
          title="รายการสินค้าที่สั่งซื้อ"
          columns={itemColumns}
          rows={items}
          emptyMessage="ไม่มีรายการสั่งซื้อ"
        />

        <div style={{ marginTop: 'auto' }} />

        <PdfSignatureBlock
          slots={[
            { role: 'ผู้สั่งซื้อ', name: po.ordered_by || po.created_by || undefined },
            { 
              role: 'ผู้อนุมัติสั่งซื้อ', 
              name: po.approved_by || undefined, 
              date: po.approved_at ? formatDateThai(parseDate(po.approved_at)) : undefined 
            },
            { role: 'ผู้รับสินค้า' },
          ]}
        />

        <PdfFooter
          docType="purchase"
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

export default PrintPurchaseOrderTemplate;
