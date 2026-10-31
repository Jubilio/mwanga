import { Camera, Sparkles, Loader2, CloudCheck, Clock, AlertTriangle, Home as HomeIcon, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserAvatar from '../UserAvatar';
import { hasOwnPhoto } from '../../utils/avatar';

export default function SettingsHero({
  form,
  state,
  isSaving,
  showAvatarGallery,
  setShowAvatarGallery,
  photoBusy,
  onRemovePhoto,
  saveStatus,
  fileInputRef,
  handleImageUpload
}) {
  const { t } = useTranslation();
  const tier = state.settings?.subscription_tier || 'free';
  const tierLabel = t(`settings.reliable.tiers.${tier}`, { defaultValue: t('settings.reliable.tiers.free') });
  const photo = state.settings?.profile_pic;
  const disabled = isSaving || photoBusy;

  return (
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
                <UserAvatar
                  name={state.user?.name || form.user_name}
                  photo={photo}
                  alt={t('settings.reliable.avatar')}
                  className="w-full h-full rounded-[2.2rem]"
                  textClassName="text-4xl md:text-5xl"
                  iconSize={44}
                />
                {photoBusy ? (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center" role="status" aria-label={t('settings.reliable.photo_processing')}>
                    <Loader2 size={28} className="animate-spin text-white" />
                  </div>
                ) : null}
              </div>
              {/* Always visible: hover-only buttons cannot be found on Android. */}
              <button
                type="button"
                disabled={disabled}
                aria-label={t('settings.reliable.change_avatar')} aria-expanded={showAvatarGallery}
                onClick={() => setShowAvatarGallery(!showAvatarGallery)}
                className="absolute -bottom-2 -right-2 p-2.5 bg-white text-midnight rounded-2xl shadow-xl border border-slate-200 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                style={{ width: 'auto' }}
              >
                <Camera size={20} />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-teal-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-3 md:mb-4">
                <Sparkles size={12} /> {tierLabel}
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
                    {saveStatus === 'error' ? <AlertTriangle size={14} className="text-red-400" /> : saveStatus === 'pending' ? <Clock size={14} className="text-amber-400" /> : <CloudCheck size={14} />} {t(`settings.reliable.status.${saveStatus}`)}
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
                <p className="text-2xl font-black font-serif text-white">{t('settings.hero.day_label', { day: form.financial_month_start_day })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showAvatarGallery && (
        <div className="glass-card mt-4 p-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
            style={{ width: 'auto' }}
          >
            {photoBusy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            {t('settings.reliable.upload_avatar')}
          </button>
          {hasOwnPhoto(photo) ? (
            <button type="button" disabled={disabled} onClick={onRemovePhoto} className="btn btn-ghost" style={{ width: 'auto' }}>
              <Trash2 size={18} /> {t('settings.reliable.use_initials')}
            </button>
          ) : null}
          <p className="w-full text-xs text-slate-500">{t('settings.reliable.photo_hint')}</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            disabled={disabled}
            accept="image/*"
            onChange={(e) => { handleImageUpload(e.target.files?.[0]); e.target.value = ''; }}
          />
        </div>
      )}
    </div>
  );
}
