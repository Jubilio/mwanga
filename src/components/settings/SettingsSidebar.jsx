import { Shield, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function SettingsSidebar({ t }) {
  const navigate = useNavigate();

  return (
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
      </div>
    </div>
  );
}
