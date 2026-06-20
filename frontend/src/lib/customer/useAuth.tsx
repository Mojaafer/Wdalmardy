'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from '@/i18n/routing';
import {
  getToken,
  clearToken,
  getMe,
  logout as apiLogout,
  type CustomerData,
} from './auth';

type AuthState = {
  customer: CustomerData | null;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getMe();
      setCustomer(res.data);
    } catch {
      clearToken();
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiLogout();
    setCustomer(null);
    router.push('/');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ customer, loading, isAuthenticated: !!customer, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
