import { NavLink } from 'react-router-dom';

export default function SidebarItem({ to, icon: Icon, label, premium, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `
        group flex items-center gap-3 px-4 py-3 rounded-xl
        transition-all duration-200 ease-out cursor-pointer select-none
        ${isActive
          ? "bg-white/5 border-l-4 border-gold-deep shadow-[0_0_20px_rgba(212,175,55,0.15)]"
          : "hover:bg-white/5 active:scale-[0.98]"
        }
      `}
    >
      {({ isActive }) => (
        <>
          <div
            className={`
              transition-colors duration-200
              ${isActive ? "text-gold-deep" : "text-slate-400 group-hover:text-white"}
              ${premium && !isActive ? "group-hover:text-gold-deep" : ""}
            `}
          >
            <Icon size={20} className={premium && !isActive ? "text-gold-deep opacity-80" : ""} />
          </div>

          <span
            className={`
              text-sm font-medium transition-colors duration-200
              ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}
            `}
          >
            {label}
          </span>
          
          {premium && (
            <span className="ml-auto text-[9px] bg-gold-deep text-white px-1.5 py-0.5 rounded-md tracking-wider uppercase opacity-90 shadow-[0_0_8px_rgba(168,127,50,0.5)]">
              Pro
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
