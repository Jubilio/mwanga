# 🔍 GUIA DE DEBUG: Login e Cadastro - Mwanga

## ✅ Checklist de Configuração

### 1. **Variáveis de Ambiente** 🛡️
```bash
# Verificar se existem no arquivo .env (na pasta server/)
JWT_SECRET=sua_chave_secreta_aqui
DATABASE_URL=postgresql://... (Supabase)
GOOGLE_CLIENT_ID=seu_google_client_id
FRONTEND_URL=http://localhost:5173
```

**❌ Problema:** Se faltarem estas variáveis:
- `JWT_SECRET` → Servidor crasha ao iniciar (vê error "CRITICAL ERROR")
- `DATABASE_URL` → Conexão recusada ao registar/login
- `GOOGLE_CLIENT_ID` → Google login retorna 400 error

---

### 2. **Conexão com Database** 🗄️

#### Teste direto (Node.js):
```javascript
// server/test_db_connection.js
const { db } = require('./src/config/db');

async function test() {
  try {
    const result = await db.execute('SELECT NOW()');
    console.log('✅ Database OK:', result.rows);
  } catch(e) {
    console.error('❌ Database ERROR:', e.message);
  }
}
test();
```

**Erros comuns:**
- `Error: connect ECONNREFUSED` → Database não está a correr
- `password authentication failed` → Credenciais wrongas no DATABASE_URL
- `SSL: CERTIFICATE_VERIFY_FAILED` → Ver se `sslmode=require` nos settings

---

### 3. **Verificar Tabelas do Banco** 📋

```sql
-- Conectar via Supabase/psql e correr:
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- Confirmar que colunas estão em camelCase (PostgreSQL default):
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
```

**Esperado:**
```
id, name, email, passwordHash, householdId, role, createdAt
```

**❌ Se aparecer:**
```
password_hash, household_id (snake_case)
```
→ Precisa correr `supabase_schema.sql` ou criar schema correto.

---

### 4. **Testar Endpoint /auth/register** 🧪

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@test.com",
    "password": "Password123",
    "householdName": "Família Silva"
  }'
```

**Respostas esperadas:**

✅ **201 Created:**
```json
{
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@test.com",
    "householdId": 1,
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

❌ **400 Bad Request - Email exists:**
```json
{"error": "Email já existe"}
```

❌ **400 Bad Request - Password too short:**
```json
{
  "error": "password: String must contain at least 8 character(s)",
  "details": [...]
}
```

❌ **500 Internal Server Error:**
```json
{"error": "..."}
```
→ Verificar logs do servidor (`server console`)

---

### 5. **Testar Endpoint /auth/login** 🔑

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@test.com",
    "password": "Password123"
  }'
```

**Respostas esperadas:**

✅ **200 OK:**
```json
{
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@test.com",
    "householdId": 1,
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

❌ **401 Unauthorized:**
```json
{"error": "Credenciais inválidas"}
```
→ Email não existe ou password está errada

---

### 6. **Testar Token JWT** 🎟️

```bash
# Usar o token retornado acima
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Testar /auth/me
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

✅ **200 OK:**
```json
{
  "id": 1,
  "name": "João Silva",
  "email": "joao@test.com",
  "householdId": 1,
  "role": "user",
  "createdAt": "2026-03-30T..."
}
```

❌ **401 Unauthorized - Invalid/Missing Token:**
```json
{"error": "Unauthorized: Invalid token"}
```

---

### 7. **Testar Frontend Login** 🎨

1. **Frontend deve detectar URL da API:**
   - Arquivo: `src/utils/api.js`
   - Ve `VITE_API_URL` em `.env` do frontend

2. **Verificar Console do Browser:**
   - Abrir DevTools (F12)
   - Ir ao Network tab
   - Fazer login
   - Clicar no request `POST /api/auth/login`
   - Verificar:
     - Status: 200 ✅ ou erro ❌
     - Request body: email e senha corretos?
     - Response: tem token?

3. **Verifcar localStorage:**
   ```javascript
   // Console do browser
   localStorage.getItem('mwanga-token')
   // Deve retornar o token JWT
   ```

---

## 🚨 Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|--------|
| `Cannot find module 'config/db'` | Node_modules não instalado | `cd server && npm install` |
| `EADDRINUSE: port 3001 already in use` | Porta ocupada | `lsof -i :3001` e kill process |
| `SyntaxError: Unexpected token` | Erro de SQL (mix SQLite/PostgreSQL) | ✅ JÁ CORRIGIDO neste commit |
| `TypeError: Cannot read property 'rows'` | API retorna formato errado | Verificar db.execute() wrapper |
| `Email already exists` | Tentar registar com email duplicado | Usar outro email |
| `Invalid token / 401 Unauthorized` | Token expirou ou é inválido | Fazer login novamente |
| CORS error no browser | Frontend URL não autorizada | Adicionar em `server/app.js` CORS list |

---

## 📝 Próximos Passos

1. ✅ Criar arquivo `.env` (copiar de `.env.example`)
2. ✅ Preencher `DATABASE_URL` do Supabase
3. ✅ Preencher `JWT_SECRET` (mínimo 32 caracteres)
4. ✅ Correr `npm install` na pasta `server/`
5. ✅ Correr `npm start` ou `npm run dev`
6. ✅ Testar endpoints com curl (acima)
7. ✅ Teste frontend em `http://localhost:5173`
8. ✅ Fazer login → deve redirecionar para Dashboard

---

## 🔗 Recursos

- Documentação Prisma: https://www.prisma.io/docs/
- PostgreSQL docs: https://www.postgresql.org/docs/
- Bearer token format: https://tools.ietf.org/html/rfc6750
- CORS issues: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

