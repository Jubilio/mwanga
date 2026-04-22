import { Palette, Globe, Zap, Sun, Moon, Bell, AlertTriangle, Calendar, Banknote, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TabPreferences({ 
  form, 
  setFormDirty, 
  state, 
  dispatch, 
  pushProps, 
  showToast 
}) {
  const { t } = useTranslation();
  const { 
    enablePush, 
    disablePush, 
    isPushLoading, 
    isSubscribed, 
    isSupported, 
    permission 
  } = pushProps;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="glass-card p-10 border-t-4 border-amber-500">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Palette size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black font-serif text-slate-800">{t('settings.pref.title')}</h2>
            <p className="text-sm text-slate-500">{t('settings.pref.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                <Globe size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{t('settings.pref.region_section')}</h3>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.pref.currency_label')}</label>
              <select
                value={form.currency}
                onChange={(e) => setFormDirty(f => ({ ...f, currency: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-teal-500/40 transition-all appearance-none cursor-pointer font-medium"
              >
                <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="MT">MT — Metical Moçambicano</option>
                <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="USD">USD — Dólar Americano</option>
                <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="EUR">EUR — Euro</option>
                <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="ZAR">ZAR — Rand Sul-Africano</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Zap size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{t('settings.pref.personalization_section')}</h3>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.pref.reset_day_label')}</label>
              <select
                value={form.cycle_start}
                onChange={(e) => setFormDirty(f => ({ ...f, cycle_start: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer font-medium"
              >
                {[...Array(31)].map((_, i) => (
                  <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={i + 1} value={i + 1}>{t('settings.pref.reset_day_option', { day: i + 1 })}</option>
                ))}
              </select>
            </div>

            <div
              onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-white transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${state.darkMode ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {state.darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <span className="text-xs font-bold text-slate-700">{t('settings.pref.dark_mode_label')}</span>
              </div>
              <div className={`w-10 h-5 rounded-full p-1 relative transition-colors ${state.darkMode ? 'bg-teal-500' : 'bg-slate-300'}`}>
                <div className={`w-3 h-3 rounded-full bg-white transition-all ${state.darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#0a4d68,#088395)] p-1 text-white shadow-[0_16px_40px_rgba(10,120,104,0.18)]">
          <div className="bg-white/5 backdrop-blur-3xl rounded-[1.4rem] p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-8">
              <div className="flex-1 min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.11em]">
                  <Bell size={12} /> {t('settings.pref.push.tag')}
                </div>
                <h5 className="text-sm font-black uppercase tracking-[0.11em]">{t('settings.pref.push.title')}</h5>
                <p className="mt-2 text-[12px] text-white/75 leading-relaxed">
                  {t('settings.pref.push.description')}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={!isSupported || isPushLoading}
                  onClick={async () => {
                    try {
                      await enablePush();
                      showToast(t('settings.toasts.push_enabled'), 'success');
                    } catch (error) {
                      if (error.message === 'BLOCKED_BY_BROWSER') {
                        showToast(t('settings.toasts.push_blocked'), 'error');
                      } else {
                        showToast(t('settings.toasts.push_error'), 'error');
                      }
                    }
                  }}
                  className="rounded-2xl bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-ocean hover:bg-slate-50 transition-all disabled:opacity-50 shadow-xl"
                >
                  {isSubscribed ? t('settings.pref.push.btn_on') : t('settings.pref.push.btn_off')}
                </button>
                {isSubscribed && (
                  <button
                    type="button"
                    onClick={disablePush}
                    className="px-6 py-2 text-[10px] font-bold text-white/50 hover:text-white transition-colors"
                  >
                    {t('settings.pref.push.disable_btn')}
                  </button>
                )}
              </div>
            </div>

            {permission === 'denied' && (
              <div className="mb-8 flex items-start gap-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 text-white animate-pulse-slow">
                <div className="shrink-0 p-3 rounded-xl bg-amber-500/20 text-amber-300">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h6 className="text-[12px] font-black uppercase tracking-widest text-amber-200 mb-1">
                    {t('settings.pref.push.blocked_title')}
                  </h6>
                  <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                    {t('settings.pref.push.blocked_desc')}
                  </p>
                </div>
              </div>
            )}

            {/* ═══ GRANULAR CONTROLS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-6">
              {/* Lembrete Diário */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-teal-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('settings.pref.push.daily_reminder')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.daily_entry_reminder_enabled}
                    onChange={(e) => setFormDirty(f => ({ ...f, daily_entry_reminder_enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={form.daily_entry_reminder_time}
                    onChange={(e) => setFormDirty(f => ({ ...f, daily_entry_reminder_time: e.target.value }))}
                    disabled={!form.daily_entry_reminder_enabled}
                    className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-teal-400 disabled:opacity-30"
                  />
                  <span className="text-[9px] text-white/40 italic">{t('settings.pref.push.daily_reminder_tip')}</span>
                </div>
              </div>

              {/* Lembrete Mensal */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Banknote size={14} className="text-amber-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('settings.pref.push.commitments')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.monthly_due_reminder_enabled}
                    onChange={(e) => setFormDirty(f => ({ ...f, monthly_due_reminder_enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={form.monthly_due_reminder_time}
                    onChange={(e) => setFormDirty(f => ({ ...f, monthly_due_reminder_time: e.target.value }))}
                    disabled={!form.monthly_due_reminder_enabled}
                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-teal-400 disabled:opacity-30"
                  />
                  <select
                    value={form.monthly_due_reminder_period}
                    onChange={(e) => setFormDirty(f => ({ ...f, monthly_due_reminder_period: e.target.value }))}
                    disabled={!form.monthly_due_reminder_enabled}
                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-teal-400 disabled:opacity-30 uppercase tracking-tighter"
                  >
                    <option value="inicio" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white bg-ocean">{t('settings.pref.push.period_start')}</option>
                    <option value="fim" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white bg-ocean">{t('settings.pref.push.period_end')}</option>
                  </select>
                </div>
              </div>

              {/* Lembrete de Dívidas */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-rose-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('settings.pref.push.debt_reminder')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.debt_due_reminder_enabled}
                    onChange={(e) => setFormDirty(f => ({ ...f, debt_due_reminder_enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/40 italic">{t('settings.pref.push.debt_reminder_tip')}</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[9px] text-white/30 text-center uppercase tracking-[0.2em]">
              {t('settings.pref.push.ai_sync')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
