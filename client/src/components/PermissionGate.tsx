import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  /** Dot-key like "delete.repairs" or array of keys (any one allows access) */
  require: string | string[];
  /** Rendered when the current user lacks permission. Defaults to nothing. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only if the current user has the required permission(s).
 * is_full bypasses all checks (handled by useAuth().hasPermission).
 */
export const PermissionGate: React.FC<Props> = ({ require, fallback = null, children }) => {
  const { hasPermission } = useAuth();
  const keys = Array.isArray(require) ? require : [require];
  const allowed = keys.some((k) => hasPermission(k));
  return <>{allowed ? children : fallback}</>;
};

export default PermissionGate;
