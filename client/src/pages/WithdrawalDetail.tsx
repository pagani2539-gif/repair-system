import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { withdrawalApi, transactionApi } from '../api';
import { useNotification } from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDateTimeThai } from '../utils/formatDate';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  Package, 
  Download,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Trash2,
  MapPin,
  ArrowUpCircle,
  Clock,
  Check,
  Upload,
  X
} from 'lucide-react';
import PrintWithdrawalTemplate from '../components/PrintWithdrawalTemplate';
import PrintDialog from '../components/PrintDialog';
import { ProvideSnModal } from '../components/ProvideSnModal';

const WithdrawalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [snModal, setSnModal] = useState<{
    isOpen: boolean;
    itemId: number | null;
    itemName: string;
    totalQty: number;
    existingSns: string[];
  }>({
    isOpen: false,
    itemId: null,
    itemName: '',
    totalQty: 0,
    existingSns: []
  });

  const [returnModal, setReturnModal] = useState<{
    isOpen: boolean;
    transaction: any | null;
  }>({
    isOpen: false,
    transaction: null
  });

  const [returning, setReturning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [returnImageFile, setReturnImageFile] = useState<File | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const { data: withdrawal, loading, request: fetchWithdrawal } = useApi(
    async (idVal: string | number) => await withdrawalApi.getById(idVal)
  );

  const { data: transactions = [], loading: loadingTx, request: fetchTransactions } = useApi(
    async (wdId: string | number) => await transactionApi.getAll({ withdrawal_id: wdId })
  );

  useEffect(() => {
    if (id) {
      fetchWithdrawal(id);
      fetchTransactions(id);
    }
  }, [id, fetchWithdrawal, fetchTransactions]);

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModal.transaction) return;
    
    const target = e.target as any;
    const userName = target.user_name.value.trim();
    const condition = target.condition.value;
    const note = target.note.value.trim();
    const imageFile = returnImageFile;

    if (!userName) {
      notify('กรุณาระบุชื่อผู้คืนอุปกรณ์', 'error');
      return;
    }

    setReturning(true);
    try {
      const formData = new FormData();
      formData.append('transaction_id', String(returnModal.transaction.id));
      formData.append('inventory_id', String(returnModal.transaction.inventory_id));
      if (returnModal.transaction.instance_id) {
        formData.append('instance_id', String(returnModal.transaction.instance_id));
      }
      formData.append('quantity', String(returnModal.transaction.quantity_borrowed || returnModal.transaction.quantity_withdrawn || 1));
      formData.append('user_name', userName);
      formData.append('condition', condition);
      formData.append('note', note);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await transactionApi.return(formData);
      notify('🎉 บันทึกการคืนอุปกรณ์เรียบร้อยแล้ว');
      setReturnModal({ isOpen: false, transaction: null });
      setImagePreview(null);
      setReturnImageFile(null);
      if (id) {
        fetchWithdrawal(id);
        fetchTransactions(id);
      }
    } catch (err: any) {
      notify(err.message || 'เกิดข้อผิดพลาดในการบันทึกการคืน', 'error');
    } finally {
      setReturning(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReturnImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReturnImageFile(null);
      setImagePreview(null);
    }
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'ติดตั้งใหม่':
        return 'badge-withdrawal-install';
      case 'ซ่อมแซม':
        return 'badge-withdrawal-repair';
      case 'สำรองใช้งาน':
        return 'badge-withdrawal-backup';
      case 'ทดสอบ':
        return 'badge-withdrawal-test';
      default:
        return 'badge-withdrawal-custom';
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('คุณต้องการลบประวัติการเบิกนี้ใช่หรือไม่? ระบบจะทำการคืนสต็อกอุปกรณ์ทั้งหมดในรายการนี้ให้โดยอัตโนมัติ')) return;
    try {
      await withdrawalApi.delete(id);
      notify('ลบประวัติและคืนสต็อกเรียบร้อยแล้ว');
      navigate('/withdrawal');
    } catch {
      notify('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
  };

  const handlePrint = () => {
    if (!withdrawal) return;
    setPrintDialogOpen(true);
  };

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="rect" width="100px" height="40px" />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton variant="rect" width="120px" height="40px" />
          <Skeleton variant="rect" width="160px" height="40px" />
        </div>
      </div>
      <Skeleton variant="rect" height="120px" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem' }}>
        <Skeleton variant="rect" height="300px" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Skeleton variant="rect" height="150px" />
          <Skeleton variant="rect" height="150px" />
        </div>
      </div>
    </div>
  );

  if (!withdrawal) return (
    <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <Card style={{ padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>ไม่พบข้อมูลการเบิก</p>
        <Button variant="outline" onClick={() => navigate('/withdrawal')} style={{ marginTop: '1.5rem' }}>
          กลับไปหน้าการเบิกจ่าย
        </Button>
      </Card>
    </div>
  );

  return (
    <div className="withdrawal-detail-page" style={{ padding: '0 0 4rem 0', minHeight: '100vh' }}>
      <PrintDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        templateId="pdf-withdrawal-template"
        docTitle={`ใบเบิกอุปกรณ์ - WD-${withdrawal.id.toString().padStart(6, '0')}`}
        renderTemplate={(companyId, logoId) => (
          <PrintWithdrawalTemplate withdrawal={withdrawal} companyId={companyId} logoId={logoId} />
        )}
      />

      {/* Sticky Glass Header */}
      <div className="glass-card" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 20, 
        borderBottom: '1px solid var(--glass-border)',
        borderRadius: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        margin: '0 0 2.5rem 0'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-outline" style={{ border: 'none', padding: '10px' }} onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <Package size={14} /> Asset Withdrawal Record
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>WD-{withdrawal.id.toString().padStart(6, '0')}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={handleDelete}>
              <Trash2 size={18} /> <span className="hide-on-mobile">ลบประวัติ</span>
            </button>
            <button className="btn btn-primary" style={{ background: 'var(--text-main)' }} onClick={handlePrint}>
              <Download size={18} /> <span className="hide-on-mobile">พิมพ์ใบเบิก (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2.5rem' }}>
        {/* Metadata Strip */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', padding: '1.5rem 2rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', gap: '3rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Transaction Type</label>
              <span className={`badge ${getBadgeClass(withdrawal.type)}`} style={{ fontSize: '0.85rem', padding: '6px 16px', fontWeight: 800 }}>
                {withdrawal.type}
              </span>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Withdrawal Date</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.95rem' }}><Calendar size={16} color="var(--primary)"/> {formatDateTimeThai(withdrawal.created_at)}</div>
            </div>
            <div className="hide-on-tablet">
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Project Name</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.95rem' }}><FileText size={16} color="var(--primary)"/> {withdrawal.project_name || '-'}</div>
            </div>
            <div className="hide-on-tablet">
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Job Location</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.95rem' }}>
                <MapPin size={16} color="var(--danger)"/> {withdrawal.location || '-'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', marginBottom: '4px' }}>STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: 'var(--success)', fontSize: '1.1rem' }}>
              <CheckCircle2 size={18} /> จ่ายอุปกรณ์แล้ว
            </div>
          </div>
        </div>

        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card glass-card" style={{ borderRadius: '24px', padding: '2.5rem' }}>
              <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Package size={28} color="var(--primary)" /> รายการอุปกรณ์ที่เบิก (Items)
              </h3>
              
              <div className="data-table-container" style={{ width: '100%', overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border-hover)' }}>
                <table className="data-table data-table--fit" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)' }}>
                      <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Serial Numbers</th>
                      <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '1rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(withdrawal.items || []).map((item, idx: number) => {
                      const currentSns = item.serial_numbers ? item.serial_numbers.split(', ').filter(s => s.trim()) : [];
                      const isMissingSn = item.requires_sn === 1 && currentSns.length < item.quantity;

                      return (
                        <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '1.25rem 1rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>{item.item_name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.item_model || '-'}</div>
                          </td>
                          <td style={{ padding: '1.25rem 1rem' }}>
                            {item.requires_sn === 1 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {currentSns.map((sn: string, i: number) => (
                                  <span key={i} className="glass-card" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', border: '1px solid var(--primary-light)' }}>
                                    {sn}
                                  </span>
                                ))}
                                {isMissingSn && (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertTriangle size={14} /> ขาด {item.quantity - currentSns.length} S/N
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Standard Non-SN Item</span>
                            )}
                          </td>
                          <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{item.quantity}</div>
                          </td>
                          <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                            {isMissingSn && (
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => setSnModal({
                                  isOpen: true,
                                  itemId: item.id,
                                  itemName: item.item_name,
                                  totalQty: item.quantity,
                                  existingSns: currentSns
                                })}
                                style={{ borderRadius: '10px', fontSize: '0.75rem' }}
                              >
                                ระบุ S/N
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Related Transactions Section */}
            <div className="card glass-card" style={{ borderRadius: '24px', padding: '2.5rem' }}>
              <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={28} color="var(--primary)" /> รายการธุรกรรมที่เกี่ยวข้อง (Transactions)
              </h3>
              
              <div className="data-table-container" style={{ width: '100%', overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border-hover)' }}>
                <table className="data-table data-table--fit" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-app)' }}>
                      <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date / ID</th>
                      <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Equipment</th>
                      <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty</th>
                      <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '1rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTx ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดข้อมูลธุรกรรม...</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>ไม่พบข้อมูลธุรกรรมที่เกี่ยวข้อง</td></tr>
                    ) : (
                      transactions.map((tx: any, idx: number) => (
                        <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatDateTimeThai(tx.created_at)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TX-{tx.id.toString().padStart(6, '0')}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{tx.product_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>S/N: {tx.serial_number || 'ไม่ระบุ'}</div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700 }}>{tx.quantity_withdrawn || tx.quantity_borrowed || tx.quantity_returned || tx.quantity_added}</div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {tx.status === 'RETURNED' ? (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>คืนแล้ว</span>
                            ) : (
                              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>อยู่ระหว่างใช้งาน</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {tx.status !== 'RETURNED' && (tx.transaction_type === 'WITHDRAW' || tx.transaction_type === 'BORROW') && (
                              <button 
                                className="btn btn-outline btn-sm"
                                onClick={() => setReturnModal({ isOpen: true, transaction: tx })}
                                style={{ borderRadius: '10px', fontSize: '0.75rem', padding: '6px 12px' }}
                              >
                                <ArrowUpCircle size={14} style={{ marginRight: '4px' }} /> คืนของ
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card glass-card" style={{ borderRadius: '24px', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} color="var(--primary)" /> ผู้เบิกรับอุปกรณ์
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{ width: 48, height: 48, background: 'var(--bg-app)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recipient</div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{withdrawal.recipient}</div>
                </div>
              </div>
              <div style={{ padding: '1.25rem', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Project</label>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{withdrawal.project_name || '-'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Location Details</label>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{withdrawal.location || '-'}</div>
                  {withdrawal.station_area_name && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, marginTop: '4px' }}>
                      Area: {withdrawal.station_area_name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card glass-card" style={{ borderRadius: '24px', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MessageSquare size={20} color="var(--primary)" /> หมายเหตุบันทึก
              </h3>
              <div style={{ padding: '1.25rem', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '0.95rem', lineHeight: '1.6', fontWeight: 500, color: 'var(--text-main)', minHeight: '120px' }}>
                {withdrawal.note || 'ไม่มีข้อมูลหมายเหตุเพิ่มเติม'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProvideSnModal 
        isOpen={snModal.isOpen}
        onClose={() => setSnModal({ ...snModal, isOpen: false })}
        onSuccess={() => id && fetchWithdrawal(id)}
        title={`ระบุ S/N ย้อนหลัง: ${snModal.itemName}`}
        totalQuantity={snModal.totalQty}
        existingSns={snModal.existingSns}
        onSubmit={async (newSns) => {
          if (id && snModal.itemId) {
            await withdrawalApi.updateItemSn(id, snModal.itemId, newSns);
          }
        }}
      />

      {returnModal.isOpen && returnModal.transaction && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3><ArrowUpCircle size={22} color="var(--primary)" /> คืนอุปกรณ์เข้าคลัง</h3>
              <button className="close-btn" onClick={() => { setReturnModal({ isOpen: false, transaction: null }); setImagePreview(null); setReturnImageFile(null); }}><X size={20} /></button>
            </div>

            <form onSubmit={handleReturn}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Card style={{ padding: '1rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>รายการที่จะคืน</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{returnModal.transaction.product_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>S/N: {returnModal.transaction.serial_number || 'ไม่ระบุ'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>จำนวน: {returnModal.transaction.quantity_borrowed || returnModal.transaction.quantity_withdrawn || 1} ชิ้น</div>
                </Card>

                <div className="form-group">
                  <label>ชื่อผู้คืนอุปกรณ์ <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      name="user_name" 
                      type="text" 
                      required 
                      placeholder="ระบุชื่อผู้คืน..." 
                      style={{ paddingLeft: '38px' }}
                      defaultValue={withdrawal?.recipient || ''}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>สภาพอุปกรณ์</label>
                    <select name="condition">
                      <option value="Good">ใช้งานได้ปกติ (Good)</option>
                      <option value="Minor Damage">ชำรุดเล็กน้อย (Minor Damage)</option>
                      <option value="Damaged">ชำรุด (Damaged)</option>
                      <option value="Broken">เสีย/ใช้งานไม่ได้ (Broken)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>หมายเหตุ</label>
                  <textarea name="note" rows={2} placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."></textarea>
                </div>

                <div className="form-group">
                  <label>รูปภาพหลักฐานการคืน (ถ้ามี)</label>
                  <div className="image-uploader-grid">
                    {imagePreview ? (
                      <div className="image-preview-card" style={{ width: '100%', height: '180px' }}>
                        <img src={imagePreview} alt="Return preview" style={{ objectFit: 'contain' }} />
                        <button type="button" className="remove-btn" onClick={() => { setImagePreview(null); setReturnImageFile(null); }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="image-uploader-box" style={{ height: '120px', background: 'var(--bg-app)' }}>
                        <Upload size={24} style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '0.85rem' }}>คลิกเพื่ออัปโหลดรูปภาพ</span>
                        <input 
                          type="file" 
                          name="return_image" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <Button type="button" variant="outline" onClick={() => { setReturnModal({ isOpen: false, transaction: null }); setImagePreview(null); setReturnImageFile(null); }} disabled={returning}>ยกเลิก</Button>
                <Button type="submit" variant="primary" loading={returning} icon={<Check size={18} />}>
                  ยืนยันการคืนอุปกรณ์
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


export default WithdrawalDetail;
