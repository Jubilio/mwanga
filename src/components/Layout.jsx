import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Home,
  Target,
  PieChart,
  Calculator,
  Moon,
  Sun,
  X,
  Wallet,
  Globe,
  Settings as SettingsIcon,
  Landmark,
  BarChart3,
  Crown,
  Brain,
  Bell,
  CreditCard,
  Sparkles,
  Info,
  HelpCircle,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';
import Toast, { useToast } from './Toast';
import Sidebar from './layout/Sidebar';
import CustomCursor from './CustomCursor';
import ConfirmModal from './ConfirmModal';
import FeedbackModal from './FeedbackModal';
import QuickAddNotificationModal from './QuickAddNotificationModal';
import InstallBanner from './InstallBanner';
import { usePWA } from '../hooks/usePWA';
import { useTranslation } from 'react-i18next';

  // Dynamic items will be generated inside the component using t()

const notificationTypePriority = {
  warning: 1,
  reminder: 2,
  motivation: 3,
  success: 4,
  info: 5,
};

function getNotificationPresentation(notification = {}) {
  const actionPayload = notification.action_payload || {};
  const quickActions = Array.isArray(actionPayload.quickActions) ? actionPayload.quickActions.slice(0, 3) : [];

  if (notification.type === 'warning') {
    return {
      label: 'Pressão',
      borderClass: 'border-l-4 border-l-amber-500',
      accentClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
      chipClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
      quickActions,
    };
  }

  if (notification.type === 'motivation' || notification.type === 'success') {
    return {
      label: 'Momentum',
      borderClass: 'border-l-4 border-l-emerald-500',
      accentClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
      chipClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
      quickActions,
    };
  }

  return {
    label: 'Check-in',
    borderClass: 'border-l-4 border-l-sky-500',
    accentClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    chipClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
    quickActions,
  };
}

function parseNotificationPayload(payload = {}) {
  return {
    notificationId: payload.notificationId || null,
    actionId: payload.actionId || payload.action || 'OPEN',
    date: payload.date || new Date().toISOString().slice(0, 10),
    route: payload.route || ((payload.date || payload.actionId || payload.action) ? '/quick-add' : null),
  };
}

export default function Layout() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const { toast, showToast } = useToast();
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('layout.dashboard') },
    { to: '/transacoes', icon: ArrowRightLeft, label: t('layout.transactions') },
    { to: '/orcamento', icon: PieChart, label: t('layout.budget') },
    { to: '/credito', icon: CreditCard, label: t('layout.credit') },
    { to: '/dividas', icon: CreditCard, label: t('layout.debts') },
    { to: '/habitacao', icon: Home, label: t('layout.housing') },
    { to: '/xitique', icon: Wallet, label: t('layout.xitique') },
    { to: '/metas', icon: Target, label: t('layout.goals') },
    { to: '/nexovibe', icon: Globe, label: t('layout.nexovibe') },
    { to: '/insights', icon: Brain, label: t('layout.insights') },
    { to: '/sms-import', icon: Globe, label: t('layout.sms_import') },
    { to: '/patrimonio', icon: Landmark, label: t('layout.patrimony') },
    { to: '/simuladores', icon: Calculator, label: t('layout.simulators') },
    { to: '/relatorio', icon: BarChart3, label: t('layout.report') },
    { to: '/pricing', icon: Crown, label: t('layout.pricing') || 'Premium', premium: true },
    { to: '/help', icon: HelpCircle, label: t('layout.help') },
    { to: '/settings', icon: SettingsIcon, label: t('layout.settings') },
  ];

  const bottomNavItems = [
    { to: '/', icon: LayoutDashboard, label: t('layout.home') || 'Home' },
    { to: null, icon: Plus, label: t('layout.add') || 'Add', isFab: true },
    { to: '/dividas', icon: CreditCard, label: t('layout.debts') },
  ];

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [quickAddPayload, setQuickAddPayload] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { installPrompt } = usePWA();
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('mwanga-token');
      if (!token) {
        setNotifications([]);
        return;
      }

      try {
        const response = await api.get('/notifications');
        setNotifications(response.data || []);
      } catch (error) {
        if (error.response?.status === 401) {
          setNotifications([]);
          return;
        }

        if (error.response?.status !== 429) {
          console.error('Error fetching notifications:', error);
        }
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handler = (event) => {
      if (
        event.data?.type !== 'MWANGA_NOTIFICATION_ACTION' &&
        event.data?.type !== 'NOTIFICATION_INTERACTION'
      ) {
        return;
      }

      const payloadData = event.data.payload || event.data.data || {};
      const payload = parseNotificationPayload({
        ...payloadData,
        actionId: event.data.action || payloadData.actionId || payloadData.action,
      });

      if (payload.notificationId) {
        setNotifications((current) => current.map((item) => (
          item.id === payload.notificationId ? { ...item, read: 1, opened_at: new Date().toISOString() } : item
        )));
      }
      setQuickAddPayload(payload);
      if (payload.notificationId) {
        api.post('/notifications/interactions', {
          notificationId: payload.notificationId,
          interaction: 'opened',
          actionId: payload.actionId,
        }).catch(() => {});
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const orderedNotifications = [...notifications].sort((a, b) => {
    const unreadDelta = Number(Boolean(a.read)) - Number(Boolean(b.read));
    if (unreadDelta !== 0) {
      return unreadDelta;
    }

    const aPriority = notificationTypePriority[a.type] || 99;
    const bPriority = notificationTypePriority[b.type] || 99;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const currentTitle = navItems.find((item) => item.to === location.pathname)?.label || 'Dashboard';
  const routeParams = location.pathname === '/quick-add' ? new URLSearchParams(location.search) : null;
  const routeQuickAddPayload = routeParams
    ? parseNotificationPayload({
        notificationId: routeParams.get('notificationId') ? Number(routeParams.get('notificationId')) : null,
        actionId: routeParams.get('action') || 'OPEN',
        date: routeParams.get('date') || new Date().toISOString().slice(0, 10),
        route: '/quick-add',
      })
    : null;
  const activeQuickAddPayload = quickAddPayload || routeQuickAddPayload;

  useEffect(() => {
    if (!routeQuickAddPayload?.notificationId) {
      return;
    }

    // Check if we actually need to update to avoid cascading renders
    const alreadyRead = notifications.find(n => n.id === routeQuickAddPayload.notificationId)?.read;
    if (!alreadyRead) {
      setNotifications((current) => current.map((item) => (
        item.id === routeQuickAddPayload.notificationId
          ? { ...item, read: 1, opened_at: new Date().toISOString() }
          : item
      )));

      api.post('/notifications/interactions', {
        notificationId: routeQuickAddPayload.notificationId,
        interaction: 'opened',
        actionId: routeQuickAddPayload.actionId,
      }).catch(() => {});
    }
  }, [location.pathname, location.search, routeQuickAddPayload?.notificationId, routeQuickAddPayload?.actionId, notifications]);

  // ─── PWA Badging & Daily Check ───
  useEffect(() => {
    const checkDailySpending = async () => {
      if (!('setAppBadge' in navigator)) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const hasAddedToday = state.transacoes.some(t => {
        const tDate = t.data?.slice(0, 10);
        return tDate === todayStr;
      });

      const now = new Date();
      const currentHour = now.getHours();
      
      // Threshold: 19:00 (7 PM)
      const isPastAlertTime = currentHour >= 19;
      
      if (!hasAddedToday && isPastAlertTime) {
        navigator.setAppBadge?.(1).catch(() => {});
        
        // Swap favicon to red version
        const favicon = document.getElementById('favicon');
        if (favicon) {
          favicon.setAttribute('href', '/favicon-alert.png');
        }
        
        // Try to trigger a local notification if supported and permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          const todayStr = new Date().toISOString().split('T')[0];
          const lastNotified = localStorage.getItem('mwanga-last-daily-alert');
          if (lastNotified !== todayStr) {
            new Notification('Mwanga ✦ Lembrete', {
              body: 'Ainda não registaste os teus gastos de hoje. Que tal fazê-lo agora?',
              icon: '/favicon.png'
            });
            localStorage.setItem('mwanga-last-daily-alert', todayStr);
          }
        }
      } else {
        navigator.clearAppBadge?.().catch(() => {});
        
        // Restore normal favicon
        const favicon = document.getElementById('favicon');
        if (favicon) {
          favicon.setAttribute('href', '/favicon-v4.png');
        }
      }
    };

    // Request notification permission on first load if not determined
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkDailySpending();
    
    const interval = setInterval(checkDailySpending, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state.transacoes]);

  async function handleMarkRead(id) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((current) => current.map((item) => (
        item.id === id ? { ...item, read: 1 } : item
      )));
    } catch (error) {
      console.error(error);
    }
  }

  async function handleNotificationOpen(notification) {
    if (!notification.read) {
      await handleMarkRead(notification.id);
    }

    const payload = parseNotificationPayload({
      ...(notification.action_payload || {}),
      notificationId: notification.id,
    });

    if (payload.route === '/quick-add') {
      setQuickAddPayload(payload);
      setIsNotificationsOpen(false);
      return;
    }

    if (payload.route) {
      navigate(payload.route);
      setIsNotificationsOpen(false);
    }
  }

  async function handleClearAll() {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      showToast('Notificações limpas.', 'success');
      setIsConfirmClearOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Erro ao limpar notificações.', 'error');
    }
  }

  async function handleDeleteOne(event, id) {
    event.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
    }
  }

  function closeQuickAddModal() {
    setQuickAddPayload(null);
    if (location.pathname === '/quick-add') {
      navigate('/', { replace: true });
    }
  }

  function getNotificationIcon(type = '') {
    if (type.includes('renda')) return <Home size={14} className="text-blue-500" />;
    if (type.includes('meta')) return <Target size={14} className="text-green-500" />;
    if (type.includes('divida')) return <CreditCard size={14} className="text-red-500" />;
    if (type === 'warning') return <Bell size={14} className="text-amber-500" />;
    if (type === 'motivation') return <Sparkles size={14} className="text-emerald-500" />;
    return <Info size={14} className="text-ocean dark:text-aurora" />;
  }

  return (
    <div className={`app-container ${state.darkMode ? 'dark transition-colors' : 'transition-colors'}`}>
      <CustomCursor />

      <div className={`fixed inset-0 z-100 transition-opacity duration-300 ${isNotificationsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 backdrop-blur-xs opacity-20 bg-linear-to-b from-transparent to-black/20" onClick={() => setIsNotificationsOpen(false)} />
        <div
          className={`absolute right-0 top-0 h-full w-80 border-l border-white/10 bg-white p-6 shadow-2xl transition-transform duration-300 dark:bg-[#1a1a1a] ${isNotificationsOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ willChange: 'transform' }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
              <Bell size={20} className="text-ocean dark:text-aurora" /> Notificações
            </h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={() => setIsConfirmClearOpen(true)}
                  className="mr-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-coral"
                >
                  Limpar Tudo
                </button>
              )}
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="custom-scrollbar max-h-[calc(100vh-150px)] space-y-4 overflow-y-auto pr-2">
            {orderedNotifications.length === 0 ? (
              <p className="py-10 text-center italic text-gray-500">Nenhuma notificação por agora.</p>
            ) : (
              orderedNotifications.map((notification) => {
                const presentation = getNotificationPresentation(notification);

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationOpen(notification)}
                    className={`group relative cursor-pointer rounded-2xl border p-4 transition-all ${presentation.borderClass} ${
                      notification.read
                        ? 'border-black/5 bg-black/2 opacity-60 dark:border-white/5 dark:bg-white/2'
                        : 'border-ocean/20 bg-white shadow-lg dark:border-aurora/20 dark:bg-[#122331]'
                    }`}
                  >
                    <button
                      onClick={(event) => handleDeleteOne(event, notification.id)}
                      className="absolute right-2 top-2 rounded-full p-1 opacity-0 transition-opacity hover:bg-red-500/10 group-hover:opacity-100"
                    >
                      <X size={12} className="text-gray-400 hover:text-red-500" />
                    </button>

                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${presentation.accentClass}`}>
                            {getNotificationIcon(notification.type)}
                            {presentation.label}
                          </span>
                          {!notification.read && (
                            <span className="inline-flex rounded-full bg-coral/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-coral">
                              Novo
                            </span>
                          )}
                        </div>
                        <div className="pr-4 text-sm font-bold text-slate-800 dark:text-white">
                          {notification.title || 'Mwanga'}
                        </div>
                      </div>
                      {!notification.read && <div className="h-2 w-2 shrink-0 rounded-full bg-ocean animate-pulse dark:bg-aurora" />}
                    </div>

                    <p className="pr-4 text-sm leading-6 text-gray-700 dark:text-gray-200">{notification.message}</p>

                    {presentation.quickActions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {presentation.quickActions.map((item, idx) => (
                          <span
                            key={`${notification.id}-${item?.title || item}-${idx}`}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${presentation.chipClass}`}
                          >
                            {item?.title || item}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="mt-3 block text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/80 px-5 pt-[calc(0.75rem+var(--sat))] pb-3 backdrop-blur-lg transition-all duration-300 dark:border-slate-800 dark:bg-midnight/90">
            <div className="min-w-0 flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="h-10 w-10 shrink-0 rounded-2xl bg-linear-to-br from-ocean to-sky text-white shadow-lg shadow-ocean/20 transition-transform hover:scale-105 active:scale-95"
              >
                {state.user?.name?.charAt(0) || 'M'}
              </button>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Mwanga Finance</span>
                <span className="block truncate text-base font-extrabold leading-tight text-midnight dark:text-white">
                  {currentTitle}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                className="relative rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => setIsNotificationsOpen(true)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral" />}
              </button>
              <button
                className="rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
              >
                {state.darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </header>

          <main className="flex w-full max-w-full flex-1 flex-col overflow-hidden bg-cream pb-[calc(6rem+var(--sab))] dark:bg-midnight md:pb-8">
            <div className="flex w-full flex-1 flex-col p-4 pt-6 md:p-8">
              <Outlet context={{ showToast }} />
            </div>
          </main>
        </div>
      </div>

      <nav className="hide-desktop fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t border-black/5 bg-white/80 pb-[calc(0.75rem+var(--sab))] pt-3 backdrop-blur-2xl dark:border-white/5 dark:bg-midnight/90">
        {bottomNavItems.map((item) => {
          if (item.isFab) {
            return (
              <div key="fab-container" className="relative flex flex-col items-center">
                <div className="fab-container">
                  <button
                    onClick={() => setQuickAddPayload({ actionId: 'OPEN', route: '/quick-add' })}
                    className="fab-button"
                  >
                    <Plus size={32} strokeWidth={3} />
                  </button>
                </div>
                <div className="h-8" />
                <span className="text-[9px] font-black uppercase tracking-wider text-ocean dark:text-sky">Adicionar</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'scale-110 text-ocean dark:text-sky' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative rounded-2xl p-2 ${isActive ? 'bg-ocean/10 dark:bg-sky/10' : ''}`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <InstallBanner
        installPrompt={installPrompt}
        onClose={() => setShowInstallBanner(false)}
        visible={showInstallBanner}
      />

      <QuickAddNotificationModal
        isOpen={Boolean(activeQuickAddPayload)}
        payload={activeQuickAddPayload}
        onClose={closeQuickAddModal}
        showToast={showToast}
      />

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} />

      <ConfirmModal
        isOpen={isConfirmClearOpen}
        title="Limpar Notificações?"
        message="Esta ação irá eliminar permanentemente todos os lembretes e alertas. Tens a certeza?"
        confirmText="Sim, Limpar Tudo"
        cancelText="Não, Manter"
        onConfirm={handleClearAll}
        onCancel={() => setIsConfirmClearOpen(false)}
      />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        showToast={showToast}
      />

      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsFeedbackModalOpen(true)}
        className="fixed bottom-24 right-4 z-49 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-ocean/90 text-white shadow-xl shadow-ocean/30 backdrop-blur-md transition-all hover:scale-110 hover:bg-ocean active:scale-95 dark:border-white/10 dark:bg-aurora/90 dark:shadow-aurora/20 md:bottom-8 md:right-8"
        title="Enviar Feedback ou Reportar Erro"
      >
        <MessageSquare size={20} className="animate-pulse" />
      </button>
    </div>
  );
}
