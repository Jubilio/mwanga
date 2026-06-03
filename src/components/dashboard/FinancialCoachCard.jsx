import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Sparkles, Target } from 'lucide-react';
import api from '../../utils/api';

const PAGE_MAP = {
  emergency_liquidity: '/transacoes',
  severe_overbudget: '/orcamento',
  debt_pressure: '/dividas',
  housing_pending: '/habitacao',
  budget_leaks: '/orcamento',
  goal_accelerator: '/metas',
  unread_alerts: '/insights',
  stability_celebration: '/patrimonio',
  generic_maintenance: '/insights',
};

export default function FinancialCoachCard({ coach, loading, error, onRefresh }) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (!coach) return;
    const page = PAGE_MAP[coach.priority?.id] || '/insights';
    navigate(page);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0a0f1c] p-6 shadow-2xl border border-indigo-500/20 w-full group">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-indigo-600/20 blur-[80px] transition-all duration-1000 group-hover:bg-indigo-500/30"></div>
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-purple-600/20 blur-[80px] transition-all duration-1000 group-hover:bg-purple-500/30"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent"></div>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <span className="text-[10px] font-black tracking-[0.25em] text-indigo-300 uppercase">Binth Intelligence</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          disabled={loading}
          title="Atualizar análise"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-400' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="relative space-y-4 py-2">
          <div className="h-6 w-3/4 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-full rounded-lg bg-white/5 animate-pulse" />
          <div className="h-24 w-full rounded-2xl bg-white/5 animate-pulse mt-4" />
        </div>
      ) : error ? (
        <div className="relative space-y-4 py-4 text-center">
          <p className="text-sm text-red-400/90 font-medium">{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/20"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      ) : (
        <div className="relative">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 leading-tight">
            A tua análise financeira <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              está pronta.
            </span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-2xl">
            {coach.priority?.reason || 'Os teus dados mostram um padrão interessante. Preparei um plano prático para otimizar os teus resultados esta semana.'}
          </p>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.15] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <Target size={14} className="text-amber-400" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Prioridade Estratégica</span>
            </div>
            <p className="text-lg font-bold text-white mb-1.5 relative z-10">
              {coach.priority?.priority || 'Manter a disciplina financeira'}
            </p>
            <p className="text-sm text-slate-400 relative z-10">
              {coach.priority?.nextAction || 'Garantir que todas as pequenas transações do dia estão registadas.'}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAction}
              className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-indigo-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:bg-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5"
            >
              <span>Ver plano detalhado</span>
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/insights')}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-white/10 hover:text-white"
            >
              Explorar Insights
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
