import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { FinanceProvider } from './hooks/useFinanceStore';
import Layout from './components/Layout';
import { useFinance } from './hooks/useFinance';

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
const Help = lazy(() => import('./pages/Help'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'));

import { useSmsSync } from './hooks/useSmsSync';

function PageLoader() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">M</div>
      <div className="loading-text">Mwanga ✦</div>
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
      <div className="loading-logo">M</div>
      <div className="loading-text">Mwanga ✦</div>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#4a5568', fontFamily: 'var(--font-body)' }}>
        Sincronizando dados financeiros...
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Main App (financial) ── */}

            
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="transacoes" element={<Transactions />} />
              <Route path="orcamento" element={<Budget />} />
              <Route path="habitacao" element={<Habitacao />} />
              <Route path="xitique" element={<Xitique />} />
              <Route path="metas" element={<Goals />} />
              <Route path="dividas" element={<Dividas />} />
              <Route path="credito" element={<Credito />} />
              <Route path="simuladores" element={<Simulators />} />
              <Route path="relatorio" element={<Reports />} />
              <Route path="patrimonio" element={<Patrimony />} />
              <Route path="sms-import" element={<SmsImport />} />
              <Route path="nexovibe" element={<NexoVibe />} />
              <Route path="settings" element={<Settings />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="insights" element={<Insights />} />
              <Route path="help" element={<Help />} />
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
      </BrowserRouter>
    </FinanceProvider>
  );
}
