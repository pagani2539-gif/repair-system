import React, { useState } from 'react';
import { PROVINCES_PATHS, type ProvincePath } from '../../utils/thailandProvincesPaths';

interface ThailandMapProps {
  selectedRegion?: string;
  onSelectRegion: (region: string) => void;
  stationCountsByRegion?: Record<string, number>;
  activeRepairsByRegion?: Record<string, number>;
  stationCountsByProvince?: Record<string, number>;
  activeRepairsByProvince?: Record<string, number>;
}

const REGION_THEMES: Record<string, { color: string; base: string; hover: string; active: string }> = {
  'ภาคเหนือ': {
    color: '#0ea5e9', // Sky blue (sky-500)
    base: 'rgba(14, 165, 233, 0.35)',
    hover: 'rgba(14, 165, 233, 0.65)',
    active: 'rgba(14, 165, 233, 0.85)'
  },
  'ภาคตะวันออกเฉียงเหนือ': {
    color: '#f43f5e', // Rose (rose-500)
    base: 'rgba(244, 63, 94, 0.35)',
    hover: 'rgba(244, 63, 94, 0.65)',
    active: 'rgba(244, 63, 94, 0.85)'
  },
  'ภาคกลาง': {
    color: '#10b981', // Emerald (emerald-500)
    base: 'rgba(16, 185, 129, 0.35)',
    hover: 'rgba(16, 185, 129, 0.65)',
    active: 'rgba(16, 185, 129, 0.85)'
  },
  'ภาคตะวันตก': {
    color: '#f59e0b', // Amber (amber-500)
    base: 'rgba(245, 158, 11, 0.35)',
    hover: 'rgba(245, 158, 11, 0.65)',
    active: 'rgba(245, 158, 11, 0.85)'
  },
  'ภาคตะวันออก': {
    color: '#8b5cf6', // Violet (violet-500)
    base: 'rgba(139, 92, 246, 0.35)',
    hover: 'rgba(139, 92, 246, 0.65)',
    active: 'rgba(139, 92, 246, 0.85)'
  },
  'ภาคใต้': {
    color: '#ec4899', // Pink (pink-500)
    base: 'rgba(236, 72, 153, 0.35)',
    hover: 'rgba(236, 72, 153, 0.65)',
    active: 'rgba(236, 72, 153, 0.85)'
  },
  'default': {
    color: '#64748b', // Slate (slate-500)
    base: 'rgba(100, 116, 139, 0.32)',
    hover: 'rgba(100, 116, 139, 0.65)',
    active: 'rgba(100, 116, 139, 0.85)'
  }
};

export const ThailandMap: React.FC<ThailandMapProps> = ({
  selectedRegion,
  onSelectRegion,
  stationCountsByRegion = {},
  activeRepairsByRegion = {},
  stationCountsByProvince = {},
  activeRepairsByProvince = {}
}) => {
  const [hoveredProvince, setHoveredProvince] = useState<ProvincePath | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 10
    });
  };

  return (
    <div 
      className="thailand-map-container"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '300px',
        margin: '0 auto',
        padding: '5px',
        userSelect: 'none'
      }}
    >
      {/* Dynamic inline styles for the Map theme */}
      <style>{`
        .thailand-svg {
          filter: drop-shadow(0 10px 25px rgba(15, 23, 42, 0.09));
          transition: all 0.4s ease;
          overflow: visible;
        }

        .province-path {
          fill: var(--region-fill-base);
          stroke: rgba(15, 23, 42, 0.18); /* Darker borders for light theme */
          stroke-width: 0.5px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Dark Mode Map paths override */
        .dark-theme .province-path,
        [data-theme='dark'] .province-path {
          stroke: rgba(255, 255, 255, 0.25); /* Lighter borders for dark theme */
        }

        /* Subtle region highlights when hovering or active */
        .province-path.region-hovered {
          fill: var(--region-fill-hover);
          stroke: var(--region-color);
          stroke-width: 0.7px;
        }

        .province-path.region-active {
          fill: var(--region-fill-active);
          stroke: var(--region-color);
          stroke-width: 1.0px;
        }

        /* Fade out non-active regions when a region is selected */
        .province-path.region-inactive {
          opacity: 0.3;
        }

        /* Strong individual province highlight on hover */
        .province-path:hover {
          fill: var(--region-color) !important;
          stroke: #ffffff;
          stroke-width: 1.2px;
          filter: drop-shadow(0 0 6px var(--region-color));
          z-index: 10;
          opacity: 1.0 !important; /* Ensure it is fully visible even if inactive */
        }

        .th-map-tooltip {
          position: absolute;
          z-index: 100;
          background: var(--glass-bg, rgba(255, 255, 255, 0.85));
          backdrop-filter: var(--glass-blur, blur(16px));
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.3));
          box-shadow: var(--glass-shadow, 0 8px 32px 0 rgba(15, 23, 42, 0.08));
          padding: 8px 12px;
          border-radius: 10px;
          pointer-events: none;
          font-size: 0.72rem;
          color: var(--text-main, #0f172a);
          display: flex;
          flex-direction: column;
          gap: 3px;
          transition: opacity 0.15s ease;
          opacity: 0;
          min-width: 160px;
        }

        .th-map-tooltip.visible {
          opacity: 1;
        }

        .alert-dot {
          animation: pulse-alert 2s infinite;
        }

        @keyframes pulse-alert {
          0% {
            r: 3px;
            opacity: 1;
            stroke-width: 0;
          }
          100% {
            r: 8px;
            opacity: 0;
            stroke-width: 1.5;
            stroke: #ef4444;
          }
        }
      `}</style>

      {/* SVG Map Render using real coordinate paths */}
      <svg 
        viewBox="0 0 560 1025" 
        className="thailand-svg"
        onMouseMove={handleMouseMove}
        style={{ width: '100%', height: 'auto' }}
      >
        <g id="provinces">
          {PROVINCES_PATHS.map((prov) => {
            const isRegionActive = selectedRegion === prov.region;
            const isRegionHovered = hoveredProvince?.region === prov.region;
            const hasActiveRegion = selectedRegion && selectedRegion !== 'All';
            
            // Determine region theme
            const theme = REGION_THEMES[prov.region] || REGION_THEMES.default;

            const styleProps = {
              '--region-color': theme.color,
              '--region-fill-base': theme.base,
              '--region-fill-hover': theme.hover,
              '--region-fill-active': theme.active
            } as React.CSSProperties;

            // Class name logic
            let classes = 'province-path';
            if (isRegionActive) {
              classes += ' region-active';
            } else if (isRegionHovered) {
              classes += ' region-hovered';
            } else if (hasActiveRegion) {
              classes += ' region-inactive';
            }

            return (
              <path 
                key={prov.id}
                d={prov.d}
                className={classes}
                onClick={() => onSelectRegion(prov.region)}
                onMouseEnter={() => setHoveredProvince(prov)}
                onMouseLeave={() => setHoveredProvince(null)}
                style={styleProps}
              />
            );
          })}
        </g>
      </svg>

      {/* Floating Glassmorphic Tooltip */}
      <div 
        className={`th-map-tooltip ${hoveredProvince ? 'visible' : ''}`}
        style={{
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`
        }}
      >
        {hoveredProvince && (
          <>
            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)' }}>
              จ. {hoveredProvince.nameTh} ({hoveredProvince.nameEn})
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              เขต: {hoveredProvince.region}
            </span>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            
            {/* Province Stats */}
            <span style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
              <span>จำนวนด่านในจังหวัด:</span>
              <strong style={{ color: 'var(--primary)', fontWeight: 800 }}>
                {stationCountsByProvince[hoveredProvince.nameTh] || 0} แห่ง
              </strong>
            </span>
            {activeRepairsByProvince[hoveredProvince.nameTh] > 0 && (
              <span style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                <span>งานซ่อมบำรุงค้าง:</span>
                <strong style={{ color: 'var(--danger)', fontWeight: 800 }}>
                  {activeRepairsByProvince[hoveredProvince.nameTh]} เคส ⚠️
                </strong>
              </span>
            )}

            {/* Regional Stats */}
            <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '4px 0' }} />
            <span style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: '15px', opacity: 0.85 }}>
              <span>ด่านรวมทั้งภาค:</span>
              <strong style={{ fontWeight: 700 }}>
                {stationCountsByRegion[hoveredProvince.region] || 0} แห่ง
              </strong>
            </span>
            <span style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: '15px', opacity: 0.85 }}>
              <span>เคสซ่อมรวมทั้งภาค:</span>
              <strong style={{ color: (activeRepairsByRegion[hoveredProvince.region] || 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                {activeRepairsByRegion[hoveredProvince.region] || 0} เคส
              </strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default ThailandMap;
