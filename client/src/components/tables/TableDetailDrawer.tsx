import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

interface TableDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const TableDetailDrawer: React.FC<TableDetailDrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1000, display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch', padding: 0, animation: 'fadeIn 0.2s' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '100%', 
          maxWidth: '450px', 
          height: '100%', 
          backgroundColor: 'var(--bg-app)', 
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ 
          padding: '1.25rem 1.5rem', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{title}</h3>
          <Button variant="outline" size="sm" onClick={onClose} icon={<X size={18} />} style={{ border: 'none' }} />
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default React.memo(TableDetailDrawer);
