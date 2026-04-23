import { NavLink } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function BottomNavigation({ items, currentPath, onAddClick }) {
  return (
    <nav className="hide-desktop fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t border-black/5 bg-white/80 pb-[calc(0.75rem+var(--sab))] pt-3 backdrop-blur-2xl dark:border-white/5 dark:bg-midnight/90">
      {items.map((item) => {
        if (item.isFab) {
          return (
            <div key="fab-container" className="relative flex flex-col items-center">
              <div className="fab-container">
                <button
                  onClick={onAddClick}
                  className="fab-button"
                >
                  <Plus size={32} strokeWidth={3} />
                </button>
              </div>
              <div className="h-8" />
              <span className="text-[9px] font-black uppercase tracking-wider text-ocean dark:text-sky">Adicionar</span>
            </div>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center justify-center gap-1.5 py-1 transition-all duration-300 ${
                isActive
                  ? 'text-ocean dark:text-aurora scale-105'
                  : 'text-slate-400 hover:text-ocean dark:text-slate-500 dark:hover:text-aurora hover:scale-105'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative flex items-center justify-center p-1 rounded-xl transition-all duration-300 ${isActive ? 'bg-ocean/10 dark:bg-aurora/10' : ''}`}>
                  <item.icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? 'animate-bounce-subtle' : ''}
                  />
                  {isActive && (
                    <span className="absolute -bottom-2 h-1 w-1 rounded-full bg-ocean dark:bg-aurora shadow-[0_0_8px_rgba(30,136,229,0.5)]"></span>
                  )}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 translate-y-2'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
