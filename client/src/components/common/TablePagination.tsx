import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Calculate visible page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = startPage + maxVisiblePages - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem', paddingBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="หน้าแรก"
          style={{ padding: '6px 10px' }}
        >
          <ChevronsLeft size={16} /> หน้าแรก
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '6px 10px' }}
        >
          <ChevronLeft size={16} /> ก่อนหน้า
        </Button>

        <div style={{ display: 'flex', gap: '4px', margin: '0 8px' }}>
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: page === currentPage ? '1px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: page === currentPage ? 'var(--primary)' : 'var(--bg-card)',
                color: page === currentPage ? 'white' : 'var(--text-main)',
                fontWeight: page === currentPage ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              {page}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '6px 10px' }}
        >
          ถัดไป <ChevronRight size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="หน้าสุดท้าย"
          style={{ padding: '6px 10px' }}
        >
          หน้าสุดท้าย <ChevronsRight size={16} />
        </Button>
      </div>
      
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        หน้า <strong style={{ color: 'var(--text-main)' }}>{currentPage}</strong> จาก <strong style={{ color: 'var(--text-main)' }}>{totalPages}</strong> 
        {' '}(รายการที่ {startItem}–{endItem} จาก {totalItems})
      </div>
    </div>
  );
};

export default TablePagination;
