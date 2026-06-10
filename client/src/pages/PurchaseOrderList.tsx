import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { purchaseOrderApi } from '../api';
import { useApi } from '../hooks/useApi';
import { useNotification } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatDateTimeThai } from '../utils/formatDate';
import {
  Trash,
  Check,
  FileText,
  Sparkles,
  Info,
  Package,
  Eye,
  Loader2,
  ShoppingBag,
  Zap,
  Plus,
  Printer
} from 'lucide-react';
import NewPurchaseOrderModal from '../components/NewPurchaseOrderModal';
import PrintPurchaseOrderTemplate from '../components/PrintPurchaseOrderTemplate';
import PrintDialog from '../components/PrintDialog';
import type { PurchaseOrder } from '../types';
import type { TableColumn, TableAction } from '../types/table.types';
import BaseDataTable from '../components/tables/BaseDataTable';
import TableToolbar from '../components/tables/TableToolbar';
import TablePagination from '../components/tables/TablePagination';
import { useTableUrlState } from '../hooks/useTableUrlState';

const PurchaseOrderList: React.FC = () => {
  const { notify } = useNotification();
  const { urlState, setTableState } = useTableUrlState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNewPoModalOpen, setIsNewPoModalOpen] = useState(false);
  const [printPo, setPrintPo] = useState<PurchaseOrder | null>(null);
  const [printingId, setPrintingId] = useState<number | string | null>(null);

  const { data: pos = [], loading, error, request: fetchPOs } = useApi(purchaseOrderApi.getAll);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      await purchaseOrderApi.autoGenerate();
      notify('🎉 สแกนและสร้างใบสั่งซื้อสำหรับพัสดุสต็อกต่ำเรียบร้อยแล้ว');
      fetchPOs();
    } catch (err: any) {
      notify(err.message || 'เกิดข้อผิดพลาดในการสแกนสต็อก', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('คุณต้องการลบใบสั่งซื้อนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      await purchaseOrderApi.delete(id);
      notify('ลบใบสั่งซื้อเรียบร้อยแล้ว');
      fetchPOs();
    } catch (err: any) {
      notify(err.message || 'ไม่สามารถลบใบสั่งซื้อได้', 'error');
    }
  };

  const handlePrint = async (id: number | string) => {
    if (printingId) return;
    setPrintingId(id);
    try {
      const detail = await purchaseOrderApi.getById(id);
      setPrintPo(detail);
    } catch (err: any) {
      notify(err?.response?.data?.message || err?.message || 'ไม่สามารถพิมพ์ใบสั่งซื้อได้', 'error');
      setPrintPo(null);
    } finally {
      setPrintingId(null);
    }
  };

  const handleReceive = async (id: number | string) => {
    if (!window.confirm('ยืนยันการตรวจรับพัสดุเข้าคลังสำหรับใบสั่งซื้อนี้?\nระบบจะอัปเดตสต็อกตามรายการอัตโนมัติ')) return;
    try {
      await purchaseOrderApi.receive(id);
      notify('ตรวจรับพัสดุเข้าคลังเรียบร้อยแล้ว');
      fetchPOs();
    } catch (err: any) {
      notify(err.message || 'ไม่สามารถตรวจรับใบสั่งซื้อได้', 'error');
    }
  };

  const getAccentColor = (status: string): string => {
    switch (status) {
      case 'Draft': return 'var(--text-muted)';
      case 'Pending': return 'var(--warning)';
      case 'Received': return 'var(--success)';
      case 'Cancelled': return 'var(--danger)';
      default: return 'transparent';
    }
  };

  const filteredData = useMemo(() => {
    const list = pos || [];
    return list.filter(p => {
      if (urlState.search) {
        const s = urlState.search.toLowerCase();
        const matches = p.po_no.toLowerCase().includes(s) || (p.company_name && p.company_name.toLowerCase().includes(s)) || (p.ordered_by && p.ordered_by.toLowerCase().includes(s));
        if (!matches) return false;
      }
      if (urlState.filters.status && urlState.filters.status !== 'All' && p.status !== urlState.filters.status) return false;
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [pos, urlState]);

  const indexOfLastItem = urlState.page * urlState.pageSize;
  const indexOfFirstItem = indexOfLastItem - urlState.pageSize;
  const paginatedData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const getStatusBadge = (status: string) => {
    const badgeStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
      backgroundColor: bg, color: color, border: `1px solid ${border}`, padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', width: '90px', justifyContent: 'center'
    });
    switch (status) {
      case 'Draft': return <span style={badgeStyle('var(--bg-app)', 'var(--text-muted)', 'var(--border)')}>แบบร่าง</span>;
      case 'Pending': return <span style={badgeStyle('var(--warning-light)', 'var(--warning)', 'var(--warning-border)')}>รออนุมัติ</span>;
      case 'Received': return <span style={badgeStyle('var(--success-light)', 'var(--success)', 'var(--success-border)')}>รับของแล้ว</span>;
      case 'Cancelled': return <span style={badgeStyle('var(--danger-light)', 'var(--danger)', 'var(--danger-border)')}>ยกเลิก</span>;
      default: return null;
    }
  };

  const columns: TableColumn<PurchaseOrder>[] = [
    {
      id: 'po_no', header: 'เลขที่ใบสั่งซื้อ', accessor: 'po_no', priority: 1, width: '160px',
      render: (val, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>
            <FileText size={14} color="var(--primary)" style={{ opacity: 0.6, flexShrink: 0 }} />
            {val}
          </div>
          {row.created_by === 'System' && (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '1px 6px', borderRadius: '4px', width: 'fit-content' }}>
              <Sparkles size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />ระบบสร้างอัตโนมัติ
            </span>
          )}
        </div>
      )
    },
    {
      id: 'company', header: 'บริษัท / ผู้ขาย', accessor: 'company_name', priority: 1, width: 'auto',
      render: (val) => (
        val
          ? <span style={{ fontWeight: 600 }}>{val}</span>
          : <span className="cell-empty">— ไม่ระบุผู้ขาย —</span>
      )
    },
    {
      id: 'requester', header: 'ผู้สั่งซื้อ', accessor: 'ordered_by', priority: 2, width: '150px',
      render: (val) => (
        val
          ? <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{val}</span>
          : <span className="cell-empty">—</span>
      )
    },
    {
      id: 'creator', header: 'ผู้สร้าง PO', accessor: 'created_by', priority: 3, width: '130px',
      render: (val) => {
        const isSystem = val === 'System';
        if (!val) return <span className="cell-empty">—</span>;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '6px',
            background: isSystem ? 'var(--bg-app)' : 'var(--success-light)',
            color: isSystem ? 'var(--text-muted)' : 'var(--success)',
            fontSize: '0.72rem', fontWeight: 700
          }}>
            {isSystem ? <><Sparkles size={10} /> ระบบ</> : val}
          </span>
        );
      }
    },
    {
      id: 'items', header: 'จำนวนรายการ', accessor: 'item_count', priority: 1, width: '120px', align: 'center',
      render: (val) => (
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{val || 0}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>รายการ</span>
        </div>
      )
    },
    {
      id: 'status', header: 'สถานะ', accessor: 'status', priority: 1, width: '120px', align: 'center',
      render: (val) => getStatusBadge(val)
    },
    {
      id: 'created', header: 'วันที่สร้าง', accessor: 'created_at', priority: 2, width: '130px',
      render: (val) => {
        if (!val) return <span className="cell-empty">—</span>;
        const [date, time] = formatDateTimeThai(val).split(' เวลา ');
        return (
          <div className="cell-date-stack">
            <span className="cd-primary">{date}</span>
            {time && <span className="cd-secondary">{time}</span>}
          </div>
        );
      }
    },
    {
      id: 'date', header: 'วันที่อัปเดต', accessor: 'updated_at', priority: 1, width: '130px',
      render: (val) => {
        const [date, time] = formatDateTimeThai(val).split(' เวลา ');
        return (
          <div className="cell-date-stack">
            <span className="cd-primary">{date}</span>
            {time && <span className="cd-secondary">{time}</span>}
          </div>
        );
      }
    }
  ];

  const actions: TableAction<PurchaseOrder>[] = [
    { id: 'view', label: 'ดูรายละเอียด', icon: <Eye size={14} />, onClick: () => {} },
    {
      id: 'print',
      label: 'พิมพ์ใบสั่งซื้อ',
      icon: <Printer size={14} />,
      onClick: (row) => handlePrint(row.id)
    },
    {
      id: 'receive',
      label: 'ตรวจรับของ',
      icon: <Check size={14} />,
      variant: 'primary',
      onClick: (row) => handleReceive(row.id),
      hidden: (row) => row.status === 'Received' || row.status === 'Cancelled'
    },
    { id: 'delete', label: 'ลบใบสั่งซื้อ', icon: <Trash size={14} />, variant: 'danger', onClick: (row) => handleDelete(row.id) }
  ];

  const renderDetailDrawer = useCallback((po: PurchaseOrder) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="reveal-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{po.po_no}</h3>
        {getStatusBadge(po.status)}
      </div>

      <section>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)' }}><Info size={18} /> ข้อมูลใบสั่งซื้อ</h4>
        <Card style={{ padding: '1rem', backgroundColor: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div><strong>บริษัทผู้ขาย:</strong> {po.company_name || '-'}</div>
            <div><strong>ผู้สั่งซื้อ:</strong> {po.ordered_by || '-'}</div>
            <div><strong>วันที่สร้าง:</strong> {formatDateTimeThai(po.created_at)}</div>
            <div><strong>อัปเดตล่าสุด:</strong> {formatDateTimeThai(po.updated_at)}</div>
          </div>
        </Card>
      </section>

      <section>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)' }}><Package size={18} /> รายการพัสดุ ({po.item_count} รายการ)</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {po.status === 'Received' ? (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', border: '1px dashed var(--success)' }}>
              ตรวจรับพัสดุเข้าคลังเรียบร้อยแล้ว
            </div>
          ) : (
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              คลิกเพื่อดูรายละเอียดรายการพัสดุในหน้าหลัก
            </div>
          )}
        </div>
      </section>

      {po.status !== 'Received' && po.status !== 'Cancelled' && (
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <Button variant="primary" style={{ width: '100%' }} icon={<Check size={18} />} onClick={() => handleReceive(po.id)}>
            ตรวจรับพัสดุเข้าคลัง
          </Button>
        </div>
      )}
    </div>
  ), []);

  return (
    <div className="po-page fade-in" style={{ padding: '0 0 4rem 0', backgroundColor: 'var(--bg-app)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 2.5rem' }}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div className="page-title">
            <h2>การจัดซื้อพัสดุและอุปกรณ์ (PO)</h2>
            <p>จัดการใบสั่งซื้อ ตรวจรับพัสดุ และสแกนสต็อกต่ำเพื่อสั่งซื้ออัตโนมัติ</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="outline"
              icon={isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              onClick={handleAutoGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'กำลังสแกน...' : 'สแกนสต็อกต่ำ'}
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsNewPoModalOpen(true)}
            >
              สร้างใบสั่งซื้อใหม่
            </Button>
          </div>
        </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'ทั้งหมด', val: pos?.length || 0, icon: ShoppingBag, status: 'All' },
          { label: 'รอรับของ', val: (pos || []).filter(p => p.status === 'Pending').length, icon: Zap, status: 'Pending' },
          { label: 'รับเข้าคลังแล้ว', val: (pos || []).filter(p => p.status === 'Received').length, icon: Check, status: 'Received' }
        ].map((s, i) => (
          <Card key={i} onClick={() => setTableState({ filters: { status: s.status }, page: 1 })} style={{ cursor: 'pointer', borderColor: urlState.filters.status === s.status ? 'var(--primary)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div className="stat-icon-wrapper" style={{ color: i === 0 ? 'var(--primary)' : i === 1 ? 'var(--warning)' : i === 3 ? 'var(--success)' : undefined }}><s.icon size={22} /></div><div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div></div>
          </Card>
        ))}
      </div>

      <TableToolbar
        searchValue={urlState.search}
        onSearchChange={(val) => setTableState({ search: val, page: 1 })}
        filters={[{ id: 'status', label: 'สถานะ', type: 'select', options: [{ label: 'แบบร่าง', value: 'Draft' }, { label: 'สั่งซื้อแล้ว', value: 'Pending' }, { label: 'รับของแล้ว', value: 'Received' }, { label: 'ยกเลิก', value: 'Cancelled' }] }]}
        activeFilters={urlState.filters}
        onFilterChange={(f) => setTableState({ filters: f, page: 1 })}
        onReset={() => setTableState({ search: '', filters: {}, page: 1 })}
        searchPlaceholder="ค้นหาเลข PO, บริษัท, หรือผู้ขอซื้อ..."
      />

      <BaseDataTable
        columns={columns}
        data={paginatedData}
        state={{ loading, error: error?.message || null, empty: !loading && paginatedData.length === 0 }}
        actions={actions}
        onRetry={fetchPOs}
        drawerTitle={(po) => `ใบสั่งซื้อ ${po.po_no}`}
        renderDetailDrawer={renderDetailDrawer}
        getRowAccent={(r) => getAccentColor(r.status)}
        mobileConfig={{
          title: (r) => r.po_no,
          subtitle: (r) => `${r.company_name || '-'} · ${r.ordered_by}`,
          statusBadge: (r) => getStatusBadge(r.status)
        }}
      />

      {!loading && filteredData.length > 0 && (
        <TablePagination
          config={{ page: urlState.page, pageSize: urlState.pageSize, totalItems: filteredData.length }}
          onPageChange={(p) => setTableState({ page: p })}
          onPageSizeChange={(s) => setTableState({ pageSize: s, page: 1 })}
        />
      )}
      </div>

      {/* Modal สร้าง PO ใหม่ด้วยตัวเอง */}
      <NewPurchaseOrderModal
        isOpen={isNewPoModalOpen}
        onClose={() => setIsNewPoModalOpen(false)}
        onSuccess={() => fetchPOs()}
      />

      {/* Print dialog — open when user clicks "พิมพ์ใบสั่งซื้อ" */}
      {printPo && (
        <PrintDialog
          open={!!printPo}
          onClose={() => setPrintPo(null)}
          templateId="pdf-po-template"
          docTitle={`ใบสั่งซื้อ ${printPo.po_no}`}
          renderTemplate={(companyId, logoId) => (
            <PrintPurchaseOrderTemplate po={printPo} companyId={companyId} logoId={logoId} />
          )}
        />
      )}
    </div>
  );
};

export default PurchaseOrderList;
