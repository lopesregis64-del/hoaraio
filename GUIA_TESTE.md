# 🧪 Guia de Testes - Sistema de Horários

## Pré-requisitos
- Backend rodando em `http://localhost:8000`
- Frontend rodando em `http://localhost:5173`
- Banco de dados populado com `python seed.py`

---

## 🔑 Login Funcionário (Passo 1)

### Com Credenciais de Teste (Recomendado)
1. Acesse `http://localhost:5173`
2. Na seção "Credenciais de Teste", veja:
   - **Admin**: `admin@test.com` / `123456`
   - **Professor**: `prof@test.com` / `123456`

### Criar Nova Conta
1. Clique em "Não tem conta? Crie uma"
2. Preencha:
   - Nome: (qualquer nome)
   - Email: (email único)
   - Senha: (qualquer senha)
   - Tipo: Selecione entre Admin ou Professor
3. Clique em "Criar Conta"
4. Volte e faça login

---

## 👨‍💼 Teste do ADMIN

### Acesso
1. Faça login com: `admin@test.com` / `123456`
2. Será redirecionado para `/admin`

### Testando Cada Funcionalidade

#### ✅ Aba "Turnos"
- [ ] Visualizar turnos já criados (Matutino, Vespertino, Noturno)
- [ ] Criar novo turno:
  - Nome: "Integral"
  - Hora início: "06:00"
  - Hora fim: "18:00"
- [ ] Verificar se aparece na lista

#### ✅ Aba "Professores"
- [ ] Visualizar professors já criados
- [ ] Criar novo professor:
  - Nome: "Prof. João Silva"
  - Email: "joao@escola.com"
  - Senha: "123456"
- [ ] Verificar se aparece na lista

#### ✅ Aba "Disciplinas"
- [ ] Visualizar disciplinas já criadas
- [ ] Criar nova disciplina:
  - Nome: "Educação Ambiental"
- [ ] Verificar se aparece na lista

#### ✅ Aba "Turmas"
- [ ] Visualizar turmas já criadas
- [ ] Criar nova turma:
  - Nome: "4º Ano A"
  - Turno: (selecione um turno existente)
- [ ] Verificar se aparece na lista

### Validações de Admin
- ✅ Não pode acessar `/professor`
- ✅ Se tentar acessar manualmente, redireciona para login
- ✅ Botão "Sair" faz logout

---

## 👨‍🏫 Teste do PROFESSOR

### Acesso
1. Faça login com: `prof@test.com` / `123456`
2. Será redirecionado para `/professor`

### Testando Cada Funcionalidade

#### Tab 1: "Minhas Disciplinas"

##### Adicionar Disciplina
1. Selecione um turno no dropdown (ex: "Matutino")
2. Preencha o formulário "Adicionar Nova Disciplina":
   - Disciplina: "Matemática"
   - Turma: "1º Ano A"
   - Quantidade de aulas: "3"
3. Clique "Adicionar Disciplina"
4. Verificar se aparece um card colorido abaixo

**Esperado:**
- Card mostra:
  - Nome da disciplina: "Matemática"
  - Turma: "1º Ano A"
  - Aulas: "0/3" (nenhuma alocada ainda)
  - Botão "↔️ Arrastar"

##### Adicionar Múltiplas Disciplinas
Repita para adicionar mais:
- Português | 1º Ano A | 2 aulas
- Inglês | 1º Ano B | 2 aulas

#### Tab 2: "Grade de Horários"

##### Alocar Aulas com Drag & Drop
1. Permaneça no mesmo turno selecionado
2. Pegue o card de "Matemática" (clique e segure no "↔️ Arrastar")
3. Arraste para um slot na grade (ex: Segunda-feira, Aula 1)
4. Solte

**Esperado:**
- Aula aparece no horário
- Card mostra "1/3" aulas alocadas
- Aula mostra: "Matemática" e "1º Ano A"

##### Validação de Conflito 1: Mesmo Professor
1. Ainda com Matemática em Mon-Slot1
2. Tente arrastar "Português" para Mon-Slot1
3. **Esperado:** Erro "Turma já possui aula neste horário" (pois 1º Ano A já tem aula)

##### Validação de Conflito 2: Mesmo Turno/Professor
1. Coloque o professor em múltiplos horários (diferente de Português problema anterior)
2. Tente alocar a mesma disciplina em 2 slots no mesmo dia
3. Selecione diferente turmas para evitar conflito anterior
4. **Esperado:** Funciona se turma diferente

##### Remover Aula
1. Clique no "✕" de uma aula alocada
2. **Esperado:**
   - Aula desaparece da grade
   - Contador de aulas volta a "0/X"

---

## 🔒 Testes de Segurança

### Proteção de Rotas
- [ ] Sem autenticação, acesse `http://localhost:5173/admin`
  - **Esperado:** Redireciona para `/`
- [ ] Sem autenticação, acesse `http://localhost:5173/professor`
  - **Esperado:** Redireciona para `/`

### Validação de Roles
- [ ] Faça login como PROFESSOR
- [ ] Tente acessar manualmente `http://localhost:5173/admin`
  - **Esperado:** Redireciona para `/`
- [ ] Faça login como ADMIN
- [ ] Tente acessar manualmente `http://localhost:5173/professor`
  - **Esperado:** Redireciona para `/`

### Token Expiration
- [ ] Espere 30 minutos ou:
  - Abra DevTools (F12)
  - Console → `localStorage.removeItem('token')`
- [ ] Tente fazer uma ação
  - **Esperado:** Erro de autenticação
  - Redireciona para login

---

## 🌐 Testes da API

### Usando Swagger/OpenAPI
1. Acesse `http://localhost:8000/docs`
2. Todos os endpoints estão documentados

### Teste Manual com cURL

#### Login
```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@test.com&password=123456"
```

**Resposta esperada:**
```json
{
  "access_token": "eyJ0...",
  "token_type": "bearer",
  "usuario_tipo": "admin"
}
```

#### Listar Turnos (com token)
```bash
TOKEN="<access_token_from_above>"
curl -X GET "http://localhost:8000/admin/turnos" \
  -H "Authorization: Bearer $TOKEN"
```

#### Criar Disciplina
```bash
curl -X POST "http://localhost:8000/admin/subjects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste API"}'
```

---

## 📊 Checklist Final

### Backend
- [ ] API rodando (abra `http://localhost:8000`)
- [ ] Swagger está acessível (`http://localhost:8000/docs`)
- [ ] Banco de dados criado (`backend/school_quest.db` existe)
- [ ] Dados de teste populados (run `python seed.py`)

### Frontend
- [ ] App rodando (`http://localhost:5173`)
- [ ] Sem erros no console (F12)
- [ ] Página de login carrega
- [ ] Login funciona

### Funcionalidades Admin
- [ ] Cria turnos ✅
- [ ] Cria professores ✅
- [ ] Cria disciplinas ✅
- [ ] Cria turmas ✅
- [ ] Lista funcionam ✅

### Funcionalidades Professor
- [ ] Seleciona turno ✅
- [ ] Adiciona disciplinas ✅
- [ ] Vê grade de horários ✅
- [ ] Arrasta e aloca aulas ✅
- [ ] Validação de conflitos funciona ✅
- [ ] Remove aulas ✅

### Segurança
- [ ] Login funciona ✅
- [ ] Logout limpa token ✅
- [ ] Rotas protegidas redireciona ✅
- [ ] Apenas admin pode acessar `/admin` ✅
- [ ] Apenas professor pode acessar `/professor` ✅

---

## 🐛 Se Algo Não Funcionar

### Backend não inicia
```bash
# Verifique Python
python --version  # Deve ser 3.8+

# Reinstale dependências
cd backend
pip install -r requirements.txt

# Ou instale manualmente:
pip install fastapi uvicorn sqlalchemy python-jose passlib python-multipart bcrypt
```

### Frontend não compila
```bash
cd frontend
rm -r node_modules package-lock.json
npm install
npm run dev
```

### Banco de dados não carrega/corrompe
- Verifique se o backend está rodando
- Execute `python seed.py` para verificar/recriar tabelas
- Veja os logs do backend para erros de conexão

### Erro 401 (Não autorizado)
- Faça logout e login novamente
- Verifique se o token está sendo enviado corretamente
- Limpe localStorage: `localStorage.clear()`

### Drag & Drop não funciona
- Verifique console (F12) para erros
- Limpe cache do navegador (Ctrl+Shift+Del)
- Teste em outro navegador

---

**Desenvolvido com ❤️ para testes.**
