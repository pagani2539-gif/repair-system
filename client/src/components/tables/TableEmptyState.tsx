import React from 'react';
import { Inbox } from 'lucide-react';

interface TableEmptyStateProps {
  message?: string;
  illustration?: React.ReactNode;
}

const TableEmptyState: React.FC<TableEmptyStateProps> = ({ 
  message = 'ไม่พบข้อมูลที่ค้นหา', 
  illustration = <Inbox size={48} style={{ opacity: 0.2 }} />
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '4rem 2rem', 
      color: 'var(--text-muted)',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--table-radius)',
      textAlign: 'center'
    }}>
      {illustration}
      <p style={{ marginTop: '1rem', fontWeight: 600 }}>{message}</p>
    </div>
  );
};

export default React.memo(TableEmptyState);
