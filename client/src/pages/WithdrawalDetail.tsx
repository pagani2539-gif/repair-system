import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { withdrawalApi } from '../api';
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
  Wrench,
  MessageSquare,
  Trash2,
  MapPin,
  Tag
} from 'lucide-react';
import PrintWithdrawalTemplate from '../components/PrintWithdrawalTemplate';
import { printElement } from '../utils/pdfGenerator';
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

  const { data: withdrawal, loading, request: fetchWithdrawal } = useApi(
    async (idVal: string | number) => await withdrawalApi.getById(idVal)
  );

  useEffect(() => {
    if (id) {
      fetchWithdrawal(id);
    }
  }, [id, fetchWithdrawal]);

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
    printElement('pdf-withdrawal-template', `ใบเบิกอุปกรณ์ - WD-${withdrawal.id.toString().padStart(6, '0')}`);
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
    <div className="withdrawal-detail-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <PrintWithdrawalTemplate withdrawal={withdrawal} />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Button variant="outline" onClick={() => navigate(-1)} icon={<ArrowLeft size={18} style={{ marginRight: '8px' }} />}>
          ย้อนกลับ
        </Button>
        <div style={{ display: 'flex', gap: '10px' }}>
           <Button variant="danger" onClick={handleDelete} icon={<Trash2 size={18} style={{ marginRight: '8px' }} />}>
             ลบประวัติ
           </Button>
           <Button variant="primary" onClick={handlePrint} icon={<Download size={18} style={{ marginRight: '8px' }} />}>
             พิมพ์ใบเบิก (PDF)
           </Button>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2.5rem', 
        padding: '1.5rem', 
        backgroundColor: 'rgba(16, 185, 129, 0.05)', 
        borderRadius: '12px', 
        border: '1px solid rgba(16, 185, 129, 0.2)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '50%', color: 'var(--success)', border: '1px solid var(--border)' }}>
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>WD-{withdrawal.id.toString().padStart(6, '0')}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="var(--primary)"/> เบิกเมื่อ: {formatDateTimeThai(withdrawal.created_at)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={14} color="var(--primary)"/> ประเภท: 
                <span className={`badge ${getBadgeClass(withdrawal.type)}`} style={{ marginLeft: '4px' }}>
                  {withdrawal.type}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} color="var(--primary)"/> โครงการ: {withdrawal.project_name || '-'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} color="var(--primary)"/> สถานที่: {withdrawal.location || '-'}</div>
            </div>
          </div>
        </div>
        <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.9rem', padding: '6px 16px', borderRadius: '20px' }}>
          จ่ายอุปกรณ์แล้ว
        </span>
      </div>

      <div className="detail-grid">
        <Card title="รายการอุปกรณ์ที่เบิก" icon={<Package size={20} />}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '10%', whiteSpace: 'nowrap' }}>ลำดับ</th>
                <th style={{ width: '35%', whiteSpace: 'nowrap' }}>รายการอุปกรณ์ / รุ่น</th>
                <th style={{ width: '35%', whiteSpace: 'nowrap' }}>Serial Number (S/N)</th>
                <th style={{ width: '10%', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวน</th>
                <th style={{ width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {(withdrawal.items || []).map((item, idx: number) => {
                const currentSns = item.serial_numbers ? item.serial_numbers.split(', ').filter(s => s.trim()) : [];
                const isMissingSn = item.requires_sn === 1 && currentSns.length < item.quantity;

                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.item_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.item_model}</div>
                    </td>
                    <td>
                      {item.requires_sn === 1 ? (
                        <>
                          {currentSns.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {currentSns.map((sn: string, i: number) => (
                                <span key={i} className="badge" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border)', fontSize: '0.75rem', width: 'fit-content' }}>
                                  {sn}
                                </span>
                              ))}
                              {isMissingSn && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, fontStyle: 'italic' }}>
                                  (ยังขาดอีก {item.quantity - currentSns.length} S/N)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>ยังไม่ระบุ S/N</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>ไม่ต้องการ S/N</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isMissingSn && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          icon={<Tag size={14} />} 
                          title="ระบุ S/N ย้อนหลัง"
                          className="btn-blink-alert"
                          style={{ 
                            backgroundColor: '#ef4444', 
                            color: 'white', 
                            border: 'none',
                            fontWeight: 'bold'
                          }}
                          onClick={() => setSnModal({
                            isOpen: true,
                            itemId: item.id,
                            itemName: item.item_name,
                            totalQty: item.quantity,
                            existingSns: currentSns
                          })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Card title="ข้อมูลผู้เบิก" icon={<User size={20} />}>
            <div className="info-item" style={{ marginBottom: '1.25rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>ผู้เบิก / หน่วยงาน</label>
              <p style={{ fontWeight: 700, fontSize: '1.2rem' }}>{withdrawal.recipient}</p>
            </div>
            <div className="info-item" style={{ marginBottom: '1.25rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>โครงการ / งาน</label>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{withdrawal.project_name || '-'}</p>
            </div>
            <div className="info-item">
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>สถานที่ / หน้างาน</label>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{withdrawal.location || '-'}</p>
            </div>
          </Card>

          <Card title="หมายเหตุ" icon={<MessageSquare size={20} />}>
            <div style={{ background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', minHeight: '100px', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {withdrawal.note || 'ไม่มีหมายเหตุเพิ่มเติม'}
            </div>
          </Card>
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
    </div>
  );
};

export default WithdrawalDetail;
