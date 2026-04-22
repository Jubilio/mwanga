import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { User, Wallet, Palette } from 'lucide-react';

// Sub-components
import SettingsHero from '../components/settings/SettingsHero';
import TabPerfil from '../components/settings/TabPerfil';
import TabFinancas from '../components/settings/TabFinancas';
import TabPreferences from '../components/settings/TabPreferences';
import SettingsSidebar from '../components/settings/SettingsSidebar';

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
  const pushProps = usePushNotifications();
  
  const [activeTab, setActiveTab] = useState('perfil');
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const isDirtyRef = useRef(false);
  const saveTimeoutRef = useRef(null);

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

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates = [];

      if (form.user_name !== state.user?.name) {
        updates.push(dispatch({ type: 'UPDATE_USER', payload: { name: form.user_name } }));
      }

      const settingsToSave = { ...form };
      delete settingsToSave.user_name;

      Object.entries(settingsToSave).forEach(([key, value]) =>
        updates.push(dispatch({ type: 'UPDATE_SETTING', payload: { key, value } }))
      );

      if (form.household_name !== state.settings.household_name || form.cash_balance !== state.settings.cash_balance) {
        updates.push(dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { name: form.household_name, cash_balance: form.cash_balance } }));
      }

      await Promise.all(updates);
    } catch {
      showToast(t('settings.toasts.save_error'));
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [form, state.user?.name, state.settings.household_name, state.settings.cash_balance, dispatch, showToast, t]);

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
        setFormDirty(f => ({ ...f, profile_pic: base64 }));
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'profile_pic', value: base64 } });
        showToast(t('settings.toasts.img_updated'));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!isDirtyRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      isDirtyRef.current = false;
      handleSaveAll();
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [form, handleSaveAll]);

  const tabs = [
    { id: 'perfil', label: t('settings.tabs.perfil'), icon: User },
    { id: 'financas', label: t('settings.tabs.financas'), icon: Wallet },
    { id: 'pref', label: t('settings.tabs.pref'), icon: Palette },
  ];

  return (
    <div className="section-fade max-w-6xl mx-auto pb-24">
      <SettingsHero 
        form={form} 
        isSaving={isSaving} 
        showAvatarGallery={showAvatarGallery} 
        setShowAvatarGallery={setShowAvatarGallery} 
        AVATARS={AVATARS} 
        setFormDirty={setFormDirty} 
        dispatch={dispatch} 
        fileInputRef={fileInputRef} 
        handleImageUpload={handleImageUpload} 
      />

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
          {activeTab === 'perfil' && <TabPerfil form={form} setFormDirty={setFormDirty} state={state} />}
          {activeTab === 'financas' && <TabFinancas form={form} setFormDirty={setFormDirty} state={state} />}
          {activeTab === 'pref' && (
            <TabPreferences 
              form={form} 
              setFormDirty={setFormDirty} 
              state={state} 
              dispatch={dispatch} 
              pushProps={pushProps} 
              showToast={showToast} 
            />
          )}
        </div>
        <SettingsSidebar t={t} />
      </div>
    </div>
  );
}
