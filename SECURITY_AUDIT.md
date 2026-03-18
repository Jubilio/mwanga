## 🔒 SECURITY AUDIT - Mwanga Stack

**Data**: 18 de Março de 2026  
**Riscos Encontrados**: 1 CRÍTICO, 2 ALTOS, 3 MÉDIOS  
**Status**: ⚠️ Em Remediação

---

## 🚨 CRÍTICO

### 1. RLS (Row Level Security) Desabilitado ❌
- **Encontrado**: 14 tabelas expostas
- **Impacto**: Qualquer user consegue ver dados de todos
- **Solução**: ✅ Script SQL criado (`SUPABASE_RLS_POLICIES.sql`)
- **ETA Fix**: 20 minutos
- **Prioridade**: 🔴 HOJE

---

## 🔴 ALTO

### 1. Secrets Exposure Risk
**Problema**: Variáveis de ambiente no Render podem estar visíveis

**Cheklist**:
```
□ VITE_API_URL - Público (ok)
□ VITE_GOOGLE_CLIENT_ID - Público (ok)
□ JWT_SECRET - ❌ PRIVADO (verificar em .env.server)
□ SUPABASE_KEY - ❌ PRIVADO (usar role key, não anon)
□ REDIS_URL - ❌ PRIVADO (autenticação?)
```

**Fix Recomendado**:
```bash
# Render Dashboard > Environment
# Verificar que nenhum secret aparece em:
# - Build logs
# - Public Env vars
# - Repository
```

### 2. CORS Misconfiguration
**Atual em `server/src/app.js`**:
```javascript
cors({
  origin: [
    'https://mwanga-opal.vercel.app',
    'https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'  // ⚠️ Remove isto em prod
  ]
})
```

**Problema**: localhost ainda ativo em produção  
**Fix**:
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://mwanga-opal.vercel.app']
  : ['http://localhost:5173', 'http://localhost:3000'];

cors({ origin: allowedOrigins })
```

---

## 🟠 MÉDIO

### 1. Rate Limiting Coverage
**Atual**:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // 100 requests
});
```

**Verificar**:
- [ ] Applied a `/api` endpoints?
- [ ] Different limits para auth vs public?
- [ ] Redis backend (para múltiplas instâncias)?

**Recomendação**:
```javascript
// Auth endpoint - mais restritivo
const authLimiter = rateLimit({
  store: new RedisStore(),
  windowMs: 15 * 60 * 1000,
  max: 5  // 5 login attempts
});

// API endpoint - normal
const apiLimiter = rateLimit({
  store: new RedisStore(),
  windowMs: 60 * 1000,
  max: 100  // 100 req/min
});
```

### 2. TLS/SSL Certificate Verification
**Verificar**:
```bash
# Supabase
- [ ] SSL verificado no pool connection

# Redis (Upstash)
- [ ] TLS ativo (rediss:// protocol)
- [ ] Certificate pinning (opcional avançado)

# Render
- [ ] HTTPS enforced
- [ ] HSTS headers ativo
```

### 3. Logging Sensitive Data
**Problema**: Logs podem conter passwords/tokens

**Verificar em `server/src/utils/logger.js`**:
```javascript
// ❌ NÃO fazer
logger.info(`User login: ${req.body.password}`);

// ✅ Fazer
logger.info(`User login attempt for: ${req.body.email}`);
```

**Sanitize antes de logar**:
```javascript
const sanitizeRequest = (req) => {
  const { password, token, ...safe } = req.body;
  return safe;
};
```

---

## ✅ MÉDIO (Já OK)

### 1. HTTPS Enforced
- ✅ Vercel: Usa HTTPS obrigatório
- ✅ Render: HTTPS obrigatório
- ✅ Supabase: HTTPS obrigatório

### 2. JWT Token Security
- ✅ `JWT_SECRET` usado para sign/verify
- ✅ Expiração: 7 dias (revisar se ok)
- ✅ HttpOnly para cookies (verificar)

### 3. Input Validation
- ✅ Zod schemas em todos os controllers
- ✅ XSS protection com `xss` middleware
- ✅ HPP (HTTP Parameter Pollution) protection

### 4. Helmet Headers
- ✅ CSP (Content Security Policy)
- ✅ `X-Frame-Options`: deny
- ✅ `X-Content-Type-Options`: nosniff
- ✅ `Referrer-Policy`: strict-origin-when-cross-origin

---

## 🎯 Plano de Remediação

### Week 1 (AGORA)
1. **Ativar RLS** ✅ Script pronto
2. **Revisar secrets** em Render
3. **Ajustar CORS** para prod
4. **Testar multi-user** isolamento

### Week 2
1. Dashboard Supabase Audit Logs
2. Implementar logging sanitizado
3. Rate limiting com Redis
4. Teste de carga (load testing)

### Week 3
1. Pen testing
2. Security headers audit
3. Dependency scan (npm audit)
4. Incident response plan

---

## 📋 Checklist Segurança

### Database (Supabase)
- [ ] RLS ativo em todas as tabelas
- [ ] Backup automático configurado
- [ ] Replicação geo (se oferecido)
- [ ] Audit logs ativos
- [ ] Passwords hashed com bcrypt

### Backend (Render)
- [ ] Variáveis de ambiente privadas
- [ ] Rate limiting ativo
- [ ] Input validation com Zod
- [ ] XSS protection (middleware xss)
- [ ] CORS restritivo
- [ ] Helmet headers completos
- [ ] Error handling sem leak de stack trace
- [ ] Logging sanitizado (sem passwords)
- [ ] Dependencies atualizadas (`npm audit`)

### Frontend (Vercel)
- [ ] HTTPS obrigatório
- [ ] CSP headers
- [ ] No inline scripts
- [ ] Dependencies atualizadas
- [ ] Secrets em ambiente variáveis (não versionadas)

### Redis (Upstash)
- [ ] TLS/SSL ativo
- [ ] Autenticação forte
- [ ] IP whitelisting (se possível)
- [ ] Key expiration policies

### Deployment
- [ ] CI/CD pipeline seguro (GitHub Actions)
- [ ] Code review obrigatório antes merge
- [ ] Secrets rotation schedule
- [ ] Recovery plan (downtime <1h)
- [ ] Monitoring & alerting (Sentry)

---

## 🛠️ Ferramentas Recomendadas

### Monitoring
- **Sentry**: Error tracking
  ```bash
  npm install @sentry/node
  ```
- **LogRocket**: Frontend session replay
- **Render Analytics**: Backend metrics

### Security Scanning
- **npm audit**: Dependency vulnerabilities
  ```bash
  npm audit --audit-level=moderate
  ```
- **OWASP Dependency Check**
- **Snyk**: Continuous security

### Performance & Logging
- **Upstash Redis Analytics**: Cache hits
- **Vercel Analytics**: Frontend perf
- **Render Logs**: Backend errors

---

## 🚀 Deploy Checklist (Pré-Prod)

```bash
# 1. Security
□ npm audit (0 vulnerabilities)
□ Code review completa
□ Secrets sanitizados

# 2. Testing
□ Jest tests passam
□ E2E tests (Cypress/Playwright)
□ Load test (k6 ou Artillery)

# 3. Performance
□ Frontend: Core Web Vitals
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
□ Backend: Response time < 500ms
□ Database: Query time < 100ms

# 4. Deployment
□ Backup DB antes do deploy
□ Blue-green deploy (se possível)
□ Rollback plan
□ Monitoring ativo

# 5. Post-Deploy
□ Smoke tests passam
□ Users conseguem fazer login
□ Transactions funcionam
□ Binth IA retorna respostas
```

---

## 📞 Contactos de Emergência

Em caso de breach ou incidente:

1. **GitHub**: Força push para repositório privado
2. **Vercel**: Deploy anterior (rollback)
3. **Render**: Restart application + check logs
4. **Supabase**: Check audit logs + restore backup
5. **Upstash**: Redis flush se comprometido
6. **Google**: Revoke tokens se necessário

---

## 📚 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Vercel Security Practices](https://vercel.com/security)

---

**Última atualização**: 18 de Março de 2026  
**Próxima auditoria**: 30 de Abril de 2026
