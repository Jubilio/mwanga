import { ui, useUiLanguage } from './utils/uiTranslation';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { FinanceProvider } from './hooks/useFinanceStore';
import AppSplash from './components/AppSplash';
import Layout from './components/Layout';
import { useFinance } from './hooks/useFinance';
import ErrorBoundary from './components/ErrorBoundary';
import Lenis from 'lenis';
import { MwangaTooltipProvider } from './components/ui/MwangaTooltip';
import { Capacitor } from '@capacitor/core';
import { LEGACY_REDIRECTS } from './config/navigation';

// Critical path — loaded immediately
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Lazy-loaded pages — only downloaded when navigated to

const Transactions = lazy(() => import('./pages/Transactions'));
const RealityReview = lazy(() => import('./pages/RealityReview'));
const Simulators = lazy(() => import('./pages/Simulators'));
const Reports = lazy(() => import('./pages/Reports'));
const Patrimony = lazy(() => import('./pages/Patrimony'));
const Xitique = lazy(() => import('./pages/Xitique'));
const NexoVibe = lazy(() => import('./pages/NexoVibe'));
const SmsImport = lazy(() => import('./pages/SmsImport'));
const Settings = lazy(() => import('./pages/Settings'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Insights = lazy(() => import('./pages/Insights'));
const Stewardship = lazy(() => import('./pages/Stewardship'));
const Help = lazy(() => import('./pages/Help'));
const Landing = lazy(() => import('./pages/Landing'));
const Download = lazy(() => import('./pages/Download'));
const Planear = lazy(() => import('./pages/Planear'));
const Mais = lazy(() => import('./pages/Mais'));
const GoalsHub = lazy(() => import('./pages/hubs').then((m) => ({ default: m.GoalsHub })));
const DebtsHub = lazy(() => import('./pages/hubs').then((m) => ({ default: m.DebtsHub })));
const BudgetHub = lazy(() => import('./pages/hubs').then((m) => ({ default: m.BudgetHub })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'));
const AdminEmails = lazy(() => import('./pages/AdminEmails'));

import { useSmsSync } from './hooks/useSmsSync';
import { getToken } from './utils/authToken';
import { FINANCIAL_QUOTE_TEXTS } from './utils/financialQuotes';

const FINANCIAL_QUOTES = FINANCIAL_QUOTE_TEXTS.map(quote => ui(quote));

function PageLoader() {
  useUiLanguage();
  const [quote] = useState(() => FINANCIAL_QUOTES[Math.floor(Math.random() * FINANCIAL_QUOTES.length)]);

  return (
    <div className="loading-screen animate-fade-in" style={{ animationDuration: '0.5s' }}>
      <div className="glass-loading-card">
        <div className="loading-logo-container">
          <img src="/splash-premium.png" alt="Mwanga Logo" className="loading-image" />
        </div>
        <div className="loading-brand">Mwanga ✦</div>
        <div className="loading-quote">"{ui(quote)}"</div>
        <div className="loading-progress-track">
          <div className="loading-progress-fill"></div>
        </div>
      </div>
    </div>
  );
}

function SmsManager() {
  useUiLanguage();
  useSmsSync();
  return null;
}

function RequireAuth({ children }) {
  useUiLanguage();
  const { state } = useFinance();
  const loc = useLocation();
  const token = getToken();
  // Fast synchronous check — written by Onboarding on completion.
  // This prevents a flash-redirect while the API is still loading.
  const hasOnboarded = localStorage.getItem('mwanga-onboarded') === 'true';
  const [quote] = useState(() => FINANCIAL_QUOTES[Math.floor(Math.random() * FINANCIAL_QUOTES.length)]);

  if (state.loading) return (
    <div className="loading-screen animate-fade-in" style={{ animationDuration: '0.5s' }}>
      <div className="glass-loading-card">
        <div className="loading-logo-container">
          <img src="/splash-premium.png" alt="Mwanga Logo" className="loading-image" />
        </div>
        <div className="loading-brand">Mwanga ✶</div>
        <div className="loading-quote">
          "{ui(quote)}"
        </div>
        <div className="loading-progress-track">
          <div className="loading-progress-fill"></div>
        </div>
        <div className="loading-status-text"> {ui("Sincronizando dados financeiros...")} </div>
      </div>
    </div>
  );
  // Web visitors without a session see the public page first; the native app goes straight to login.
  if (!token) return <Navigate to={Capacitor.isNativePlatform() ? '/login' : '/bem-vindo'} replace />;

  return (
    <>
      <SmsManager />
      {children}
    </>
  );
}

export default function App() {
  useUiLanguage();
  // ── Lenis: Scroll suave global para toda a aplicação ──────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      // Let scrollable cards, modals and sheets scroll themselves. Without this the
      // wheel moved the page behind an open modal and its save button stayed out of reach.
      allowNestedScroll: true,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <MwangaTooltipProvider>
    <FinanceProvider>
      <AppSplash />
      <BrowserRouter>
        <ErrorBoundary context={ui("Aplicação")}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Main App (financial) ── */}
              <Route element={<RequireAuth><Layout /></RequireAuth>}>
                <Route index element={<ErrorBoundary context="Dashboard"><Dashboard /></ErrorBoundary>} />
                <Route path="transacoes" element={<ErrorBoundary context={ui("Transações")}><Transactions /></ErrorBoundary>} />
                <Route path="orcamento" element={<ErrorBoundary context={ui("Orçamento")}><BudgetHub /></ErrorBoundary>} />
                <Route path="habitacao" element={<Navigate to={LEGACY_REDIRECTS['/habitacao']} replace />} />
                <Route path="xitique" element={<ErrorBoundary context="Xitique"><Xitique /></ErrorBoundary>} />
                <Route path="metas" element={<ErrorBoundary context={ui("Metas")}><GoalsHub /></ErrorBoundary>} />
                <Route path="dividas" element={<ErrorBoundary context={ui("Dívidas")}><DebtsHub /></ErrorBoundary>} />
                <Route path="credito" element={<Navigate to={LEGACY_REDIRECTS['/credito']} replace />} />
                <Route path="simuladores" element={<ErrorBoundary context={ui("Simuladores")}><Simulators /></ErrorBoundary>} />
                <Route path="rever-realidade" element={<RealityReview />} />
                <Route path="jornada" element={<Navigate to={LEGACY_REDIRECTS['/jornada']} replace />} />
                <Route path="relatorio" element={<ErrorBoundary context={ui("Relatórios")}><Reports /></ErrorBoundary>} />
                <Route path="patrimonio" element={<ErrorBoundary context={ui("Património")}><Patrimony /></ErrorBoundary>} />
                <Route path="sms-import" element={<ErrorBoundary context="SMS Import"><SmsImport /></ErrorBoundary>} />
                <Route path="nexovibe" element={<ErrorBoundary context="NexoVibe"><NexoVibe /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary context={ui("Definições")}><Settings /></ErrorBoundary>} />
                <Route path="pricing" element={<ErrorBoundary context="Pricing"><Pricing /></ErrorBoundary>} />
                <Route path="insights" element={<ErrorBoundary context={ui("Insights")}><Insights /></ErrorBoundary>} />
                <Route path="mordomia" element={<ErrorBoundary context={ui("Mordomia")}><Stewardship /></ErrorBoundary>} />
                <Route path="time-machine" element={<Navigate to={LEGACY_REDIRECTS['/time-machine']} replace />} />
                <Route path="help" element={<ErrorBoundary context="Ajuda"><Help /></ErrorBoundary>} />
                <Route path="planear" element={<ErrorBoundary context="Planear"><Planear /></ErrorBoundary>} />
                <Route path="mais" element={<ErrorBoundary context="Mais"><Mais /></ErrorBoundary>} />
                <Route path="quick-add" element={<Dashboard />} />
              </Route>

              {/* ── Admin Portal (isolated) ── */}
              <Route path="admin/login" element={<AdminLogin />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Admin />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="emails" element={<AdminEmails />} />
              </Route>

              {/* ── Public auth pages ── */}
              <Route path="bem-vindo" element={<Landing />} />
              <Route path="baixar" element={<Download />} />
              <Route path="login" element={<Login />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </FinanceProvider>
    </MwangaTooltipProvider>
  );
}
