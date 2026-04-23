import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { useStewardship } from '../hooks/useStewardship';
import { motion } from 'framer-motion';
import { Crown, Heart, Shield, Zap, Star, Trophy, Info, Sparkles, BookOpen, Clock } from 'lucide-react';

export default function Stewardship() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const { stats, badges } = useStewardship();


  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-20 max-w-7xl mx-auto w-full">
      {/* ─── HEADER: PROVERBS SCORE ─── */}
      <div className="relative overflow-hidden glass-card p-6 md:p-12 flex flex-col items-center text-center gap-6 min-h-[280px] md:min-h-[340px] justify-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-gold via-amber-500 to-gold shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />

        <div className="relative">
           <Trophy size={48} className="text-gold animate-bounce" />
           <div className="absolute -top-1 -right-1">
              <Sparkles size={16} className="text-white animate-pulse" />
           </div>
        </div>

        <div>
          <h1 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 mb-1">Índice de Mordomia</h1>
          <div className="text-6xl font-black text-white tracking-tighter tabular-nums flex items-baseline gap-2">
            {stats.totalScore}
            <span className="text-xl text-gold font-bold">/100</span>
          </div>
        </div>

        <p className="text-sm text-gray-400 max-w-md italic leading-relaxed">
          "Foste fiel no pouco, sobre o muito te colocarei." (Mateus 25:21)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ─── PILLARS ─── */}
        <div className="glass-card p-8 space-y-8">
           <h3 className="text-xs font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
             <BookOpen size={14} className="text-indigo-400" /> Pilares da Mordomia
           </h3>
           
           {[
             { label: 'Generosidade', score: stats.generosityScore, icon: Heart, color: 'bg-rose-500' },
             { label: 'Prudência', score: stats.prudenceScore, icon: Shield, color: 'bg-emerald-500' },
             { label: 'Diligência', score: stats.diligenceScore, icon: Zap, color: 'bg-amber-500' },
             { label: 'Integridade', score: stats.integrityScore, icon: Star, color: 'bg-blue-500' }
           ].map(pillar => (
             <div key={pillar.label} className="space-y-3">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <pillar.icon size={14} className="text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">{pillar.label}</span>
                   </div>
                   <span className="text-xs font-black text-white">{Math.round(pillar.score)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${pillar.score}%` }}
                     className={`h-full ${pillar.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} 
                   />
                </div>
             </div>
           ))}
        </div>

        {/* ─── RUNWAY CARD ─── */}
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center gap-4 border-indigo-500/20">
           <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Clock size={32} />
           </div>
           <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pista de Sobrevivência (Runway)</span>
              <div className="text-4xl font-black text-white mt-1">
                 {stats.runwayMonths} <span className="text-sm font-bold text-indigo-400 uppercase">Meses</span>
              </div>
           </div>
           <p className="text-[10px] text-gray-500 leading-relaxed max-w-[200px]">
              Se o teu rendimento parar hoje, consegues manter o teu estilo de vida por este período.
           </p>
           {stats.runwayMonths < 6 && (
             <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                Alerta de Prudência
             </div>
           )}
        </div>

        {/* ─── BADGES ─── */}
        <div className="glass-card p-8">
           <h3 className="text-xs font-black uppercase tracking-widest text-white mb-8 flex items-center gap-2">
             <Crown size={14} className="text-gold" /> Galeria de Honra
           </h3>

           <div className="grid grid-cols-2 gap-4">
              {badges.map(badge => (
                <div 
                  key={badge.id}
                  className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-3 transition-all ${badge.active ? 'bg-white/5 border-white/10 opacity-100 scale-100 shadow-xl' : 'bg-black/20 border-transparent opacity-20 grayscale scale-95'}`}
                >
                  <div className={`p-3 rounded-xl bg-midnight border border-white/5 ${badge.active ? badge.color : 'text-gray-600'}`}>
                    <badge.icon size={24} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-tight ${badge.active ? 'text-white' : 'text-gray-500'}`}>{badge.label}</p>
                    {badge.active && <p className="text-[9px] text-gray-500 mt-1 leading-tight">{badge.desc}</p>}
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* ─── PROVERBS INSIGHT ─── */}
      <div className="glass-card p-8 border-gold/20 flex flex-col md:flex-row items-center gap-8">
         <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shrink-0">
            <Info size={32} />
         </div>
         <div className="flex flex-col gap-2">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Conselho da Binth</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              O teu índice de {stats.totalScore}% reflete uma gestão {stats.totalScore > 80 ? 'excelente' : stats.totalScore > 50 ? 'equilibrada' : 'que precisa de atenção'}. 
              {stats.generosityScore < 50 && ' Lembra-te que a generosidade abre portas para a abundância.'}
              {stats.prudenceScore < 50 && ' Tenta aumentar a tua reserva de emergência para dias de tempestade.'}
            </p>
         </div>
      </div>
    </div>
  );
}
