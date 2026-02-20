import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { fmt, calcCategoryBreakdown, getMonthKey } from '../utils/calculations';

const EXPENSE_CATEGORIES = [
  'Alimentação', 'Transporte', 'Energia/Água', 'Internet',
  'Saúde', 'Educação', 'Igreja/Doações', 'Lazer',
  'Investimentos', 'Casa', 'Outro',
];

export default function Budget() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();
  const monthKey = getMonthKey();

  const [newCat, setNewCat] = useState(EXPENSE_CATEGORIES[0]);
  const [newLimit, setNewLimit] = useState('');

  const categories = calcCategoryBreakdown(state.transacoes, 'despesa', monthKey);

  function handleAdd(e) {
    e.preventDefault();
    if (!newLimit) { showToast('⚠️ Defina um limite'); return; }
    dispatch({ type: 'SET_BUDGET', payload: { category: newCat, limit: parseFloat(newLimit) } });
    setNewLimit('');
    showToast('✅ Orçamento definido!');
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Add Budget Form */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">Definir Limite por Categoria</div>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label">Categoria</label>
            <select className="form-input" value={newCat} onChange={e => setNewCat(e.target.value)}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label">Limite Mensal (MT)</label>
            <input
              type="number" className="form-input" placeholder="Ex: 20000"
              value={newLimit} onChange={e => setNewLimit(e.target.value)} min="0"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginBottom: '0.1rem' }}>
            <Plus size={16} /> Definir
          </button>
        </form>
      </div>

      {/* Budget Progress */}
      <div className="section-title">Orçamento do Mês</div>

      {state.budgets.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="icon">📊</div>
            <div className="title">Sem orçamentos definidos</div>
            <div className="subtitle">Defina limites para controlar as suas despesas</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {state.budgets.map(budget => {
            const spent = categories.find(c => c.category === budget.category)?.amount || 0;
            const pct = Math.min(100, Math.round((spent / budget.limit) * 100));
            const isOver = pct >= 100;
            const isWarning = pct >= 80 && !isOver;
            const barColor = isOver ? 'var(--color-coral)' : isWarning ? 'var(--color-gold)' : 'var(--color-leaf)';

            return (
              <div key={budget.id || budget.category} className="glass-card animate-fade-in-up" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{budget.category}</span>
                    {isOver && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-coral)', fontWeight: 600 }}>
                        <AlertTriangle size={13} style={{ verticalAlign: 'text-bottom' }} /> Excedido!
                      </span>
                    )}
                    {isWarning && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                        ⚠️ Atenção
                      </span>
                    )}
                    {!isOver && !isWarning && pct > 0 && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-leaf)', fontWeight: 600 }}>
                        <CheckCircle size={13} style={{ verticalAlign: 'text-bottom' }} /> OK
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => { dispatch({ type: 'DELETE_BUDGET', payload: budget.id }); showToast('🗑️ Orçamento removido'); }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
                  <span>{fmt(spent, currency)} gasto</span>
                  <span>Meta: {fmt(budget.limit, currency)}</span>
                </div>

                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                  <span>{pct}% utilizado</span>
                  <span>Restam: {fmt(Math.max(0, budget.limit - spent))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
