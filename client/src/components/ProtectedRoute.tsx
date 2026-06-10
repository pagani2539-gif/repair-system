import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** If true, blocks regular users — only User Full can access */
  requireFull?: boolean;
}

export const ProtectedRoute: React.FC<Props> = ({ children, requireFull = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-app)', color: 'var(--text-muted)', flexDirection: 'column', gap: '12px',
      }}>
        <Loader2 size={36} className="spinner" />
        <div style={{ fontSize: '0.9rem' }}>กำลังตรวจสอบการเข้าสู่ระบบ...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.force_password_change && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requireFull && !user.is_full) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
