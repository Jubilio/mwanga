import { Menu, Bell, Sun, Moon, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MwangaLogo from '../MwangaLogo';

export default function Header({ 
  onMenuClick, 
  onNotificationClick, 
  unreadCount, 
  darkMode, 
  onToggleDarkMode, 
  user, 
  settings 
}) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/50 bg-white/70 px-4 pt-[calc(0.5rem+var(--sat))] pb-2 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/50 dark:bg-midnight/80">
      {/* Left Side: Logo or Minimal Trigger */}
      <div className="flex items-center">
        <div className="hidden md:block scale-75 origin-left">
          <MwangaLogo variant="sidebar" />
        </div>
        
        {/* Mobile trigger is now the user initial/photo but on the right by default, 
            let's keep the left side clean for mobile as requested previously, or put a small logo here */}
        <div className="md:hidden">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-ocean dark:text-sky/60">Mwanga</span>
        </div>
      </div>

      {/* Right Side: Actions & Profile */}
      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
        {/* Quick Info / Options Button - Mobile Only */}
        <button
          className="md:hidden rounded-2xl p-2.5 transition-all hover:bg-black/5 active:scale-95 dark:hover:bg-white/5 flex items-center gap-1.5"
          onClick={() => onMenuClick(true)}
          title="Abrir Menu Principal"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-ocean dark:text-aurora">
            <Menu size={18} strokeWidth={2.5} />
          </div>
        </button>

        <button
          className="relative rounded-2xl p-2.5 transition-all hover:bg-black/5 active:scale-95 dark:hover:bg-white/5"
          onClick={onNotificationClick}
        >
          <Bell size={20} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute right-2.5 top-2.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral shadow-[0_0_8px_rgba(224,122,95,0.6)]"></span>
            </span>
          )}
        </button>

        <button
          className="hidden sm:block rounded-2xl p-2.5 transition-all hover:bg-black/5 active:scale-95 dark:hover:bg-white/5"
          onClick={onToggleDarkMode}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="mx-2 h-8 w-[1.5px] bg-linear-to-b from-transparent via-slate-200 to-transparent dark:via-slate-800" />

        {/* User Profile Trigger (Desktop & Mobile) - Now goes to Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="group flex items-center gap-3 rounded-2xl p-1 pr-2 transition-all hover:bg-black/5 dark:hover:bg-white/5"
        >
          {/* Desktop Info */}
          <div className="hidden md:flex flex-col items-end pl-2">
            <span className="text-[12px] font-bold text-midnight dark:text-white leading-tight">
              {user?.name?.split(' ')[0] || 'Explorador'}
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500/80">
              {settings?.household_name?.slice(0, 15) || 'Mwanga'}
            </span>
          </div>

          {/* Avatar */}
          <div className="relative">
            {settings?.profile_pic ? (
              <img 
                src={settings.profile_pic} 
                alt="Profile" 
                className="h-10 w-10 rounded-xl object-cover shadow-lg border border-white/20 transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-ocean to-sky text-sm font-black text-white shadow-xl shadow-ocean/30 transition-transform group-hover:scale-105 border border-white/20">
                {user?.name?.charAt(0) || 'M'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 hidden md:flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-midnight shadow-sm border border-slate-100 dark:border-slate-800">
              <ChevronDown size={10} className="text-slate-400" />
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}
