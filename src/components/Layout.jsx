import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, ArrowRightLeft, Home, Target, 
  PieChart, Calculator, Moon, Sun, Menu, X, Wallet, Globe, Settings as SettingsIcon,
  Landmark, BarChart3, Crown, Brain, Bell, CreditCard, Sparkles, Info
} from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';
import Toast, { useToast } from './Toast';
import Sidebar from './layout/Sidebar';
import CustomCursor from './CustomCursor';
import { AnimatePresence, motion } from 'framer-motion';


const bottomNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/transacoes', icon: ArrowRightLeft, label: 'Transações' },
  { to: '/xitique', icon: Wallet, label: 'Xitique' },
  { to: '/credito', icon: CreditCard, label: 'Crédito' },
  { to: '/insights', icon: Brain, label: 'Binth' },
];

const navItems = [
  // GESTÃO FINANCEIRA
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transacoes', icon: ArrowRightLeft, label: 'Transações' },
  { to: '/orcamento', icon: PieChart, label: 'Orçamento' },
  
  // FINANCIAMENTO
  { to: '/credito', icon: CreditCard, label: 'Crédito' },
  { to: '/dividas', icon: CreditCard, label: 'Dívidas' },
  { to: '/habitacao', icon: Home, label: 'Habitação' },
  
  // POUPANÇA & METAS
  { to: '/xitique', icon: Wallet, label: 'Xitique' },
  { to: '/metas', icon: Target, label: 'Metas' },
  { to: '/nexovibe', icon: Globe, label: 'Nexo Vibe' },
  
  // INTELIGÊNCIA PRO
  { to: '/insights', icon: Brain, label: 'Binth Insights' },
  { to: '/sms-import', icon: Globe, label: 'Importar Mensagem' },
  { to: '/patrimonio', icon: Landmark, label: 'Património' },
  { to: '/simuladores', icon: Calculator, label: 'Simuladores' },
  { to: '/relatorio', icon: BarChart3, label: 'Relatórios' },
  
  // SISTEMA
  { to: '/pricing', icon: Crown, label: 'Mover para Premium', premium: true },
  { to: '/settings', icon: SettingsIcon, label: 'Definições' },
];

export default function Layout() {
  const { state, dispatch } = useFinance();
  const { toast, showToast } = useToast();
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
        if (error.response?.status !== 429) {
          console.error('Error fetching notifications:', error);
        }
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentTitle = navItems.find(i => i.to === location.pathname)?.label || 'Dashboard';

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: 1 } : n));
    } catch (error) { console.error(error); }
  };

  const handleClearAll = async () => {
    try {
      if (window.confirm('Tens a certeza que queres eliminar todas as notificações?')) {
        await api.delete('/notifications');
        setNotifications([]);
        showToast('Notificações limpas!', 'success');
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) { console.error(error); }
  };

  const getNotificationIcon = (type) => {
    if (type.includes('renda')) return <Home size={14} className="text-blue-500" />;
    if (type.includes('meta')) return <Target size={14} className="text-green-500" />;
    if (type.includes('divida')) return <CreditCard size={14} className="text-red-500" />;
    if (type === 'warning') return <Bell size={14} className="text-amber-500" />;
    if (type === 'success') return <Sparkles size={14} className="text-emerald-500" />;
    return <Info size={14} className="text-ocean dark:text-aurora" />;
  };

  return (
    <div className={`app-container ${state.darkMode ? 'dark transition-colors' : 'transition-colors'}`}>
      <CustomCursor />
      {/* Notifications Drawer */}
      <div className={`fixed inset-0 z-100 transition-opacity duration-300 ${isNotificationsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={() => setIsNotificationsOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white dark:bg-[#1a1a1a] border-l border-white/10 p-6 transform transition-transform duration-300 shadow-2xl ${isNotificationsOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ willChange: 'transform' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-ocean dark:text-aurora" /> Notificações
            </h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-red-500 transition-colors mr-2"
                >
                  Limpar Tudo
                </button>
              )}
              <button onClick={() => setIsNotificationsOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-150px)] pr-2 custom-scrollbar">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-10 italic">Nenhuma notificação por agora.</p>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`group p-4 rounded-xl border transition-all cursor-pointer relative ${n.read ? 'bg-black/2 dark:bg-white/2 border-black/5 dark:border-white/5 opacity-60' : 'bg-ocean/5 dark:bg-aurora/5 border-ocean/30 dark:border-aurora/30 shadow-lg'}`}
                >
                  <button 
                    onClick={(e) => handleDeleteOne(e, n.id)}
                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded-full"
                  >
                    <X size={12} className="text-gray-400 hover:text-red-500" />
                  </button>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getNotificationIcon(n.type)}
                      <span className="text-[10px] uppercase tracking-widest text-ocean dark:text-aurora font-bold truncate">{n.type.replace('lembrete-', '')}</span>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-ocean dark:bg-aurora animate-pulse shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 pr-4">{n.message}</p>
                  <span className="text-[10px] text-gray-500 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
        {/* ═══ SIDEBAR (Desktop) ═══ */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* ═══ MOBILE HEADER & CONTENT ═══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
          <header className="sticky top-0 z-40 bg-white/70 dark:bg-midnight/80 backdrop-blur-3xl border-b border-white/10 py-3 px-5 flex items-center justify-between transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ocean to-sky flex items-center justify-center shadow-lg shadow-ocean/20 text-white font-bold shrink-0 hover:scale-105 active:scale-95 transition-transform"
              >
                {state.user?.name?.charAt(0) || 'M'}
              </button>
              <div className="min-w-0 flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-black">Mwanga Finance</span>
                <span className="text-midnight dark:text-white font-extrabold text-base truncate leading-tight">
                  {currentTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
                {state.darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </header>

          <main className="w-full flex-1 pb-24 md:pb-8 flex flex-col max-w-full overflow-hidden bg-cream dark:bg-[#0a1926]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full flex-1 flex flex-col p-4 md:p-8 pt-6"
              >
                <Outlet context={{ showToast }} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="hide-desktop fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0a1926]/90 backdrop-blur-2xl border-t border-black/5 dark:border-white/5 flex justify-around p-2 pt-3 pb-6 z-50">
        {bottomNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-ocean dark:text-sky scale-110' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            {({ isActive }) => (
              <>
                <div className={`relative p-2 rounded-2xl ${isActive ? 'bg-ocean/10 dark:bg-sky/10' : ''}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {item.to === '/insights' && <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full" />}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
