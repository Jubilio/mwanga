# 🔒 GUIA: Aplicar Row Level Security (RLS) - URGENTE

**Status**: 🚨 **CRÍTICO** - Dados expostos, RLS desabilitado em 14 tabelas  
**Impacto**: Qualquer utilizador pode ver dados de TODOS os outros  
**Solução**: Ativar RLS policies (20 minutos)

---

## ⚠️ O Problema

Supabase detectou que **Row Level Security (RLS) está desabilitado** em:
```
- rentals, assets, liabilities
- xitiques, xitique_cycles, xitique_contributions, xitique_receipts
- settings, notifications, audit_log, accounts
- debts, financial_messages, debt_payments
```

**Consequência**: Se User A faz login, consegue ver TODAS as transações de User B, C, D... ❌

---

## ✅ Solução: Aplicar RLS Policies

### 📝 Passo 1: Abrir SQL Editor no Supabase

1. Vai a https://app.supabase.com
2. Seleciona o teu projeto **mwanga**
3. Vai a **SQL Editor** (lado esquerdo)
4. Clica em **"New Query"**

### 📋 Passo 2: Copiar o Script SQL

Abre o arquivo `SUPABASE_RLS_POLICIES.sql` (criado no repositório) e **copia TODO o conteúdo**.

### 🚀 Passo 3: Executar no Supabase

1. Cola o SQL no SQL Editor
2. Seleciona **todo o código** (Ctrl+A)
3. Clica em **"Run"** (atalho: Ctrl+Enter)
4. Aguarda a confirmação ✅

**Output esperado:**
```
-- 14 comandos executados com sucesso
ALTER TABLE ... successful
CREATE POLICY ... successful
... (repetido para cada tabela)
```

---

## 🔍 Passo 4: Validar RLS (Pós-Ativação)

Executa estas queries para confirmar:

### Query 1: Verificar que RLS está ativo
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Resultado esperado:** Todas as tabelas com `rowsecurity = true`

### Query 2: Listar todas as policies
```sql
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

**Resultado esperado:** ~40+ policies (várias por tabela)

### Query 3: Testar uma policy (SELECT apenas)
```sql
-- Liga como um utilizador específico
-- Isso não é possível no SQL Editor direto, mas podes testar:
SELECT * FROM public.transactions LIMIT 1;

-- Se retorna 0 linhas = RLS está bloqueando (correto!)
-- Se retorna linhas = RLS permite (dependente do policy)
```

---

## 🧪 Passo 5: Testar no Frontend

### Teste 1: Multi-User Isolation
```javascript
// User A faz login
localStorage.setItem('mwanga-token', tokenA);
const transA = await api.get('/api/transactions');
// Deve retornar APENAS transações de User A

// User B faz login (mesmo device, diferente token)
localStorage.setItem('mwanga-token', tokenB);
const transB = await api.get('/api/transactions');
// Deve retornar APENAS transações de User B (diferente de transA)
```

### Teste 2: Validar Backend Enforcement

A Supabase vai bloquear queries não-authorized:
```javascript
// Isto VAI FALHAR (User A tentando ver dados de User B)
const supabase = createClient(url, key);
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('household_id', differentHouseholdId); // Error: RLS policy violation
```

---

## 📊 Comprovar Segurança

Depois de ativar, o Supabase Database Linter deve passar:

1. Volta a https://app.supabase.com
2. Vai a **Database** > **Lint** (lado esquerdo)
3. Clica em **"Run Lint"**
4. Verifica se todos os `rls_disabled_in_public` erros desapareceram ✅

---

## 🎯 Admin & Audit Log

### Nota Sobre Admin Access
Se precisas que admins vejam TODOS os dados:

```sql
-- Adiciona uma policy especial para admins
CREATE POLICY "Admins can view all transactions"
  ON public.transactions
  FOR SELECT
  USING (
    -- Verifica se user_id está na tabela de admins
    auth.uid() IN (SELECT user_id FROM admin_users)
  );
```

### Audit Log
Para audit logs, a policy é read-only (apenas SELECT):
```sql
-- Já incluída no script - audit_log é append-only
CREATE POLICY "Users can view household audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    household_id = (SELECT household_id FROM users WHERE id = auth.uid())
  );

-- Ninguém consegue DELETE/UPDATE logs (apenas INSERT automático)
```

---

## ⏱️ Passo-a-Passo Resumido

```
⏱️ ~2 min - Abrir Supabase SQL Editor
⏱️ ~2 min - Copiar `SUPABASE_RLS_POLICIES.sql`
⏱️ ~5 min - Executar o script
⏱️ ~3 min - Validar com queries
⏱️ ~5 min - Testar no frontend
⏱️ ~3 min - Confirmar no Lint
────────────
⏱️ Total: ~20 minutos
```

---

## 🆘 Se Algo Correr Mal

### Problema: "Permission denied for schema public"
**Solução**: Certifica que estás logged-in como **project owner** no Supabase

### Problema: "Policies already exist"
**Solução**: Drop as antigas primeiro:
```sql
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
-- Repete para todas
```

### Problema: RLS bloqueia todas as queries
**Solução**: Verifica se o `auth.uid()` está configurado na session

---

## 📞 Próximos Passos

### Após ativar RLS:
1. ✅ Monitora errors no Render (backend)
2. ✅ Testa login de múltiplos users
3. ✅ Valida Binth IA queries (deve funcionar normalmente)
4. ✅ Considera **Segment-level RLS** (futuro)

### Segurança Adicional:
1. 🔐 **Habilita 2FA** no Supabase
2. 🔐 **Restringe API Keys** (public vs. private)
3. 🔐 **SSL/TLS** para todas as conexões
4. 🔐 **IP Whitelist** no Render (backend)

---

## ✅ Checklist Final

- [ ] Abri SQL Editor no Supabase
- [ ] Copiei `SUPABASE_RLS_POLICIES.sql`
- [ ] Executei o script sem erros
- [ ] Validei com as queries de verificação
- [ ] Testei no frontend (User A vs User B)
- [ ] Confirmei no Supabase Lint (0 erros RLS)
- [ ] Monitorizei Render logs (sem quebras)
- [ ] Documentei policies no arquivo de segurança

---

## 📚 Referências

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Auth.uid() Function](https://supabase.com/docs/guides/auth/auth-helpers/postgres-rls)

---

**ATIVA ISTO HOJE!** 🚀 O teu projeto fica 1000x mais seguro.

