import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useMemo } from 'react';
import { FinanceProvider } from './hooks/useFinanceStore';
import Layout from './components/Layout';
import { useFinance } from './hooks/useFinance';
import ErrorBoundary from './components/ErrorBoundary';

// Critical path — loaded immediately
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Lazy-loaded pages — only downloaded when navigated to

const Transactions = lazy(() => import('./pages/Transactions'));
const Budget = lazy(() => import('./pages/Budget'));
const Habitacao = lazy(() => import('./pages/Habitacao'));
const Goals = lazy(() => import('./pages/Goals'));
const Simulators = lazy(() => import('./pages/Simulators'));
const Reports = lazy(() => import('./pages/Reports'));
const Patrimony = lazy(() => import('./pages/Patrimony'));
const Xitique = lazy(() => import('./pages/Xitique'));
const NexoVibe = lazy(() => import('./pages/NexoVibe'));
const SmsImport = lazy(() => import('./pages/SmsImport'));
const Settings = lazy(() => import('./pages/Settings'));
const Dividas = lazy(() => import('./pages/Dividas'));
const Credito = lazy(() => import('./pages/Credito'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Insights = lazy(() => import('./pages/Insights'));
const Stewardship = lazy(() => import('./pages/Stewardship'));
const Help = lazy(() => import('./pages/Help'));
const TimeMachine = lazy(() => import('./pages/TimeMachine'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'));

import { useSmsSync } from './hooks/useSmsSync';

const FINANCIAL_QUOTES = [
  "O melhor investimento que podes fazer é em ti mesmo.",
  "Riqueza não é o que ganhas, é o que guardas.",
  "Orçamento não é sobre limitação, é sobre priorização.",
  "A disciplina financeira é o passaporte para a liberdade.",
  "Pequenos riachos formam grandes rios; controla as pequenas despesas.",
  "O tempo é o teu maior aliado nos juros compostos.",
  "Dinheiro é um excelente escravo, mas um mestre terrível.",
  "A paciência é a chave para o crescimento patrimonial.",
  "O rico domina sobre o pobre, e o que toma emprestado é servo do que empresta. (Provérbios 22:7)",
  "A riqueza obtida com pressa diminuirá, mas quem a ajunta pelo trabalho terá aumento. (Provérbios 13:11)",
  "Foste fiel no pouco, sobre o muito te colocarei. (Mateus 25:21)",
  "Honra ao Senhor com os teus bens e com a primícia de toda a tua renda. (Provérbios 3:9)",
  "Os planos do diligente levam à fartura, mas a pressa excessiva leva à pobreza. (Provérbios 21:5)",
  "Pois onde estiver o vosso tesouro, ali estará também o vosso coração. (Mateus 6:21)"
];

function PageLoader() {
  const quote = FINANCIAL_QUOTES[Math.floor(Math.random() * FINANCIAL_QUOTES.length)];

  return (
    <div className="loading-screen">
      <div className="glass-loading-card">
        <div className="loading-logo-container">
          <img src="/splash-premium.png" alt="Mwanga Logo" className="loading-image" />
        </div>
        <div className="loading-brand">Mwanga ✦</div>
        <div className="loading-quote">"{quote}"</div>
        <div className="loading-progress-track">
          <div className="loading-progress-fill"></div>
        </div>
      </div>
    </div>
  );
}

function SmsManager() {
  useSmsSync();
  return null;
}

function RequireAuth({ children }) {
  const { state } = useFinance();
  const loc = useLocation();
  const token = localStorage.getItem('mwanga-token');
  // Fast synchronous check — written by Onboarding on completion.
  // This prevents a flash-redirect while the API is still loading.
  const hasOnboarded = localStorage.getItem('mwanga-onboarded') === 'true';

  if (state.loading) return (
    <div className="loading-screen">
      <div className="glass-loading-card">
        <div className="loading-logo-container">
          <img src="/splash-premium.png" alt="Mwanga Logo" className="loading-image" />
        </div>
        <div className="loading-brand">Mwanga ✶</div>
        <div className="loading-quote">
          "{FINANCIAL_QUOTES[Math.floor(Math.random() * FINANCIAL_QUOTES.length)]}"
        </div>
        <div className="loading-progress-track">
          <div className="loading-progress-fill"></div>
        </div>
        <div className="loading-status-text">
          Sincronizando dados financeiros...
        </div>
      </div>
    </div>
  );
  if (!token) return <Navigate to="/login" replace />;

  return (
    <>
      <SmsManager />
      {children}
    </>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <ErrorBoundary context="Aplicação">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Main App (financial) ── */}
              <Route element={<RequireAuth><Layout /></RequireAuth>}>
                <Route index element={<ErrorBoundary context="Dashboard"><Dashboard /></ErrorBoundary>} />
                <Route path="transacoes" element={<ErrorBoundary context="Transações"><Transactions /></ErrorBoundary>} />
                <Route path="orcamento" element={<ErrorBoundary context="Orçamento"><Budget /></ErrorBoundary>} />
                <Route path="habitacao" element={<ErrorBoundary context="Habitação"><Habitacao /></ErrorBoundary>} />
                <Route path="xitique" element={<ErrorBoundary context="Xitique"><Xitique /></ErrorBoundary>} />
                <Route path="metas" element={<ErrorBoundary context="Metas"><Goals /></ErrorBoundary>} />
                <Route path="dividas" element={<ErrorBoundary context="Dívidas"><Dividas /></ErrorBoundary>} />
                <Route path="credito" element={<ErrorBoundary context="Crédito"><Credito /></ErrorBoundary>} />
                <Route path="simuladores" element={<ErrorBoundary context="Simuladores"><Simulators /></ErrorBoundary>} />
                <Route path="relatorio" element={<ErrorBoundary context="Relatórios"><Reports /></ErrorBoundary>} />
                <Route path="patrimonio" element={<ErrorBoundary context="Património"><Patrimony /></ErrorBoundary>} />
                <Route path="sms-import" element={<ErrorBoundary context="SMS Import"><SmsImport /></ErrorBoundary>} />
                <Route path="nexovibe" element={<ErrorBoundary context="NexoVibe"><NexoVibe /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary context="Definições"><Settings /></ErrorBoundary>} />
                <Route path="pricing" element={<ErrorBoundary context="Pricing"><Pricing /></ErrorBoundary>} />
                <Route path="insights" element={<ErrorBoundary context="Insights"><Insights /></ErrorBoundary>} />
                <Route path="mordomia" element={<ErrorBoundary context="Mordomia"><Stewardship /></ErrorBoundary>} />
                <Route path="time-machine" element={<ErrorBoundary context="Máquina do Tempo"><TimeMachine /></ErrorBoundary>} />
                <Route path="help" element={<ErrorBoundary context="Ajuda"><Help /></ErrorBoundary>} />
                <Route path="quick-add" element={<Dashboard />} />
              </Route>

              {/* ── Admin Portal (isolated) ── */}
              <Route path="admin/login" element={<AdminLogin />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Admin />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="feedback" element={<AdminFeedback />} />
              </Route>

              {/* ── Public auth pages ── */}
              <Route path="login" element={<Login />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </FinanceProvider>
  );
}
