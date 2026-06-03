import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  count = 1,
}) => {
  const baseStyle: React.CSSProperties = {
    width: width,
    height: height,
    backgroundColor: '#161822',
    backgroundImage: 'linear-gradient(90deg, #161822 25%, #222538 50%, #161822 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite linear',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      height: '1rem',
      borderRadius: '4px',
      margin: '8px 0',
    },
    rect: {
      borderRadius: 'var(--radius-md)',
    },
    circle: {
      borderRadius: '50%',
    },
    card: {
      borderRadius: 'var(--radius-lg)',
      height: '140px',
    }
  };

  const skeletons = Array.from({ length: count }).map((_, idx) => (
    <div
      key={idx}
      className={`skeleton-${variant} ${className}`}
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
    />
  ));

  return count === 1 ? (
    skeletons[0]
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {skeletons}
    </div>
  );
};

export default Skeleton;
