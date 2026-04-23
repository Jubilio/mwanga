import { X, Bell, Home, Target, CreditCard, Sparkles, Info } from 'lucide-react';

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

function getNotificationIcon(type = '') {
  if (type.includes('renda')) return <Home size={14} className="text-blue-500" />;
  if (type.includes('meta')) return <Target size={14} className="text-green-500" />;
  if (type.includes('divida')) return <CreditCard size={14} className="text-red-500" />;
  if (type === 'warning') return <Bell size={14} className="text-amber-500" />;
  if (type === 'motivation') return <Sparkles size={14} className="text-emerald-500" />;
  return <Info size={14} className="text-ocean dark:text-aurora" />;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onNotificationOpen,
  onDeleteOne,
  onClearAllClick
}) {
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

  return (
    <div className={`fixed inset-0 z-100 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 backdrop-blur-xs opacity-20 bg-linear-to-b from-transparent to-black/20" onClick={onClose} />
      <div
        className={`absolute right-0 top-0 h-full w-80 border-l border-white/10 bg-white p-6 shadow-2xl transition-transform duration-300 dark:bg-[#1a1a1a] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ willChange: 'transform' }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
            <Bell size={20} className="text-ocean dark:text-aurora" /> Notificações
          </h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAllClick}
                className="mr-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-coral"
              >
                Limpar Tudo
              </button>
            )}
            <button
              onClick={onClose}
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
                  onClick={() => onNotificationOpen(notification)}
                  className={`group relative cursor-pointer rounded-2xl border p-4 transition-all ${presentation.borderClass} ${
                    notification.read
                      ? 'border-black/5 bg-black/2 opacity-60 dark:border-white/5 dark:bg-white/2'
                      : 'border-ocean/20 bg-white shadow-lg dark:border-aurora/20 dark:bg-[#122331]'
                  }`}
                >
                  <button
                    onClick={(event) => onDeleteOne(event, notification.id)}
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
  );
}
