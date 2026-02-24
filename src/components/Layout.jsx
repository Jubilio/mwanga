import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, ArrowRightLeft, Home, Target, 
  PieChart, Calculator, Moon, Sun, Menu, X, Wallet, Globe, Settings as SettingsIcon,
  Landmark, BarChart3, Crown, Brain, Bell
} from 'lucide-react';
import { useFinance } from '../hooks/useFinanceStore';
import { getCurrentMonthLabel } from '../utils/calculations';
import api from '../utils/api';
import { usePWAInstall } from '../hooks/usePWAInstall';
import Toast from './Toast';
import { useToast } from './Toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transacoes', icon: ArrowRightLeft, label: 'Transações' },
  { to: '/orcamento', icon: PieChart, label: 'Orçamento' },
  { to: '/habitacao', icon: Home, label: 'Habitação' },
  { to: '/xitique', icon: Wallet, label: 'Xitique' },
  { to: '/metas', icon: Target, label: 'Metas' },
  { to: '/insights', icon: Brain, label: 'Binth Insights' },
  { to: '/patrimonio', icon: Landmark, label: 'Património' },
  { to: '/simuladores', icon: Calculator, label: 'Simuladores' },
  { to: '/nexovibe', icon: Globe, label: 'NEXO VIBE' },
  { to: '/relatorio', icon: BarChart3, label: 'Relatórios' },
  { to: '/pricing', icon: Crown, label: 'Mover para Premium', premium: true },
  { to: '/settings', icon: SettingsIcon, label: 'Definições' },
];

export default function Layout() {
  const { state, dispatch } = useFinance();
  const { toast, showToast } = useToast();
  const { isInstallable, installApp } = usePWAInstall();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: 1 } : n));
    } catch (error) { console.error(error); }
  };

  return (
    <div className={`app-container ${state.settings.darkMode ? 'dark transition-colors' : 'transition-colors'}`}>
      {/* Notifications Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isNotificationsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsNotificationsOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white dark:bg-[#1a1a1a] border-l border-white/10 p-6 transform transition-transform duration-300 shadow-2xl ${isNotificationsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-ocean dark:text-aurora" /> Notificações
            </h3>
            <button onClick={() => setIsNotificationsOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><X size={20} /></button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-150px)] pr-2 custom-scrollbar">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-10 italic">Nenhuma notificação por agora.</p>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${n.read ? 'bg-black/2 dark:bg-white/2 border-black/5 dark:border-white/5 opacity-60' : 'bg-ocean/5 dark:bg-aurora/5 border-ocean/30 dark:border-aurora/30 shadow-lg'}`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest text-ocean dark:text-aurora font-bold">{n.type}</span>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-ocean dark:bg-aurora animate-pulse" />}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{n.message}</p>
                  <span className="text-[10px] text-gray-500 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* ═══ SIDEBAR (Desktop) ═══ */}
        <aside
          className={`sidebar-new ${isSidebarOpen ? 'open' : ''} hide-mobile`}
          style={{
            width: '280px',
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            flexShrink: 0,
            zIndex: 50,
            boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
          }}
        >
          <div className="p-6">
            <div className="logo-container mb-10 flex items-center justify-center">
              <div className="logo-icon animate-pulse" style={{ fontSize: '1.5rem', marginRight: '8px' }}>✦</div>
              <div className="logo-text">
                <span className="logo-mwanga font-black text-2xl tracking-tight text-gray-900 dark:text-white">Mwanga</span>
              </div>
            </div>

            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-4">Menu Principal</div>
            <nav className="space-y-2 mb-8">
              {navItems.slice(0, 6).map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-ocean to-sky text-white shadow-md shadow-ocean/20' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:translate-x-1'
                  }`}
                >
                  <item.icon size={18} className={`transition-transform duration-200 ${item.premium ? 'animate-pulse text-gold-deep' : ''} group-hover:scale-110`} />
                  <span className="text-sm font-semibold">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-4">Ferramentas Pro</div>
            <nav className="space-y-2">
              {navItems.slice(6).map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-ocean to-sky text-white shadow-md shadow-ocean/20' 
                      : item.premium 
                        ? 'bg-gradient-to-r from-gold/10 to-transparent text-gold-deep hover:bg-gold/20 font-bold border border-gold/20' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:translate-x-1'
                  }`}
                >
                  <item.icon size={18} className={`transition-transform duration-200 ${item.premium ? 'text-gold-deep drop-shadow-sm' : ''} group-hover:scale-110`} />
                  <span className="text-sm font-semibold">{item.label}</span>
                  {item.premium && <span className="ml-auto text-[9px] bg-gold-deep text-white px-1.5 py-0.5 rounded-md tracking-wider uppercase">Pro</span>}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-5 mx-4 mb-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/2 border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-3 justify-between mb-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-ocean to-sky flex items-center justify-center font-bold text-white shadow-inner shrink-0">
                  {state.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-gray-800 dark:text-white truncate">{state.user?.name || 'Utilizador'}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{state.settings.household_name || 'Família Mwanga'}</div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('mwanga-token'); window.location.reload(); }}
              className="w-full py-1.5 text-xs text-center text-rose-500 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              Terminar Sessão
            </button>
          </div>
        </aside>

        {/* ═══ MOBILE HEADER & CONTENT ═══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-bottom p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="hide-desktop p-2" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                  {navItems.find(i => i.to === location.pathname)?.label || 'Dashboard'}
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{getCurrentMonthLabel()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 relative"
                onClick={() => setIsNotificationsOpen(true)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-coral rounded-full" />}
              </button>
              <button 
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
              >
                {state.settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </header>

          <main className="p-4 md:p-8 w-full flex-1 pb-24 md:pb-8">
            <Outlet context={{ showToast }} />
          </main>
        </div>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="hide-desktop fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-black/5 dark:border-white/5 flex justify-around p-3 z-50">
        {navItems.slice(0, 4).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-ocean' : 'text-gray-400'}`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setIsNotificationsOpen(true)} className="flex flex-col items-center gap-1 text-gray-400 relative">
          <Bell size={20} />
          {unreadCount > 0 && <span className="absolute -top-1 right-0 w-2 h-2 bg-coral rounded-full" />}
          <span className="text-[10px] font-medium">Alertas</span>
        </button>
      </nav>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
