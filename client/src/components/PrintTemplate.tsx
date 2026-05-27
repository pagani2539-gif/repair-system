import React from 'react';
import type { RepairDetail } from '../types';

interface Props {
  repair: RepairDetail;
  isPreview?: boolean;
}

const PrintTemplate: React.FC<Props> = ({ repair, isPreview }) => {
  const primaryBlue = '#1e3a8a';
  const headerBlue = '#dbeafe';
  const borderBlue = '#93c5fd';

  return (
    <div 
      id="pdf-print-template" 
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        padding: '20mm', 
        backgroundColor: 'white', 
        color: '#1e293b',
        fontFamily: '"Sarabun", sans-serif',
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? '0' : '-9999px',
        top: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <header style={{ borderBottom: `2px solid ${primaryBlue}`, paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ color: primaryBlue, fontSize: '24px', margin: '0', textAlign: 'center', textTransform: 'uppercase' }}>ใบรายงานการดำเนินการซ่อมและบำรุงรักษา</h1>
      </header>

      {/* Info Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', border: `1px solid ${borderBlue}`, padding: '15px', borderRadius: '4px' }}>
        <div>
          <p style={{ margin: '5px 0' }}><strong>เลขที่ใบงาน:</strong> {repair.ticket_no}</p>
          <p style={{ margin: '5px 0' }}><strong>สถานะงาน:</strong> {repair.status}</p>
        </div>
        <div>
          <p style={{ margin: '5px 0' }}><strong>ผู้แจ้ง:</strong> {repair.reporter}</p>
          <p style={{ margin: '5px 0' }}><strong>วันที่แจ้ง:</strong> {new Date(repair.created_at).toLocaleDateString('th-TH')}</p>
        </div>
      </div>

      {/* Main Details */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', color: primaryBlue, backgroundColor: headerBlue, padding: '5px 10px', borderLeft: `4px solid ${primaryBlue}`, marginBottom: '10px' }}>รายละเอียดการแจ้งซ่อม</h2>
        <div style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
          <p><strong>อุปกรณ์:</strong> {repair.device_name}</p>
          <p><strong>สถานที่:</strong> {repair.location}</p>
          <p><strong>ปัญหา:</strong> {repair.problem}</p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', color: primaryBlue, backgroundColor: headerBlue, padding: '5px 10px', borderLeft: `4px solid ${primaryBlue}`, marginBottom: '10px' }}>สรุปผลการดำเนินการ</h2>
        <div style={{ padding: '10px', border: '1px solid #e2e8f0', minHeight: '80px' }}>{repair.repair_note || '-'}</div>
      </div>

      {/* Images Section */}
      {repair.images && repair.images.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', color: primaryBlue, backgroundColor: headerBlue, padding: '5px 10px', borderLeft: `4px solid ${primaryBlue}`, marginBottom: '10px' }}>รูปภาพหลักฐาน</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {repair.images.map((img) => {
              const timestamp = new Date(img.uploaded_at || new Date()).getTime();
              return (
                <div key={img.id} style={{ border: '1px solid #cbd5e1', padding: '5px' }}>
                  <img src={`http://localhost:5221/${img.file_path}?t=${timestamp}`} crossOrigin="anonymous" alt="evidence" style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Replacement Table */}
      {repair.devices && repair.devices.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', color: primaryBlue, backgroundColor: headerBlue, padding: '5px 10px', borderLeft: `4px solid ${primaryBlue}`, marginBottom: '10px' }}>รายการอะไหล่ที่เปลี่ยน</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>เดิม</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>ใหม่</th>
              </tr>
            </thead>
            <tbody>
              {repair.devices.map((dev) => (
                <tr key={dev.id}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{dev.old_model} / {dev.old_serial}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{dev.new_model} / {dev.new_serial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingTop: '40px' }}>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{ borderBottom: '1px solid #000', height: '20px' }}></div>
          <p>ผู้แจ้ง</p>
        </div>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{ borderBottom: '1px solid #000', height: '20px' }}></div>
          <p>ช่างผู้ซ่อม</p>
        </div>
      </footer>
    </div>
  );
};

export default PrintTemplate;
