import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './hooks/useFinanceStore';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Habitacao from './pages/Habitacao';
import Goals from './pages/Goals';
import Simulators from './pages/Simulators';
import Reports from './pages/Reports';
import Patrimony from './pages/Patrimony';
import Xitique from './pages/Xitique';
import NexoVibe from './pages/NexoVibe';
import SmsImport from './pages/SmsImport';
import Settings from './pages/Settings';
import Dividas from './pages/Dividas';
import Credito from './pages/Credito';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import Insights from './pages/Insights';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Help from './pages/Help';
import { useFinance } from './hooks/useFinance';
import { Navigate } from 'react-router-dom';

function RequireAuth({ children }) {
  const { state } = useFinance();
  const token = localStorage.getItem('mwanga-token');
  
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
  
  return children;
}

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
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
          </Route>

          {/* ── Public auth pages ── */}
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    </FinanceProvider>
  );
}
