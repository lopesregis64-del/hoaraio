import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

interface LoginProps {
  onLoginSuccess: (token: string, tipo: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'admin' | 'professor'>('professor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('usuario_tipo', data.usuario_tipo);
      localStorage.setItem('usuario_id', data.usuario_id.toString());

      onLoginSuccess(data.access_token, data.usuario_tipo);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          nome,
          senha: password,
          tipo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar conta');
      }

      setIsSignUp(false);
      setError('');
      setEmail('');
      setPassword('');
      setNome('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Sistema de Horários</h1>

        {error && <div className="error-message">{error}</div>}

        {isSignUp ? (
          <form onSubmit={handleSignUp}>
            <h2>Criar Nova Conta</h2>

            <input
              type="text"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'admin' | 'professor')}>
              <option value="professor">Professor</option>
              <option value="admin">Administrador</option>
            </select>

            <button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Conta'}
            </button>

            <button
              type="button"
              className="toggle-btn"
              onClick={() => setIsSignUp(false)}
            >
              Já tem conta? Faça login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <h2>Login</h2>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              className="toggle-btn"
              onClick={() => setIsSignUp(true)}
            >
              Não tem conta? Crie uma
            </button>
          </form>
        )}

        <div className="demo-credentials">
          <h4>Credenciais de Teste:</h4>
          <p><strong>Admin:</strong> admin@test.com / 123456</p>
          <p><strong>Professor:</strong> prof@test.com / 123456</p>
        </div>
      </div>
    </div>
  );
}
