import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  usuarioTipo: string | null;
  isAuthenticated: boolean;
  login: (token: string, tipo: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuarioTipo, setUsuarioTipo] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Carregar token do localStorage ao inicializar
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedTipo = localStorage.getItem('usuario_tipo');
    
    if (savedToken && savedTipo) {
      setToken(savedToken);
      setUsuarioTipo(savedTipo);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (newToken: string, tipo: string) => {
    setToken(newToken);
    setUsuarioTipo(tipo);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('usuario_tipo', tipo);
  };

  const logout = () => {
    setToken(null);
    setUsuarioTipo(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_tipo');
  };

  return (
    <AuthContext.Provider value={{ token, usuarioTipo, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
