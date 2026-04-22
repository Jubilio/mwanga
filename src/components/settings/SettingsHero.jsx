import { Camera, Sparkles, Loader2, CloudCheck, Home as HomeIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SettingsHero({ 
  form, 
  isSaving, 
  showAvatarGallery, 
  setShowAvatarGallery, 
  AVATARS, 
  setFormDirty, 
  dispatch, 
  fileInputRef, 
  handleImageUpload 
}) {
  const { t } = useTranslation();

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
                          setFormDirty(f => ({ ...f, profile_pic: url }));
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
  );
}
