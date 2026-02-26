import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PremiumCard() {
  return (
    <div className="mx-4 mb-6 rounded-2xl relative overflow-hidden group">
      {/* Background with Dark Ocean Gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-midnight to-ocean z-0"></div>
      
      {/* Golden border effect (simulated with an inner div to allow radius) */}
      <div className="relative z-10 border border-[#D4AF37]/30 rounded-2xl p-5 shadow-[0_4px_24px_rgba(212,175,55,0.08)] group-hover:shadow-[0_4px_32px_rgba(212,175,55,0.15)] transition-shadow duration-300">
        
        {/* Glow effect on hover */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#D4AF37]/20 blur-2xl rounded-full group-hover:bg-[#D4AF37]/30 transition-all duration-500"></div>

        <div className="flex items-center gap-2 mb-2">
          <Crown size={16} className="text-[#D4AF37]" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Nexo Vibe Premium</span>
        </div>
        
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Desbloqueie Inteligência Avançada, Relatórios Detalhados e Simuladores Exclusivos.
        </p>

        <Link 
          to="/pricing" 
          className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-midnight bg-linear-to-r from-[#D4AF37] to-[#e6ca73] hover:from-[#e6ca73] hover:to-sand transition-all transform active:scale-95 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
        >
          Fazer Upgrade
        </Link>
      </div>
    </div>
  );
}
