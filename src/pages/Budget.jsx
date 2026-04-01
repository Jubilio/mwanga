import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { fmt, calcCategoryBreakdown, getMonthKey } from '../utils/calculations';

const EXPENSE_CATEGORIES = [
  'AlimentaÃ§Ã£o', 'Transporte', 'Energia/Ãgua', 'Internet',
  'SaÃºde', 'EducaÃ§Ã£o', 'Igreja/DoaÃ§Ãµes', 'Lazer',
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
    if (!newLimit) { showToast('âš ï¸ Defina um limite'); return; }
    dispatch({ type: 'SET_BUDGET', payload: { category: newCat, limit: parseFloat(newLimit) } });
    setNewLimit('');
    showToast('âœ… OrÃ§amento definido!');
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
      <div className="section-title">OrÃ§amento do MÃªs</div>

      {state.budgets.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="icon">ðŸ“Š</div>
            <div className="title">Sem orÃ§amentos definidos</div>
            <div className="subtitle">Defina limites para controlar as suas despesas</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Biblical Principle Banner â€” Contentamento */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-700/30 text-indigo-700 dark:text-indigo-400">
            <span className="text-base flex-shrink-0">ðŸ“–</span>
            <div className="text-[12px] leading-relaxed">
              <span className="font-bold">Contentamento: </span>
              A riqueza real comeÃ§a por saber o que Ã© suficiente. Cada limite de orÃ§amento que defines Ã© uma escolha sÃ¡bia de quem governa o seu dinheiro com intencionalidade.
            </div>
          </div>

          {state.budgets.map(budget => {
            const spent = categories.find(c => c.category === budget.category)?.amount || 0;
            const budgetLimit = Number(budget.limit || 0);
            const pct = budgetLimit > 0 ? Math.min(100, Math.round((spent / budgetLimit) * 100)) : (spent > 0 ? 100 : 0);
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
                        âš ï¸ AtenÃ§Ã£o
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
                    onClick={() => {
                      dispatch({
                        type: 'DELETE_BUDGET',
                        payload: budget.id,
                        meta: { category: budget.category }
                      });
                      showToast('Orcamento removido');
                    }}
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

                {/* Biblical micro-tip when over budget */}
                {isOver && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--color-coral)', display: 'flex', gap: 5, alignItems: 'flex-start', opacity: 0.9 }}>
                    <span>ðŸ“–</span>
                    <em>PrincÃ­pio do Contentamento: reveja o que Ã© essencial nesta categoria antes do prÃ³ximo gasto.</em>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
