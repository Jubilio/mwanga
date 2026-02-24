import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './hooks/useFinanceStore';
import Layout from './components/Layout';
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
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import Insights from './pages/Insights';
import Login from './pages/Login';
import { useFinance } from './hooks/useFinanceStore';
import { Navigate } from 'react-router-dom';

function RequireAuth({ children }) {
  const { state } = useFinance();
  const token = localStorage.getItem('mwanga-token');
  
  if (state.loading) return <div className="loading-screen">Carregando...</div>;
  if (!token) return <Navigate to="/login" replace />;
  
  return children;
}

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="transacoes" element={<Transactions />} />
            <Route path="orcamento" element={<Budget />} />
            <Route path="habitacao" element={<Habitacao />} />
            <Route path="xitique" element={<Xitique />} />
            <Route path="metas" element={<Goals />} />
            <Route path="simuladores" element={<Simulators />} />
            <Route path="relatorio" element={<Reports />} />
            <Route path="patrimonio" element={<Patrimony />} />
            <Route path="nexovibe" element={<NexoVibe />} />
            <Route path="settings" element={<Settings />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="insights" element={<Insights />} />
          </Route>
          <Route path="login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </FinanceProvider>
  );
}
