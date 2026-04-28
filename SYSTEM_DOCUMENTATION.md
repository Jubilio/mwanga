# Mwanga Financial — Documentação Técnica do Sistema

> **Versão:** 2.1.0 | **Última actualização:** 27/04/2026

---

## 1. Visão Geral

O **Mwanga Financial** é uma plataforma SaaS de elite dedicada à gestão financeira pessoal e familiar, optimizada para o mercado moçambicano. Combina um design moderno **(Glassmorphism 2.0)** com funcionalidades avançadas como automação via SMS bancários, IA conversacional **(Binth)** e suporte nativo Android via Capacitor.

---

## 2. Arquitectura do Sistema

O sistema segue uma arquitectura **Client-Server** moderna, descentralizada e offline-first:

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React + Vite (SPA/PWA) | React 19, Vite 7 |
| Backend | Node.js + Express (API REST) | Express 5 |
| Base de Dados | PostgreSQL (Supabase) + SQLite (local dev) | better-sqlite3 12 |
| Cache | Redis (Upstash) | @upstash/redis 1.37 |
| Mobile | Capacitor (Android nativo) | Capacitor 8 |
| PWA | vite-plugin-pwa | v1.2 |
| ORM / DB Client | @libsql/client (Turso compatível) | v0.17 |

---

## 3. Deploy e URLs

| Plataforma | URL / Destino |
|------------|---------------|
| Frontend (Vercel) | `https://mwanga-opal.vercel.app` |
| Frontend (Netlify) | `https://mwangafin.netlify.app` |
| Backend (Render) | Configurado via `VITE_API_URL` no `.env` |
| Android (APK) | Build Capacitor em `/android` |

---

## 4. Modelo de Dados (Schema Principal)

O sistema usa multi-tenancy baseado em **Households** (Agregados Familiares).

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Utilizadores, credenciais bcrypt, `role` (user/admin), `subscription_tier` |
| `households` | Unidade de partilha. Todos os dados financeiros estão ligados a `household_id` |
| `transactions` | Fluxos de caixa. Campos: `id`, `date`, `type`, `amount`, `category`, `account_id`, `household_id` |
| `accounts` | Contas bancárias / carteiras (M-Pesa, mKesh, BIM). Saldo calculado dinamicamente |
| `debts` | Dívidas com amortizações parciais e cálculo de juros |
| `budgets` | Limites mensais por categoria |
| `goals` | Metas de poupança com progresso e prazo |
| `rentals` | Registo de pagamentos de renda mensal |
| `assets` | Activos patrimoniais (imóveis, veículos, etc.) |
| `liabilities` | Passivos (empréstimos, obrigações) |
| `xitiques` | Grupos de poupança rotativa (modelo VSLA local) |
| `notifications` | Alertas e lembretes integrados com Push API |
| `push_subscriptions` | Tokens VAPID (PWA) e FCM (Android nativo) |
| `behavior_events` | Interacções e métricas de uso (DAU/MAU) |
| `kyc_documents` | Metadados de documentos de identidade para verificação manual |
| `webauthn_credentials` | Credenciais de Passkey/Biometria por utilizador |
| `feedback` | Feedback submetido pelos utilizadores |

---

## 5. Módulos Frontend (27 páginas)

### Páginas Principais (Lazy-loaded)

| Rota | Página | Tamanho |
|------|--------|---------|
| `/` | Dashboard | 8 KB |
| `/transacoes` | Transactions | 8 KB |
| `/orcamento` | Budget | 7.8 KB |
| `/dividas` | Dividas | 18 KB |
| `/metas` | Goals | 23 KB |
| `/patrimonio` | Patrimony | 18.7 KB |
| `/insights` | Insights (Binth AI) | 23 KB |
| `/simuladores` | Simulators | 33 KB |
| `/relatorio` | Reports | 10.4 KB |
| `/xitique` | Xitique (VSLA) | 12.3 KB |
| `/habitacao` | Habitacao | 9.9 KB |
| `/credito` | Credito | 8.8 KB |
| `/sms-import` | SmsImport | 20 KB |
| `/nexovibe` | NexoVibe | 8.9 KB |
| `/mordomia` | Stewardship | 7.3 KB |
| `/time-machine` | TimeMachine | 10.9 KB |
| `/settings` | Settings | 7.4 KB |
| `/help` | Help | 7 KB |
| `/pricing` | Pricing | 11 KB |

### Admin Portal (rota isolada `/admin`)

| Sub-rota | Página |
|----------|--------|
| `/admin` | Dashboard administrativo |
| `/admin/users` | Gestão de utilizadores + KYC |
| `/admin/settings` | Configurações da plataforma |
| `/admin/feedback` | Visualização de feedback |

### Auth (páginas públicas)

- `/login` — Login, Registo, Google OAuth2
- `/forgot-password` — Recuperação por email
- `/reset-password` — Reset via token

---

## 6. Arquitectura de Estado (Frontend)

### `useFinanceStore.jsx` (45.6 KB) — Store Central

O estado global é gerido por um `useReducer` com **persistência dupla**:

1. **Caminho online**: Endpoint agregado `/api/dashboard-summary` (1 chamada) com fallback para 13 chamadas individuais em lote (concorrência limitada a 5 para evitar exaustão de streams HTTP/2 no Render free-tier).
2. **Caminho offline**: Fallback automático para **Dexie.js (IndexedDB)** se a API falhar.

#### Estado Global (`defaultState`)

```js
{
  transacoes, rendas, metas, budgets,
  activos, passivos, xitiques, dividas,
  contas, loans, loanApplications,
  settings: { user_salary, default_rent, housing_type,
               financial_month_start_day, subscription_tier,
               sms_automation_enabled, last_sms_sync_date, ... },
  user: null,
  darkMode: true,
  loading: true
}
```

#### Acções do Reducer

`SET_DATA`, `RESET_SESSION`, `SET_USER`, `UPDATE_USER`, `ADD/DELETE_TRANSACTION`, `UPDATE_TRANSACTION`, `ADD/DELETE_RENDA`, `ADD/UPDATE/DELETE_META`, `SET/DELETE_BUDGET`, `UPDATE_SETTING`, `ADD/DELETE_ASSET`, `ADD/DELETE_LIABILITY`, `SET_XITIQUES`, `ADD/DELETE/SET_DEBTS`, `ADD/UPDATE_ACCOUNT_BALANCE/DELETE/SET_ACCOUNTS`, `TOGGLE_DARK_MODE`

### Outros Hooks

| Hook | Função |
|------|--------|
| `usePushNotifications.js` | VAPID (PWA) + FCM (Android nativo via Capacitor) |
| `useSmsSync.js` | Leitura de SMS bancários no Android e importação automática de transacções |
| `useOfflineSync.js` | Processamento da fila `pendingActions` do Dexie quando a rede regressa |
| `useStewardship.js` | Lógica do módulo de Mordomia financeira |
| `useVsla.js` | Gestão de Xitiques (grupos de poupança rotativa) |
| `useProFeatures.js` | Feature flags por tier (free / growth / pro) |
| `usePWA.js` | Detecção de estado PWA e service worker |
| `usePWAInstall.js` | Prompt de instalação da PWA |
| `useClipboardSMS.jsx` | Leitura de SMS via clipboard (fallback web) |

---

## 7. API Backend — Rotas

### Registadas em `app.js`

| Prefixo | Módulo | Autenticação |
|---------|--------|-------------|
| `/api/auth` | Registo, Login, Google OAuth2, Perfil | Pública / JWT |
| `/api/auth/webauthn` | WebAuthn (Passkey/Biometria) | Pública / JWT |
| `/api/` (finance) | Transacções, Orçamento, Metas, Dívidas, Contas, Activos, Passivos, Dashboard Summary | JWT |
| `/api/notifications` | Push subscriptions (VAPID + FCM), test push, config | JWT |
| `/api/sms` | SMS Parser (Regex + Claude 3.5 Haiku fallback) | JWT |
| `/api/credit` | Pedidos de crédito, loans | JWT |
| `/api/kyc` | Upload de documentos de identidade | JWT |
| `/api/admin` | Painel admin, broadcast, métricas | JWT + isAdmin |
| `/api/households` | Convites e gestão de agregados familiares | JWT |
| `/api/behavior` | Ping de actividade, tracking DAU/MAU | JWT |
| `/api/feedback` | Submissão e listagem de feedback | JWT / isAdmin |
| `/api/health` | Health check (DB ping) | Pública |
| `/api/metrics` | Métricas de plataforma | JWT + isAdmin |

### Endpoint Agregado: `/api/dashboard-summary`

Carrega todos os dados do utilizador numa só chamada HTTP:
`transactions`, `rentals`, `goals`, `budgets`, `assets`, `liabilities`, `xitiques`, `settings`, `user`, `debts`, `accounts`, `loanApplications`, `loans`.

---

## 8. Autenticação e Segurança

### Métodos de Autenticação

| Método | Implementação |
|--------|--------------|
| Email + Password | bcryptjs, JWT (7 dias) |
| Google OAuth2 (Web) | `@react-oauth/google` (implicit flow) |
| Google OAuth2 (Android) | Redirect manual → intercepção do `access_token` no hash da URL |
| Passkey / Biometria | `@simplewebauthn/server` v13 (WebAuthn Level 2) |
| Recuperação de Password | Email via nodemailer + token de reset |

### Middlewares de Segurança (por ordem no pipeline)

1. **Helmet** — Headers HTTP (CSP, CORP, COEP configurados para Capacitor/Android)
2. **CORS** — Origens: Vercel, Netlify, localhost:5173/3000/8081
3. **Compression** — gzip/deflate para todas as respostas
4. **Rate Limiting** — 300 req/15min (API geral), 100 req/hora (auth)
5. **Body Parsing** — Limite 1MB (anti-DoS)
6. **HPP** — Protecção contra HTTP Parameter Pollution
7. **XSS Deep Sanitization** — Recursiva em todos os campos do body (incluindo objectos nested)
8. **JWT Verification** — Middleware `authenticate` para rotas protegidas

---

## 9. Serviços Core (Backend)

| Serviço | Descrição | Tamanho |
|---------|-----------|---------|
| `binthService.js` | Motor de IA Binth: score financeiro, chat contextual, insights de gastos | 41 KB |
| `notification.service.js` | Orquestração central de notificações | 14.5 KB |
| `notificationEventEngine.service.js` | Eventos que disparam notificações | 14.8 KB |
| `notificationEngine.service.js` | Motor de entrega e scoring de relevância | 8.5 KB |
| `push.service.js` | Envio via VAPID (web-push) e FCM (firebase-admin) | 10 KB |
| `notificationAi.service.js` | Geração de conteúdo de notificação via IA | 5.5 KB |
| `smsParserService.js` | Parser SMS bancários (Regex + LLM fallback) | 9.8 KB |
| `transaction.service.js` | CRUD de transacções + actualização de saldos | 7.9 KB |
| `auth.service.js` | Registo, login, Google OAuth, JWT | 6 KB |
| `reminder.service.js` | Agendamento de lembretes (node-cron) | 7.9 KB |
| `scoring.service.js` | Cálculo do score financeiro do utilizador | 4.6 KB |
| `credit.service.js` | Avaliação e gestão de crédito | 4.2 KB |
| `debt.service.js` | Gestão de dívidas e amortizações | 4.1 KB |
| `goal.service.js` | Metas de poupança com integração de contas | 3.1 KB |
| `gamificationEngine.service.js` | Sistema de badges e conquistas | 3.3 KB |
| `xitique.service.js` | Grupos de poupança rotativa (VSLA) | 6.3 KB |
| `email.service.js` | Envio de emails (nodemailer) | 3.6 KB |
| `account.service.js` | Gestão de contas bancárias e carteiras | 3.2 KB |
| `vsla.service.js` | Lógica de grupos VSLA | 2.5 KB |
| `patrimony.service.js` | Activos e passivos patrimoniais | 1.8 KB |
| `audit.service.js` | Log de auditoria de acções | 1.2 KB |
| `behaviorTracking.service.js` | Registo de eventos de comportamento | 939 B |
| `toolRegistry.js` | Registo de ferramentas para o agente Binth | 4.3 KB |

---

## 10. Módulo SMS Parser

### Fluxo de Processamento

```
SMS recebido (texto)
        │
        ▼
  Fase 1: Regex Engine
  (padrões: M-Pesa, e-Mola, BIM, BCI, mKesh, Absa, Standard Bank)
        │
        ├─ Confiança alta ──► Transacção criada
        │
        └─ Falha / baixa confiança
                  │
                  ▼
         Fase 2: LLM Fallback
         (Anthropic Claude 3.5 Haiku)
         Retorna JSON estruturado
                  │
                  ▼
          Transacção criada
```

### Auto-Sync SMS (Android — `useSmsSync.js`)

- Lê os últimos 200 SMS desde a última sincronização (default: últimos 7 dias)
- Filtra por remetentes conhecidos: `M-Pesa`, `e-Mola`, `Millennium`, `BIM`, `BCI`, `mKesh`, `Absa`, `Standard`
- Deduplica por `SMS_REF:<id>` e `TX:<transaction_id>` no campo `note`
- Mapeia automaticamente para a conta correcta com base no nome do banco
- Actualiza o timestamp `last_sms_sync_date` nas settings após cada sincronização

---

## 11. Sistema de Notificações v2

### Canais de Entrega

| Canal | Utilização | Serviço |
|-------|-----------|---------|
| VAPID Web Push | PWA / Desktop / Browser | `web-push` + `push.service.js` |
| FCM (Firebase) | Android nativo (Capacitor) | `firebase-admin` + `push.service.js` |
| In-App | Notificações dentro da aplicação | Tabela `notifications` |
| Email | Lembretes e alertas críticos | `nodemailer` + `email.service.js` |

### Fluxo de Inteligência

1. **Evento financeiro** ocorre (nova transacção, dívida a vencer, etc.)
2. `notificationEventEngine` avalia o evento
3. `notificationScoring` calcula relevância (evita spam)
4. `notificationEngine` decide: push imediato ou agregação em resumo diário
5. **Deduplicação**: Verifica se alerta semelhante foi enviado recentemente
6. Despacho via canal adequado (VAPID ou FCM consoante `deviceType`)

---

## 12. Resiliência Offline e PWA

### Estratégia Offline-First

```
Arranque da app
      │
      ▼
 Tem token JWT?
      │
  Sim ▼
 fetchAllData() ─── sucesso ──► dados frescos da API + sincroniza Dexie
      │
    falha
      │
      ▼
 Dexie.js (IndexedDB)
 (transacoes, budgets, metas, rendas, settings, user_profile)
      │
  tem dados?
      │
  Sim ▼
 Modo Offline activo — dados locais apresentados
      │
    Não
      │
      ▼
 Demo Data (dados de demonstração gerados localmente)
```

### Fila de Sincronização (`pendingActions`)

Acções realizadas offline são guardadas em `db.pendingActions` e processadas por `useOfflineSync.js` quando a rede é restabelecida.

### Persistência Local (Dexie.js)

| Tabela Dexie | Conteúdo |
|-------------|---------|
| `transacoes` | Transacções financeiras |
| `budgets` | Limites de orçamento |
| `metas` | Metas de poupança |
| `rendas` | Pagamentos de renda |
| `settings` (id: `current`) | Configurações do utilizador |
| `settings` (id: `user_profile`) | Perfil do utilizador (persiste identidade offline) |
| `pendingActions` | Fila de acções a sincronizar |

---

## 13. Sistema de Gamificação

Badges atribuídos automaticamente com base em comportamentos:

| Badge | Critério |
|-------|---------|
| **Poupador** | X semanas consecutivas de saldo positivo |
| **Organizado** | Todas as categorias de orçamento dentro do limite |

---

## 14. Tiers de Subscrição

| Tier | Acesso |
|------|--------|
| `free` | Funcionalidades básicas |
| `growth` | Funcionalidades intermédias |
| `pro` | Acesso total (Binth IA, Simuladores avançados, etc.) |

Gerido via `subscription_tier` na tabela `users` e `useProFeatures.js` no frontend.

---

## 15. i18n — Internacionalização

- **Biblioteca**: `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- **Idiomas**: Português (PT) como principal, Inglês (EN) como secundário
- **Ficheiros**: `/src/locales/pt/`, `/src/locales/en/`

---

## 16. Configuração e Deploy

### Variáveis de Ambiente — Frontend (`.env`)

```env
VITE_API_URL=https://seu-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_VAPID_PUBLIC_KEY=...
```

### Variáveis de Ambiente — Backend (`server/.env`)

```env
DATABASE_URL=postgresql://...          # Supabase PostgreSQL
TURSO_DATABASE_URL=libsql://...        # Turso (alternativa)
JWT_SECRET=...                         # Chave de assinatura JWT
ANTHROPIC_API_KEY=...                  # Claude (SMS Parser LLM fallback)
GOOGLE_CLIENT_ID=...                   # Google OAuth2
REDIS_URL=https://...upstash.io        # Cache Upstash
FIREBASE_SERVICE_ACCOUNT_JSON=...      # FCM (push nativo Android)
VAPID_PUBLIC_KEY=...                   # Web Push
VAPID_PRIVATE_KEY=...
EMAIL_USER=...                         # Nodemailer
EMAIL_PASS=...
# Binth AI — Providers
GEMINI_API_KEY=...                     # Provider principal (gemini-2.0-flash)
GROQ_API_KEY=...                       # Provider secundário (llama-3.1-8b-instant)
OPENROUTER_API_KEY=...                 # Provider openrouter + openrouter_free (fallback)
OPENROUTER_MODEL=...                   # Modelo OpenRouter pago (default: meta-llama/llama-3.1-8b-instruct)
OPENROUTER_FREE_MODEL=...              # Modelo OpenRouter gratuito (default: qwen/qwen-2-vl-7b-instruct:free)
```

### Comandos de Execução

```bash
# Frontend (dev)
npm run dev

# Frontend (build de produção)
npm run build

# Backend (desenvolvimento)
cd server && npm run dev

# Backend (produção)
cd server && npm start

# Testes frontend
npm run test

# Build Android (Capacitor)
npm run build && npx cap sync android && npx cap open android
```

---

## 17. Segurança — Resumo Executivo

| Área | Implementação |
|------|--------------|
| Passwords | bcryptjs (hash + salt) |
| Sessões | JWT HS256, 7 dias de validade |
| Auth Social | Google OAuth2 (implicit flow, compatível com Android WebView) |
| Biometria | WebAuthn Level 2 (@simplewebauthn/server v13) |
| Headers | Helmet (CSP, HSTS, X-Frame-Options) |
| Rate Limiting | 300 req/15min (API), 100 req/h (auth) |
| Injecção XSS | Sanitização recursiva com `xss` em todos os campos |
| HTTP Param Pollution | `hpp` middleware |
| CORS | Lista branca explícita de origens |
| Uploads | multer (controlo de tipo e tamanho de ficheiros) |
| Logs | `pino` + `pino-pretty` (estruturados, sem dados sensíveis) |

---

*Documentação gerada automaticamente com base no código-fonte em: **27/04/2026***
