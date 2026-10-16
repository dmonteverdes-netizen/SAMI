import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AppRole, User } from '../types';
import { api, AUTH_TOKEN_KEY, setBearerToken } from '../services/api';

export interface Pending2FAData {
  tempToken: string;
  user: User;
  method?: string;
  demoCodeHint?: string;
}

interface LoginResult {
  requires2FA: boolean;
  tempToken?: string;
  user?: User;
  mfaMethod?: string;
  demoCodeHint?: string;
  error?: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  permissions: string[];
  isLoading: boolean;
  pending2FA: Pending2FAData | null;
  login: (email?: string, password?: string, role?: string) => Promise<LoginResult>;
  verify2FA: (code: string, tempToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  clearPending2FA: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pending2FA, setPending2FA] = useState<Pending2FAData | null>(null);

  // Restore authenticated session from backend on startup
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (response.data?.success && response.data?.user) {
          setCurrentUser(response.data.user);
          setPermissions(response.data.permissions || []);
          setToken(storedToken);
          setBearerToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('[AuthContext] Stored session could not be verified on server:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email?: string, password?: string, role?: string): Promise<LoginResult> => {
    try {
      const response = await api.post('/auth/login', { email, password, role });
      const data = response.data;

      if (data.requires2FA) {
        const pending: Pending2FAData = {
          tempToken: data.tempToken,
          user: data.user,
          method: data.mfaMethod || 'SMS',
          demoCodeHint: data.demoCodeHint
        };
        setPending2FA(pending);
        return {
          requires2FA: true,
          tempToken: data.tempToken,
          user: data.user,
          mfaMethod: data.mfaMethod,
          demoCodeHint: data.demoCodeHint
        };
      }

      if (data.token && data.user) {
        setToken(data.token);
        setCurrentUser(data.user);
        setPermissions(data.permissions || []);
        setBearerToken(data.token);
        setPending2FA(null);
        return {
          requires2FA: false,
          user: data.user
        };
      }

      return {
        requires2FA: false,
        error: 'Respuesta de autenticación no válida del servidor.'
      };
    } catch (err: any) {
      const serverMessage = err.response?.data?.error || err.message || 'Error de conexión con el servidor de autenticación.';
      return {
        requires2FA: false,
        error: serverMessage
      };
    }
  };

  const verify2FA = async (code: string, customTempToken?: string): Promise<{ success: boolean; error?: string }> => {
    const tokenToUse = customTempToken || pending2FA?.tempToken;
    if (!tokenToUse) {
      return { success: false, error: 'No hay una sesión de 2FA activa.' };
    }

    try {
      const response = await api.post('/auth/2fa/verify', {
        tempToken: tokenToUse,
        code
      });

      const data = response.data;
      if (data.success && data.token && data.user) {
        setToken(data.token);
        setCurrentUser(data.user);
        setPermissions(data.permissions || []);
        setBearerToken(data.token);
        setPending2FA(null);
        return { success: true };
      }

      return { success: false, error: data.error || 'Código incorrecto.' };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Código incorrecto o sesión 2FA expirada.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    setPermissions([]);
    setPending2FA(null);
    setBearerToken(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === AppRole.SAMI_ADMIN) return true;
    return permissions.includes(permission);
  };

  const clearPending2FA = () => {
    setPending2FA(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        permissions,
        isLoading,
        pending2FA,
        login,
        verify2FA,
        logout,
        hasPermission,
        clearPending2FA
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
