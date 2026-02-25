# 🏗️ Arquitetura do Sistema de Horários

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                       APLICAÇÃO WEB                             │
├─────────────────────────────────────────────────────────────────┤
│                    Frontend (React + TypeScript)                │
│  • Page: Login        • Page: AdminDashboard                    │
│  • Page: ProfessorDashboard                                     │
│  • Components: Forms, Grid, DragDrop                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST
                           │ JWT Token
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                             │
│  • Autenticação (JWT)     • Validações de Negócio             │
│  • Endpoints CRUD         • Middleware CORS                     │
│  • WebSocket (opcional)                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Banco de Dados (SQLite)                        │
│  • Users (autenticação)     • Allocations (aulas alocadas)     │
│  • Professors               • ProfessorSubjects (disciplinas)   │
│  • Subjects                 • Turnos                            │
│  • SchoolClasses (turmas)                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Modelos de Dados

### User (Usuário/Autenticação)
```python
User {
  id: Integer,
  email: String (único),
  senha_hash: String,
  nome: String,
  tipo: Enum ['admin', 'professor'],
  ativo: Boolean
}
```

**Relacionamentos:**
- 1 User → 1 Professor (vinculação via email)

### Professor
```python
Professor {
  id: Integer,
  user_id: Integer (FK → User),
  nome: String,
  email: String (único),
  senha_hash: String
}
```

**Relacionamentos:**
- 1 Professor → N ProfessorSubjects
- 1 Professor → N Allocations

### ProfessorSubject (Disciplinas do Professor)
```python
ProfessorSubject {
  id: Integer,
  professor_id: Integer (FK → Professor),
  subject_id: Integer (FK → Subject),
  class_id: Integer (FK → SchoolClass),
  turno_id: Integer (FK → Turno),
  quantidade_aulas: Integer,
  aulas_alocadas: Integer (contador)
}

CONSTRAINT: Única combinação (professor, subject, class, turno)
```

**Purpose:** Vincular professor a disciplinas em turmas específicas

### Allocation (Aula Alocada)
```python
Allocation {
  id: Integer,
  professor_subject_id: Integer (FK → ProfessorSubject),
  professor_id: Integer (FK → Professor),
  subject_id: Integer (FK → Subject),
  class_id: Integer (FK → SchoolClass),
  classroom_id: Integer (FK → ClassRoom),
  turno_id: Integer (FK → Turno),
  dia_semana: Integer [0-4] (Seg-Sex),
  slot: Integer [0-5] (6 aulas por dia)
}

CONSTRAINTS:
  • Única: (class_id, dia_semana, slot, turno_id)
  • Única: (professor_id, dia_semana, slot, turno_id)
```

**Purpose:** Registrar aulas alocadas, validando conflitos

### Turno (Turno Escolar)
```python
Turno {
  id: Integer,
  nome: String (único) // "Matutino", "Vespertino", etc
  hora_inicio: String // "07:00"
  hora_fim: String    // "12:00"
}
```

### Subject (Disciplina)
```python
Subject {
  id: Integer,
  nome: String
}
```

### SchoolClass (Turma)
```python
SchoolClass {
  id: Integer,
  nome: String // "1º Ano A"
  turno: String // Ex: "Matutino"
}
```

### ClassRoom (Sala de Aula)
```python
ClassRoom {
  id: Integer,
  nome: String // "Sala 101", "Laborátório"
}
```

---

## 🔐 Fluxo de Autenticação

```
1. Frontend → POST /token {username, password}
   └─> Backend valida credenciais

2. Backend → Retorna {access_token, usuario_tipo}
   └─> Frontend armazena em localStorage

3. Frontend → Inclui Authorization: Bearer {token} em cada request

4. Backend → Valida JWT com função obter_usuario_atual()
   └─> Se válido: continua
   └─> Se inválido: retorna 401 Unauthorized

5. CRUD Operations com contexto do usuário autenticado
   └─> Admin: acesso a /admin/* endpoints
   └─> Professor: acesso a /professor/* endpoints
```

### Diagrama JWT
```
┌──────────────────────────┐
│    Login (email, senha)  │
└───────────┬──────────────┘
            ↓
┌──────────────────────────────────────────┐
│ Validate Credentials                     │
│ • Hash senha com bcrypt                  │
│ • Comparar com senha_hash                │
└───────────┬──────────────────────────────┘
            ↓ (válido)
┌──────────────────────────────────────────┐
│ Generate JWT Token                       │
│ Header: {algoritmo: HS256}              │
│ Payload: {sub: email, exp: NOW+30min}   │
│ Signature: HMAC-SHA256(SECRET_KEY)     │
└───────────┬──────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ Return {access_token, usuario_tipo}      │
└──────────────────────────────────────────┘
```

---

## 📡 Endpoints da API

### Autenticação
```
POST   /signup              → Criar novo usuário
POST   /token               → Login (gera JWT)
GET    /me                  → Obter usuário autenticado
```

### Admin Endpoints
```
POST   /admin/turnos        → Criar turno
GET    /admin/turnos        → Listar turnos

POST   /admin/professors    → Criar professor
GET    /admin/professors    → Listar professores

POST   /admin/subjects      → Criar disciplina
GET    /admin/subjects      → Listar disciplinas

POST   /admin/classes       → Criar turma
GET    /admin/classes       → Listar turmas
```

### Professor Endpoints
```
POST   /professor/professor-subjects     → Adicionar disciplina
GET    /professor/professor-subjects     → Listar disciplinas
GET    /professor/me                     → Obter dados do professor

POST   /professor/allocations            → Alocar aula
GET    /professor/allocations            → Listar alocações
DELETE /professor/allocations/{id}       → Remover alocação
```

### WebSocket
```
WS     /ws                  → Conexão WebSocket para atualizações em tempo real
```

---

## 🎯 Fluxo de Negócio: Alocar Aula

```
┌─────────────┐
│ Professor   │
│ Seleciona   │
│ Disciplina  │
└──────┬──────┘
       ↓
┌──────────────────────────────────────────┐
│ Arrastar para Horário                    │
│ (dia_semana, slot, turno_id)            │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Backend Valida Conflitos                 │
│ 1. Turma já tem aula neste horário?     │
│    SELECT * FROM Allocations WHERE      │
│    class_id AND dia_semana AND slot    │
│    AND turno_id                         │
│                                          │
│ 2. Professor já alocado neste horário?  │
│    SELECT * FROM Allocations WHERE      │
│    professor_id AND dia_semana AND slot│
│    AND turno_id                         │
└──────┬───────────────────────────────────┘
       │
       ├─→ [CONFLITO] → Retorna erro 409
       │
       └─→ [OK]
           ↓
┌──────────────────────────────────────────┐
│ Inserir Allocation                       │
│ INSERT INTO Allocations (                │
│   professor_subject_id,                  │
│   professor_id,                          │
│   subject_id,                            │
│   class_id,                              │
│   classroom_id,                          │
│   turno_id,                              │
│   dia_semana,                            │
│   slot                                   │
│ )                                        │
│                                          │
│ UPDATE ProfessorSubject                  │
│   SET aulas_alocadas = aulas_alocadas + 1
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Broadcast WebSocket                      │
│ {type: 'new_allocation', data: {..}}    │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Frontend Atualiza UI                     │
│ • Mostra aula no grid                    │
│ • Atualiza contador (X/Y)               │
└──────────────────────────────────────────┘
```

---

## 🎨 Estrutura Frontend

### Páginas
```
/                  → Login
/admin             → AdminDashboard
/professor         → ProfessorDashboard
```

### Componentes Principais
```
Login.tsx
├── Form: email, senha
├── Toggle: Login ↔ SignUp
└── Submit: Autenticação

AdminDashboard.tsx
├── Header: Logout
├── Tabs: Turnos, Professores, Disciplinas, Turmas
└── Tab Content: CRUD Forms + Listas

ProfessorDashboard.tsx
├── Header: Logout
├── Tabs: Minhas Disciplinas, Grade de Horários
├── Tab 1: 
│   ├── Turno Selector
│   ├── Add Disciplina Form
│   └── Disciplina Cards (draggable)
└── Tab 2:
    ├── Grade Table (6 aulas × 5 dias)
    ├── Slots: Drop zones
    └── Aulas: Com remove button

ProtectedRoute.tsx
└── Valida autenticação + role antes de renderizar
```

### Context & Hooks
```
AuthContext.tsx
├── token: string
├── usuarioTipo: 'admin' | 'professor'
├── isAuthenticated: boolean
├── login(): void
└── logout(): void

Uso: const {token, usuarioTipo} = useAuth()
```

---

## 💾 Persistência de Dados

### localStorage (Frontend)
```javascript
localStorage.setItem('token', jwt_token)
localStorage.setItem('usuario_tipo', 'admin' | 'professor')

// Na inicialização
const token = localStorage.getItem('token')
const tipo = localStorage.getItem('usuario_tipo')
if (token && tipo) {
  // Usuário já autenticado, redireciona para dashboard
}
```

### SQLite (Backend)
```python
# Arquivo: backend/school_quest.db
# Auto-criado pelo SQLAlchemy na primeira execução

# Tables:
# - users
# - professors
# - subjects
# - classrooms
# - school_classes
# - turnos
# - professor_subjects
# - allocations
```

---

## 🔄 Fluxo de Requisição Completo

### Exemplo: Professor Aloca Aula

```
1. FRONTEND:
   └─ Usuário arrasta "Matemática" para "Seg-Aula1"
   └─ handleDrop(dia=0, slot=0) chamado
   └─ Prepara payload:
      {
        professor_subject_id: 5,
        professor_id: 2,
        subject_id: 1,
        class_id: 3,
        classroom_id: 1,
        turno_id: 1,
        dia_semana: 0,
        slot: 0
      }

2. FETCH:
   └─ POST /professor/allocations
   └─ Headers: { Authorization: "Bearer eyJ0..." }
   └─ Body: JSON payload acima

3. BACKEND:
   ├─ auth.obter_usuario_professor() descodifica JWT
   │  └─ Recupera email do payload
   │  └─ Busca User no banco
   │  └─ Se não encontrado ou tipo != 'professor', retorna 403
   │
   ├─ Valida conflitos:
   │  └─ Turma: SELECT count(*) FROM Allocations
   │     WHERE class_id=3 AND dia_semana=0 
   │           AND slot=0 AND turno_id=1
   │  └─ Professor: SELECT count(*) FROM Allocations
   │     WHERE professor_id=2 AND dia_semana=0 
   │           AND slot=0 AND turno_id=1
   │
   ├─ Se algum retorna > 0: HTTPException(409, "Conflito")
   │
   ├─ Se OK: INSERT INTO Allocations (...)
   │  └─ UPDATE ProfessorSubject SET aulas_alocadas += 1
   │  └─ db.commit()
   │
   └─ Retorna: { id: 42, professor_subject_id: 5, ... }

4. WEBSOCKET (Broadcast):
   └─ manager.broadcast({
        type: 'new_allocation',
        data: {...}
      })

5. FRONTEND:
   ├─ Recebe resposta 200 OK
   ├─ Atualiza state:
   │  └─ setAllocations([...prev, data])
   │  └─ Recarrega disciplinas (para atualizar contador)
   ├─ UI atualiza:
   │  └─ Aula aparece no grid
   │  └─ Card mostra "1/XXX" aulas alocadas
   └─ Erro? Mostra mensagem de erro
```

---

## 🔒 Validações & Segurança

### Validações de Entrada (Backend)
```python
# auth.py
- Senha: hash com bcrypt
- Email: validado com regex
- Token: decodificado e validado

# main.py (endpoints)
- Schema Pydantic valida tipos
- Constraints de banco validam unicidade
- Autenticação requerida em endpoints protegidos
```

### Validações de Conflito (Regras de Negócio)
```python
# Alocação não pode violar:
1. Turma não pode ter 2 aulas no mesmo horário/turno
2. Professor não pode estar em 2 lugares no mesmo horário/turno
3. Disciplina já alocada não pode ter slots duplicados
4. Aulas não podem exceder quantidade_aulas definida
```

### Validações Frontend
```javascript
// React
- Token enviado em Authorization header
- Rotas protegidas antes de renderizar
- Logout limpa token e localStorage
- Validação de conflitos no drop
```

---

## 🧪 Teste Unitário Exemplo

```python
# No backend, exemplo de teste:

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login():
    response = client.post(
        "/token",
        data={"username": "admin@test.com", "password": "123456"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_criar_turno():
    # 1. Login
    login_resp = client.post(
        "/token",
        data={"username": "admin@test.com", "password": "123456"}
    )
    token = login_resp.json()["access_token"]
    
    # 2. Criar turno
    turno_resp = client.post(
        "/admin/turnos",
        headers={"Authorization": f"Bearer {token}"},
        json={"nome": "Teste", "hora_inicio": "08:00", "hora_fim": "13:00"}
    )
    assert turno_resp.status_code == 200
    assert turno_resp.json()["nome"] == "Teste"
```

---

## 📈 Possíveis Extensões

1. **Multiplas Salas**: Campo `classroom_id` já pronto
2. **Sincronização Real-time**: WebSocket conectado, aguarda uso
3. **Relatórios PDF**: Adicionar library `reportlab`
4. **Busca Avançada**: Filtros no GET dos endpoints
5. **Auditoria**: Log de alterações (created_at, updated_at)
6. **Notificações**: Email para mudanças de horário
7. **Mobile App**: Usar mesma API, React Native
8. **Persistência Arquivo**: Exportar horários em Excel/PDF

---

**Documentação Técnica v1.0**
