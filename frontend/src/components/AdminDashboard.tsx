import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminDashboard.css';

interface Turno {
  id: number;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
}

interface Professor {
  id: number;
  email: string;
  nome: string;
  tipo: string;
  total_aulas: number;
  aulas_alocadas: number;
}

interface Disciplina {
  id: number;
  nome: string;
}

interface Turma {
  id: number;
  nome: string;
  turno: string;
}

export function AdminDashboard() {
  const { token, usuarioTipo, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('turnos');

  // Turnos
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [novoTurno, setNovoTurno] = useState({ nome: '', hora_inicio: '', hora_fim: '' });

  // Professores
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [nomeProf, setNomeProf] = useState('');
  const [emailProf, setEmailProf] = useState('');
  const [senhaProf, setSenhaProf] = useState('');

  // Disciplinas
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [nomeDisciplina, setNomeDisciplina] = useState('');

  // Turmas
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [nomeTurma, setNomeTurma] = useState('');
  const [turnoTurma, setTurnoTurma] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // API Base URL for both local dev and Render deploy
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

  // Helper para fetch com auth
  const fetchAuth = async (endpoint: string, options: any = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    });
    if (res.status === 401) {
      logout();
      navigate('/');
      throw new Error('Não autorizado');
    }
    return res;
  };

  useEffect(() => {
    if (token && usuarioTipo === 'admin') {
      carregarDados();
    } else if (usuarioTipo !== 'admin') {
      navigate('/');
    }
  }, [token, usuarioTipo]);

  const carregarDados = async () => {
    try {
      const [resTurnos, resProfessores, resDisciplinas, resTurmas] = await Promise.all([
        fetchAuth('/admin/turnos'),
        fetchAuth('/admin/professors'),
        fetchAuth('/admin/subjects'),
        fetchAuth('/admin/classes')
      ]);

      if (resTurnos.ok) setTurnos(await resTurnos.json());
      if (resProfessores.ok) setProfessores(await resProfessores.json());
      if (resDisciplinas.ok) setDisciplinas(await resDisciplinas.json());
      if (resTurmas.ok) setTurmas(await resTurmas.json());

    } catch (err) {
      setError('Erro ao carregar dados');
    }
  };

  const handleCriarTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchAuth('/admin/turnos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoTurno),
      });

      if (res.ok) {
        const data = await res.json();
        setTurnos([...turnos, data]);
        setNovoTurno({ nome: '', hora_inicio: '', hora_fim: '' });
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao criar turno');
      }
    } catch (err) {
      setError('Erro ao criar turno');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchAuth('/admin/professors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailProf,
          nome: nomeProf,
          senha: senhaProf,
          tipo: 'professor',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfessores([...professores, data]);
        setNomeProf('');
        setEmailProf('');
        setSenhaProf('');
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao criar professor');
      }
    } catch (err) {
      setError('Erro ao criar professor');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarDisciplina = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchAuth('/admin/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome: nomeDisciplina }),
      });

      if (res.ok) {
        const data = await res.json();
        setDisciplinas([...disciplinas, data]);
        setNomeDisciplina('');
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao criar disciplina');
      }
    } catch (err) {
      setError('Erro ao criar disciplina');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchAuth('/admin/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome: nomeTurma, turno: turnoTurma }),
      });

      if (res.ok) {
        const data = await res.json();
        setTurmas([...turmas, data]);
        setNomeTurma('');
        setTurnoTurma('');
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao criar turma');
      }
    } catch (err) {
      setError('Erro ao criar turma');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/admin/professors/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        logout();
        navigate('/');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        alert(`Sucesso: ${data.sucessos} professores importados.\nErros: ${data.erros.length}\n${data.erros.join('\n')}`);
        if (token) carregarDados();
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao importar CSV');
      }
    } catch (err) {
      setError('Erro ao conectar com servidor para importar CSV');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleImportFullCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/admin/professors/import-full`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        logout();
        navigate('/');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        alert(`Sucesso: ${data.sucessos} linhas processadas.\nErros: ${data.erros.length}\n${data.erros.join('\n')}`);
        if (token) carregarDados();
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao importar CSV Completo');
      }
    } catch (err) {
      setError('Erro ao conectar com servidor para importação completa');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDownloadTemplate = (tipo: 'simples' | 'completa') => {
    let headers = '';
    let csvContent = '';
    let fileName = '';

    if (tipo === 'simples') {
      headers = 'nome;email;senha\n';
      csvContent = 'Professor Exemplo;professor@escola.com;senha123\n';
      fileName = 'modelo_professores_simples.csv';
    } else {
      headers = 'nome_professor;email_professor;senha_professor;nome_turma;nome_disciplina;nome_turno;quantidade_aulas\n';
      csvContent = 'Maria Silva;maria@escola.com;senha123;1º Ano A;Matemática;Matutino;4\nJoão Souza;joao@escola.com;senha123;2º Ano B;Português;Vespertino;5\n';
      fileName = 'modelo_importacao_completa.csv';
    }

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeletar = async (tipo: string, id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      let endpoint = '';
      if (tipo === 'turnos') endpoint = `/admin/turnos/${id}`;
      if (tipo === 'professors') endpoint = `/admin/professors/${id}`;
      if (tipo === 'subjects') endpoint = `/admin/subjects/${id}`;
      if (tipo === 'classes') endpoint = `/admin/classes/${id}`;

      const res = await fetchAuth(endpoint, {
        method: 'DELETE',
      });

      if (res.ok) {
        carregarDados();
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || `Erro ao excluir ${tipo}`);
      }
    } catch (err) {
      setError(`Erro ao excluir ${tipo}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const irParaGradeGlobal = () => {
    navigate('/professor');
  };

  const handleExportAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/export-all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Falha ao baixar backup');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_horarios_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao baixar backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>Painel Administrativo</h1>
          <button onClick={irParaGradeGlobal} className="global-grade-btn">
            Ver Grade Global
          </button>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Sair
        </button>
      </header>

      <div className="admin-backup-bar" style={{ display: 'flex', gap: '10px', padding: '10px 30px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={handleExportAll}
          className="backup-btn"
          style={{ padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          disabled={loading}
        >
          {loading ? '📥 Processando...' : '📥 Baixar Backup Geral (CSV)'}
        </button>
        <div className="import-wrapper" style={{ position: 'relative' }}>
          <button
            className="backup-btn"
            style={{ padding: '8px 16px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            📤 Restaurar Backup Geral (CSV)
          </button>
          <input
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!window.confirm("Isso irá importar professores, turmas e alocações. Deseja continuar?")) return;

              setLoading(true);
              const formData = new FormData();
              formData.append('file', file);
              try {
                const res = await fetch(`${API_URL}/admin/import-all`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                });
                if (res.ok) {
                  const data = await res.json();
                  alert(`Sucesso: ${data.sucessos} itens processados.\nErros: ${data.erros.length}`);
                  carregarDados();
                } else {
                  alert("Erro ao importar backup");
                }
              } catch (err) {
                alert("Erro de conexão");
              } finally {
                setLoading(false);
                e.target.value = '';
              }
            }}
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-tabs">
        <button
          className={activeTab === 'turnos' ? 'active' : ''}
          onClick={() => setActiveTab('turnos')}
        >
          Turnos
        </button>
        <button
          className={activeTab === 'professores' ? 'active' : ''}
          onClick={() => setActiveTab('professores')}
        >
          Professores
        </button>
        <button
          className={activeTab === 'disciplinas' ? 'active' : ''}
          onClick={() => setActiveTab('disciplinas')}
        >
          Disciplinas
        </button>
        <button
          className={activeTab === 'turmas' ? 'active' : ''}
          onClick={() => setActiveTab('turmas')}
        >
          Turmas
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'turnos' && (
          <div className="tab-content">
            <h2>Gerenciar Turnos</h2>
            <form onSubmit={handleCriarTurno}>
              <input
                type="text"
                placeholder="Nome do turno (ex: Matutino)"
                value={novoTurno.nome}
                onChange={(e) => setNovoTurno({ ...novoTurno, nome: e.target.value })}
                required
              />
              <input
                type="time"
                placeholder="Hora de início"
                value={novoTurno.hora_inicio}
                onChange={(e) => setNovoTurno({ ...novoTurno, hora_inicio: e.target.value })}
                required
              />
              <input
                type="time"
                placeholder="Hora de fim"
                value={novoTurno.hora_fim}
                onChange={(e) => setNovoTurno({ ...novoTurno, hora_fim: e.target.value })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Turno'}
              </button>
            </form>

            <div className="list">
              <h3>Turnos Cadastrados</h3>
              {turnos.map((t) => (
                <div key={t.id} className="item">
                  <span><strong>{t.nome}</strong> - {t.hora_inicio} às {t.hora_fim}</span>
                  <button onClick={() => handleDeletar('turnos', t.id)} className="delete-btn">Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'professores' && (
          <div className="tab-content">
            <h2>Gerenciar Professores</h2>
            <form onSubmit={handleCriarProfessor}>
              <input
                type="text"
                placeholder="Nome do professor"
                value={nomeProf}
                onChange={(e) => setNomeProf(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={emailProf}
                onChange={(e) => setEmailProf(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={senhaProf}
                onChange={(e) => setSenhaProf(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Professor'}
              </button>
            </form>

            <div className="import-section" style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
              <h3>Importar via CSV</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                Selecione um arquivo .csv no formato: <strong>nome;email;senha</strong>
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                disabled={loading}
                style={{ fontSize: '14px' }}
              />
              <button
                onClick={() => handleDownloadTemplate('simples')}
                style={{ marginTop: '10px', background: '#e2e8f0', color: '#475569', fontSize: '12px', padding: '6px 12px' }}
              >
                📥 Baixar Modelo Simples
              </button>
            </div>

            <div className="import-section" style={{ marginTop: '20px', padding: '20px', background: '#f0f9ff', borderRadius: '12px', border: '2px dashed #7dd3fc' }}>
              <h3>Importação Completa (Avançada)</h3>
              <p style={{ fontSize: '13px', color: '#0369a1', marginBottom: '10px' }}>
                Cria professor, turma, disciplina e carga horária em uma única linha!
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportFullCSV}
                disabled={loading}
                style={{ fontSize: '14px' }}
              />
              <button
                onClick={() => handleDownloadTemplate('completa')}
                style={{ marginTop: '10px', background: '#e0f2fe', color: '#0369a1', fontSize: '12px', padding: '6px 12px' }}
              >
                📥 Baixar Modelo Completo
              </button>
            </div>

            <div className="list">
              <h3>Professores Cadastrados</h3>
              {professores.map((p) => (
                <div key={p.id} className="item">
                  <div className="item-info">
                    <strong>{p.nome}</strong> - {p.email}
                    <div className="item-stats" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Aulas: {p.aulas_alocadas} alocadas / {p.total_aulas - p.aulas_alocadas} pendentes (Total: {p.total_aulas})
                    </div>
                  </div>
                  <button onClick={() => handleDeletar('professors', p.id)} className="delete-btn">Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'disciplinas' && (
          <div className="tab-content">
            <h2>Gerenciar Disciplinas</h2>
            <form onSubmit={handleCriarDisciplina}>
              <input
                type="text"
                placeholder="Nome da disciplina"
                value={nomeDisciplina}
                onChange={(e) => setNomeDisciplina(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Disciplina'}
              </button>
            </form>

            <div className="list">
              <h3>Disciplinas Cadastradas</h3>
              {disciplinas.map((d) => (
                <div key={d.id} className="item">
                  <span><strong>{d.nome}</strong></span>
                  <button onClick={() => handleDeletar('subjects', d.id)} className="delete-btn">Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'turmas' && (
          <div className="tab-content">
            <h2>Gerenciar Turmas</h2>
            <form onSubmit={handleCriarTurma}>
              <input
                type="text"
                placeholder="Nome da turma (ex: 2º Ano A)"
                value={nomeTurma}
                onChange={(e) => setNomeTurma(e.target.value)}
                required
              />
              <select
                value={turnoTurma}
                onChange={(e) => setTurnoTurma(e.target.value)}
                required
              >
                <option value="">Selecione um turno</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.nome}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Turma'}
              </button>
            </form>

            <div className="list">
              <h3>Turmas Cadastradas</h3>
              {turmas.map((t) => (
                <div key={t.id} className="item">
                  <span><strong>{t.nome}</strong> - {t.turno}</span>
                  <button onClick={() => handleDeletar('classes', t.id)} className="delete-btn">Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
