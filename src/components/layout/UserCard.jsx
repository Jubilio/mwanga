import { Settings, LogOut } from 'lucide-react';
import { useFinance } from '../../hooks/useFinanceStore';
import { Link } from 'react-router-dom';

export default function UserCard() {
  const { state } = useFinance();
  const userName = state.user?.name || 'Utilizador';
  const familyName = state.settings.household_name || 'Família Mwanga';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('mwanga-token');
    window.location.reload();
  };

  return (
    <div className="mx-4 mb-4 mt-auto">
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors duration-200 border border-white/5 group relative overflow-hidden">
        
        {/* Avatar with Glow */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-[#D4AF37]/40 blur-md rounded-full group-hover:bg-[#D4AF37]/60 transition-all duration-300"></div>
          <div className="w-10 h-10 rounded-full bg-linear-to-tr from-ocean to-sky flex items-center justify-center font-bold text-white shadow-inner relative z-10 border border-white/10">
            {userInitial}
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 overflow-hidden">
          <div className="text-sm font-bold text-white truncate">{userName}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest truncate">{familyName}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <Link to="/settings" className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <Settings size={16} />
          </Link>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-colors"
            title="Terminar Sessão"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
