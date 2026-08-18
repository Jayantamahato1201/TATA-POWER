import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { safeJsonFetch, safeParseResponse } from '../utils/apiUtils';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  quickLogin: (role: UserRole) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tatapower_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('tatapower_token') || null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      // Validate session with server
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Session expired');
          return safeParseResponse<{ user: User }>(res, { user: null as any });
        })
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('tatapower_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {
          // Clean expired session
          setUser(null);
          setToken(null);
          localStorage.removeItem('tatapower_user');
          localStorage.removeItem('tatapower_token');
        });
    }
  }, [token]);

  const login = async (
    emailOrUser: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const { ok, data, error: fetchErr } = await safeJsonFetch<{ user: User; token: string; error?: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailOrUser, username: emailOrUser, password: pass }),
        }
      );

      if (!ok || !data || !data.token) {
        const errorMsg = data?.error || fetchErr || 'Login failed. Please check credentials or database configuration.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('tatapower_user', JSON.stringify(data.user));
      localStorage.setItem('tatapower_token', data.token);
      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Authentication network error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const quickLogin = async (role: UserRole) => {
    let email = 'admin';
    let pass = 'admin123';

    if (role === 'STAFF') {
      email = 'operator';
      pass = 'operator123';
    } else if (role === 'VIEWER') {
      email = 'viewer';
      pass = 'viewer123';
    }

    await login(email, pass);
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('tatapower_user');
    localStorage.removeItem('tatapower_token');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.permissions?.includes(permission) ?? false;
  };

  const clearError = () => setError(null);

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF' || isAdmin;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isStaff,
        login,
        logout,
        quickLogin,
        hasPermission,
        isLoginModalOpen,
        setIsLoginModalOpen,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
