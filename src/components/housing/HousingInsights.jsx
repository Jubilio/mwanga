import { TrendingDown, ArrowUpRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function HousingInsights({ committedIncome, momComparison }) {
  // Let's pretend 30% is the ideal limit for housing costs
  const isHealthy = committedIncome <= 30;
  const isTrendingDown = momComparison <= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Insight 1: % of salary */}
      <div className="glass-card p-5 group hover:-translate-y-1 transition-transform duration-300">
        <div className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Cometimento do Rendimento</div>
        <div className="flex items-end gap-3">
          <div className="text-2xl font-bold text-gray-800 dark:text-white group-hover:text-ocean transition-colors">
            {committedIncome}%
          </div>
          <div className={`text-xs font-medium mb-1 ${isHealthy ? 'text-leaf' : 'text-coral'}`}>
            {isHealthy ? 'Saudável' : 'Atenção'}
          </div>
        </div>
      </div>

      {/* Insight 2: M-o-M Comparison */}
      <div className="glass-card p-5 group hover:-translate-y-1 transition-transform duration-300">
        <div className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Evolução Mensal</div>
        <div className="flex items-end gap-3">
          <div className="text-2xl font-bold text-gray-800 dark:text-white group-hover:text-ocean transition-colors">
            {Math.abs(momComparison)}%
          </div>
          <div className={`flex items-center text-xs font-medium mb-1 ${isTrendingDown ? 'text-leaf' : 'text-coral'}`}>
            {isTrendingDown ? <TrendingDown size={14} className="mr-1" /> : <ArrowUpRight size={14} className="mr-1" />}
            {isTrendingDown ? 'Redução' : 'Aumento'}
          </div>
        </div>
      </div>

      {/* Insight 3: Auto Recommendation */}
      <div className="glass-card p-5 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-16 h-16 bg-gradient-to-br from-gold/5 to-transparent rounded-bl-full"></div>
        <div className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Recomendação Nexo</div>
        <div className="flex items-start gap-3 mt-1">
          {isHealthy ? (
            <CheckCircle className="text-leaf shrink-0 mt-0.5" size={18} />
          ) : (
            <AlertCircle className="text-coral shrink-0 mt-0.5" size={18} />
          )}
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isHealthy 
              ? 'Custos de habitação estão perfeitamente otimizados dentro do limite dos 30%.'
              : 'Considere rever as suas despesas. A habitação está a pesar no orçamento.'}
          </div>
        </div>
      </div>
    </div>
  );
}
