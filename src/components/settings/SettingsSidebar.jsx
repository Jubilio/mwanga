import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function SettingsSidebar({ t }) {
  return <aside className="lg:col-span-4 space-y-5">
    <section className="glass-card p-6"><h2 className="font-black">{t('settings.reliable.save_title')}</h2><p className="text-sm text-slate-500 mt-3">{t('settings.reliable.save_note')}</p><p className="text-sm text-slate-500 mt-3">{t('settings.reliable.password_note')}</p></section>
    <section className="glass-card p-6"><h2 className="font-black">{t('settings.reliable.journey_title')}</h2><p className="text-sm text-slate-500 mt-3 mb-4">{t('settings.reliable.journey_note')}</p><Link to="/jornada" className="btn btn-primary">{t('journey.nav')}</Link></section>
    <Link to="/help" className="btn btn-ghost w-full"><HelpCircle size={18} />{t('settings.sidebar.help_btn')}</Link>
  </aside>;
}
