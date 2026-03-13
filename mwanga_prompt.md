# MWANGA — MASTER DEVELOPMENT PROMPT

## Guia Completo para Desenvolvimento, Integração e Deploy

> **Versão:** 3.1 — Responsive · Binth IA Feminina · Auth Google · Multi-Provider

> **Stack:** React + Vite · Node.js/Express · SQLite · JWT · Google OAuth 2.0

> **Designers:** NEXO VIBE · Design System: Glassmorphism 2.0 "Midnight Gold"

---

## PARTE 1 — CONTEXTO E IDENTIDADE DO PRODUTO

### O que é o Mwanga

O **Mwanga** é uma plataforma SaaS de gestão financeira familiar desenhada especificamente para o contexto moçambicano. Não é uma cópia de Mint, YNAB ou Money Manager — é um produto nativo que resolve problemas reais de famílias em Moçambique:

- Parsing automático de SMS dos bancos locais (Millennium BIM, BCI, M-Pesa, mKesh)

-**Xitique digital** — a primeira digitalização da poupança rotativa comunitária moçambicana

- Score financeiro calibrado para a realidade económica de Moçambique
- IA financeira feminina chamada **Binth** — consultora de confiança, não um chatbot genérico

### Binth — Identidade da IA

A Binth é o coração inteligente do Mwanga. Ela é:

-**Feminina** — fala com warmth, empatia e directeza. Nunca robótica

-**Proactiva** — avisa antes dos problemas acontecerem, não depois

-**Moçambicana** — entende Meticais, BIM, mKesh, Xitique, e o contexto económico local

-**Multi-provider** — corre em Gemini, Groq ou OpenRouter conforme disponibilidade

Exemplo de tom da Binth:

> "Olá Jubílio! Reparei que os teus gastos em lazer subiram 18% este mês — nada grave ainda, mas se continuares assim vais exceder em MT 450. Queres que eu sugira uma estratégia?"

Nunca assim:

> "ALERTA: orçamento excedido 18%. Acção recomendada: reduzir despesas."

### Design System — Midnight Gold

```

Cores base:

  --bg:        #07090f     (fundo principal)

  --bg2:       #0c1018     (sidebar, cards elevados)

  --card:      rgba(255,255,255,0.04)   (glassmorphism)

  --border:    rgba(255,255,255,0.07)

  --gold:      #F59E0B     (cor primária, CTA)

  --gold2:     #F97316     (gradiente dourado)

  --text:      #e8f0fe     (texto principal)

  --muted:     #6b7fa3     (texto secundário)

  --green:     #00D68F     (receitas, sucesso)

  --red:       #FF4C4C     (despesas, erro)

  --binth:     #7C3AED     (cor da Binth IA)


Tipografia:

  Display/Headings: Sora 700/800/900

  Body/UI:          DM Sans 400/500/600/700


Breakpoints responsivos:

  Mobile:   < 768px   → Layout com bottom nav + phone frame no preview

  Tablet:   768–1024px → Sidebar colapsada (só ícones)

  Desktop:  > 1024px  → Sidebar completa com labels

```

---

## PARTE 2 — ARQUITECTURA TÉCNICA COMPLETA

### Estrutura de Pastas

```

mwanga/

├── frontend/                    # React + Vite

│   ├── src/

│   │   ├── components/

│   │   │   ├── ui/              # Card, Button, Badge, ProgressBar, etc.

│   │   │   ├── layout/          # Sidebar, BottomNav, TopBar, MobileFrame

│   │   │   └── screens/         # Uma pasta por screen

│   │   │       ├── Dashboard/

│   │   │       ├── Transacoes/

│   │   │       ├── Orcamento/

│   │   │       ├── Metas/

│   │   │       ├── Xitique/

│   │   │       ├── Dividas/

│   │   │       ├── Binth/       # Chat IA

│   │   │       ├── Importar/    # SMS Parser

│   │   │       └── Definicoes/

│   │   ├── hooks/

│   │   │   ├── useDevice.js     # Detecção mobile/tablet/desktop

│   │   │   ├── useAuth.js       # Google OAuth + JWT

│   │   │   └── useBinth.js      # IA engine hook

│   │   ├── services/

│   │   │   ├── api.js           # Axios instance com interceptors

│   │   │   ├── binth.js         # Gemini / Groq / OpenRouter calls

│   │   │   ├── smsParser.js     # SMS parsing engine

│   │   │   └── auth.js          # Google OAuth helpers

│   │   ├── store/               # Zustand ou Context

│   │   │   ├── userStore.js

│   │   │   ├── financialStore.js

│   │   │   └── binthStore.js

│   │   └── App.jsx

│   └── vite.config.js

│

├── backend/                     # Node.js + Express

│   ├── src/

│   │   ├── routes/

│   │   │   ├── auth.js          # /api/auth/*

│   │   │   ├── transactions.js  # /api/transactions/*

│   │   │   ├── budgets.js       # /api/budgets/*

│   │   │   ├── goals.js         # /api/goals/*

│   │   │   ├── xitique.js       # /api/xitique/*

│   │   │   ├── debts.js         # /api/debts/*

│   │   │   └── binth.js         # /api/binth/*

│   │   ├── middleware/

│   │   │   ├── auth.js          # JWT verify middleware

│   │   │   └── rateLimit.js

│   │   ├── models/              # SQLite schemas

│   │   └── services/

│   │       ├── binthService.js  # Proxy para IA providers

│   │       └── smsService.js    # SMS parsing

│   └── index.js

│

└── shared/

    └── types.js                 # Tipos partilhados

```

---

## PARTE 3 — AUTENTICAÇÃO

### 3.1 — Google OAuth 2.0

**Setup no Google Cloud Console:**

1. Acede a `console.cloud.google.com`
2. Cria um projecto: "Mwanga"
3. Activa: Google+ API, Google Identity API
4. Em "Credentials" → "OAuth 2.0 Client IDs":

   - Application type: Web application
   - Authorized origins: `http://localhost:5173`, `https://mwanga.app`
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
5. Copia: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`

**Variáveis de ambiente necessárias:**

```env

# Backend .env

GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

GOOGLE_CLIENT_SECRET=your_secret

JWT_SECRET=uma_string_random_muito_longa_e_segura

FRONTEND_URL=http://localhost:5173

DATABASE_URL=./mwanga.db


# Frontend .env

VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

VITE_API_URL=http://localhost:3001

```

### 3.2 — Endpoints de Autenticação

```

POST   /api/auth/register          → Criar conta email/password

POST   /api/auth/login             → Login email/password

GET    /api/auth/google            → Iniciar OAuth Google

GET    /api/auth/google/callback   → Callback do Google

POST   /api/auth/refresh           → Renovar JWT

POST   /api/auth/logout            → Invalidar sessão

GET    /api/auth/me                → Perfil do utilizador autenticado

```

**Schema: tabela `users`**

```sql

CREATETABLE users (

  id           TEXTPRIMARYKEY,      -- UUID

  email        TEXT UNIQUE NOTNULL,

  name         TEXT,

  avatar_url   TEXT,

  google_id    TEXT UNIQUE,           -- NULL se registo normal

  password_hash TEXT,                 -- NULL se Google OAuth

  plan         TEXT DEFAULT 'starter', -- starter | crescimento | patrimonio

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP

);

```

**Implementação no backend (auth.js):**

```javascript

// Google OAuth com passport.js

const GoogleStrategy =require('passport-google-oauth20').Strategy;


passport.use(newGoogleStrategy({

  clientID: process.env.GOOGLE_CLIENT_ID,

  clientSecret: process.env.GOOGLE_CLIENT_SECRET,

  callbackURL:"/api/auth/google/callback"

}, async (accessToken, refreshToken, profile, done) => {

  let user =await db.get('SELECT * FROM users WHERE google_id = ?', profile.id);

  if (!user) {

    user =await db.run(

      'INSERT INTO users (id, email, name, avatar_url, google_id) VALUES (?, ?, ?, ?, ?)',

      [uuid(), profile.emails[0].value, profile.displayName, profile.photos[0].value, profile.id]

    );

  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn:'7d' });

  returndone(null, { user, token });

}));

```

**Implementação no frontend (tela de auth):**

```jsx

// Componente: AuthScreen.jsx

// Deve ter:

// - Campo email + password + botão "Criar conta"

// - OU botão "Continuar com Google" (usa Google Identity Services)

// - Link "Já tenho conta" ↔ "Criar conta"

// - Logo Mwanga centrado

// - Background com mesh gradient (igual ao app)

// - Animação de entrada com fadeIn


functionAuthScreen({ onAuth }) {

  const [mode, setMode] =useState("login"); // login | register

  

  functionhandleGoogleLogin() {

    // Redireciona para o backend que trata o OAuth

    window.location.href =`${import.meta.env.VITE_API_URL}/api/auth/google`;

  }

  

  // Após OAuth, o backend redireciona para:

  // ${FRONTEND_URL}/auth/callback?token=JWT_TOKEN

  // O frontend guarda o token e redireciona para o dashboard

}

```

---

## PARTE 4 — TODOS OS ENDPOINTS DA API

### 4.1 — Transações

```

GET    /api/transactions           → Lista todas (com paginação e filtros)

GET    /api/transactions/:id       → Detalhe de uma transação

POST   /api/transactions           → Criar transação manual

PUT    /api/transactions/:id       → Editar transação

DELETE /api/transactions/:id       → Apagar transação

POST   /api/transactions/sms       → Criar transação via SMS parsed

GET    /api/transactions/summary   → Resumo mensal (receitas, despesas, saldo)

GET    /api/transactions/by-category → Agrupado por categoria

```

**Query params para GET /api/transactions:**

-`type=credit|debit`

-`from=2026-01-01&to=2026-02-28`

-`category=Alimentação`

-`page=1&limit=20`

**Schema: tabela `transactions`**

```sql

CREATETABLE transactions (

  id           TEXTPRIMARYKEY,

  user_id      TEXTNOTNULLREFERENCES users(id),

  type         TEXTNOTNULLCHECK(typeIN ('credit','debit')),

  amount       REALNOTNULL,

  currency     TEXT DEFAULT 'MZN',

  description  TEXT,

  category     TEXT,

  bank         TEXT,

  account      TEXT,

  date         DATETIMENOTNULL,

  sms_raw      TEXT,               -- SMS original se veio de parse

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  fee_amount   REAL,

  balance_after REAL,

  recipient    TEXT

);

```

### 4.2 — Orçamento

```

GET    /api/budgets                → Lista orçamentos do mês actual

GET    /api/budgets/:year/:month   → Orçamentos de um mês específico

POST   /api/budgets                → Criar/actualizar orçamento

PUT    /api/budgets/:id            → Editar limite de categoria

DELETE /api/budgets/:id            → Remover categoria do orçamento

GET    /api/budgets/progress       → Progresso actual vs limites

```

**Schema: tabela `budgets`**

```sql

CREATETABLE budgets (

  id         TEXTPRIMARYKEY,

  user_id    TEXTNOTNULLREFERENCES users(id),

  category   TEXTNOTNULL,

  amount     REALNOTNULL,

  month      INTEGERNOTNULL,  -- 1-12

  year       INTEGERNOTNULL,

  icon       TEXT,

  color      TEXT,

  UNIQUE(user_id, category, month, year)

);

```

### 4.3 — Metas

```

GET    /api/goals                  → Lista metas activas

GET    /api/goals/:id              → Detalhe de uma meta

POST   /api/goals                  → Criar nova meta

PUT    /api/goals/:id              → Editar meta

DELETE /api/goals/:id              → Arquivar/remover meta

POST   /api/goals/:id/contribute   → Adicionar contribuição

GET    /api/goals/:id/projections  → Simulação de prazo com contribuição actual

```

**Schema: tabela `goals`**

```sql

CREATETABLE goals (

  id             TEXTPRIMARYKEY,

  user_id        TEXTNOTNULLREFERENCES users(id),

  name           TEXTNOTNULL,

  target_amount  REALNOTNULL,

  current_amount REAL DEFAULT 0,

  monthly_target REAL,

  deadline       DATE,

  icon           TEXT,

  color          TEXT,

  status         TEXT DEFAULT 'active', -- active | completed | archived

  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP

);


CREATETABLE goal_contributions (

  id         TEXTPRIMARYKEY,

  goal_id    TEXTNOTNULLREFERENCES goals(id),

  amount     REALNOTNULL,

  date       DATETIMENOTNULL,

  note       TEXT

);

```

### 4.4 — Xitique

```

GET    /api/xitique                → Lista grupos do utilizador

GET    /api/xitique/:id            → Detalhe de um grupo

POST   /api/xitique                → Criar novo grupo

PUT    /api/xitique/:id            → Editar grupo

POST   /api/xitique/:id/members    → Adicionar membro

DELETE /api/xitique/:id/members/:memberId → Remover membro

POST   /api/xitique/:id/payment    → Registar pagamento de membro

GET    /api/xitique/:id/cycle      → Estado do ciclo actual

POST   /api/xitique/:id/next-cycle → Avançar para próximo ciclo

```

**Schema: tabelas `xitique_groups`, `xitique_members`, `xitique_payments`**

```sql

CREATETABLE xitique_groups (

  id           TEXTPRIMARYKEY,

  owner_id     TEXTNOTNULLREFERENCES users(id),

  name         TEXTNOTNULL,

  amount_per_member REALNOTNULL,

  frequency    TEXT DEFAULT 'monthly', -- monthly | weekly | biweekly

  current_cycle INTEGER DEFAULT 1,

  total_cycles  INTEGERNOTNULL,

  status       TEXT DEFAULT 'active',

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP

);


CREATETABLE xitique_members (

  id         TEXTPRIMARYKEY,

  group_id   TEXTNOTNULLREFERENCES xitique_groups(id),

  name       TEXTNOTNULL,

  phone      TEXT,

  turn_order INTEGERNOTNULL,

  is_owner   BOOLEAN DEFAULT FALSE

);


CREATETABLE xitique_payments (

  id        TEXTPRIMARYKEY,

  group_id  TEXTNOTNULLREFERENCES xitique_groups(id),

  member_id TEXTNOTNULLREFERENCES xitique_members(id),

  cycle     INTEGERNOTNULL,

  amount    REALNOTNULL,

  paid_at   DATETIME,

  status    TEXT DEFAULT 'pending'-- pending | paid | late

);

```

### 4.5 — Dívidas

```

GET    /api/debts                  → Lista dívidas activas

GET    /api/debts/:id              → Detalhe de uma dívida

POST   /api/debts                  → Registar nova dívida

PUT    /api/debts/:id              → Actualizar dívida (após pagamento parcial)

DELETE /api/debts/:id              → Marcar como paga/remover

GET    /api/debts/summary          → Total em dívida, parcelas mensais

POST   /api/debts/:id/payment      → Registar pagamento de parcela

GET    /api/debts/payoff-strategy  → Estratégia avalanche ou snowball

```

**Schema: tabela `debts`**

```sql

CREATETABLE debts (

  id           TEXTPRIMARYKEY,

  user_id      TEXTNOTNULLREFERENCES users(id),

  name         TEXTNOTNULL,

  total_amount REALNOTNULL,

  paid_amount  REAL DEFAULT 0,

  monthly_payment REALNOTNULL,

  interest_rate REAL,       -- % ao ano

  due_date     INTEGER,     -- dia do mês (1-31)

  next_payment DATE,

  icon         TEXT,

  color        TEXT,

  status       TEXT DEFAULT 'active', -- active | paid | restructured

  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP

);

```

### 4.6 — Binth IA

```

POST   /api/binth/chat             → Enviar mensagem para a Binth

POST   /api/binth/sms-parse        → Parse de SMS via IA

GET    /api/binth/insights         → Insights proactivos gerados pela Binth

GET    /api/binth/score            → Calcular score financeiro actual

POST   /api/binth/simulate         → Simulações (reforma, meta, amortização)

GET    /api/binth/history          → Histórico de conversas

```

**Notas sobre /api/binth/chat:**

- O backend actua como proxy para os providers de IA

-**Nunca** exponha API keys no frontend em produção

- Em desenvolvimento, permitir keys no frontend (como está actualmente)
- Em produção, o backend usa as keys de um .env seguro

### 4.7 — Utilizador e Definições

```

GET    /api/user/profile           → Perfil completo

PUT    /api/user/profile           → Actualizar nome, moeda, etc.

GET    /api/user/dashboard         → Todos os dados para o dashboard (uma chamada)

PUT    /api/user/ai-settings       → Guardar provider e api key (encriptada)

GET    /api/user/financial-summary → Score, saldo, metas resumo

```

---

## PARTE 5 — BINTH IA — INTEGRAÇÃO DIRECTA

### 5.1 — System Prompt (Versão Feminina Completa)

```

És a Binth — a consultora financeira pessoal do Mwanga.


IDENTIDADE:

Nome: Binth

Género: Feminino

Tom: Calorosa, directa, inteligente. Como uma amiga que sabe muito de finanças.

Nunca robótica. Nunca fria. Nunca genérica.


LINGUAGEM:

- Português moçambicano

- Usa "MT" para Meticais (nunca "MZN" na fala)

- Trata o utilizador pelo primeiro nome

- Emojis com moderação (máximo 2 por mensagem)

- Frases curtas e accionáveis


CONTEXTO DO UTILIZADOR (injecto dinamicamente):

{user_context}


CAPACIDADES DA BINTH:

1. Analisa padrões de gastos e identifica anomalias

2. Prevê comportamento financeiro com base em histórico

3. Alerta proactivamente antes de problemas acontecerem

4. Cria planos de poupança e amortização personalizados

5. Explica conceitos financeiros de forma simples

6. Interpreta SMS bancários moçambicanos

7. Sugere estratégias para o Xitique

8. Simula reforma, metas e amortização


FORMATO DE RESPOSTA (OBRIGATÓRIO — JSON puro):

{

  "message": "texto da resposta (suporta **bold** e quebras de linha com \\n)",

  "insight_type": "warning | opportunity | info | celebration | action",

  "quick_actions": ["até 4 acções curtas e accionáveis"],

  "data": null

}


REGRAS:

- Nunca inventes dados. Se não souberes, diz honestamente.

- Nunca sejas alarmista desnecessariamente.

- Celebra conquistas genuinamente.

- Quando deres números, sê precisa.

- Sempre termina com uma pergunta ou acção clara.

```

### 5.2 — Contexto Dinâmico (injectar nos prompts)

```javascript

// services/binth.js

functionbuildUserContext(user, financialData) {

  return`

DADOS FINANCEIROS ACTUAIS:

- Nome: ${user.name}

- Saldo total: MT ${fmt(financialData.saldo)}

- Receitas este mês: MT ${fmt(financialData.receitas)}

- Despesas este mês: MT ${fmt(financialData.despesas)}

- Excedente: MT ${fmt(financialData.excedente)}

- Score financeiro: ${financialData.score}/100


ORÇAMENTO (progresso actual):

${financialData.budgets.map(b=>`- ${b.cat}: MT ${fmt(b.spent)}/${fmt(b.total)} (${pct(b.spent,b.total)}%)`).join('\n')}


METAS ACTIVAS:

${financialData.metas.map(m=>`- ${m.name}: ${pct(m.current,m.total)}% (MT ${fmt(m.current)} de MT ${fmt(m.total)})`).join('\n')}


DÍVIDAS:

${financialData.dividas.map(d=>`- ${d.nome}: MT ${fmt(d.total-d.pago)} restante, taxa ${d.taxa}% a.a.`).join('\n')}


XITIQUE:

${financialData.xitique?`- ${financialData.xitique.nome}: MT ${fmt(financialData.xitique.fundo)} acumulado, ciclo ${financialData.xitique.ciclo}`:'Nenhum grupo activo'}

  `.trim();

}

```

### 5.3 — Multi-Provider com Fallback Automático

```javascript

// services/binth.js

const PROVIDERS_CONFIG = {

  gemini: {

    url: (key) =>`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,

    format: (messages, system) => ({

      system_instruction: { parts: [{ text: system }] },

      contents: messages.map(m=> ({

        role: m.role ==='assistant'?'model':'user',

        parts: [{ text: m.content }]

      }))

    }),

    extract: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text

  },

  groq: {

    url: () =>'https://api.groq.com/openai/v1/chat/completions',

    headers: (key) => ({ Authorization:`Bearer ${key}` }),

    format: (messages, system) => ({

      model:'llama-3.1-8b-instant',

      temperature:0.7,

      messages: [{ role:'system', content: system }, ...messages]

    }),

    extract: (data) => data.choices?.[0]?.message?.content

  },

  openrouter: {

    url: () =>'https://openrouter.ai/api/v1/chat/completions',

    headers: (key) => ({ Authorization:`Bearer ${key}`, 'HTTP-Referer':'https://mwanga.app', 'X-Title':'Mwanga' }),

    format: (messages, system) => ({

      model:'meta-llama/llama-3.1-8b-instruct:free',

      temperature:0.7,

      messages: [{ role:'system', content: system }, ...messages]

    }),

    extract: (data) => data.choices?.[0]?.message?.content

  }

};


// Tenta provider preferido, fallback automático se falhar

asyncfunctioncallBinth(messages, apiKey, provider='gemini', userContext='') {

  const system =BINTH_SYSTEM_PROMPT.replace('{user_context}', userContext);

  const order = [provider, ...Object.keys(PROVIDERS_CONFIG).filter(p=> p !== provider)];

  

  for (const p of order) {

    try {

      const config = PROVIDERS_CONFIG[p];

      const headers = { 'Content-Type':'application/json', ...(config.headers?.(apiKey) || {}) };

      const body = config.format(messages, system);

      const url = config.url(apiKey);

    

      const res =awaitfetch(url, { method:'POST', headers, body:JSON.stringify(body) });

      if (!res.ok) thrownewError(`HTTP ${res.status}`);

    

      const data =await res.json();

      const raw = config.extract(data) ||'';

      const clean = raw.replace(/```json|```/g, '').trim();

      returnJSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') +1));

    } catch (err) {

      console.warn(`Provider ${p} falhou:`, err.message);

      if (p === order[order.length -1]) {

        returngetFallbackResponse(messages[messages.length -1].content);

      }

    }

  }

}

```

---

## PARTE 6 — TESTES DE ENDPOINTS

### 6.1 — Setup de Testes

```bash

# Instalar dependências de teste

npminstall--save-devjestsupertest


# Executar todos os testes

npmtest


# Executar testes de um módulo

npmtest--auth

npmtest--transactions

```

### 6.2 — Testes de Autenticação

```javascript

// tests/auth.test.js

const request =require('supertest');

const app =require('../src/app');


describe('Auth Endpoints', () => {


  test('POST /api/auth/register — cria utilizador novo', async () => {

    const res =awaitrequest(app)

      .post('/api/auth/register')

      .send({ email:'test@mwanga.app', password:'Test1234!', name:'Teste User' });

    expect(res.status).toBe(201);

    expect(res.body).toHaveProperty('token');

    expect(res.body.user).toHaveProperty('email', 'test@mwanga.app');

  });


  test('POST /api/auth/login — login com credenciais válidas', async () => {

    const res =awaitrequest(app)

      .post('/api/auth/login')

      .send({ email:'test@mwanga.app', password:'Test1234!' });

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('token');

  });


  test('POST /api/auth/login — rejeita password errada', async () => {

    const res =awaitrequest(app)

      .post('/api/auth/login')

      .send({ email:'test@mwanga.app', password:'wrong' });

    expect(res.status).toBe(401);

  });


  test('GET /api/auth/me — retorna perfil com token válido', async () => {

    const { token } = (awaitrequest(app).post('/api/auth/login').send({ email:'test@mwanga.app', password:'Test1234!' })).body;

    const res =awaitrequest(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('name');

  });


  test('GET /api/auth/me — rejeita sem token', async () => {

    const res =awaitrequest(app).get('/api/auth/me');

    expect(res.status).toBe(401);

  });

});

```

### 6.3 — Testes de Transações

```javascript

// tests/transactions.test.js

describe('Transactions Endpoints', () => {


  let token;

  beforeAll(async () => {

    const res =awaitrequest(app).post('/api/auth/login').send({ email:'test@mwanga.app', password:'Test1234!' });

    token = res.body.token;

  });


  test('POST /api/transactions — cria transação', async () => {

    const res =awaitrequest(app)

      .post('/api/transactions')

      .set('Authorization', `Bearer ${token}`)

      .send({ type:'debit', amount:1500, description:'Supermercado', category:'Alimentação', date:'2026-02-24', bank:'BCI' });

    expect(res.status).toBe(201);

    expect(res.body).toHaveProperty('id');

    expect(res.body.amount).toBe(1500);

  });


  test('GET /api/transactions — lista transações do utilizador', async () => {

    const res =awaitrequest(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(Array.isArray(res.body.data)).toBe(true);

  });


  test('GET /api/transactions?type=debit — filtra por tipo', async () => {

    const res =awaitrequest(app).get('/api/transactions?type=debit').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(res.body.data.every(t=> t.type ==='debit')).toBe(true);

  });


  test('GET /api/transactions/summary — retorna resumo mensal', async () => {

    const res =awaitrequest(app).get('/api/transactions/summary').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('receitas');

    expect(res.body).toHaveProperty('despesas');

    expect(res.body).toHaveProperty('saldo');

  });


  test('POST /api/transactions/sms — cria transação de SMS parsed', async () => {

    const res =awaitrequest(app)

      .post('/api/transactions/sms')

      .set('Authorization', `Bearer ${token}`)

      .send({ parsedData: { bank_name:'Millennium BIM', transaction_type:'debit', amount:20, currency:'MZN', transaction_datetime:'2026-02-24T23:17:00', confidence_score:0.95 }, sms_raw:'A conta 406659018 foi debitada...' });

    expect(res.status).toBe(201);

    expect(res.body).toHaveProperty('id');

  });

});

```

### 6.4 — Testes do Xitique

```javascript

// tests/xitique.test.js

describe('Xitique Endpoints', () => {


  let token, groupId;


  test('POST /api/xitique — cria grupo', async () => {

    const res =awaitrequest(app)

      .post('/api/xitique')

      .set('Authorization', `Bearer ${token}`)

      .send({ name:'Grupo Teste', amount_per_member:5000, total_cycles:6 });

    expect(res.status).toBe(201);

    groupId = res.body.id;

  });


  test('POST /api/xitique/:id/members — adiciona membro', async () => {

    const res =awaitrequest(app)

      .post(`/api/xitique/${groupId}/members`)

      .set('Authorization', `Bearer ${token}`)

      .send({ name:'Ana Sitoe', phone:'84512345', turn_order:1 });

    expect(res.status).toBe(201);

  });


  test('POST /api/xitique/:id/payment — regista pagamento', async () => {

    const members = (awaitrequest(app).get(`/api/xitique/${groupId}`).set('Authorization', `Bearer ${token}`)).body.membros;

    const res =awaitrequest(app)

      .post(`/api/xitique/${groupId}/payment`)

      .set('Authorization', `Bearer ${token}`)

      .send({ member_id: members[0].id, amount:5000, cycle:1 });

    expect(res.status).toBe(200);

    expect(res.body.status).toBe('paid');

  });


  test('GET /api/xitique/:id/cycle — estado do ciclo', async () => {

    const res =awaitrequest(app).get(`/api/xitique/${groupId}/cycle`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('pagos');

    expect(res.body).toHaveProperty('pendentes');

    expect(res.body).toHaveProperty('fundo_acumulado');

  });

});

```

### 6.5 — Testes da Binth IA

```javascript

// tests/binth.test.js

describe('Binth AI Endpoints', () => {


  test('GET /api/binth/score — calcula score financeiro', async () => {

    const res =awaitrequest(app).get('/api/binth/score').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(res.body.score).toBeGreaterThanOrEqual(0);

    expect(res.body.score).toBeLessThanOrEqual(100);

    expect(res.body).toHaveProperty('factors');

  });


  test('GET /api/binth/insights — retorna insights proactivos', async () => {

    const res =awaitrequest(app).get('/api/binth/insights').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length >0) {

      expect(res.body[0]).toHaveProperty('type');

      expect(res.body[0]).toHaveProperty('title');

      expect(res.body[0]).toHaveProperty('desc');

    }

  });


  // Nota: /api/binth/chat só é testado com mock do provider IA

  test('POST /api/binth/chat — responde com estrutura correcta (mock)', async () => {

    // Mock do provider

    jest.spyOn(binthService, 'callProvider').mockResolvedValue({

      message:'Resposta mock da Binth',

      insight_type:'info',

      quick_actions: ['Acção 1'],

      data:null

    });

    const res =awaitrequest(app)

      .post('/api/binth/chat')

      .set('Authorization', `Bearer ${token}`)

      .send({ message:'Como estão as minhas finanças?' });

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('message');

    expect(res.body).toHaveProperty('insight_type');

  });


  test('POST /api/binth/sms-parse — parse de SMS Millennium BIM', async () => {

    const res =awaitrequest(app)

      .post('/api/binth/sms-parse')

      .set('Authorization', `Bearer ${token}`)

      .send({ sms:'A conta 406659018 foi debitada no valor de 20.00 MZN as 23:17 do dia 24/02/26. Millennium bim' });

    expect(res.status).toBe(200);

    expect(res.body.is_financial).toBe(true);

    expect(res.body.bank_name).toMatch(/Millennium/i);

    expect(res.body.amount).toBe(20);

    expect(res.body.transaction_type).toBe('debit');

  });

});

```

### 6.6 — Script de Teste Manual (cURL)

```bash

#!/bin/bash

# tests/manual/test-api.sh

BASE="http://localhost:3001/api"


echo"=== 1. REGISTER ==="

REGISTER=$(curl-s-XPOST $BASE/auth/register\

  -H "Content-Type: application/json" \

  -d'{"email":"jubilio@mwanga.app","password":"Test1234!","name":"Jubílio Maússe"}')

echo $REGISTER |jq.

TOKEN=$(echo $REGISTER |jq-r'.token')


echo""

echo"=== 2. GET PROFILE ==="

curl-s-H"Authorization: Bearer $TOKEN" $BASE/auth/me|jq.


echo""

echo"=== 3. CREATE TRANSACTION ==="

curl-s-XPOST $BASE/transactions\

  -H "Authorization: Bearer $TOKEN" \

  -H"Content-Type: application/json"\

  -d '{"type":"credit","amount":45000,"description":"Salário Fevereiro","category":"Rendimento","date":"2026-02-01","bank":"Millennium BIM"}' | jq .


echo""

echo"=== 4. GET TRANSACTIONS ==="

curl-s-H"Authorization: Bearer $TOKEN" $BASE/transactions|jq.


echo""

echo"=== 5. BINTH SCORE ==="

curl-s-H"Authorization: Bearer $TOKEN" $BASE/binth/score|jq.


echo""

echo"=== 6. BINTH INSIGHTS ==="

curl-s-H"Authorization: Bearer $TOKEN" $BASE/binth/insights|jq.


echo""

echo"=== 7. SMS PARSE ==="

curl-s-XPOST $BASE/binth/sms-parse\

  -H "Authorization: Bearer $TOKEN" \

  -H"Content-Type: application/json"\

  -d '{"sms":"mKesh: Transferiste 1,500.00MT para Fatima Macie (845123456). Taxa: 15.00MT. Saldo: 8,230.50MT."}' | jq .

```

---

## PARTE 7 — ALGORITMO DO SCORE FINANCEIRO BINTH

O score deve ser calculado no backend, em `/api/binth/score`, com esta lógica:

```javascript

// services/scoreService.js

functioncalculateBinthScore(userData) {

  let score =0;

  const factors = [];


  // 1. Taxa de poupança (max 25 pts)

  // Ideal: poupar > 20% do rendimento

  const savingsRate = userData.excedente / userData.receitas;

  const savingsPts = Math.min(25, Math.round(savingsRate *125));

  score += savingsPts;

  factors.push({ name:'Taxa de poupança', pts: savingsPts, max:25, value:`${Math.round(savingsRate*100)}%` });


  // 2. Controlo do orçamento (max 25 pts)

  // Penaliza categorias excedidas

  const overBudget = userData.budgets.filter(b=> b.spent > b.total).length;

  const budgetPts = Math.max(0, 25- (overBudget *8));

  score += budgetPts;

  factors.push({ name:'Controlo de orçamento', pts: budgetPts, max:25, value:`${overBudget} categorias excedidas` });


  // 3. Progresso nas metas (max 20 pts)

  const avgGoalProgress = userData.metas.length >0

    ? userData.metas.reduce((sum, m) => sum + (m.current / m.total), 0) / userData.metas.length

    :0;

  const goalPts = Math.round(avgGoalProgress *20);

  score += goalPts;

  factors.push({ name:'Progresso nas metas', pts: goalPts, max:20, value:`${Math.round(avgGoalProgress*100)}% em média` });


  // 4. Gestão de dívidas (max 20 pts)

  const debtToIncome = userData.totalDividas / (userData.receitas *12);

  const debtPts = debtToIncome >3?0: debtToIncome >1.5?10: Math.round(20- (debtToIncome *6));

  score += debtPts;

  factors.push({ name:'Rácio dívida/rendimento', pts: debtPts, max:20, value:`${debtToIncome.toFixed(1)}x rendimento anual` });


  // 5. Participação no Xitique / comunidade (max 10 pts)

  const xitiquePts = userData.xitique?.status ==='active'?10:0;

  score += xitiquePts;

  factors.push({ name:'Poupança comunitária', pts: xitiquePts, max:10, value: userData.xitique ?'Xitique activo':'Sem grupo' });


  return {

    score: Math.min(100, Math.max(0, score)),

    label: score >=90?'Perfeito': score >=75?'Excelente': score >=60?'Bom': score >=40?'A melhorar':'Crítico',

    factors

  };

}

```

---

## PARTE 8 — INSTRUÇÕES DE IMPLEMENTAÇÃO PARA IA/LLM

Se estás a usar este prompt para pedir a uma IA para implementar o Mwanga, segue estas regras:

### REGRA 1 — Preservar tudo o que existe

O sistema base (`mwanga-v3-responsive.jsx`) tem estas funcionalidades que NUNCA devem ser removidas:

-`useDevice()` hook para detecção responsiva

- Todas as 8 screens: Dashboard, Transações, Orçamento, Metas, Xitique, Dívidas, Binth, Importar SMS
- Layout mobile com phone frame + bottom nav + bottom sheet "Mais"
- Layout desktop com sidebar + top bar
- Layout tablet com sidebar colapsada
- Design tokens em `G` (objecto de cores)
- SMS parser com regex fallback + IA
- Todos os mock data em `DATA`

### REGRA 2 — Melhorar sem substituir

Ao adicionar features, **adiciona** ao código existente. Não refactores sem autorização.

Melhorias permitidas:

- Substituir mock data por chamadas reais à API
- Adicionar `useAuth` para proteger screens
- Adicionar `AuthScreen` antes das screens protegidas
- Conectar Binth ao backend em vez de directo ao provider
- Adicionar loading states e error boundaries

### REGRA 3 — Binth continua feminina

Em qualquer modificação ao system prompt ou mensagens da Binth, manter:

- Pronomes e concordâncias no feminino
- Tom caloroso e directo
- Nunca robótico ou impessoal

### REGRA 4 — API keys em produção

Em produção, as API keys dos providers de IA (Gemini, Groq, OpenRouter) NUNCA devem estar no frontend. O frontend faz POST `/api/binth/chat` → backend faz a chamada ao provider. Em desenvolvimento, o modo "bring your own key" no frontend é aceitável.

### REGRA 5 — Auth Google

Ao implementar Google OAuth:

1. Adicionar `AuthScreen` component com dois modos: login e register
2. Botão "Continuar com Google" que redireciona para `/api/auth/google`
3. Callback handler em `/auth/callback` que extrai o JWT da query string
4. Guardar JWT em `localStorage` (ou `httpOnly cookie` em produção)

5.`useAuth` hook que verifica token e redireciona se não autenticado

6. Todas as screen calls à API incluem `Authorization: Bearer {token}`

### REGRA 6 — Testar antes de declarar pronto

Antes de considerar qualquer endpoint implementado, executar:

```bash

npmtest                          # Todos os testes

npmtest----coverage            # Com coverage (meta: >80%)

bashtests/manual/test-api.sh    # Testes manuais cURL

```

---

## PARTE 9 — CHECKLIST DE DEPLOY

```

PRÉ-DEPLOY:

[ ] npm test — todos os testes passam

[ ] .env.production configurado (não commitar)

[ ] Google OAuth redirect URIs actualizados para domínio de produção

[ ] JWT_SECRET forte (>32 chars random)

[ ] HTTPS configurado (OAuth Google requer HTTPS em produção)

[ ] Rate limiting activo em /api/auth e /api/binth/chat

[ ] CORS configurado apenas para o domínio do frontend


BASE DE DADOS:

[ ] Migrations executadas

[ ] Backups configurados

[ ] Índices criados: users.email, transactions.user_id, transactions.date


FRONTEND:

[ ] Variáveis VITE_ configuradas

[ ] Build sem erros: npm run build

[ ] Assets optimizados


PÓS-DEPLOY:

[ ] Testar login Google em produção

[ ] Testar criação de conta

[ ] Testar SMS parser com SMS reais

[ ] Testar Binth com provider configurado

[ ] Verificar que API keys não aparecem nos network logs

```

---

## PARTE 10 — REFERÊNCIA RÁPIDA DE COMPONENTES

### Componentes base existentes (não recriar)

```jsx

<CardonClick={fn}hoverstyle={{}}>          // Glassmorphism card

<GoldBtnsize="sm|md|lg"disabled>            // Botão dourado gradiente

<GhostBtnonClick={fn}style={{}}>            // Botão outline

<ProgressBarvalue={0-100}color="#hex">      // Barra de progresso

<Badgelabel="texto"color="#hex"size="sm">  // Chip/badge colorido

<SectionTitleaction="Ver todos →"onAction>  // Título de secção

<InsightCardinsight={type,title,desc,icon}>  // Card de insight da Binth

<MiniChartdata={[{mes,rec,desp}]}>           // Gráfico de linha SVG

```

### Hooks existentes (não recriar)

```javascript

const device =useDevice();

// device.isMobile    → boolean

// device.isTablet    → boolean

// device.isDesktop   → boolean

// device.width       → number (px)

```

### Estrutura de resposta da Binth (não alterar)

```typescript

interfaceBinthResponse {

  message:string;           // Texto para mostrar ao utilizador

  insight_type:'warning'|'opportunity'|'info'|'celebration'|'action';

  quick_actions:string[];   // Máximo 4 acções rápidas

  data:any|null;          // Dados estruturados adicionais (opcional)

}

```

---

*Documento gerado automaticamente para o projecto Mwanga × NEXO VIBE*

*Versão 3.1 — Fevereiro 2026*
