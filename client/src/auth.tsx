import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from './api';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'vendor' | 'admin';
  phone?: string;
  avatarUrl?: string;
  vendor?: any;
  mfaEnabled?: boolean;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  mfaLogin: (tempToken: string, token: string) => Promise<void>;
  verifyMfa: (tempToken: string, code: string) => Promise<void>;
  register: (data: any) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  googleAuth: (idToken: string, vendorData?: any) => Promise<void>;
  registerVendor: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function cleanupStaleTokens() {
  const access = localStorage.getItem('accessToken');
  if (access === 'undefined' || access === 'null') {
    localStorage.removeItem('accessToken');
  }
  const refresh = localStorage.getItem('refreshToken');
  if (refresh === 'undefined' || refresh === 'null') {
    localStorage.removeItem('refreshToken');
  }
}

function saveTokens(data?: { accessToken?: string; refreshToken?: string }) {
  if (typeof data?.accessToken === 'string' && data.accessToken !== 'undefined' && data.accessToken !== 'null') {
    localStorage.setItem('accessToken', data.accessToken);
  } else {
    const cur = localStorage.getItem('accessToken');
    if (cur === 'undefined' || cur === 'null') {
      localStorage.removeItem('accessToken');
    }
  }

  if (typeof data?.refreshToken === 'string' && data.refreshToken !== 'undefined' && data.refreshToken !== 'null') {
    localStorage.setItem('refreshToken', data.refreshToken);
  } else {
    const cur = localStorage.getItem('refreshToken');
    if (cur === 'undefined' || cur === 'null') {
      localStorage.removeItem('refreshToken');
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      cleanupStaleTokens();
      const res = await authApi.getProfile();
      setUser((res as any).data || res);
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cleanupStaleTokens();
    refreshProfile();
    const onLogout = () => {
      setUser(null);
    };
    const onRefresh = () => {
      refreshProfile();
    };
    window.addEventListener('auth:logout', onLogout);
    window.addEventListener('auth:refresh', onRefresh);
    return () => {
      window.removeEventListener('auth:logout', onLogout);
      window.removeEventListener('auth:refresh', onRefresh);
    };
  }, [refreshProfile]);

  const login = async (email: string, password: string): Promise<any> => {
    const res = (await authApi.login({ email, password })) as any;
    const data = res.data || res;

    if (data.requiresMfa) {
      return { requiresMfa: true, tempToken: data.tempToken };
    }

    saveTokens(data);
    setUser(data.user);
    return { requiresMfa: false };
  };

  const mfaLogin = async (tempToken: string, token: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tempToken && tempToken !== 'undefined' && tempToken !== 'null') {
      headers['Authorization'] = `Bearer ${tempToken}`;
    }

    const res = await fetch('/api/auth/mfa/challenge', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.error || 'رمز غير صحيح');
    }

    const json = await res.json();
    const data = json.data || json;
    saveTokens(data);
    setUser(data.user);
  };

  const register = async (formData: any) => {
    const res = (await authApi.register(formData)) as any;
    const data = res.data || res;

    if (data.requiresOtp) {
      return data;
    }

    saveTokens(data);
    setUser(data.user);
    return data;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = (await authApi.verifyOtp({ email, otp })) as any;
    const data = res.data || res;
    saveTokens(data);
    setUser(data.user);
  };

  const googleAuth = async (idToken: string, vendorData?: any) => {
    const res = (await authApi.googleAuth({ idToken, vendorData })) as any;
    const data = res.data || res;
    saveTokens(data);
    setUser(data.user);
  };

  const registerVendor = async (formData: any) => {
    const res = (await authApi.registerVendor(formData)) as any;
    const data = res.data || res;

    if (data.requiresOtp) {
      return data;
    }

    saveTokens(data);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    const rawRefresh = localStorage.getItem('refreshToken');
    const refreshToken = rawRefresh && rawRefresh !== 'undefined' && rawRefresh !== 'null' ? rawRefresh : undefined;
    try {
      await authApi.logout(refreshToken);
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        mfaLogin,
        verifyMfa: mfaLogin,
        register,
        verifyOtp,
        googleAuth,
        registerVendor,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
