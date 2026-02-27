import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/ProfessorDashboard.css';

interface Turno {
  id: number;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
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

interface ProfessorSubject {
  id: number;
  professor_id: number;
  subject_id: number;
  class_id: number;
  turno_id: number;
  quantidade_aulas: number;
  aulas_alocadas: number;
}

interface Allocation {
  id: number;
  professor_subject_id: number;
  professor_id: number;
  subject_id: number;
  class_id: number;
  classroom_id: number;
  turno_id: number;
  dia_semana: number;
  slot: number;
}

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const SLOTS = Array.from({ length: 6 }, (_, i) => i);

const SUBJECT_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#2563eb', '#9333ea', '#ea580c'
];

function abreviarNome(nome: string) {
  if (!nome) return '';
  const partes = nome.trim().split(/\s+/);
  const primeiro = partes[0].toUpperCase();
  return primeiro.substring(0, 4); // Ex: REGINA -> REGI
}

function abreviarDisciplina(nome: string) {
  if (!nome) return '';
  return nome.trim().substring(0, 6).toUpperCase(); // Ex: MATEMATICA -> MATEMA
}

export function ProfessorDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('disciplinas'); // Mantido o valor da chave interno, mas rótulos traduzidos no JSX

  // Estados para dados
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [selectedTurno, setSelectedTurno] = useState<number | null>(null);

  // Estados para disciplinas do professor
  const [professorSubjects, setProfessorSubjects] = useState<ProfessorSubject[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  // Novos dados
  const [novaDisciplinaProf, setNovaDisciplinaProf] = useState({
    subject_id: '',
    class_id: '',
    turno_id: '',
    quantidade_aulas: '',
    professor_id: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filtroProfessorId, setFiltroProfessorId] = useState<number | null>(null);
  const [editandoSubject, setEditandoSubject] = useState<{ id: number; quantidade_aulas: number } | null>(null);
  const [draggingFromGrid, setDraggingFromGrid] = useState<{ allocationId: number; psItem: ProfessorSubject } | null>(null);

  const obterNomeDisciplina = (id: number) => {
    return disciplinas.find((d) => d.id === id)?.nome || '';
  };

  const obterNomeTurma = (id: number) => {
    return turmas.find((t) => t.id === id)?.nome || '';
  };

  // API Base URL for both local dev and Render deploy
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

  // Helper function para fazer requisições autenticadas
  const fetchAutenticado = async (endpoint: string, options: any = {}) => {
    try {
      if (!token) {
        throw new Error('Token não disponível');
      }
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        console.warn('Sessão expirada ou inválida. Redirecionando para login...');
        logout();
        navigate('/', { state: { error: 'Sua sessão expirou. Por favor, faça login novamente.' } });
      }
      return res;
    } catch (err) {
      console.error('Request failed:', err);
      throw err;
    }
  };


  // Verificação de autenticação
  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (token) {
      carregarDados();
      obterProfessorId();
    }
  }, [token]);

  const obterProfessorId = async () => {
    try {
      console.log('Obtendo dados do professor via API...');
      const res = await fetchAutenticado('/professor/me');
      console.log('Resposta /professor/me:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('Dados do professor (API):', data);

        // Se o usuário for Admin, podemos ter um objeto sem Professor ID direto se não associado
        if (data.user_tipo === 'admin') {
          setIsAdmin(true);
        }

        setProfessorId(data.id);
        return data.id;
      } else {
        const errorText = await res.text();
        console.error('Erro ao obter professor. Status:', res.status, 'Resposta:', errorText);
        setError(`Erro ao obter dados do professor: ${res.status}`);
      }
    } catch (err) {
      console.error('Erro ao obter professor:', err);
      setError(`Erro ao obter professor: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  useEffect(() => {
    if (selectedTurno && token) {
      carregarDisciplinasDoTurno(selectedTurno);
      carregarAlocacoes(selectedTurno);
    }
  }, [selectedTurno, token]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    if (!token) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      // Create WebSocket URL dynamically based on the HTTP URL
      const wsUrl = API_URL.replace(/^http/, 'ws') + '/ws';
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'new_allocation') {
            const newAlloc = message.data;
            setAllocations((prev) => {
              if (prev.find(a => a.id === newAlloc.id)) return prev;
              return [...prev, newAlloc];
            });
            // Recarregar disciplinas se mudar o contador
            if (selectedTurno) carregarDisciplinasDoTurno(selectedTurno);
          } else if (message.type === 'deleted_allocation') {
            const deleted = message.data;
            setAllocations((prev) => prev.filter(a => a.id !== deleted.id));
            if (selectedTurno) carregarDisciplinasDoTurno(selectedTurno);
          } else if (message.type === 'clear_all_allocations') {
            setAllocations([]);
            if (selectedTurno) carregarDisciplinasDoTurno(selectedTurno);
          } else if (message.type === 'professor_subject_created') {
            // Se for do turno atual, recarregar a lista de disciplinas
            if (selectedTurno && message.data.turno_id === selectedTurno) {
              carregarDisciplinasDoTurno(selectedTurno);
            }
          } else if (message.type === 'professor_subject_deleted') {
            // Sempre recarregar se algo for excluído para garantir sincronia
            if (selectedTurno) carregarDisciplinasDoTurno(selectedTurno);
          }
        } catch (err) {
          console.error('Erro WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token, selectedTurno]);

  const carregarDados = async () => {
    try {
      setError('');
      console.log('Iniciando carregamento de dados...');

      // Carregar turnos
      const resTurnos = await fetchAutenticado('/turnos');
      console.log('Resposta turnos:', resTurnos.status);

      if (resTurnos.ok) {
        const data = await resTurnos.json();
        console.log('Turnos carregados:', data);
        setTurnos(data);
        if (data.length > 0 && !selectedTurno) {
          setSelectedTurno(data[0].id);
        }
      } else {
        const errorText = await resTurnos.text();
        console.error('Erro ao carregar turnos:', resTurnos.status, errorText);
        setError(`Erro ao carregar turnos: ${resTurnos.status}`);
      }

      // Carregar disciplinas
      const resDisciplinas = await fetchAutenticado('/subjects');
      if (resDisciplinas.ok) {
        const data = await resDisciplinas.json();
        setDisciplinas(data);
      } else {
        console.error('Erro ao carregar disciplinas:', resDisciplinas.status);
      }

      // Carregar turmas
      const resTurmas = await fetchAutenticado('/classes');
      if (resTurmas.ok) {
        const data = await resTurmas.json();
        setTurmas(data);
      } else {
        console.error('Erro ao carregar turmas:', resTurmas.status);
      }

      // Carregar professores
      const resProfessores = await fetchAutenticado('/professors');
      if (resProfessores.ok) {
        const data = await resProfessores.json();
        setProfessores(data);
      } else {
        console.error('Erro ao carregar professores:', resProfessores.status);
      }
    } catch (err) {
      console.error('Erro geral ao carregar dados:', err);
      setError(`Erro ao carregar dados: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const carregarDisciplinasDoTurno = async (turnoId: number) => {
    try {
      console.log(`Carregando disciplinas do turno ${turnoId}...`);
      const res = await fetchAutenticado(
        `/professor/professor-subjects?turno_id=${turnoId}`
      );
      console.log('Resposta disciplinas:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('Disciplinas carregadas:', data);
        setProfessorSubjects(data);
      } else {
        const errorText = await res.text();
        console.error('Erro ao carregar disciplinas:', res.status, errorText);
        setError(`Erro ao obter disciplina: ${res.status}`);
      }
    } catch (err) {
      console.error('Erro ao carregar disciplinas:', err);
      setError(`Erro ao obter disciplina: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const carregarAlocacoes = async (turnoId: number) => {
    try {
      const res = await fetchAutenticado(
        `/professor/allocations?turno_id=${turnoId}`
      );
      if (res.ok) {
        const data = await res.json();
        setAllocations(data);
      }
    } catch (err) {
      setError('Erro ao carregar alocações');
    }
  };

  const handleAdicionarDisciplina = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let profIdToUse = professorId;
    if (isAdmin) {
      if (!novaDisciplinaProf.professor_id) {
        setError('Por favor, selecione um professor para a disciplina');
        setLoading(false);
        return;
      }
      profIdToUse = parseInt(novaDisciplinaProf.professor_id);
    } else if (!professorId) {
      setError('Erro ao obter dados do professor');
      setLoading(false);
      return;
    }

    // Validar que turno foi selecionado
    if (!selectedTurno) {
      setError('Por favor, selecione um turno');
      setLoading(false);
      return;
    }

    // Validar que todos os campos foram preenchidos
    if (!novaDisciplinaProf.subject_id || !novaDisciplinaProf.class_id || !novaDisciplinaProf.quantidade_aulas) {
      setError('Por favor, preencha todos os campos da disciplina');
      setLoading(false);
      return;
    }

    try {
      console.log('Adicionando disciplina:', {
        professor_id: profIdToUse,
        subject_id: novaDisciplinaProf.subject_id,
        class_id: novaDisciplinaProf.class_id,
        turno_id: selectedTurno,
        quantidade_aulas: novaDisciplinaProf.quantidade_aulas,
      });

      const res = await fetchAutenticado(
        '/professor/professor-subjects',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            professor_id: profIdToUse,
            subject_id: parseInt(novaDisciplinaProf.subject_id),
            class_id: parseInt(novaDisciplinaProf.class_id),
            turno_id: selectedTurno,
            quantidade_aulas: parseInt(novaDisciplinaProf.quantidade_aulas),
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        console.log('Disciplina adicionada:', data);
        setProfessorSubjects([...professorSubjects, data]);
        setNovaDisciplinaProf({ subject_id: '', class_id: '', turno_id: '', quantidade_aulas: '', professor_id: '' });
        setError('');
      } else {
        const errorText = await res.text();
        console.error('Erro ao adicionar disciplina:', res.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          // Se é um array de erros Pydantic, pega o primeiro
          if (Array.isArray(errorData.detail)) {
            setError(errorData.detail[0]?.msg || `Erro ao adicionar disciplina: ${res.status}`);
          } else {
            setError(errorData.detail || `Erro ao adicionar disciplina: ${res.status}`);
          }
        } catch {
          setError(`Erro ao adicionar disciplina: ${res.status}`);
        }
      }
    } catch (err) {
      console.error('Erro ao adicionar disciplina:', err);
      setError(`Erro ao adicionar disciplina: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: ProfessorSubject) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropSpreadsheet = async (e: React.DragEvent, dia: number, slot: number, classId: number) => {
    e.preventDefault();

    // CASO 1: Arrastar da grade para outro slot (MOVER)
    if (draggingFromGrid) {
      const { allocationId, psItem } = draggingFromGrid;
      setDraggingFromGrid(null);
      setDraggedItem(null);

      if (psItem.class_id !== classId) {
        setError(`Esta disciplina pertence à turma ${obterNomeTurma(psItem.class_id)}`);
        return;
      }

      try {
        const res = await fetchAutenticado('/professor/allocations/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allocation_id: allocationId,
            dia_semana: dia,
            slot: slot,
          }),
        });
        if (res.ok) {
          const updatedAlloc = await res.json();
          setAllocations(prev => [...prev.filter(a => a.id !== allocationId), updatedAlloc]);
          setError('');
          carregarDisciplinasDoTurno(selectedTurno!);
        } else {
          const errData = await res.json();
          setError(errData.detail || 'Erro ao mover aula');
          carregarAlocacoes(selectedTurno!);
        }
      } catch (err) {
        setError('Erro ao mover aula');
        carregarAlocacoes(selectedTurno!);
      }
      return;
    }

    // CASO 2: Arrastar da lista de disciplinas (NOVO)
    if (!draggedItem || !selectedTurno || !professorId) return;

    if (draggedItem.class_id !== classId) {
      setError(`Esta disciplina pertence à turma ${obterNomeTurma(draggedItem.class_id)}`);
      setDraggedItem(null);
      return;
    }

    try {
      const res = await fetchAutenticado(
        '/professor/allocations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            professor_subject_id: draggedItem.id,
            professor_id: draggedItem.professor_id,
            subject_id: draggedItem.subject_id,
            class_id: classId,
            turno_id: selectedTurno,
            dia_semana: dia,
            slot: slot,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setAllocations([...allocations, data]);
        setError('');
        carregarDisciplinasDoTurno(selectedTurno);
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Erro ao alocar aula');
      }
    } catch (err) {
      setError('Erro ao alocar aula');
    }

    setDraggedItem(null);
  };

  const handleRemoverAlocacao = async (allocationId: number) => {
    try {
      const res = await fetchAutenticado(
        `/professor/allocations/${allocationId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setAllocations(allocations.filter((a) => a.id !== allocationId));
        carregarDisciplinasDoTurno(selectedTurno!);
        setError('');
      } else {
        setError('Erro ao remover alocação');
      }
    } catch (err) {
      setError('Erro ao remover alocação');
    }
  };


  const handleDownloadExcel = async () => {
    if (!selectedTurno) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Grade de Horários');

    const turnoNome = turnos.find(t => t.id === selectedTurno)?.nome || '';
    const escolaNome = "E.E. Alcides Cesar Meneses";

    // Estilo para o cabeçalho principal
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Relatório de Horários - ${escolaNome}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:G2');
    const infoCell = worksheet.getCell('A2');
    infoCell.value = `Turno: ${turnoNome} | Integrado em: ${new Date().toLocaleDateString('pt-BR')}`;
    infoCell.font = { size: 12 };
    infoCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]); // Espaço

    // Cabeçalho da Tabela
    const turmasDoTurno = turmas.filter(t => {
      const tId = Number(t.id);
      return !isNaN(tId) && (t.turno === String(selectedTurno) || t.turno === turnoNome);
    });

    const header = ['Dia', 'Aula', ...turmasDoTurno.map(t => t.nome)];
    const headerRow = worksheet.addRow(header);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Cores dos Dias (Hex sem o #)
    const DAY_COLORS = [
      'BFDBFE', // Seg
      'FBCFE8', // Ter
      'BBF7D0', // Qua
      'FDE68A', // Qui
      'E9D5FF'  // Sex
    ];

    DIAS.forEach((dia, diaIdx) => {
      SLOTS.forEach(slot => {
        const rowData = [
          slot === 0 ? dia : '',
          `Aula ${slot + 1}`,
          ...turmasDoTurno.map(turma => {
            const aula = allocations.find(a =>
              a.dia_semana === diaIdx &&
              a.slot === slot &&
              a.class_id === turma.id
            );
            if (!aula) return '';
            const discNome = obterNomeDisciplina(aula.subject_id);
            const profObj = professores.find(p => p.id === aula.professor_id);
            const profAbrev = profObj ? abreviarNome(profObj.nome) : '';
            return `${abreviarDisciplina(discNome)}-${profAbrev}`;
          })
        ];

        const row = worksheet.addRow(rowData);

        // Estilização das células do dia
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // Cor de fundo baseada no dia
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF' + DAY_COLORS[diaIdx] }
          };

          if (colNumber <= 2) {
            cell.font = { bold: true };
          }
        });

        // Inserir Intervalo
        if (slot === 2) {
          const intervalRow = worksheet.addRow(['', 'INTERVALO', ...turmasDoTurno.map(() => 'PAUSA')]);
          intervalRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF1F5F9' }
            };
            cell.font = { italic: true, bold: true };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });
    });

    // Ajustar largura das colunas
    worksheet.columns.forEach((column, i) => {
      column.width = i === 1 ? 20 : 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Grade_Horarios_${turnoNome}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPDF = () => {
    if (!selectedTurno) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const turnoNome = turnos.find(t => t.id === selectedTurno)?.nome || '';
    const escolaNome = "C.E. Alcides Cesar Meneses";

    // Cabeçalho institucional (MAIS PRÓXIMO DO TOPO)
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`Horários - ${escolaNome}`, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Turno: ${turnoNome}   |   Data: ${new Date().toLocaleDateString('pt-BR')}`, doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });

    // Horários específicos solicitados
    const morningTimes = ['7:00-7:45', '7:45-8:30', '8:30-9:15', '9:25-10:10', '10:10-10:55', '10:55-11:40'];

    // Filtrar e ORDENAR turmas do turno (A-Z)
    const turmasDoTurno = turmas
      .filter(t => {
        const tId = Number(t.id);
        return !isNaN(tId) && (t.turno === String(selectedTurno) || t.turno === turnoNome);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const body: any[] = [];

    // Cores (RGB) para os dias
    const DAY_COLORS_RGB = [
      [191, 219, 254], // Seg (Blue-200)
      [251, 207, 232], // Ter (Pink-200)
      [187, 247, 208], // Qua (Green-200)
      [253, 230, 138], // Qui (Amber-200)
      [233, 213, 255]  // Sex (Purple-200)
    ];

    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    DIAS.forEach((dia, diaIdx) => {
      SLOTS.forEach(slot => {
        const rowData = [
          slot === 0 ? dia : '',
          morningTimes[slot] || `Aula ${slot + 1}`,
          ...turmasDoTurno.map(turma => {
            const aula = allocations.find(a =>
              a.dia_semana === diaIdx &&
              a.slot === slot &&
              a.class_id === turma.id
            );
            if (!aula) return { content: '', _isAula: false };
            const discNome = obterNomeDisciplina(aula.subject_id);
            const profObj = professores.find(p => p.id === aula.professor_id);
            const profAbrev = profObj ? abreviarNome(profObj.nome) : '';

            // Cor da disciplina
            const colorHex = SUBJECT_COLORS[aula.subject_id % SUBJECT_COLORS.length];
            const colorRgb = hexToRgb(colorHex);

            return {
              content: `${abreviarDisciplina(discNome)}-${profAbrev}`,
              _isAula: true,
              _color: colorRgb
            };
          })
        ];

        // Atribuir metadados da linha
        (rowData as any)._dayIdx = diaIdx;
        (rowData as any)._isInterval = false;
        body.push(rowData);

        if (slot === 2) {
          const intervalCells = ['', '9:15-9:25', ...turmasDoTurno.map(() => 'PAUSA')];
          (intervalCells as any)._isInterval = true;
          body.push(intervalCells);
        }
      });
    });

    autoTable(doc, {
      startY: 22, // MAIS PRÓXIMO DO CABEÇALHO
      head: [['Dia', 'Horário', ...turmasDoTurno.map(t => t.nome)]],
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 0.8,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 3,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [226, 232, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 15 },
        1: { fontStyle: 'bold', cellWidth: 25 }, // UM POUCO MAIS LARGO PARA OS HORÁRIOS
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rowData = data.row.raw as any;
          const cellData = data.cell.raw as any;

          if (rowData._isInterval) {
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.fontStyle = 'bolditalic';
          } else if (cellData && typeof cellData === 'object' && cellData._isAula) {
            // Se for uma aula, usar a cor da disciplina e texto branco
            data.cell.styles.fillColor = cellData._color;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else {
            // Células vazias, Dia e Horário recebem a cor do dia
            const dayIdx = rowData._dayIdx;
            if (dayIdx !== undefined && DAY_COLORS_RGB[dayIdx]) {
              data.cell.styles.fillColor = DAY_COLORS_RGB[dayIdx] as [number, number, number];
            }
          }
        }
      },
      margin: { top: 22, left: 10, right: 10, bottom: 10 },
    });

    doc.save(`Horario_${turnoNome}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleRemoverSubject = async (psId: number) => {
    if (!window.confirm('Excluir esta disciplina e todas as suas alocações na grade?')) return;
    try {
      const res = await fetchAutenticado(
        `/professor/professor-subjects/${psId}`,
        { method: 'DELETE' }
      );
      if (res.ok || res.status === 204) {
        setProfessorSubjects(prev => prev.filter(ps => ps.id !== psId));
        setAllocations(prev => prev.filter(a => a.professor_subject_id !== psId));
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao excluir disciplina');
      }
    } catch (err) {
      setError('Erro ao excluir disciplina');
    }
  };

  const handleSalvarEdits = async () => {
    if (!editandoSubject) return;
    try {
      const ps = professorSubjects.find(p => p.id === editandoSubject.id);
      if (!ps) return;
      const res = await fetchAutenticado(
        `/professor/professor-subjects/${editandoSubject.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            professor_id: ps.professor_id,
            subject_id: ps.subject_id,
            class_id: ps.class_id,
            turno_id: ps.turno_id,
            quantidade_aulas: editandoSubject.quantidade_aulas,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setProfessorSubjects(prev => prev.map(p => p.id === updated.id ? { ...p, quantidade_aulas: updated.quantidade_aulas } : p));
        setEditandoSubject(null);
        setError('');
      } else {
        const data = await res.json();
        setError(data.detail || 'Erro ao salvar alterações');
      }
    } catch (err) {
      setError('Erro ao salvar alterações');
    }
  };


  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="professor-dashboard">
      <header className="prof-header">
        <div className="header-left">
          <h1>Dashboard de Horários</h1>
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="admin-back-btn">
              ⚙️ Painel Administrativo
            </button>
          )}
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Sair
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="prof-tabs">
        <button
          className={activeTab === 'disciplinas' ? 'active' : ''}
          onClick={() => setActiveTab('disciplinas')}
        >
          Minhas Disciplinas
        </button>
        <button
          className={activeTab === 'grade' ? 'active' : ''}
          onClick={() => setActiveTab('grade')}
        >
          Grade de Horários
        </button>
      </div>

      <div className="prof-content">
        {activeTab === 'disciplinas' && (
          <div className="tab-content">
            <h2>Minhas Disciplinas</h2>

            <div className="turno-selector">
              <label>Selecione o Turno:</label>
              {turnos.length === 0 ? (
                <div className="error-message" style={{ margin: '10px 0' }}>
                  Nenhum turno disponível. Carregando...
                </div>
              ) : (
                <select
                  value={selectedTurno || ''}
                  onChange={(e) => setSelectedTurno(parseInt(e.target.value))}
                >
                  <option value="">-- Selecione um turno --</option>
                  {turnos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.hora_inicio} - {t.hora_fim})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Filtro de Professor (apenas para Admin) */}
            {isAdmin && (
              <div className="turno-selector" style={{ marginTop: '10px' }}>
                <label>Filtrar por Professor:</label>
                <select
                  value={filtroProfessorId || ''}
                  onChange={(e) => setFiltroProfessorId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">-- Todos os Professores --</option>
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleAdicionarDisciplina}>
              <h3>Adicionar Nova Disciplina</h3>

              {isAdmin && (
                <select
                  value={novaDisciplinaProf.professor_id}
                  onChange={(e) => setNovaDisciplinaProf({ ...novaDisciplinaProf, professor_id: e.target.value })}
                  required
                >
                  <option value="">Selecione o professor</option>
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              )}

              <select
                value={novaDisciplinaProf.subject_id}
                onChange={(e) =>
                  setNovaDisciplinaProf({ ...novaDisciplinaProf, subject_id: e.target.value })
                }
                required
              >
                <option value="">Selecione uma disciplina</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>

              <select
                value={novaDisciplinaProf.class_id}
                onChange={(e) =>
                  setNovaDisciplinaProf({ ...novaDisciplinaProf, class_id: e.target.value })
                }
                required
              >
                <option value="">Selecione uma turma</option>
                {turmas
                  .filter((t) => t.turno === turnos.find((tn) => tn.id === selectedTurno)?.nome)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))
                }
              </select>

              <input
                type="number"
                placeholder="Quantidade de aulas"
                value={novaDisciplinaProf.quantidade_aulas}
                onChange={(e) =>
                  setNovaDisciplinaProf({
                    ...novaDisciplinaProf,
                    quantidade_aulas: e.target.value,
                  })
                }
                min="1"
                required
              />

              <button type="submit" disabled={loading || !selectedTurno}>
                {loading ? 'Adicionando...' : 'Adicionar Disciplina'}
              </button>
            </form>

            <div className="disciplinas-list">
              <h3>
                Disciplinas para {turnos.find((t) => t.id === selectedTurno)?.nome}
                {isAdmin && filtroProfessorId && (
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>
                    — {professores.find(p => p.id === filtroProfessorId)?.nome}
                  </span>
                )}
              </h3>
              {(() => {
                const psExibidos = isAdmin && filtroProfessorId
                  ? professorSubjects.filter(ps => ps.professor_id === filtroProfessorId)
                  : professorSubjects;
                return psExibidos.length === 0 ? (
                  <p>Nenhuma disciplina encontrada para este turno{isAdmin && filtroProfessorId ? ' / professor' : ''}.</p>
                ) : (
                  <div className="disciplinas">
                    {psExibidos.map((ps) => (
                      <div key={ps.id} className="disciplina-item">
                        <div className="disciplina-info">
                          <strong>{obterNomeDisciplina(ps.subject_id)}</strong>
                          <p className="turma-info">Turma: {obterNomeTurma(ps.class_id)}</p>
                          {isAdmin && !filtroProfessorId && (
                            <p style={{ fontSize: '11px', color: '#7c3aed', margin: '2px 0' }}>
                              👤 {professores.find(p => p.id === ps.professor_id)?.nome || 'Prof. desconhecido'}
                            </p>
                          )}
                          {editandoSubject?.id === ps.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <label style={{ fontSize: '12px' }}>Qtd:</label>
                              <input
                                type="number"
                                min={1}
                                value={editandoSubject.quantidade_aulas}
                                onChange={(e) => setEditandoSubject({ ...editandoSubject, quantidade_aulas: parseInt(e.target.value) || 1 })}
                                style={{ width: '54px', padding: '2px 6px', fontSize: '13px' }}
                              />
                              <button onClick={handleSalvarEdits} style={{ fontSize: '12px', padding: '2px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✓</button>
                              <button onClick={() => setEditandoSubject(null)} style={{ fontSize: '12px', padding: '2px 8px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
                            </div>
                          ) : (
                            <p className="aulas-info">
                              {ps.quantidade_aulas - ps.aulas_alocadas === 0
                                ? '✅ Completa'
                                : `⏳ Faltam ${ps.quantidade_aulas - ps.aulas_alocadas} aulas`}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                          <div
                            className="disciplina-drag"
                            draggable
                            onDragStart={(e) => handleDragStart(e, ps)}
                            title="Arrastar disciplina para a grade"
                          >
                            ⠿
                          </div>
                          {editandoSubject?.id !== ps.id && (
                            <>
                              <button
                                onClick={() => setEditandoSubject({ id: ps.id, quantidade_aulas: ps.quantidade_aulas })}
                                style={{ fontSize: '11px', padding: '2px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleRemoverSubject(ps.id)}
                                style={{ fontSize: '11px', padding: '2px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                🗑️ Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'grade' && (
          <div className="tab-content">
            <div className="tab-header-flex">
              <h2>Grade de Horários</h2>
              <div className="tab-header-btns">
                <button onClick={handleDownloadExcel} className="print-btn no-print export-excel-btn">
                  📊 Baixar Horário Excel
                </button>
                <button onClick={handleDownloadPDF} className="print-btn no-print export-pdf-btn">
                  📄 Baixar Horário PDF
                </button>
              </div>
            </div>


            {!selectedTurno ? (
              <p>Selecione um turno na aba "Minhas Disciplinas".</p>
            ) : (
              <div className="grade-wrapper">
                <div className="grade-header-info">
                  <div className="info-card">
                    <span className="info-label">{isAdmin ? 'Logado como' : 'Professor(a)'}</span>
                    <span className="info-value">
                      {isAdmin
                        ? 'Administrador'
                        : (professores.find(p => p.id === professorId)?.nome || 'Carregando...')
                      }
                    </span>
                  </div>
                  <div className="info-card">
                    <span className="info-label">Turno</span>
                    <select
                      className="turno-selector-inline no-print"
                      value={selectedTurno || ''}
                      onChange={(e) => setSelectedTurno(Number(e.target.value))}
                    >
                      <option value="">Selecione...</option>
                      {turnos.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>

                  {isAdmin && (
                    <div className="info-card">
                      <span className="info-label">Professor (Filtro)</span>
                      <select
                        className="turno-selector-inline"
                        value={filtroProfessorId || ''}
                        onChange={(e) => setFiltroProfessorId(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Todos os Professores</option>
                        {professores.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="info-card">
                    <span className="info-label">Carga Horária</span>
                    <span className="info-value">
                      {professorSubjects
                        .filter(ps => professores.some(p => p.id === ps.professor_id)) // Check if professor exists
                        .filter(ps => !isAdmin || !filtroProfessorId || ps.professor_id === filtroProfessorId)
                        .reduce((acc, curr) => acc + curr.quantidade_aulas, 0)
                      } Aulas
                    </span>
                  </div>
                </div>

                {/* Painel Superior de Disciplinas */}
                <div className="disciplinas-top-panel">
                  <div className="top-panel-header">
                    <h3>Disciplinas Disponíveis</h3>
                    <p className="hint">Arraste as aulas para a grade</p>
                  </div>

                  <div className="disciplinas-cards-container">
                    {professorSubjects
                      .filter(ps => professores.some(p => p.id === ps.professor_id))
                      .filter(ps => !isAdmin || !filtroProfessorId || ps.professor_id === filtroProfessorId)
                      .length === 0 ? (
                      <p className="empty-msg">Nenhuma disciplina adicionada.</p>
                    ) : (
                      professorSubjects
                        .filter(ps => professores.some(p => p.id === ps.professor_id))
                        .filter(ps => !isAdmin || !filtroProfessorId || ps.professor_id === filtroProfessorId)
                        .flatMap((ps) => {
                          const numAlocadas = allocations.filter(a => Number(a.professor_subject_id) === Number(ps.id)).length;
                          const numRestantes = ps.quantidade_aulas - numAlocadas;

                          return Array.from({ length: Math.max(0, numRestantes) }).map((_, idx) => (
                            <div
                              key={`${ps.id}-card-${idx}`}
                              className="disciplina-card-mini"
                              style={{ borderLeft: `4px solid ${SUBJECT_COLORS[ps.subject_id % SUBJECT_COLORS.length]}` }}
                              draggable
                              onDragStart={(e) => handleDragStart(e, ps)}
                            >
                              <div className="card-subject">
                                {abreviarDisciplina(obterNomeDisciplina(ps.subject_id))}-{abreviarNome(professores.find(p => p.id === ps.professor_id)?.nome || '')}
                              </div>
                              <div className="card-class">{obterNomeTurma(ps.class_id)}</div>
                            </div>
                          ));
                        })
                    )}
                  </div>
                </div>

                <div className="grade-container-full">
                  <div className="table-scroll">
                    <table className="schedule-table">
                      <thead>
                        <tr>
                          <th className="sticky-left">DIA</th>
                          <th className="sticky-left-2">HORA</th>
                          {turmas
                            .filter((t) => {
                              const turnoNome = turnos.find((tr) => tr.id === selectedTurno)?.nome;
                              return t.turno === turnoNome;
                            })
                            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                            .map((turma) => (
                              <th key={turma.id} style={{ width: '100px' }}>{turma.nome}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DIAS.map((diaNome, diaIdx) => {
                          const turmasDoTurno = turmas
                            .filter((t) => {
                              const turnoNome = turnos.find((tr) => tr.id === selectedTurno)?.nome;
                              return t.turno === turnoNome;
                            })
                            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

                          return (
                            <React.Fragment key={diaIdx}>
                              {SLOTS.map((slot) => {
                                const renderRows = [];

                                // Renderiza a aula normal
                                renderRows.push(
                                  <tr key={`${diaIdx}-${slot}`} className={slot === 0 ? 'day-start' : ''}>
                                    {slot === 0 && (
                                      <td className={`day-cell sticky-left day-${diaIdx}`} rowSpan={SLOTS.length + 1}>
                                        <div className="day-stack">
                                          {diaNome.toUpperCase().split('').map((char, i) => (
                                            <div key={i}>{char}</div>
                                          ))}
                                        </div>
                                      </td>
                                    )}

                                    <td className={`time-cell sticky-left-2 day-${diaIdx}`}>
                                      Aula {slot + 1}
                                    </td>

                                    {turmasDoTurno.map((turma) => {
                                      const allAllocationsInSlot = allocations
                                        .filter(a => professores.some(p => p.id === a.professor_id))
                                        .filter(a => a.dia_semana === diaIdx && a.slot === slot && a.class_id === turma.id);

                                      const aula = allAllocationsInSlot[0];

                                      const activeDrag = draggedItem || draggingFromGrid?.psItem;
                                      const activeDragClassId = activeDrag?.class_id;
                                      const activeDragProfId = activeDrag?.professor_id !== undefined
                                        ? activeDrag.professor_id
                                        : (isAdmin ? null : professorId);

                                      // Turma tem aula de OUTRO professor neste slot
                                      const classeOcupada = !aula && allAllocationsInSlot.length > 0;

                                      // Professor já está em outra turma neste slot
                                      const professorJaOcupado = activeDragProfId ? allocations.some(
                                        (a) => a.dia_semana === diaIdx && a.slot === slot && a.professor_id === activeDragProfId && a.class_id !== turma.id
                                          && !(draggingFromGrid && a.id === draggingFromGrid.allocationId)
                                      ) : false;

                                      // Drop é inválido para disciplina arrastada (turma errada)
                                      const dropInvalido = !!activeDrag && activeDragClassId !== undefined && activeDragClassId !== turma.id;
                                      // Drop é válido: mesma turma, professor livre, célula vazia
                                      const dropValido = !!activeDrag && !dropInvalido && !professorJaOcupado && !aula;

                                      return (
                                        <td
                                          key={turma.id}
                                          className={`slot-cell
                                            ${dropInvalido ? 'invalid-drop' : ''}
                                            ${!dropInvalido && professorJaOcupado ? 'prof-busy-elsewhere' : ''}
                                            ${!dropInvalido && !professorJaOcupado && classeOcupada ? 'class-occupied' : ''}
                                            ${dropValido ? 'valid-drop' : ''}
                                          `}
                                          onDragOver={handleDragOver}
                                          onDrop={(e) => {
                                            if (activeDrag && activeDragClassId !== turma.id) {
                                              setError(`Esta disciplina pertence à turma ${obterNomeTurma(activeDragClassId!)}`);
                                              return;
                                            }
                                            handleDropSpreadsheet(e, diaIdx, slot, turma.id);
                                          }}
                                        >
                                          {aula ? (
                                            <div
                                              className={`aula-alocada-mini ${(!isAdmin && aula.professor_id !== professorId) || (isAdmin && filtroProfessorId && aula.professor_id !== filtroProfessorId) ? 'aula-outra' : ''}`}
                                              style={{
                                                background: SUBJECT_COLORS[aula.subject_id % SUBJECT_COLORS.length],
                                                boxShadow: `0 4px 6px -1px ${SUBJECT_COLORS[aula.subject_id % SUBJECT_COLORS.length]}33`,
                                                cursor: (isAdmin || aula.professor_id === professorId) ? 'grab' : 'default',
                                                opacity: draggingFromGrid?.allocationId === aula.id ? 0.4 : 1,
                                              }}
                                              draggable={isAdmin || aula.professor_id === professorId}
                                              onDragStart={(ev) => {
                                                if (!isAdmin && aula.professor_id !== professorId) return;
                                                ev.dataTransfer.effectAllowed = 'move';
                                                const ps = professorSubjects.find(p => p.id === aula.professor_subject_id);
                                                if (ps) {
                                                  setDraggingFromGrid({ allocationId: aula.id, psItem: ps });
                                                  setDraggedItem(ps); // to drive slot highlighting
                                                }
                                              }}
                                              onDragEnd={() => {
                                                setDraggingFromGrid(null);
                                                setDraggedItem(null);
                                              }}
                                            >
                                              <div className="aula-text-compact">
                                                {`${abreviarDisciplina(obterNomeDisciplina(aula.subject_id))}-${abreviarNome(professores.find(p => p.id === aula.professor_id)?.nome || '')}`}
                                              </div>
                                              {(isAdmin || aula.professor_id === professorId) && (
                                                <button
                                                  className="remove-btn-mini no-print"
                                                  onClick={() => handleRemoverAlocacao(aula.id)}
                                                >
                                                  ✕
                                                </button>
                                              )}
                                            </div>
                                          ) : professorJaOcupado ? (
                                            <div className="busy-elsewhere-indicator">
                                              <span>OCUPADO</span>
                                            </div>
                                          ) : (
                                            <div className="empty-slot-mini"></div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );

                                // Inserir intervalo após a 3ª aula (index 2)
                                if (slot === 2) {
                                  renderRows.push(
                                    <tr key={`${diaIdx}-interval`} className="interval-row">
                                      <td className={`time-cell sticky-left-2 day-${diaIdx}`}>PAUSA</td>
                                      <td colSpan={turmasDoTurno.length} className="interval-cell text-center">
                                        INTERVALO (RECREIO)
                                      </td>
                                    </tr>
                                  );
                                }

                                return renderRows;
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
}
