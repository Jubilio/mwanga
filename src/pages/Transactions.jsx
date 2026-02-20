import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { Plus, Search, Trash2, Download } from 'lucide-react';
import { fmt, exportToCSV } from '../utils/calculations';

const CATEGORIES = [
  'Salário', 'Renda Casa', 'Alimentação', 'Transporte', 'Saúde',
  'Educação', 'Energia/Água', 'Internet', 'Igreja/Doações',
  'Lazer', 'Investimentos', 'Poupança', 'Outro',
];

const TYPES = [
  { value: 'receita', label: '💰 Receita' },
  { value: 'despesa', label: '💸 Despesa' },
  { value: 'renda', label: '🏠 Renda da Casa' },
  { value: 'poupanca', label: '🏦 Poupança' },
];

export default function Transactions() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    data: today, tipo: 'despesa', desc: '', valor: '', cat: 'Alimentação', nota: '',
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.desc || !form.valor) {
      showToast('⚠️ Preencha descrição e valor');
      return;
    }
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: { ...form, valor: parseFloat(form.valor) },
    });
    setForm({ ...form, desc: '', valor: '', nota: '' });
    showToast('✅ Transação adicionada!');
  }

  const filtered = state.transacoes
    .filter(t => filterType === 'all' || t.tipo === filterType)
    .filter(t =>
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      t.cat.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Add Transaction Form */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">
          <span>Adicionar Transação</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            <div>
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-input"
                value={form.data}
                onChange={e => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Tipo</label>
              <select
                className="form-input"
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              >
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Descrição</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Supermercado, Salário..."
                value={form.desc}
                onChange={e => setForm({ ...form, desc: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Valor (MT)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                min="0"
                value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Categoria</label>
              <select
                className="form-input"
                value={form.cat}
                onChange={e => setForm({ ...form, cat: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Notas</label>
              <input
                type="text"
                className="form-input"
                placeholder="Observação..."
                value={form.nota}
                onChange={e => setForm({ ...form, nota: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </form>
      </div>

      {/* Filters + Export */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{
            position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-muted)',
          }} />
          <input
            type="text"
            className="form-input"
            placeholder="Pesquisar transações..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <select
          className="form-input"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ width: 'auto', minWidth: '140px' }}
        >
          <option value="all">Todos os tipos</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          className="btn btn-primary"
          onClick={() => { exportToCSV(state.transacoes); showToast('📥 CSV exportado!'); }}
          style={{ fontSize: '0.8rem' }}
        >
          <Download size={14} /> CSV
        </button>
      </div>

      {/* Count */}
      <div className="section-title">
        <span>Todas as Transações</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 400, fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>
          {filtered.length} registos
        </span>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="icon">📭</div>
                      <div className="title">Sem transações</div>
                      <div className="subtitle">Adicione a primeira transação acima</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{t.data}</td>
                    <td style={{ fontWeight: 500 }}>
                      {t.desc}
                      {t.nota && <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{t.nota}</div>}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{t.cat}</td>
                    <td><span className={`badge badge-${t.tipo}`}>{t.tipo}</span></td>
                    <td style={{
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      color: t.tipo === 'despesa' ? 'var(--color-coral)' : 'var(--color-leaf)',
                    }}>
                      {t.tipo === 'despesa' ? '−' : '+'}{fmt(t.valor, currency)}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => { dispatch({ type: 'DELETE_TRANSACTION', payload: t.id }); showToast('🗑️ Removido'); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
