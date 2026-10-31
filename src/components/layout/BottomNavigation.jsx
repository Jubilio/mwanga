import { NavLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isBottomItemActive } from '../../config/navigation';

export default function BottomNavigation({ items, currentPath, onAddClick }) {
  const { t } = useTranslation();
  return (
    <nav className="hide-desktop fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t border-black/5 bg-white/80 pb-[calc(0.75rem+var(--sab))] pt-3 backdrop-blur-2xl dark:border-white/5 dark:bg-midnight/90">
      {items.map((item) => {
        if (item.isFab) {
          return (
            <div key="fab-container" className="relative flex flex-1 flex-col items-center">
              <div className="fab-container">
                <button onClick={onAddClick} className="fab-button" aria-label={t(item.label)}>
                  <Plus size={32} strokeWidth={3} />
                </button>
              </div>
              <div className="h-8" />
              <span className="text-[10px] font-bold text-ocean dark:text-sky">{t(item.label)}</span>
            </div>
          );
        }

        const active = isBottomItemActive(item, currentPath);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors duration-300 ${
              active
                ? 'text-ocean dark:text-sky-light'
                : 'text-slate-400 hover:text-ocean dark:text-slate-500 dark:hover:text-sky-light'
            }`}
          >
            <div className={`relative flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-300 ${active ? 'bg-ocean/10 dark:bg-sky/15' : ''}`}>
              <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] ${active ? 'font-black' : 'font-semibold'}`}>{t(item.label)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
