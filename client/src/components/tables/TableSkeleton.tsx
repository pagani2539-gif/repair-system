import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns, rows = 5 }) => {
  return (
    <div style={{ width: '100%', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--table-radius)' }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          style={{ 
            height: 'var(--table-row-height)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0 var(--table-padding)',
            borderBottom: '1px solid var(--border)',
            gap: 'var(--table-gap)'
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} style={{ flex: 1 }}>
              <Skeleton variant="rect" height="24px" width="80%" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default React.memo(TableSkeleton);
