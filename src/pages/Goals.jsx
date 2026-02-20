import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { Plus, Trash2, Clock, TrendingUp } from 'lucide-react';
import { fmt, daysUntil, calcMonthlySavingsNeeded } from '../utils/calculations';

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
    const amount = prompt(`Quanto quer adicionar à meta "${meta.nome}"? (MT)`);
    if (!amount || isNaN(amount)) return;
    dispatch({
      type: 'UPDATE_META',
      payload: { id: meta.id, poupado: meta.poupado + parseFloat(amount) },
    });
    showToast(`💰 +${fmt(parseFloat(amount))} adicionados!`);
  }

  const colors = ['var(--color-ocean)', 'var(--color-leaf)', 'var(--color-gold)', 'var(--color-coral)', 'var(--color-sky)'];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Add Goal Form */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">Nova Meta Financeira</div>
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}>
            <div>
              <label className="form-label">Nome da Meta</label>
              <input type="text" className="form-input" placeholder="Ex: Fundo de emergência, Terreno..." value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Valor Alvo (MT)</label>
              <input type="number" className="form-input" placeholder="0" min="0" value={form.alvo} onChange={e => setForm({ ...form, alvo: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Já Poupado (MT)</label>
              <input type="number" className="form-input" placeholder="0" min="0" value={form.poupado} onChange={e => setForm({ ...form, poupado: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Prazo</label>
              <input type="date" className="form-input" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary"><Plus size={16} /> Criar Meta</button>
          </div>
        </form>
      </div>

      {/* Goals List */}
      <div className="section-title">Minhas Metas</div>

      {state.metas.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="icon">🎯</div>
            <div className="title">Sem metas financeiras</div>
            <div className="subtitle">Crie a sua primeira meta para acompanhar o progresso</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {state.metas.map((m, i) => {
            const pct = Math.min(100, Math.round((m.poupado / m.alvo) * 100));
            const color = colors[i % colors.length];
            const days = daysUntil(m.prazo);
            const monthlyNeeded = calcMonthlySavingsNeeded(m.alvo, m.poupado, m.prazo);
            const remaining = Math.max(0, m.alvo - m.poupado);
            const isComplete = pct >= 100;

            return (
              <div key={m.id} className="glass-card animate-fade-in-up" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                      {isComplete ? '🎉 ' : ''}{m.nome}
                    </div>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{fmt(m.poupado, currency)} / {fmt(m.alvo, currency)}</p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Mensal: <strong>{fmt(m.mensal, currency)}</strong></span>
                      {days !== null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />
                          {days > 0 ? `${days} dias restantes` : 'Prazo expirado'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn"
                      onClick={() => handleAddSavings(m)}
                      style={{
                        background: 'rgba(10, 77, 104, 0.08)',
                        color: 'var(--color-ocean)',
                        fontSize: '0.75rem',
                        padding: '0.35rem 0.75rem',
                      }}
                    >
                      <TrendingUp size={13} /> Poupar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => { dispatch({ type: 'DELETE_META', payload: m.id }); showToast('🗑️ Meta removida'); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
                  <span>{fmt(m.poupado)} poupados</span>
                  <span style={{ fontWeight: 600, color }}>{pct}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.5rem',
                  flexWrap: 'wrap', gap: '0.5rem',
                }}>
                  <span>Faltam: {fmt(remaining)}</span>
                  {monthlyNeeded !== null && monthlyNeeded > 0 && (
                    <span style={{
                      background: 'rgba(10, 77, 104, 0.06)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '8px',
                      fontWeight: 500,
                    }}>
                      💡 Poupar {fmt(monthlyNeeded)}/mês
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
