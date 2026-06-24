import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ src, alt = 'Image Preview', onClose }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(prev => (prev + 90) % 360);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden'; // prevent background scrolling

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Glassmorphic Top Bar */}
      <div 
        onClick={e => e.stopPropagation()}
        className="glass-card"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '12px',
          zIndex: 10000,
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <button
          onClick={handleZoomIn}
          title="ขยายรูป"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          title="ย่อรูป"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleRotate}
          title="หมุนรูป"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <RotateCw size={18} />
        </button>
        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />
        <button
          onClick={onClose}
          title="ปิด"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={18} />
        </button>
      </div>

      {/* Image Container */}
      <div 
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <img 
          src={src}
          alt={alt}
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
            cursor: 'default',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  );
};

export default Lightbox;
