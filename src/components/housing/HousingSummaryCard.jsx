import { TrendingUp, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { fmt } from '../../utils/calculations';

// Mock data for sparkline
const sparklineData = [
  { value: 20000 }, { value: 20000 }, { value: 20000 }, { value: 22000 }, { value: 22000 }, { value: 25000 }, { value: 25000 }
];

export default function HousingSummaryCard({ totalInvested, currency, type }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br from-ocean-deep via-ocean to-ocean-light border border-white/10 shadow-xl group">
      {/* Decorative background flair */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-gold/10 rounded-full blur-3xl group-hover:bg-gold/20 transition-all duration-700"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        
        {/* Main Value Area */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white/70 text-sm font-medium tracking-wide uppercase">
              {type === 'renda' ? 'Total Arrendamento (Ano)' : 'Total Casa Própria (Ano)'}
            </span>
          </div>
          <div className="text-4xl md:text-5xl font-display font-bold text-white mb-4 drop-shadow-sm">
            {fmt(totalInvested, currency)}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/5">
              <span className="w-2 h-2 rounded-full bg-leaf animate-pulse"></span>
              Estado: Em dia
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/5">
              <span>Próximo pag.: <strong>01 do próximo mês</strong></span>
            </div>
          </div>
        </div>

        {/* Sparkline & Call to Action side */}
        <div className="w-full md:w-48 flex flex-col items-end gap-4">
          <div className="w-full h-16 opacity-80 group-hover:opacity-100 transition-opacity">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9963a" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#c9963a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#c9963a" strokeWidth={2} fill="url(#sparklineGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <button className="text-xs font-semibold text-gold-light hover:text-gold flex items-center gap-1 transition-colors">
            Ver detalhes completos <ChevronRight size={14} />
          </button>
        </div>
        
      </div>
    </div>
  );
}
