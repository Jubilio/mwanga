import AiSettings from '../components/settings/AiSettings';
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { User, Wallet, Palette, Bell, Bot } from 'lucide-react';
import SettingsHero from '../components/settings/SettingsHero';
import TabPerfil from '../components/settings/TabPerfil';
import TabFinancas from '../components/settings/TabFinancas';
import TabPreferences from '../components/settings/TabPreferences';
import SettingsSidebar from '../components/settings/SettingsSidebar';
import PasswordSettings from '../components/settings/PasswordSettings';
import { DEFAULT_AVATAR, settingsForm, changedSettings, validateSettings, settingsActions } from '../utils/settingsForm';

const AVATARS = [DEFAULT_AVATAR, 'https://ui-avatars.com/api/?name=Fam&background=20c997&color=fff&size=128', 'https://ui-avatars.com/api/?name=Mwanga&background=0a4d68&color=fff&size=128', 'https://ui-avatars.com/api/?name=Admin&background=6c757d&color=fff&size=128'];
export default function Settings() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  const pushProps = usePushNotifications();
  const [activeTab, setActiveTab] = useState('perfil');
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [form, setForm] = useState(() => settingsForm(state));
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [error, setError] = useState('');
  const dirty = useRef(new Set());
  const lock = useRef(false);
  const fileInputRef = useRef(null);
  const { user, settings } = state;
  const base = settingsForm({ user, settings });
  const pending = changedSettings(form, base).length;
  useEffect(() => {
    const incoming = settingsForm({ user, settings });
    setForm(previous => Object.fromEntries(Object.entries(incoming).map(([key, value]) => [key, dirty.current.has(key) ? previous[key] : value])));
  }, [user, settings]);
  const setFormDirty = updater => {
    setForm(previous => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      for (const key of Object.keys(next)) if (String(next[key]) !== String(previous[key])) dirty.current.add(key);
      return next;
    });
    setSaveStatus('pending'); setError('');
  };
  async function save() {
    if (lock.current || !pending) return;
    const invalid = validateSettings(form, state.contas);
    if (invalid) { setError(invalid); setSaveStatus('error'); return; }
    lock.current = true; setBusy(true); setSaveStatus('saving'); setError('');
    const actions = settingsActions(form, base);
    const results = await Promise.allSettled(actions.map(action => dispatch(action)));
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const action = actions[index];
      const keys = action.type === 'UPDATE_SETTING' ? [action.payload.key] : action.type === 'UPDATE_USER' ? Object.keys(action.payload).map(key => key === 'name' ? 'user_name' : key) : Object.keys(action.payload).map(key => key === 'name' ? 'household_name' : key);
      keys.forEach(key => dirty.current.delete(key));
      const confirmed = action.type === 'UPDATE_SETTING' ? { [action.payload.key]: action.payload.value } : Object.fromEntries(keys.map(key => [key, action.payload[key === 'user_name' || key === 'household_name' ? 'name' : key]]));
      setForm(previous => ({ ...previous, ...confirmed }));
    });
    const failed = results.some(result => result.status === 'rejected');
    setSaveStatus(failed ? 'error' : 'saved');
    if (failed) setError('partial_error');
    else { dirty.current.clear(); showToast(t('settings.toasts.save_success'), 'success'); }
    lock.current = false; setBusy(false);
  }
  function discard() { dirty.current.clear(); setForm(settingsForm(state)); setSaveStatus('saved'); setError(''); }
  async function handleImageUpload(file) {
    if (!file) return;
    // A 600 KiB image remains below the API's 1 MiB JSON limit after base64 encoding.
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 600 * 1024) { showToast(t('settings.reliable.image_limit'), 'error'); return; }
    const reader = new FileReader();
    reader.onerror = () => showToast(t('settings.reliable.image_error'), 'error');
    reader.onload = () => setFormDirty(previous => ({ ...previous, profile_pic: reader.result }));
    reader.readAsDataURL(file);
  }
  const tabs = [{ id: 'perfil', icon: User }, { id: 'financas', icon: Wallet }, { id: 'pref', icon: Palette }, { id: 'notifications', icon: Bell }, { id: 'ai', icon: Bot }];
  const status = busy ? 'saving' : saveStatus === 'error' ? 'error' : pending ? 'pending' : 'saved';
  return <div className="settings-surface section-fade max-w-6xl mx-auto pb-28">
    <SettingsHero form={form} state={state} isSaving={busy} saveStatus={status} showAvatarGallery={showAvatarGallery} setShowAvatarGallery={setShowAvatarGallery} AVATARS={AVATARS} setFormDirty={setFormDirty} fileInputRef={fileInputRef} handleImageUpload={handleImageUpload} />
    <nav aria-label={t('settings.reliable.navigation')} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
      {tabs.map(tab => <button key={tab.id} aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}><tab.icon size={18} />{t(`settings.reliable.tabs.${tab.id}`)}</button>)}
    </nav>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8">
        <p className="text-xs text-slate-500 mb-4">{t(['perfil', 'ai'].includes(activeTab) ? 'settings.reliable.account_scope' : activeTab === 'notifications' ? 'settings.reliable.device_scope' : 'settings.reliable.household_scope')}</p>
        {activeTab === 'ai' ? <AiSettings /> : null}
        <fieldset disabled={busy} className="min-w-0 disabled:opacity-60">
          {activeTab === 'perfil' ? <TabPerfil form={form} setFormDirty={setFormDirty} state={state} /> : null}
          {activeTab === 'financas' ? <TabFinancas form={form} setFormDirty={setFormDirty} state={state} /> : null}
          {['pref', 'notifications'].includes(activeTab) ? <TabPreferences section={activeTab} form={form} setFormDirty={setFormDirty} state={state} dispatch={dispatch} pushProps={pushProps} showToast={showToast} /> : null}
        </fieldset>
        {activeTab === 'perfil' ? <PasswordSettings dispatch={dispatch} /> : null}
        <section className="glass-card p-5 mt-6" aria-live="polite">
          <p className="text-sm font-bold">{t(`settings.reliable.status.${status}`)}</p>
          {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400 mt-2">{t(`settings.reliable.${error}`)}</p> : null}
          <div className="flex flex-wrap gap-3 mt-4"><button disabled={busy || !pending} onClick={save} className="btn btn-primary disabled:opacity-50">{t('settings.reliable.save')}</button><button disabled={busy || !pending} onClick={discard} className="btn btn-ghost disabled:opacity-50">{t('settings.reliable.discard')}</button></div>
        </section>
      </div>
      <SettingsSidebar t={t} />
    </div>
  </div>;
}
