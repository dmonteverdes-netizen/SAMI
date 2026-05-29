
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { AppRole, User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: User[] = [
  { id: 'u1', name: 'Maria Rodriguez', email: 'm.rodriguez@sami.pe', role: AppRole.SAMI_ADMIN, businessId: 'sami-internal', twoFactorCode: '884422' },
  { id: 'u2', name: 'Carlos Gomez', email: 'carlos@bodegacentral.pe', role: AppRole.MYPE_ADMIN, businessId: 'b1' },
  { id: 'u3', name: 'Juan Perez', email: 'juan.perez@bodegacentral.pe', role: AppRole.MYPE_WORKER, businessId: 'b1' },
  { id: 'bank1', name: 'Analista de Riesgos', email: 'analista@interbank.pe', role: AppRole.BANK_ANALYST, businessId: 'none', institutionId: 'bank-aliado' },
  { id: 'bank2', name: 'Supervisor Bancario', email: 'supervisor@interbank.pe', role: AppRole.BANK_SUPERVISOR, businessId: 'none', institutionId: 'bank-aliado' },
  { id: 'bank3', name: 'Admin de Banco', email: 'admin@interbank.pe', role: AppRole.BANK_ADMIN, businessId: 'none', institutionId: 'bank-aliado' }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = (user: User) => {
    // In a real app, we would authenticate, but for MVP we find the user by role for simulation
    const foundUser = mockUsers.find(u => u.role === user.role);
    if (foundUser) {
        setCurrentUser(foundUser);
    } else {
        // Fallback to the passed user object if not in mocks
        setCurrentUser(user);
    }
  };

  const logout = () => {
    // In a real app, this would clear the token and call a logout endpoint
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
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
