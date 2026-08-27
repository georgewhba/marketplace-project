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
  register: (data: any) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  googleAuth: (idToken: string, vendorData?: any) => Promise<void>;
  registerVendor: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { setUser(null); setIsLoading(false); return; }
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
    refreshProfile();
    const onLogout = () => { setUser(null); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [refreshProfile]);

  const login = async (email: string, password: string): Promise<any> => {
    const res = await authApi.login({ email, password }) as any;
    const data = res.data || res;
    
    if (data.requiresMfa) {
      return { requiresMfa: true, tempToken: data.tempToken };
    }
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return { requiresMfa: false };
  };
  
  const mfaLogin = async (tempToken: string, token: string) => {
    // Override default header behavior to pass tempToken, since it's a special route
    const res = await fetch('/api/auth/mfa/challenge', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify({ token })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'رمز غير صحيح');
    }
    
    const json = await res.json();
    const data = json.data || json;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const register = async (formData: any) => {
    const res = await authApi.register(formData) as any;
    const data = res.data || res;
    
    if (data.requiresOtp) {
      return data;
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await authApi.verifyOtp({ email, otp }) as any;
    const data = res.data || res;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const googleAuth = async (idToken: string, vendorData?: any) => {
    const res = await authApi.googleAuth({ idToken, vendorData }) as any;
    const data = res.data || res;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const registerVendor = async (formData: any) => {
    const res = await authApi.registerVendor(formData) as any;
    const data = res.data || res;
    
    if (data.requiresOtp) {
      return data;
    }
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch {}
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, mfaLogin, register, verifyOtp, googleAuth, registerVendor, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
