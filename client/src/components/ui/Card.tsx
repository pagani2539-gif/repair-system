import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  icon,
  onClick,
  className = '',
  style,
  children,
}) => {
  const isClickable = !!onClick;
  const clickableStyle = isClickable ? { cursor: 'pointer' } : {};

  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      style={{ ...clickableStyle, ...style }}
    >
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {icon && <span style={{ display: 'inline-flex', color: 'var(--primary)' }}>{icon}</span>}
            {title}
          </h3>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
