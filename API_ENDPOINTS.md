# 📡 ENDPOINTS DA API

> Documentação interativa: http://localhost:8000/docs

---

## 🔐 AUTENTICAÇÃO

### ✅ Criar Novo Usuário
```http
POST /signup
Content-Type: application/json

{
  "email": "novo@test.com",
  "nome": "Novo Usuário",
  "senha": "123456",
  "tipo": "professor"  // "admin" ou "professor"
}

Resposta: 200 OK
{
  "id": 5,
  "email": "novo@test.com",
  "nome": "Novo Usuário",
  "tipo": "professor"
}
```

### ✅ Login (Gerar JWT Token)
```http
POST /token
Content-Type: application/x-www-form-urlencoded

username=admin@test.com&password=123456

Resposta: 200 OK
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "usuario_tipo": "admin"
}
```

### ✅ Obter Usuário Atual
```http
GET /me
Authorization: Bearer {token}

Resposta: 200 OK
{
  "id": 1,
  "email": "admin@test.com",
  "nome": "Administrador",
  "tipo": "admin"
}
```

---

## 👨‍💼 ADMIN ENDPOINTS

### TURNOS

#### ✅ Criar Turno
```http
POST /admin/turnos
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Integral",
  "hora_inicio": "06:00",
  "hora_fim": "18:00"
}

Resposta: 200 OK
{
  "id": 4,
  "nome": "Integral",
  "hora_inicio": "06:00",
  "hora_fim": "18:00"
}
```

#### ✅ Listar Turnos
```http
GET /admin/turnos
Authorization: Bearer {token}

Resposta: 200 OK
[
  {
    "id": 1,
    "nome": "Matutino",
    "hora_inicio": "07:00",
    "hora_fim": "12:00"
  },
  ...
]
```

### PROFESSORES

#### ✅ Criar Professor
```http
POST /admin/professors
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "prof.nova@escola.com",
  "nome": "Prof. Nova Silva",
  "senha": "123456",
  "tipo": "professor"
}

Resposta: 200 OK
{
  "id": 2,
  "email": "prof.nova@escola.com",
  "nome": "Prof. Nova Silva",
  "tipo": "professor"
}
```

#### ✅ Listar Professores
```http
GET /admin/professors
Authorization: Bearer {token}

Resposta: 200 OK
[
  {
    "id": 2,
    "email": "prof@test.com",
    "nome": "Professor Teste",
    "tipo": "professor"
  },
  ...
]
```

### DISCIPLINAS

#### ✅ Criar Disciplina
```http
POST /admin/subjects
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Educação Ambiental"
}

Resposta: 200 OK
{
  "id": 9,
  "nome": "Educação Ambiental"
}
```

#### ✅ Listar Disciplinas
```http
GET /admin/subjects
Authorization: Bearer {token}

Resposta: 200 OK
[
  {
    "id": 1,
    "nome": "Matemática"
  },
  ...
]
```

### TURMAS

#### ✅ Criar Turma
```http
POST /admin/classes
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "4º Ano A",
  "turno": "Matutino"
}

Resposta: 200 OK
{
  "id": 7,
  "nome": "4º Ano A",
  "turno": "Matutino"
}
```

#### ✅ Listar Turmas
```http
GET /admin/classes
Authorization: Bearer {token}

Resposta: 200 OK
[
  {
    "id": 1,
    "nome": "1º Ano A",
    "turno": "Matutino"
  },
  ...
]
```

---

## 👨‍🏫 PROFESSOR ENDPOINTS

### PROFESSOR INFO

#### ✅ Obter Dados do Professor Autenticado
```http
GET /professor/me
Authorization: Bearer {token}

Resposta: 200 OK
{
  "id": 1,
  "nome": "Professor Teste",
  "email": "prof@test.com"
}
```

### DISCIPLINAS DO PROFESSOR

#### ✅ Adicionar Disciplina
```http
POST /professor/professor-subjects
Authorization: Bearer {token}
Content-Type: application/json

{
  "professor_id": 1,
  "subject_id": 1,      // Matemática
  "class_id": 1,        // 1º Ano A
  "turno_id": 1,        // Matutino
  "quantidade_aulas": 4
}

Resposta: 200 OK
{
  "id": 1,
  "professor_id": 1,
  "subject_id": 1,
  "class_id": 1,
  "turno_id": 1,
  "quantidade_aulas": 4,
  "aulas_alocadas": 0
}

Erro: 400 Bad Request
{
  "detail": "Disciplina já cadastrada para esta turma/turno"
}
```

#### ✅ Listar Disciplinas do Turno
```http
GET /professor/professor-subjects?turno_id=1
Authorization: Bearer {token}

Resposta: 200 OK
[
  {
    "id": 1,
    "professor_id": 1,
    "subject_id": 1,
    "class_id": 1,
    "turno_id": 1,
    "quantidade_aulas": 4,
    "aulas_alocadas": 2
  },
  ...
]
```

### ALOCAÇÕES (AULAS)

#### ✅ Alocar Aula
```http
POST /professor/allocations
Authorization: Bearer {token}
Content-Type: application/json

{
  "professor_subject_id": 1,
  "professor_id": 1,
  "subject_id": 1,
  "class_id": 1,
  "classroom_id": 1,
  "turno_id": 1,
  "dia_semana": 0,      // 0=Seg, 1=Ter, ..., 4=Sex
  "slot": 0             // 0-5 (6 aulas por dia)
}

Resposta: 200 OK
{
  "id": 1,
  "professor_subject_id": 1,
  "professor_id": 1,
  "subject_id": 1,
  "class_id": 1,
  "classroom_id": 1,
  "turno_id": 1,
  "dia_semana": 0,
  "slot": 0
}

Erro: 409 Conflict
{
  "detail": "Turma já possui aula neste horário"
}
// ou
{
  "detail": "Você já possui aula alocada neste horário"
}
```

#### ✅ Listar Alocações do Turno
```http
GET /professor/allocations?turno_id=1
Authorization: Bearer {token}

Resposta: 200 OK
[
  {
    "id": 1,
    "professor_subject_id": 1,
    "professor_id": 1,
    "subject_id": 1,
    "class_id": 1,
    "classroom_id": 1,
    "turno_id": 1,
    "dia_semana": 0,
    "slot": 0
  },
  ...
]
```

#### ✅ Remover Aula
```http
DELETE /professor/allocations/1
Authorization: Bearer {token}

Resposta: 200 OK
{
  "message": "Alocação removida"
}

Erro: 404 Not Found
{
  "detail": "Alocação não encontrada"
}
```

---

## 🌐 WEBSOCKET

#### ✅ Conexão WebSocket
```python
# Conectar
ws = WebSocket('ws://localhost:8000/ws')

# Eventos recebidos:
{
  "type": "new_allocation",
  "data": { ... alocação ... }
}

{
  "type": "deleted_allocation",
  "data": { ... alocação ... }
}
```

---

## 📊 CÓDIGOS DE RESPOSTA

| Código | Significado | Exemplo |
|--------|-------------|---------|
| 200 | OK - Sucesso | GET /admin/turnos |
| 201 | Created - Criado | POST /admin/subjects |
| 400 | Bad Request - Erro de validação | Email duplicado |
| 401 | Unauthorized - Sem autenticação | Token inválido |
| 403 | Forbidden - Sem permissão | Professor tentando usar /admin |
| 404 | Not Found - Não encontrado | DELETE allocation inexistente |
| 409 | Conflict - Conflito de negócio | Turma com 2 aulas no mesmo horário |
| 500 | Server Error - Erro interno | Erro da API |

---

## 🔑 VALORES PADRÃO

### dia_semana
```
0 = Segunda-feira
1 = Terça-feira
2 = Quarta-feira
3 = Quinta-feira
4 = Sexta-feira
```

### slot (Aula)
```
0 = Aula 1
1 = Aula 2
2 = Aula 3
3 = Aula 4
4 = Aula 5
5 = Aula 6
```

### tipo (Usuário)
```
"admin" = Administrador
"professor" = Professor
```

---

## 🧪 EXEMPLO DE FLUXO COMPLETO

### 1. Login
```bash
curl -X POST http://localhost:8000/token \
  -d "username=prof@test.com&password=123456"

# Salve o access_token
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### 2. Obter ID do Professor
```bash
curl -X GET http://localhost:8000/professor/me \
  -H "Authorization: Bearer $TOKEN"

# Retorna: {"id": 1, "nome": "...", ...}
PROF_ID=1
```

### 3. Listar Turnos
```bash
curl -X GET http://localhost:8000/admin/turnos \
  -H "Authorization: Bearer $TOKEN"

# Retorna lista de turnos
TURNO_ID=1
```

### 4. Adicionar Disciplina
```bash
curl -X POST http://localhost:8000/professor/professor-subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "professor_id": '$PROF_ID',
    "subject_id": 1,
    "class_id": 1,
    "turno_id": '$TURNO_ID',
    "quantidade_aulas": 3
  }'

# Retorna: {"id": 1, ...}
PROF_SUBJECT_ID=1
```

### 5. Alocar Aula (Segunda-feira, Aula 1)
```bash
curl -X POST http://localhost:8000/professor/allocations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "professor_subject_id": '$PROF_SUBJECT_ID',
    "professor_id": '$PROF_ID',
    "subject_id": 1,
    "class_id": 1,
    "classroom_id": 1,
    "turno_id": '$TURNO_ID',
    "dia_semana": 0,
    "slot": 0
  }'

# Sucesso!
```

---

## 📝 NOTAS

- Todos os endpoints que modificam dados (POST, PUT, DELETE) requerem autenticação
- GET endpoints públicos requerem autenticação exceto `/` e `/token`
- Token expira em 30 minutos
- Banco de dados é SQLite (arquivo `school_quest.db`)
- Erros contêm detalhes em `response.json()["detail"]`

---

**Acesse a documentação interativa em: http://localhost:8000/docs**
