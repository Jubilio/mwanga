import { User, Sparkles, Home as HomeIcon, Heart, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TabPerfil({ form, setFormDirty, state }) {
  const { t } = useTranslation();

  return (
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
                  onChange={(e) => setFormDirty(f => ({ ...f, user_name: e.target.value }))}
                  className="premium-input"
                  placeholder={t('settings.perfil.user_name_placeholder')}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                  <Sparkles size={18} className="text-teal-400" />
                </div>
              </div>
            </div>

            <div className="group transition-all mt-6">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <Lock size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Segurança</h3>
                </div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Definir/Alterar Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    value={form.password || ''}
                    onChange={(e) => setFormDirty(f => ({ ...f, password: e.target.value }))}
                    className="premium-input"
                    placeholder="Nova senha (min. 8 caracteres)"
                  />
                  <p className="mt-2 text-[10px] text-slate-500 italic">
                    Utilize isto se entrou com Google e deseja criar um acesso via email/senha.
                  </p>
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
                  onChange={(e) => setFormDirty(f => ({ ...f, household_name: e.target.value }))}
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
  );
}
