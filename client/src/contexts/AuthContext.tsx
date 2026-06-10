import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, tokenStorage } from '../api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setTokenAndUser: (token: string, user: User) => void;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const hasPermissionFor = (user: User | null, key: string): boolean => {
  if (!user) return false;
  if (user.is_full) return true;
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = user.permissions || {};
  for (const p of parts) {
    if (node == null || typeof node !== 'object') return false;
    node = node[p];
  }
  return node === true;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    const token = tokenStorage.get();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user: fetched } = await authApi.me();
      setUser(fetched);
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (username: string, password: string) => {
    const { token, user: loggedIn } = await authApi.login(username, password);
    tokenStorage.set(token);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: fetched } = await authApi.me();
      setUser(fetched);
    } catch {
      // ignored
    }
  }, []);

  const setTokenAndUser = useCallback((token: string, nextUser: User) => {
    tokenStorage.set(token);
    setUser(nextUser);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    setTokenAndUser,
    hasPermission: (key) => hasPermissionFor(user, key),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
