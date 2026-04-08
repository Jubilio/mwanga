# Mwanga Financial — Documentação Técnica do Sistema

## 1. Visão Geral
O **Mwanga Financial** é uma plataforma SaaS (Software as a Service) de elite dedicada à gestão financeira familiar e crescimento patrimonial. O sistema combina um design moderno (**Glassmorphism 2.0**) com funcionalidades robustas de automação, como um motor de extração de SMS bancários e uma assistente virtual inteligente (**Binth**).

---

## 2. Arquitetura do Sistema
O sistema segue uma arquitetura **Client-Server** moderna e descentralizada:

- **Frontend**: Aplicação Single-Page (SPA) construída com **React** e **Vite**, otimizada como **PWA** (Progressive Web App) para funcionamento offline e instalação nativa.
- **Backend**: API RESTful em **Node.js** com **Express**, utilizando **JWT** para autenticação e **Zod** para validação de esquemas.
- **Base de Dados**: **PostgreSQL** (alojado via Supabase) para persistência de dados e **Redis** para cache de performance.
- **Design System**: Sistema de design proprietário em **Vanilla CSS** focado em estética premium, transparências e micro-animações.

---

## 3. Modelo de Dados (Schema)
O sistema utiliza um modelo relacional focado em multi-tenancy através do conceito de **Households** (Agregados Familiares).

### Tabelas Principais:
- **`users`**: Armazena informações dos utilizadores, credenciais (hash bcrypt) e associação ao agregado.
- **`households`**: Unidade central de partilha. Todos os dados financeiros (transações, dívidas) estão ligados a um `household_id`.
- **`transactions`**: Registo de fluxos de caixa.
  - Campos: `id`, `date`, `type` (receita/despesa), `amount`, `category`, `account_id`, `household_id`.
- **`debts`**: Gestão de dívidas e empréstimos.
  - Suporta amortizações parciais e cálculo de juros.
- **`accounts`**: Contas bancárias ou carteiras móveis (M-Pesa, mKesh) com saldo dinâmico.
- **`notifications`**: Sistema de alertas e lembretes integrados com Push API.

---

## 4. Módulos Core

### 4.1. SMS Parser Engine (Extração Automática)
Um dos diferenciais competitivos do Mwanga. Permite importar transações copiando o texto de SMS de bancos moçambicanos (Millennium BIM, BCI) e carteiras móveis.
- **Fase 1 (Regex)**: Tenta extrair valores, referências e datas usando padrões conhecidos.
- **Fase 2 (LLM Fallback)**: Se o Regex falhar ou tiver baixa confiança, o sistema utiliza a API da **Anthropic (Claude 3.5)** para interpretar o texto e devolver um JSON estruturado.

### 4.2. Binth AI Assistant
A assistente virtual inteligente que oferece:
- **Score Financeiro**: Avaliação da saúde financeira baseada no comportamento.
- **Chat Contextual**: Responde a dúvidas sobre o orçamento e sugere melhorias.
- **Insights**: Analisa padrões de gastos para detetar anomalias ou oportunidades de poupança.

### 4.3. Gamificação (Badges)
Sistema de incentivo onde os utilizadores ganham "conquistas" baseadas em hábitos saudáveis:
- **Poupador**: Registar X semanas seguidas de saldo positivo.
- **Organizado**: Manter todas as categorias de orçamento abaixo do limite.

### 4.4. Notification Engine v2
Sistema proativo de notificações:
- **Inteligência de Entrega**: Score de relevância para decidir se envia push instantâneo ou agrega num resumo diário.
- **Deduplicação**: Evita alertas repetidos para o mesmo evento financeiro.

---

## 5. Autenticação e Segurança
- **JWT**: Sessões seguras com validade de 7 dias.
- **Google Login**: Integração via OAuth2.
- **PII Encryption**: Dados sensíveis (como IDs nacionais) podem ser cifrados ao nível da aplicação antes de serem guardados.
- **CORS Dinâmico**: Gestão rigorosa de origens permitidas via variáveis de ambiente.

---

## 6. Configuração e Deploy

### Variáveis de Ambiente Necessárias:
- `DATABASE_URL`: String de conexão PostgreSQL.
- `JWT_SECRET`: Chave para assinatura de tokens.
- `ANTHROPIC_API_KEY`: Para o fallback inteligente do SMS Parser.
- `GOOGLE_CLIENT_ID`: Para autenticação social.
- `REDIS_URL`: URL para o servidor de cache.

### Comandos de Execução:
```bash
# Frontend
npm run dev

# Backend
cd server && npm start
```

---
*Documentação atualizada em: 08/04/2026*
