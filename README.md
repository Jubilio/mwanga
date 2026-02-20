# 🌊 Mwanga — Gestão Financeira Inteligente

![Mwanga Banner](public/favicon.svg)

O **Mwanga** é uma plataforma SaaS premium de gestão financeira familiar, desenhada para trazer clareza, controlo e crescimento ao seu património. Com uma estética moderna e futurista sob a marca **NEXO VIBE**, o Mwanga combina ferramentas financeiras tradicionais com inovações locais como o **Xitique**.

---

## ✨ Funcionalidades Principais

### 🏢 SaaS & Multi-Tenant

- **Isolamento de Dados**: Sistema multi-agregado familiar onde cada família gere os seus próprios dados com total privacidade.
- **Autenticação Segura**: Gestão de acessos via JWT (JSON Web Tokens).
- **Audit Log**: Todas as operações críticas são registadas para garantir transparência e segurança.

### 💰 Gestão Financeira 360º

- **Dashboard Dinâmico**: Visualização em tempo real de receitas, despesas e saldo líquido.
- **Xitique (Fintech Social)**: Módulo exclusivo para gestão de poupança rotativa comunitária, com automação de ciclos e pagamentos.
- **Gestão de Património**: Monitorização detalhada de Activos (bens) e Passivos (dívidas) com cálculo automático de Património Líquido.
- **Simuladores Inteligentes**: Planeamento de reformas, compra de casa própria e estratégias de investimento.

### 🏠 Habitação & Salários

- **Controlo de Habitação**: Gestão de rendas ou manutenção de casa própria.
- **Gestão Salarial**: Planeamento baseado no rendimento mensal com sugestões automáticas de orçamentação (50/30/20).

### 📱 Experiência Premium (PWA)

- **Instalável**: Funciona como uma aplicação nativa no seu telemóvel ou desktop (Progressive Web App).
- **Offline Ready**: Acesso rápido e interface fluida mesmo em ligações lentas.
- **Branding NEXO VIBE**: Interface futurista ("Ocean & Gold") que alia estética e usabilidade.

---

## 🚀 Tecnologias

### **Frontend**

- **React + Vite**: Performance ultra-rápida.
- **Lucide React**: Ícones modernos e consistentes.
- **Recharts**: Gráficos interactivos e elegantes.
- **Vanilla CSS**: Design customizado e responsivo ("Mobile First").

### **Backend**

- **Node.js + Express**: API robusta e escalável.
- **SQLite (better-sqlite3)**: Base de dados relacional eficiente com suporte para multi-tenancy.
- **JSON Web Tokens (JWT)**: Segurança e persistência de sessão.

---

## 🛠️ Instalação e Execução

### Pré-requisitos

- Node.js (v18 ou superior)
- NPM ou Yarn

### Passos

1. **Clone o repositório**

   ```bash
   git clone https://github.com/Jubilio/mwanga.git
   cd mwanga
   ```
2. **Instale as dependências**

   ```bash
   # Frontend
   npm install

   # Backend
   cd server
   npm install
   ```
3. **Configuração**
   Crie um ficheiro `.env` na pasta `server/` com:

   ```env
   JWT_SECRET=sua_chave_secreta_aqui
   PORT=3001
   ```
4. **Execução**

   ```bash
   # Numa consola (server)
   npm start

   # Noutra consola (root)
   npm run dev
   ```

---

## 🎨 Branding: NEXO VIBE

O Mwanga faz parte do ecossistema **NEXO VIBE**, uma marca dedicada à excelência em:

- **Software Development**
- **AI & Prompt Engineering**
- **Data Analysis**

Visite a nossa página oficial dentro da app em `/nexovibe`.

---

## 👨‍💻 Autor

Desenvolvido com ❤️ por **Jubílio Maússe** — *Fullstack Developer & Financial Strategist*.

---

*Mwanga 2026 — Ilumine as suas finanças.*
