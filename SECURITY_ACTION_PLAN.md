## 🚀 AÇÃO IMEDIATA - Security Fixes (Hoje)

**Status**: 🚨 CRÍTICO encontrado  
**Tempo Total**: ~2 horas (inclui testes)  
**Risco**: Dados de clientes expostos até serem implementadas as fixes

---

## 1️⃣ ATIVAR RLS - PRIMEIRA COISA (20 min)

### ✅ Já pronto: `SUPABASE_RLS_POLICIES.sql`

```bash
# 1. Vai a Supabase Dashboard
https://app.supabase.com

# 2. Projeto > SQL Editor > New Query

# 3. Copia TODO o content de:
SUPABASE_RLS_POLICIES.sql

# 4. Run (Ctrl+Enter)

# 5. Valida resultado (0 errors)
```

**Impacto**: 🔴 CRÍTICO > ✅ RESOLVIDO

---

## 2️⃣ FIX CORS (10 min)

**Arquivo**: `server/src/app.js` (linha ~35)

**Atual (❌ Inseguro)**:
```javascript
cors({
  origin: [
    'https://mwanga-opal.vercel.app',
    'https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app',
    'http://localhost:5173',    // ⚠️ REMOVE ISTO
    'http://localhost:3000'     // ⚠️ REMOVE ISTO
  ]
})
```

**Novo (✅ Seguro)**:
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://mwanga-opal.vercel.app'] // Apenas prod
  : ['http://localhost:5173', 'http://localhost:3000']; // Dev local

cors({ origin: allowedOrigins })
```

**Deploy**: `git push` para Render (auto-redeploy)

---

## 3️⃣ VERIFICAR SECRETS (5 min)

**Render Dashboard**:
```
https://dashboard.render.com > Mwanga > Environment

Adiciona:
- VITE_API_URL = https://mwanga-api.onrender.com ✅
- VITE_GOOGLE_CLIENT_ID = ... ✅
- JWT_SECRET = ... ✅ (PRIVADO)
- SUPABASE_URL = ... ✅
- SUPABASE_KEY = ... ✅ (usar role_key se possível)
- REDIS_URL = ... ✅ (incluir autenticação)

Remove de:
- .env.local
- repository
- commits anteriores (git filter-branch se necessário)
```

---

## 4️⃣ TESTES DE SEGURANÇA (45 min)

### Teste 1: Multi-User Isolation
```javascript
// Simula 2 users diferentes
const user1 = { id: 'abc', household_id: 1 };
const user2 = { id: 'def', household_id: 2 };

// User 1 vê próprios dados
localStorage.setItem('token', user1Token);
const trans1 = await api.get('/transactions');
// Deve conter APENAS household_id = 1

// User 2 vê próprios dados
localStorage.setItem('token', user2Token);
const trans2 = await api.get('/transactions');
// Deve conter APENAS household_id = 2 (≠ trans1)

// User 1 **NÃO** consegue ver User 2
const malicious = await api.get('/transactions?household_id=2');
// Deve retornar erro (RLS bloqueado)
```

### Teste 2: SQL Injection Prevention
```javascript
// Testa se Zod validation funciona
const malicious = { 
  email: "test@test.com' OR '1'='1"
};
const response = await api.post('/auth/login', malicious);
// Deve falhar validação (não retornar dados)
```

### Teste 3: API Rate Limiting
```javascript
// Faz 150 requests em rápida sucessão
for (let i = 0; i < 150; i++) {
  await api.get('/transactions');
}
// Deve receber 429 Too Many Requests na request 101
```

### Teste 4: CORS Enforcement
```javascript
// Tenta chamar API de origem não-whitelistada
fetch('https://malicious.com/api/transactions', {
  headers: { 'Authorization': 'Bearer TOKEN' }
});
// Deve falhar com CORS error (não retornar dados)
```

---

## 5️⃣ DEPENDÊNCIAS ATUALIZADAS (10 min)

```bash
# Root (Frontend)
cd mwanga
npm audit fix --force
npm update

# Backend
cd server
npm audit fix --force
npm update

# Commit
git add package*.json
git commit -m "chore: update dependencies & security patches"
git push
```

---

## 6️⃣ DEPLOY & VALIDATE (20 min)

```bash
# 1. Frontend (Vercel) - automático
# - Detecta push em main
# - Build & deploy automático
# - Check: https://mwanga-opal.vercel.app

# 2. Backend (Render) - automático
# - Detecta push em server/
# - Build & deploy automático
# - Check: https://mwanga-api.onrender.com (Render logs)

# 3. Monitor 5 min após deploy
# - Check Render logs: "Server running on port 3001"
# - Test API: curl https://mwanga-api.onrender.com/health
# - Test Frontend: login e transação básica
# - Check Sentry: nenhum erro crítico
```

---

## 📋 Quick Checklist

```
HOJE (Agora):
□ Aplicar SUPABASE_RLS_POLICIES.sql (20 min)
□ Testar multi-user isolation (15 min)
□ Validar RLS no Supabase Lint (5 min)

A SEGUIR (Hoje à noite):
□ FIX CORS em server/src/app.js (10 min)
□ Verificar secrets em Render (5 min)
□ npm audit fix (10 min)
□ Deploy & monitorar (20 min)

AMANHÃ:
□ Security audit completa (SECURITY_AUDIT.md)
□ Implementar Sentry para error tracking
□ Setup logging sanitizado
□ Teste de carga

PRÓXIMA SEMANA:
□ Code review security
□ Pen testing (contrata especialista se budget)
□ Incident response plan
```

---

## 🎯 Cronograma Final

| Tarefa | Tempo | Crítico? | Quando |
|--------|-------|----------|--------|
| RLS enable | 20 min | 🔴 SIM | AGORA |
| RLS validation | 15 min | 🔴 SIM | AGORA |
| CORS fix | 10 min | 🔴 SIM | Hoje |
| Secrets audit | 5 min | 🟠 ALTO | Hoje |
| npm audit fix | 10 min | 🟠 ALTO | Hoje |
| Deploy | 20 min | 🟠 ALTO | Hoje |
| Monitoring setup | 30 min | 🟡 MÉD | Amanhã |
| Logging sanitize | 45 min | 🟡 MÉD | Amanhã |
| Rate limiting enhance | 1 hora | 🟡 MÉD | Próxima semana |

---

## 💬 Resumo

**Antes (ATUAL)**:
- 🚨 14 tabelas com RLS desabilitado
- 🔓 Qualquer user vê dados de todos
- ⚠️ CORS aberto para localhost em prod
- ❌ Risco máximo de data breach

**Depois (PÓS-FIX)**:
- ✅ RLS ativo em 16 tabelas
- 🔐 Cada user vê APENAS seu data
- 🔒 CORS restritivo (prod only)
- ✅ Enterprise-grade security

---

## ❓ Dúvidas?

Se algo não ficar claro:
1. 📖 Lê `RLS_SETUP_GUIDE.md` (passo-a-passo)
2. 📊 Consulta `SECURITY_AUDIT.md` (contexto completo)
3. 💻 Executa `SUPABASE_RLS_POLICIES.sql` (script pronto)
4. ✅ Valida com os testes acima

---

**Status**: 🚨 CRÍTICO - Executa hoje!  
**Próxima review**: Amanhã (após deploy)  
**Suporte**: Contacta @jubilio ou senior dev
