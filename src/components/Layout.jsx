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
  Menu,
  ChevronDown,
  Clock,
  Shield,
} from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';
import Toast, { useToast } from './Toast';
import Sidebar from './layout/Sidebar';
import NotificationPanel from './layout/NotificationPanel';
import Header from './layout/Header';
import BottomNavigation from './layout/BottomNavigation';
import CustomCursor from './CustomCursor';
import ConfirmModal from './ConfirmModal';
import FeedbackModal from './FeedbackModal';
import QuickAddNotificationModal from './QuickAddNotificationModal';
import InstallBanner from './InstallBanner';
import { usePWA } from '../hooks/usePWA';
import { useTranslation } from 'react-i18next';
import MwangaLogo from './MwangaLogo';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useSmsSync } from '../hooks/useSmsSync';

  // Dynamic items will be generated inside the component using t()


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
    { to: '/mordomia', icon: Crown, label: 'Mordomia', premium: true },
    { to: '/simuladores', icon: Calculator, label: t('layout.simulators') },
    { to: '/relatorio', icon: BarChart3, label: t('layout.report') },
    { to: '/pricing', icon: Crown, label: t('layout.pricing') || 'Premium', premium: true },
    { to: '/time-machine', icon: Clock, label: 'Máquina do Tempo', premium: true },
    { to: '/help', icon: HelpCircle, label: t('layout.help') },
    { to: '/settings', icon: SettingsIcon, label: t('layout.settings') },
    ...(state.user?.role === 'admin' ? [{ to: '/admin', icon: Shield, label: t('layout.admin') }] : []),
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
  const { enablePush, isSubscribed, isSupported, permission } = usePushNotifications();
  const { syncSms } = useSmsSync(showToast);

  // Auto SMS Sync
  useEffect(() => {
    if (state.settings?.sms_automation_enabled) {
      syncSms(); // Initial sync on load
      
      const intervalId = setInterval(() => {
        syncSms();
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(intervalId);
    }
  }, [state.settings?.sms_automation_enabled, syncSms]);

  // Auto-enable push notifications if possible
  useEffect(() => {
    if (isSupported && !isSubscribed && permission !== 'denied') {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        enablePush().catch(err => {
          // Silently fail for auto-enable to avoid bothering the user with errors
          console.warn('Auto-enable push failed:', err.message);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission, enablePush]);

  useEffect(() => {
    let failCount = 0;
    let timeoutId = null;

    const fetchNotifications = async () => {
      const token = localStorage.getItem('mwanga-token');
      if (!token) {
        setNotifications([]);
        scheduleNext();
        return;
      }

      try {
        const response = await api.get('/notifications');
        setNotifications(response.data || []);
        failCount = 0; // Reset on success
      } catch (error) {
        if (error.response?.status === 401) {
          setNotifications([]);
          scheduleNext();
          return;
        }

        // Silently ignore network-level errors (DNS, offline, Render cold start)
        const errorText = error.message || '';
        const isNetworkError = !error.response || 
          error.code === 'ERR_NETWORK' || 
          errorText.includes('Network Error') || 
          errorText.includes('ERR_NAME_NOT_RESOLVED') ||
          errorText.includes('dns');

        if (!isNetworkError && error.response?.status !== 429) {
          console.error('Notification Error:', error.message);
        }

        failCount++;
      }

      scheduleNext();
    };

    // Back off polling on consecutive failures: 60s → 120s → 240s (max 5 min)
    function scheduleNext() {
      const baseInterval = 60000;
      const backoff = Math.min(baseInterval * Math.pow(2, failCount), 300000);
      timeoutId = setTimeout(fetchNotifications, backoff);
    }

    fetchNotifications();

    // Ping behavior tracking for Active User metrics
    api.post('/behavior/ping').catch(() => {});

    return () => { if (timeoutId) clearTimeout(timeoutId); };
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

  return (
    <div className={`app-container premium-bg ${state.darkMode ? 'dark transition-colors' : 'transition-colors'}`}>
      <CustomCursor />

      <NotificationPanel 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        notifications={notifications} 
        onNotificationOpen={handleNotificationOpen} 
        onDeleteOne={handleDeleteOne} 
        onClearAllClick={() => setIsConfirmClearOpen(true)} 
      />

      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
          <Header 
            onMenuClick={() => setIsSidebarOpen(true)}
            onNotificationClick={() => setIsNotificationsOpen(true)}
            unreadCount={unreadCount}
            darkMode={state.darkMode}
            onToggleDarkMode={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
            user={state.user}
            settings={state.settings}
          />

          <main className="flex w-full max-w-full flex-1 flex-col overflow-hidden bg-cream pb-[calc(6rem+var(--sab))] dark:bg-midnight md:pb-8">
            <div className="flex w-full flex-1 flex-col p-4 pt-6 md:p-8">
              <Outlet context={{ showToast }} />
            </div>
          </main>
        </div>
      </div>

      <BottomNavigation 
        items={bottomNavItems} 
        currentPath={location.pathname} 
        onAddClick={() => setQuickAddPayload({ actionId: 'OPEN', route: '/quick-add' })} 
      />

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
