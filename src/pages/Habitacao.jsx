import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { Plus, Trash2, Home, Key, Settings } from 'lucide-react';
import { fmt, getMonthKey } from '../utils/calculations';

export default function Habitacao() {
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  const monthKey = getMonthKey();

  const type = state.settings.housing_type || 'renda';

  const [form, setForm] = useState({
    mes: monthKey, proprietario: '', valor: '', estado: 'pago', obs: '',
  });

  // Load defaults from global settings
  useEffect(() => {
    if (state.settings.default_rent || state.settings.landlord_name) {
      setForm(prev => ({
        ...prev,
        proprietario: prev.proprietario || state.settings.landlord_name || '',
        valor: prev.valor || state.settings.default_rent || '',
      }));
    }
  }, [state.settings.default_rent, state.settings.landlord_name]);

  function saveDefaults() {
    if (!form.proprietario || !form.valor) {
      showToast('⚠️ Preencha nome e valor para guardar como padrão');
      return;
    }
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'landlord_name', value: form.proprietario } });
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'default_rent', value: parseFloat(form.valor) } });
    showToast('💾 Definições guardadas como padrão!');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (type === 'renda' && (!form.proprietario || !form.valor)) {
      showToast('⚠️ Preencha proprietário e valor');
      return;
    }
    if (type === 'propria' && !form.valor) {
      showToast('⚠️ Preencha o valor da manutenção/prestação');
      return;
    }

    dispatch({ 
      type: 'ADD_RENDA', 
      payload: { 
        ...form, 
        proprietario: type === 'propria' ? 'Casa Própria' : form.proprietario,
        valor: parseFloat(form.valor) 
      } 
    });
    setForm({ ...form, proprietario: '', valor: '', obs: '' });
    showToast(type === 'renda' ? '🏠 Aluguer registado!' : '🏠 Manutenção registada!');
  }

  const toggleType = (newType) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'housing_type', value: newType } });
    showToast(`Perfil alterado para: ${newType === 'renda' ? 'Arrendamento' : 'Casa Própria'}`);
  };

  const totalPago = state.rendas.filter(r => r.estado === 'pago').reduce((s, r) => s + r.valor, 0);
  const pendente = state.rendas.filter(r => r.estado === 'pendente').reduce((s, r) => s + r.valor, 0);

  const statusIcon = { pago: '✅', pendente: '⏳', atrasado: '⚠️' };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Header Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-ocean)' }}>
          Gestão de Habitação
        </h2>
        <div className="glass-card" style={{ padding: '0.25rem', display: 'flex', gap: '0.25rem' }}>
          <button 
            onClick={() => toggleType('renda')}
            className={`btn ${type === 'renda' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          >
            <Key size={14} style={{ marginRight: '0.4rem' }} /> Arrendamento
          </button>
          <button 
            onClick={() => toggleType('propria')}
            className={`btn ${type === 'propria' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          >
            <Home size={14} style={{ marginRight: '0.4rem' }} /> Casa Própria
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div style={{
        background: type === 'renda' 
          ? 'linear-gradient(135deg, var(--color-ocean), var(--color-sky))'
          : 'linear-gradient(135deg, #2c3e50, #4ca1af)',
        borderRadius: '20px',
        padding: '2rem',
        color: 'white',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', fontSize: '5rem', opacity: 0.15 }}>
          {type === 'renda' ? '🔑' : '🏡'}
        </div>
        <div style={{ opacity: 0.8, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
          {type === 'renda' ? 'Habitação — Em Arrendamento' : 'Habitação — Casa Própria'}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.2rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
        }}>
          {fmt(totalPago)}
        </div>
        <div style={{ opacity: 0.75, fontSize: '0.8rem' }}>Total investido este ano</div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.82rem' }}>
          <div>
            <span style={{ opacity: 0.7 }}>A pagar: </span>
            <strong>{fmt(pendente)}</strong>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">
          {type === 'renda' ? 'Registar Aluguer' : 'Registar Manutenção / Prestação'}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}>
            <div>
              <label className="form-label">Mês/Ano</label>
              <input type="month" className="form-input" value={form.mes} onChange={e => setForm({ ...form, mes: e.target.value })} />
            </div>
            {type === 'renda' && (
              <div>
                <label className="form-label">Proprietário</label>
                <input type="text" className="form-input" placeholder="Nome do senhorio" value={form.proprietario} onChange={e => setForm({ ...form, proprietario: e.target.value })} />
              </div>
            )}
            <div>
              <label className="form-label">Valor (MT)</label>
              <input type="number" className="form-input" placeholder="Valor mensal" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select className="form-input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option value="pago">✅ Pago</option>
                <option value="pendente">⏳ Pendente</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Observações</label>
              <input type="text" className="form-input" placeholder="Detalhes adicionais..." value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> {type === 'renda' ? 'Registar' : 'Registar Despesa'}
            </button>
            {type === 'renda' && (
              <button 
                type="button" 
                onClick={saveDefaults} 
                className="btn btn-ghost" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                💾 Definir como Padrão
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="section-title">Histórico de Gastos</div>
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Mês</th><th>Descrição</th><th>Valor</th><th>Estado</th><th>Notas</th><th></th></tr>
            </thead>
            <tbody>
              {state.rendas.map((r, idx) => (
                <tr key={r.id || `rent-${idx}`}>
                  <td>{r.mes}</td>
                  <td style={{ fontWeight: 500 }}>{r.proprietario}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(r.valor)}</td>
                  <td>
                    <span className={`badge badge-${r.estado}`}>
                      {statusIcon[r.estado]} {r.estado}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}>{r.obs}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => { dispatch({ type: 'DELETE_RENDA', payload: r.id }); showToast('🗑️ Removido'); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
