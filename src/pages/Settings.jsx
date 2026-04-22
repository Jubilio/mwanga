import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  Settings as SettingsIcon, Save, User, Building,
  Wallet, Palette, Bell, Shield, LogOut, Camera,
  Banknote, Calendar, Globe, Mail, CreditCard, Chrome,
  Sun, Moon, Calculator, Check, ChevronRight, Sparkles, Zap,
  Loader2, CloudCheck, Home as HomeIcon, Heart, TrendingUp,
  HelpCircle, AlertTriangle, ShieldAlert
} from 'lucide-react';

const AVATARS = [
  'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&size=128',
  'https://ui-avatars.com/api/?name=Fam&background=20c997&color=fff&size=128',
  'https://ui-avatars.com/api/?name=Mwanga&background=0a4d68&color=fff&size=128',
  'https://ui-avatars.com/api/?name=Admin&background=6c757d&color=fff&size=128',
];

export default function Settings() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const {
    enablePush,
    disablePush,
    isLoading: isPushLoading,
    isSubscribed,
    isSupported,
    permission,
  } = usePushNotifications();
  const [activeTab, setActiveTab] = useState('perfil');
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    user_salary: state.settings.user_salary || 50000,
    default_rent: state.settings.default_rent || 15000,
    landlord_name: state.settings.landlord_name || '',
    household_name: state.settings.household_name || 'A Minha Família',
    user_name: state.user?.name || '',
    currency: state.settings.currency || 'MT',
    cycle_start: state.settings.cycle_start || '1',
    profile_pic: state.settings.profile_pic || AVATARS[0],
    daily_entry_reminder_enabled: state.settings.daily_entry_reminder_enabled ?? true,
    daily_entry_reminder_time: state.settings.daily_entry_reminder_time || '20:00',
    monthly_due_reminder_enabled: state.settings.monthly_due_reminder_enabled ?? true,
    monthly_due_reminder_time: state.settings.monthly_due_reminder_time || '08:00',
    monthly_due_reminder_period: state.settings.monthly_due_reminder_period || 'inicio',
    debt_due_reminder_enabled: state.settings.debt_due_reminder_enabled ?? true,
    cash_balance: state.settings.cash_balance || 0,
    sms_automation_enabled: state.settings.sms_automation_enabled === 'true' || state.settings.sms_automation_enabled === true,
    default_income_account_id: state.settings.default_income_account_id || '',
    default_expense_account_id: state.settings.default_expense_account_id || '',
  });

  const saveTimeoutRef = useRef(null);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates = [];

      if (form.user_name !== state.user?.name) {
        updates.push(dispatch({ type: 'UPDATE_USER', payload: { name: form.user_name } }));
      }

      const settingsToSave = { ...form };
      delete settingsToSave.user_name;

      Object.entries(settingsToSave).map(([key, value]) =>
        updates.push(dispatch({ type: 'UPDATE_SETTING', payload: { key, value } }))
      );

      if (form.household_name !== state.settings.household_name || form.cash_balance !== state.settings.cash_balance) {
        updates.push(dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { name: form.household_name, cash_balance: form.cash_balance } }));
      }

      await Promise.all(updates);
      setLastSaved(new Date());
    } catch {
      showToast(t('settings.toasts.save_error'));
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [form, state.user?.name, state.settings.household_name, state.settings.cash_balance, dispatch, showToast, t]);

  // isDirtyRef is set to true only when the user edits a field.
  // This prevents the auto-save effect from re-firing when state.settings
  // is updated by the API response, which would create an infinite loop.
  const isDirtyRef = useRef(false);

  // Wrap setForm so that any field change marks the form as dirty.
  const setFormDirty = useCallback((updater) => {
    isDirtyRef.current = true;
    setForm(updater);
  }, []);

  const handleImageUpload = (file) => {
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast(t('settings.toasts.img_too_large'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setForm({ ...form, profile_pic: base64 });
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'profile_pic', value: base64 } });
        showToast(t('settings.toasts.img_updated'));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Only auto-save when the user has actually changed something.
    if (!isDirtyRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      isDirtyRef.current = false;
      handleSaveAll();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // Intentionally omitting state.settings from deps — we don't want
    // API responses updating state.settings to trigger another save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const tabs = [
    { id: 'perfil', label: t('settings.tabs.perfil'), icon: User, color: 'indigo' },
    { id: 'financas', label: t('settings.tabs.financas'), icon: Wallet, color: 'teal' },
    { id: 'pref', label: t('settings.tabs.pref'), icon: Palette, color: 'amber' },
  ];

  return (
    <div className="section-fade max-w-6xl mx-auto pb-24">
      {/* ═══ PREMIUM HERO ═══ */}
      <div className="relative mb-10 md:mb-16 animate-in fade-in slide-in-from-top-12 duration-1000">
        <div className="h-auto py-10 md:py-0 md:h-72 rounded-3xl md:rounded-[3.5rem] bg-midnight relative overflow-hidden shadow-[0_40px_80px_-20px_rgba(10,25,38,0.5)] border border-white/5">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 bg-linear-to-br from-ocean/40 via-transparent to-indigo-900/40" />
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-1/2 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
          
          <div className="relative px-6 md:px-12 z-10 h-full flex items-center">
            <div className="flex flex-col md:flex-row items-center gap-10 w-full">
              <div className="relative group shrink-0">
                <div className="w-28 h-28 md:w-40 md:h-40 rounded-3xl md:rounded-[2.5rem] p-1 bg-linear-to-br from-white/20 to-transparent backdrop-blur-2xl border border-white/20 shadow-2xl relative overflow-hidden transition-transform duration-500 group-hover:scale-105">
                  <img
                    src={form.profile_pic}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-[2.2rem]"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setShowAvatarGallery(!showAvatarGallery)}
                      className="p-3 bg-white text-midnight rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform"
                    >
                      <Camera size={24} />
                    </button>
                  </div>
                </div>

                {showAvatarGallery && (
                  <div className="absolute top-full mt-6 left-1/2 -translate-x-1/2 p-6 glass-card shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] z-50 flex gap-4 animate-in fade-in zoom-in-95 duration-300 min-w-[300px]">
                    <div className="grid grid-cols-5 gap-3">
                      {AVATARS.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setFormDirty({ ...form, profile_pic: url });
                            setShowAvatarGallery(false);
                            dispatch({ type: 'UPDATE_SETTING', payload: { key: 'profile_pic', value: url } });
                          }}
                          className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${form.profile_pic === url ? 'border-teal-400 scale-110 shadow-lg shadow-teal-500/20' : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100'}`}
                        >
                          <img src={url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-teal-400 hover:text-teal-400 transition-colors bg-white/5"
                      >
                        <Camera size={20} />
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files[0])}
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-teal-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-3 md:mb-4">
                  <Sparkles size={12} /> {t('settings.hero.premium_account')}
                </div>
                <h1 className="text-3xl md:text-5xl font-black font-serif text-white tracking-tight drop-shadow-2xl mb-2">
                  {form.user_name || t('settings.hero.default_user_name')}
                </h1>
                <p className="text-white/50 text-lg font-medium flex items-center justify-center md:justify-start gap-3">
                  <HomeIcon size={18} className="text-teal-500/50" /> {form.household_name}
                </p>

                <div className="mt-6 md:mt-8 flex items-center justify-center md:justify-start gap-3 md:gap-4">
                  {isSaving ? (
                    <div className="flex items-center gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 text-[10px] md:text-xs font-bold animate-pulse">
                      <Loader2 size={14} className="animate-spin text-teal-400" /> {t('settings.hero.saving')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl bg-teal-500/10 backdrop-blur-xl border border-teal-500/20 text-teal-400 text-[10px] md:text-xs font-bold animate-in fade-in slide-in-from-left-4">
                      <CloudCheck size={14} /> {t('settings.hero.synced')}
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-6">
                <div className="glass-card bg-white/5! border-white/5! p-6 min-w-[140px] text-center backdrop-blur-3xl group">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 group-hover:text-teal-400 transition-colors">{t('settings.hero.currency_label')}</p>
                  <p className="text-2xl font-black font-serif text-white">{form.currency}</p>
                </div>
                <div className="glass-card bg-white/5! border-white/5! p-6 min-w-[140px] text-center backdrop-blur-3xl group">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 group-hover:text-indigo-400 transition-colors">{t('settings.hero.cycle_label')}</p>
                  <p className="text-2xl font-black font-serif text-white">{t('settings.hero.day_label', { day: form.cycle_start })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-md mb-8 max-w-md mx-auto sticky top-20 z-40 border border-white/20 shadow-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-ocean dark:text-teal-400 shadow-md scale-100'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
          >
            <tab.icon size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">

        <div className="lg:col-span-8">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {activeTab === 'perfil' && (
              <div className="space-y-8">
                {/* Subscription Tier Badge */}
                <div className="glass-card bg-gradient-to-r from-gold/10 to-amber-500/10 border-l-4 border-gold p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center text-gold">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Subscription Tier</p>
                        <p className="text-lg font-black text-gold capitalize">{state.settings?.subscription_tier || 'free'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {(state.settings?.subscription_tier === 'pro' || state.settings?.subscription_tier === 'legacy') && (
                        <span className="px-3 py-1 bg-gold/20 text-gold text-xs font-bold rounded-full">✓ ALL FEATURES</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 md:p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                    <User size={120} />
                  </div>

                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black font-serif text-slate-800">{t('settings.perfil.title')}</h2>
                      <p className="text-sm text-slate-500">{t('settings.perfil.subtitle')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                          <User size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">{t('settings.perfil.personal_info')}</h3>
                      </div>

                      <div className="group transition-all">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">{t('settings.perfil.user_name_label')}</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={form.user_name}
                            onChange={(e) => setFormDirty({ ...form, user_name: e.target.value })}
                            className="premium-input"
                            placeholder={t('settings.perfil.user_name_placeholder')}
                          />
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                            <Sparkles size={18} className="text-teal-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                          <HomeIcon size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">{t('settings.perfil.family_info')}</h3>
                      </div>

                      <div className="group transition-all">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">{t('settings.perfil.household_name_label')}</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={form.household_name}
                            onChange={(e) => setFormDirty({ ...form, household_name: e.target.value })}
                            className="premium-input"
                            placeholder={t('settings.perfil.household_name_placeholder')}
                          />
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                            <Heart size={18} className="text-sky-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financas' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="glass-card p-10 border-t-4 border-teal-500">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black font-serif text-slate-800">{t('settings.financas.title')}</h2>
                      <p className="text-sm text-slate-500">{t('settings.financas.subtitle')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-800 tracking-tight">{t('settings.financas.income_section')}</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('settings.financas.income_subtitle')}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="group">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.salary_label')}</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={form.user_salary}
                              onChange={(e) => setFormDirty({ ...form, user_salary: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-teal-600 outline-none focus:border-teal-500/40 transition-all shadow-inner"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              {form.currency}
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 italic px-1">{t('settings.financas.salary_tip')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                          <HomeIcon size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-800 tracking-tight">{t('settings.financas.housing_section')}</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('settings.financas.housing_subtitle')}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="group">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.landlord_label')}</label>
                          <input
                            type="text"
                            value={form.landlord_name}
                            onChange={(e) => setFormDirty({ ...form, landlord_name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-amber-500/40 transition-all font-medium"
                            placeholder={t('settings.financas.landlord_placeholder')}
                          />
                        </div>
                        <div className="group">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.rent_label')}</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={form.default_rent}
                              onChange={(e) => setFormDirty({ ...form, default_rent: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-amber-600 outline-none focus:border-amber-500/40 transition-all shadow-inner"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              {form.currency}
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 italic px-1">{t('settings.financas.rent_tip')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ═══ SMS AUTOMATION & WALLET ═══ */}
                  <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                        <Zap size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-800 tracking-tight">{t('settings.financas.automation_section')}</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('settings.financas.automation_subtitle')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.cash_balance_label')}</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={form.cash_balance}
                            onChange={(e) => setFormDirty({ ...form, cash_balance: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-indigo-600 outline-none focus:border-indigo-500/40 transition-all shadow-inner"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                            {form.currency}
                          </div>
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Conta Padrão (Entradas)</label>
                        <select
                          value={form.default_income_account_id}
                          onChange={(e) => setFormDirty({ ...form, default_income_account_id: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer font-medium"
                        >
                          <option value="">Nenhuma</option>
                          {state.contas?.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Conta Padrão (Despesas)</label>
                        <select
                          value={form.default_expense_account_id}
                          onChange={(e) => setFormDirty({ ...form, default_expense_account_id: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer font-medium"
                        >
                          <option value="">Nenhuma</option>
                          {state.contas?.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div
                        onClick={() => setFormDirty({ ...form, sms_automation_enabled: !form.sms_automation_enabled })}
                        className="flex items-center justify-between p-6 rounded-2xl bg-indigo-50 border border-indigo-100/50 cursor-pointer hover:bg-white transition-all group shadow-sm h-fit"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${form.sms_automation_enabled ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{t('settings.financas.sms_sync_tag')}</p>
                            <span className="text-xs font-bold text-slate-700">{t('settings.financas.sms_sync_label')}</span>
                          </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 relative transition-colors ${form.sms_automation_enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-all ${form.sms_automation_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'pref' && (
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
                          onChange={(e) => setFormDirty({ ...form, currency: e.target.value })}
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
                          onChange={(e) => setFormDirty({ ...form, cycle_start: e.target.value })}
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
                              onChange={(e) => setFormDirty({ ...form, daily_entry_reminder_enabled: e.target.checked })}
                              className="w-4 h-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={form.daily_entry_reminder_time}
                              onChange={(e) => setFormDirty({ ...form, daily_entry_reminder_time: e.target.value })}
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
                              onChange={(e) => setFormDirty({ ...form, monthly_due_reminder_enabled: e.target.checked })}
                              className="w-4 h-4 rounded border-white/20 bg-transparent text-teal-500 focus:ring-teal-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="time"
                              value={form.monthly_due_reminder_time}
                              onChange={(e) => setFormDirty({ ...form, monthly_due_reminder_time: e.target.value })}
                              disabled={!form.monthly_due_reminder_enabled}
                              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-teal-400 disabled:opacity-30"
                            />
                            <select
                              value={form.monthly_due_reminder_period}
                              onChange={(e) => setFormDirty({ ...form, monthly_due_reminder_period: e.target.value })}
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
                              onChange={(e) => setFormDirty({ ...form, debt_due_reminder_enabled: e.target.checked })}
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
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">

          {/* Tooltip Card */}
          <div className="glass-card p-8 bg-ocean text-white overflow-hidden relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-6">{t('settings.sidebar.account_status')}</h3>

            <div className="space-y-5 relative z-10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{t('settings.sidebar.security_level')}</span>
                <span className="font-black text-teal-400">{t('settings.sidebar.security_value')}</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="w-[85%] bg-teal-400 h-full rounded-full" />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Shield size={20} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-xs font-bold">{t('settings.sidebar.protection_title')}</p>
                  <p className="text-[10px] text-white/50">{t('settings.sidebar.protection_subtitle')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-8 space-y-4">
            <div className="p-4 rounded-2xl bg-teal-50/10 border border-teal-500/10 text-center mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">{t('settings.sidebar.autosave_tag')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('settings.sidebar.autosave_desc')}</p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/help')}
              className="w-full py-5 rounded-4xl bg-white border border-slate-200 text-ocean font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-slate-50"
            >
              <HelpCircle size={20} /> {t('settings.sidebar.help_btn')}
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`w-full py-5 rounded-4xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSaving ? 'bg-slate-200 text-slate-400' : 'bg-ocean hover:bg-[#088395] text-white shadow-lg'
                }`}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {t('settings.sidebar.sync_btn')}
            </button>

            <button
              type="button"
              onClick={() => { localStorage.removeItem('mwanga-token'); window.location.reload(); }}
              className="w-full py-5 rounded-4xl text-rose-500 font-black text-sm uppercase tracking-widest border-2 border-rose-50 hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> {t('settings.sidebar.logout_btn')}
            </button>
          </div>

          {/* Branding */}
          <div className="text-center px-4">
            <div className="flex items-center justify-center gap-2 mb-3 grayscale opacity-30">
              <Zap size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Nexo Vibe 2026</span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400 uppercase tracking-tighter">
              Sistema Operativo Mwanga v1.5.0 Premium<br />
              Engineering by Maússe, Jubílio
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
