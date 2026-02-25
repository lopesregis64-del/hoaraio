# 🎓 Sistema de Horários - Verificação de Sistema

## ✅ Checklist de Verificação

Este script automatiza os testes do sistema. Execute-o para confirmar que tudo está funcionando.

### 📋 Como Usar

1. **Certifique-se que Backend e Frontend estão rodando:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python -m uvicorn main:app --reload
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Em um novo terminal, execute a verificação:**
   ```bash
   python verificar_sistema.py
   ```

### 🧪 O que é Testado

- ✅ Backend respondendo (localhost:8000)
- ✅ Login de Admin e Professor
- ✅ Endpoints do Admin (turnos, professores, disciplinas, turmas)
- ✅ Endpoints do Professor (meus dados, disciplinas, alocações)
- ✅ Banco de dados existe e tem tamanho válido
- ✅ Documentação completa

### 📊 Resultados Esperados

```
✅ PASSOU | Backend respondendo
✅ PASSOU | Login Admin
✅ PASSOU | Login Professor
✅ PASSOU | GET /admin/turnos
... (mais testes)
✅ Testes Passados: 23
❌ Testes Falhados: 0
📊 Taxa de Sucesso: 100%
```

## 🚀 Próximas Etapas

Se todos os testes passarem:

1. **Abra o Frontend:** http://localhost:5173
2. **Teste as Credenciais:**
   - Usuário Admin: `admin@test.com` / `123456`
   - Usuário Professor: `prof@test.com` / `123456`
3. **Siga o COMECE_AQUI.md** para um exemplo prático de 40 segundos

## 📚 Documentação

- **COMECE_AQUI.md** - Guia rápido (40 segundos)
- **GUIA_TESTE.md** - 30+ cenários de teste
- **ARQUITETURA.md** - Design técnico detalhado
- **API_ENDPOINTS.md** - Referência completa da API
- **STATUS.md** - Checklist de implementação
- **README.md** - Guia principal

## 🔧 Troubleshooting

Se algum teste falhar:

1. Verifique se **Backend está rodando** na porta 8000
   ```bash
   curl http://localhost:8000/
   ```

2. Verifique se **Frontend está rodando** na porta 5173
   ```bash
   curl http://localhost:5173/
   ```

3. Se o **banco não existe**, rode:
   ```bash
   cd backend
   python seed.py
   ```

4. Se **node_modules está faltando**, rode:
   ```bash
   cd frontend
   npm install
   ```

## 💡 Dicas

- O script tira um snapshot atual do sistema
- Rode periodicamente para garantir tudo funciona
- Se falhar um teste, verifique o log do erro
- Todos os endpoints estão documentados em `/admin/swagger` no backend

---

**Status:** ✅ Sistema Pronto para Teste
