import { createContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'admin' | 'dosen' | 'mahasiswa';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  reference_id?: string;
}

const normalizeRole = (role: unknown): Role | null => {
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'dosen' || normalized === 'mahasiswa') {
    return normalized;
  }
  return null;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const normalizedRole = normalizeRole(parsed?.role);

        if (!normalizedRole) {
          throw new Error('Invalid user role in localStorage');
        }

        setToken(storedToken);
        setUser({ ...parsed, role: normalizedRole });
      } catch (error) {
        console.error('Failed to restore auth session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    const normalizedRole = normalizeRole(newUser.role);
    if (!normalizedRole) {
      throw new Error('Invalid role provided during login');
    }

    const normalizedUser: User = { ...newUser, role: normalizedRole };
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
