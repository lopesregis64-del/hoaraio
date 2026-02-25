# 📅 Sistema de Gerenciamento de Horários

Um sistema completo de gerenciamento de horários escolares com autenticação baseada em roles (Admin e Professor).

## 🎯 Funcionalidades

### Administrador
- ✅ Criar e gerenciar **turnos** (Matutino, Vespertino, Noturno)
- ✅ Cadastrar **professores** no sistema
- ✅ Criar e gerenciar **disciplinas**
- ✅ Criar e gerenciar **turmas**

### Professor
- ✅ Cadastrar suas **disciplinas** vinculadas a turmas com quantidade de aulas
- ✅ Visualizar **grade de horários** do turno
- ✅ **Arrastar e alocar** disciplinas nos horários disponíveis
- ✅ Validação automática de conflitos (professor e turma não podem ter 2 aulas no mesmo horário)
- ✅ Remover alocações de aulas

## 🚀 Como Usar

### 1. Instalar Dependências

#### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt  # Ou instale os packages listad no setup
```

#### Frontend
```bash
cd frontend
npm install
```

### 2. Popular Banco de Dados com Dados de Teste

```bash
cd backend
python seed.py
```

Isso criará:
- **Admin**: `admin@test.com` / `123456`
- **Professor**: `prof@test.com` / `123456`
- 3 Turnos (Matutino, Vespertino, Noturno)
- 8 Disciplinas (Matemática, Português, História, etc)
- 6 Turmas (1º-3º Anos, multi-turnos)

### 3. Iniciar o Sistema

#### Terminal 1 - Backend
```bash
cd backend
python -m uvicorn main:app --reload
```
Acesso: `http://localhost:8000`
Documentação API: `http://localhost:8000/docs`

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
Acesso: `http://localhost:5173`

## 🔐 Autenticação e Rotas

### Login
- Página inicial: `http://localhost:5173/`
- Você pode fazer login ou criar uma nova conta
- Use as credenciais de teste ou crie novos usuários

### Dashboard Admin
- URL: `http://localhost:5173/admin`
- Interface para cadastrar todos os dados do sistema
- 4 abas: Turnos, Professores, Disciplinas, Turmas

### Dashboard Professor
- URL: `http://localhost:5173/professor`
- 2 abas:
  1. **Minhas Disciplinas**: Adicione disciplinas para turmas específicas
  2. **Grade de Horários**: Visualize e arraste disciplinas para os horários

## 📊 Fluxo de Uso Recomendado

### Primeira Vez
1. Faça login como **Admin** (admin@test.com / 123456)
2. Verifique se os turnos, disciplinas e turmas foram criados (devem estar do seed.py)
3. Cadastre mais professores se necessário
4. Logout

### Como Professor
1. Faça login como **Professor** (prof@test.com / 123456)
2. Vá para a aba "Minhas Disciplinas"
3. Selecione um turno no dropdown
4. Adicione uma disciplina para uma turma com a quantidade de aulas
5. A disciplina aparecerá como um card colorido
6. Vá para a aba "Grade de Horários"
7. Arraste uma disciplina para o horário desejado
8. O sistema valida automaticamente conflitos:
   - ❌ Mesma disciplina não pode estar em dois horários no mesmo dia
   - ❌ Turma não pode ter 2 aulas diferentes no mesmo horário
   - ✅ Se tudo OK, a aula é alocada e o contador é atualizado

## 🛠️ Tecnologias Utilizadas

### Backend
- **FastAPI**: Framework web moderno
- **SQLAlchemy**: ORM para banco de dados
- **JWT (python-jose)**: Autenticação com tokens
- **Passlib**: Hash de senhas
- **WebSocket**: Comunicação em tempo real (pronto para expansão)

### Frontend
- **React 19**: Biblioteca UI
- **TypeScript**: Tipagem estática
- **React Router**: Navegação entre páginas
- **Vite**: Build tool rápido
- **CSS3**: Estilos responsivos

### Banco de Dados
- **SQLite**: Banco de dados local (padrão)
- Fácil migração para PostgreSQL

## 🔒 Segurança

- ✅ Senhas hasheadas com bcrypt
- ✅ Autenticação por JWT
- ✅ Rotas protegidas por role (Admin/Professor)
- ✅ CORS configurado
- ✅ Validação de entrada nos endpoints

## 📝 Estrutura do Projeto

```
horario/
├── backend/
│   ├── main.py           # Endpoints FastAPI
│   ├── models.py         # Modelos SQLAlchemy
│   ├── schemas.py        # Schemas Pydantic
│   ├── auth.py           # Autenticação e JWT
│   ├── database.py       # Configuração do banco
│   ├── websocket_manager.py  # WebSocket
│   ├── seed.py           # Dados de teste
│   └── school_quest.db   # Banco SQLite
│
└── frontend/
    ├── src/
    │   ├── components/    # Componentes React
    │   │   ├── Login.tsx
    │   │   ├── AdminDashboard.tsx
    │   │   ├── ProfessorDashboard.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   └── ...
    │   ├── context/       # Context API
    │   │   └── AuthContext.tsx
    │   ├── styles/        # Estilos CSS
    │   ├── App.tsx        # Componente principal
    │   ├── main.tsx       # Entrada
    │   └── index.css
    └── package.json
```

## 🐛 Troubleshooting

### Backend não inicia
- Verifique se o Python 3.8+ está instalado
- Execute: `python -m pip install --upgrade pip`
- Recrie o venv se necessário

### Frontend não compila
- Delete `node_modules` e `package-lock.json`
- Execute: `npm install`
- Limpe o cache do Vite: `npm run dev -- --force`

### Banco de dados com erro
- Execute: `python seed.py` para verificar/recriar tabelas

### Token expirado no frontend
- O token expira em 30 minutos
- Faça logout e login novamente

## 🚀 Próximas Melhorias

- [ ] Editar/excluir turnos, disciplinas, turmas
- [ ] Gerenciar salas de aula
- [ ] Relatórios de utilização
- [ ] Sincronização em tempo real com mais WebSocket
- [ ] Multi-idioma
- [ ] Exportação de horários em PDF
- [ ] Sistema de avaliação de conflitos
- [ ] Histórico de alterações

## 📞 Suporte

Para dúvidas ou problemas, verifique os logs do backend em `http://localhost:8000/docs` para testar os endpoints.

---

**Desenvolvido com ❤️ usando FastAPI e React**
