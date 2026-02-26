import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

interface LoginProps {
  onLoginSuccess?: (token: string, tipo: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // API Base URL for both local dev and Render deploy
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Email ou senha inválidos');
      }

      const data = await response.json();

      // Atualiza o contexto global de autenticação (isso já salva no localStorage)
      login(data.access_token, data.usuario_tipo);

      // Armazena o ID do usuário (opcional se não estiver no context)
      localStorage.setItem('usuario_id', data.usuario_id.toString());

      if (onLoginSuccess) {
        onLoginSuccess(data.access_token, data.usuario_tipo);
      }

      // Redirecionar baseado no tipo
      if (data.usuario_tipo === 'admin') {
        navigate('/admin');
      } else {
        navigate('/professor');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h1>Sistema de Horários</h1>
          <h2>Acesse sua conta para continuar</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="login-footer">
          <p>E.E. Alcides Cesar Meneses</p>
          <p>Desenvolvido por <strong>Reginaldo Lopes</strong> &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}
