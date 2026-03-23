import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { Plus, Trash2, Clock, TrendingUp } from 'lucide-react';
import { fmt, daysUntil, calcMonthlySavingsNeeded } from '../utils/calculations';
import BinthContextual from '../components/BinthContextual';

export default function Goals() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();

  const [form, setForm] = useState({ nome: '', alvo: '', poupado: '', prazo: '' });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.alvo) { showToast('⚠️ Preencha nome e valor alvo'); return; }
    dispatch({
      type: 'ADD_META',
      payload: { ...form, alvo: parseFloat(form.alvo), poupado: parseFloat(form.poupado) || 0 },
    });
    setForm({ nome: '', alvo: '', poupado: '', prazo: '' });
    showToast('🎯 Meta criada!');
  }

  function handleAddSavings(meta) {
    const amount = prompt(`Quanto quer adicionar à meta "${meta.nome}"? (${currency})`);
    if (!amount || isNaN(amount)) return;
    dispatch({
      type: 'UPDATE_META',
      payload: { id: meta.id, poupado: meta.poupado + parseFloat(amount) },
    });
    showToast(`💰 +${fmt(parseFloat(amount), currency)} adicionados!`);
  }

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark dark:text-white">Metas Financeiras</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Visualize o seu progresso rumo à liberdade financeira.</p>
        </div>
      </div>

      {/* Add Goal Form */}
      <div className="glass-card p-6 mb-8 border border-ocean/10">
        <div className="section-title text-ocean dark:text-sky mb-4">Nova Meta Financeira</div>
        <form onSubmit={handleSubmit}>
          <div className="responsive-grid">
            <div>
              <label className="form-label">Nome da Meta</label>
              <input type="text" className="form-input" placeholder="Ex: Fundo de emergência, Carro..." value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Valor Alvo ({currency})</label>
              <input type="number" className="form-input" placeholder="0" min="0" value={form.alvo} onChange={e => setForm({ ...form, alvo: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Já Poupado ({currency})</label>
              <input type="number" className="form-input" placeholder="0" min="0" value={form.poupado} onChange={e => setForm({ ...form, poupado: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Prazo Final</label>
              <input type="date" className="form-input" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="btn btn-primary"><Plus size={18} /> Criar Meta</button>
          </div>
        </form>
      </div>

      <BinthContextual page="metas" />

      {/* Biblical Principle Banner — Poupança e Proteção */}
      {state.metas?.length > 0 && (
        <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400">
          <span className="text-base flex-shrink-0">📖</span>
          <div className="text-[12px] leading-relaxed">
            <span className="font-bold">Poupança e Proteção: </span>
            O pé de meia de hoje é a liberdade de amanhã. Cada contribuição à tua meta é um passo para os teus sonhos. Não esperes a perfeita altura — começa agora com o que tens.
          </div>
        </div>
      )}

      {/* Goals Grid */}
      <div className="section-title mt-8">O Seu Progresso</div>
      
      {state.metas?.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <TrendingUp size={48} className="mx-auto text-ocean/20 mb-3" />
          <p className="text-muted italic">Defina a sua primeira meta para começar a poupar.</p>
        </div>
      ) : (
        <div className="responsive-grid mt-6">
          {state.metas?.map((m, i) => {
            const pct = Math.min(100, Math.round((m.poupado / m.alvo) * 100));
            const days = daysUntil(m.prazo);
            const monthlyNeeded = calcMonthlySavingsNeeded(m.alvo, m.poupado, m.prazo);
            const isComplete = pct >= 100;

            return (
              <div key={m.id} className="glass-card p-5 flex flex-col justify-between animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{m.nome}</h3>
                    {isComplete && <span className="premium-badge">Concluída!</span>}
                  </div>
                  <div className="text-2xl font-black text-ocean dark:text-sky mb-4">
                    {fmt(m.poupado, currency)} <span className="text-xs text-muted font-normal">de {fmt(m.alvo, currency)}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted mb-1">
                      <span>Progresso</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill bg-ocean" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {days !== null && (
                      <div className="flex items-center gap-2 text-muted">
                        <Clock size={12} />
                        {days > 0 ? `${days} dias restantes` : 'Prazo atingido'}
                      </div>
                    )}
                    {monthlyNeeded > 0 && !isComplete && (
                      <div className="p-2 bg-leaf/5 dark:bg-leaf/10 border border-leaf/20 rounded-lg text-leaf font-semibold">
                        💡 Poupar {fmt(monthlyNeeded, currency)}/mês
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button onClick={() => handleAddSavings(m)} className="btn btn-primary flex-1 py-2 text-xs">
                    <Plus size={14} /> Poupar
                  </button>
                  <button onClick={() => { if(confirm('Remover esta meta?')) dispatch({ type: 'DELETE_META', payload: m.id }); }} className="btn bg-coral/10 text-coral hover:bg-coral hover:text-white p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
