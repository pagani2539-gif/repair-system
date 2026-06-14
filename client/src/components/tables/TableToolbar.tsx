import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import Select from '../ui/Select';
import type { TableFilter } from '../../types/table.types';

interface TableToolbarProps {
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange: (value: string) => void;
  filters?: TableFilter[];
  activeFilters?: Record<string, unknown>;
  onFilterChange: (filters: Record<string, unknown>) => void;
  onReset?: () => void;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  searchEnabled = true,
  searchPlaceholder = 'ค้นหา...',
  searchValue = '',
  onSearchChange,
  filters = [],
  activeFilters = {},
  onFilterChange,
  onReset
}) => {
  const [prevSearchValue, setPrevSearchValue] = useState(searchValue);
  const [localSearch, setLocalSearch] = useState(searchValue);

  if (searchValue !== prevSearchValue) {
    setPrevSearchValue(searchValue);
    setLocalSearch(searchValue);
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, searchValue]);

  const filterCount = Object.values(activeFilters).filter(v => v !== undefined && v !== '' && v !== 'All').length;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem', 
      marginBottom: '1.5rem',
      padding: '1.25rem 1.5rem',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--table-radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {searchEnabled && (
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 1rem 0 2.75rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-app)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            {localSearch && (
              <button 
                onClick={() => setLocalSearch('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {filters.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <Filter size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>ตัวกรอง {filterCount > 0 && `(${filterCount})`}</span>
            </div>
          )}
          
          {filterCount > 0 && onReset && (
            <Button variant="outline" size="sm" onClick={onReset} style={{ fontSize: '0.8rem', height: '32px' }}>
              ล้างค่า
            </Button>
          )}
        </div>
      </div>

      {filters.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          {filters.map(filter => (
            <div
              key={filter.id}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title={filter.disabled ? filter.disabledHint : undefined}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: filter.disabled ? 'var(--border-hover)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {filter.label}:
              </span>
              {filter.type === 'select' && (
                <Select
                  value={(activeFilters[filter.id] as string) || 'All'}
                  options={[{ label: 'ทั้งหมด', value: 'All' }, ...(filter.options || [])]}
                  onChange={(val) => onFilterChange({ ...activeFilters, [filter.id]: val })}
                  disabled={filter.disabled}
                  style={{ minWidth: '130px' }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(TableToolbar);
