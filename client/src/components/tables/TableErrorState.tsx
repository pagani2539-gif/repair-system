import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface TableErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

const TableErrorState: React.FC<TableErrorStateProps> = ({ 
  message = 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 
  onRetry 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '4rem 2rem', 
      color: 'var(--danger)',
      backgroundColor: 'var(--danger-light)',
      borderRadius: 'var(--table-radius)',
      textAlign: 'center',
      border: '1px solid var(--danger-border)'
    }}>
      <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
      <p style={{ fontWeight: 700, marginBottom: '1.5rem' }}>{message}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry} icon={<RotateCcw size={16} />}>
          ลองใหม่ครั้ง
        </Button>
      )}
    </div>
  );
};

export default React.memo(TableErrorState);
