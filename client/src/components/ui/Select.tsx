import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  label: string;
  value: string | number;
}

interface SelectProps {
  value: string | number;
  options: Option[];
  placeholder?: string;
  onChange: (value: string | number) => void;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  options,
  placeholder = 'เลือกตัวเลือก...',
  onChange,
  icon,
  style = {},
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{ position: 'relative', display: 'inline-block', width: '100%', ...style }}
    >
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--bg-card)',
          border: value ? '1px solid var(--primary)' : '1px solid var(--border)',
          borderRadius: '12px',
          color: value ? 'var(--text-main)' : 'var(--text-muted)',
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          userSelect: 'none',
          gap: '8px',
          minHeight: '42px',
          boxSizing: 'border-box',
          transition: 'all 0.2s'
        }}
        className="form-control-custom-select"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {icon}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayText}
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
            color: 'var(--text-muted)'
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10000,
            maxHeight: '220px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={idx}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                  background: isSelected ? 'var(--primary-light)' : 'transparent',
                  borderBottom: idx === options.length - 1 ? 'none' : '1px solid var(--border)',
                  transition: 'background 0.2s',
                  fontWeight: isSelected ? 800 : 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-main)';
                  }
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Select;
