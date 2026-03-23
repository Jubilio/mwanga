import { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { Wallet, AlertTriangle, CheckCircle, Plus, Trash2, CalendarDays, CheckCircle2 } from 'lucide-react';
import { fmt } from '../utils/calculations';
import { getPaymentMethodLabel } from '../utils/paymentMethods';
import BinthContextual from '../components/BinthContextual';

export default function Dividas() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDebt, setNewDebt] = useState({ creditor_name: '', total_amount: '', due_date: '' });

  const [showPayForm, setShowPayForm] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);

  const debts = state.dividas || [];

  const totalDebt = debts.reduce((sum, d) => sum + d.total_amount, 0);
  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining_amount, 0);
  const totalPaid = totalDebt - totalRemaining;

  const handleAddDebt = (e) => {
    e.preventDefault();
    if (!newDebt.creditor_name || !newDebt.total_amount) return;

    dispatch({
      type: 'ADD_DEBT',
      payload: {
        creditor_name: newDebt.creditor_name,
        total_amount: Number(newDebt.total_amount),
        remaining_amount: Number(newDebt.total_amount),
        due_date: newDebt.due_date,
        status: 'pending'
      }
    });

    setNewDebt({ creditor_name: '', total_amount: '', due_date: '' });
    setShowAddForm(false);
  };

  const handlePay = (debtId) => {
    if (!paymentAmount) return;

    dispatch({
      type: 'PAY_DEBT',
      payload: {
        debtId,
        amount: Number(paymentAmount),
        account_id: paymentAccount || null,
        payment_date: new Date().toISOString()
      }
    });

    setPaymentAmount('');
    setPaymentAccount('');
    setShowPayForm(null);
  };

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_DEBT', payload: id });
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark dark:text-white">Gestão de Dívidas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Controle e elimine as suas obrigações financeiras.</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} /> Nova Dívida
        </button>
      </div>

      {/* Summary Cards */}
      <div className="responsive-grid mb-6">
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-coral">
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Total em Dívida</div>
          <div className="text-2xl font-bold text-coral">{fmt(totalRemaining, currency)}</div>
          <Wallet size={32} className="absolute right-4 bottom-4 text-coral opacity-20" />
        </div>
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-leaf">
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Total Pago</div>
          <div className="text-2xl font-bold text-leaf">{fmt(totalPaid, currency)}</div>
          <CheckCircle size={32} className="absolute right-4 bottom-4 text-leaf opacity-20" />
        </div>
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-gold text-white bg-gradient-to-br from-gray-900 to-black">
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">Dívidas Activas</div>
          <div className="text-2xl font-bold text-gold">{debts.filter(d => d.status !== 'paid').length}</div>
          <AlertTriangle size={32} className="absolute right-4 bottom-4 text-gold opacity-20" />
        </div>
      </div>

      <BinthContextual page="dividas" />

      {/* Biblical Principle Banner — Evitar Dívidas Excessivas */}
      {debts.filter(d => d.status !== 'paid').length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30 text-red-700 dark:text-red-400">
          <span className="text-base flex-shrink-0">📖</span>
          <div className="text-[12px] leading-relaxed">
            <span className="font-bold">Evitar Dívidas Excessivas: </span>
            A dívida é um peso que limita a tua liberdade. O objetivo é reduzir, não acumular. Prioriza a dívida com maior juro e põe um bocado extra nela cada mês.
          </div>
        </div>
      )}

      {/* Add Debt Form */}
      {showAddForm && (
        <div className="glass-card p-6 border border-gold/30 animate-fade-in-up">
          <h3 className="font-semibold mb-4 text-lg">Registar Nova Dívida</h3>
          <form onSubmit={handleAddDebt} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-l-4 border-l-gold pl-4">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide">Credor / Nome</label>
              <input type="text" className="input" required value={newDebt.creditor_name} onChange={e => setNewDebt({ ...newDebt, creditor_name: e.target.value })} placeholder="Ex: Banco A, Familiar..." />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide">Valor Total</label>
              <input type="number" className="input" required min="1" step="any" value={newDebt.total_amount} onChange={e => setNewDebt({ ...newDebt, total_amount: e.target.value })} placeholder="Valor da dívida" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide">Data Limite (Opcional)</label>
              <input type="date" className="input" value={newDebt.due_date} onChange={e => setNewDebt({ ...newDebt, due_date: e.target.value })} />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
              <button type="button" className="btn bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300" onClick={() => setShowAddForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Adicionar Dívida</button>
            </div>
          </form>
        </div>
      )}

      {/* Debts List */}
      <div className="section-title mt-8">As Suas Dívidas</div>
      {debts.length === 0 ? (
        <div className="glass-card p-10 text-center text-gray-500">
          <CheckCircle size={48} className="mx-auto mb-3 text-leaf/50" />
          <p>Nenhuma dívida registada. Excelente saúde financeira!</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dívida</th>
                <th className="hide-mobile">Valor Total</th>
                <th>Restante</th>
                <th className="hide-mobile">Vencimento</th>
                <th>Acções</th>
              </tr>
            </thead>
            <tbody>
              {debts.map(debt => (
                <tr key={`debt-${debt.id}`} style={{ opacity: debt.status === 'paid' ? 0.6 : 1 }}>
                  <td>
                    <div className="font-semibold">{debt.creditor_name}</div>
                    <div className="text-[10px] text-muted hide-desktop">{debt.due_date || 'Sem data'}</div>
                  </td>
                  <td className="hide-mobile text-muted">{fmt(debt.total_amount, currency)}</td>
                  <td className="font-bold text-coral">{fmt(debt.remaining_amount, currency)}</td>
                  <td className="hide-mobile">
                    {debt.due_date ? (
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-muted" />
                        {debt.due_date}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {debt.status !== 'paid' && (
                        <button
                          onClick={() => setShowPayForm(showPayForm === debt.id ? null : debt.id)}
                          className="text-leaf hover:opacity-70 p-1"
                          title="Pagar parcela"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(debt.id)}
                        className="text-coral hover:opacity-70 p-1"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {confirmDelete === debt.id && (
                      <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-black border border-coral/30 rounded-xl shadow-xl z-10 animate-fade-in">
                        <p className="text-[10px] font-bold text-coral mb-2">Eliminar?</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(debt.id)} className="bg-coral text-white text-[10px] px-2 py-1 rounded">Sim</button>
                          <button onClick={() => setConfirmDelete(null)} className="bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded">Não</button>
                        </div>
                      </div>
                    )}
                    {showPayForm === debt.id && (
                      <div className="absolute right-0 mt-2 p-4 bg-white dark:bg-black border border-gold/30 rounded-xl shadow-xl z-20 animate-fade-in w-56">
                        <label className="block text-[10px] font-bold mb-1">VALOR A PAGAR</label>
                        <input
                          type="number"
                          className="form-input text-xs py-1 mb-2"
                          value={paymentAmount}
                          max={debt.remaining_amount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          placeholder="Quantia..."
                        />
                        <label className="block text-[10px] font-bold mb-1">MEIO DE PAGAMENTO</label>
                        <select
                          className="form-input text-xs py-1 mb-3"
                          value={paymentAccount}
                          onChange={e => setPaymentAccount(e.target.value)}
                        >
                          <option value="">Não descontar de saldo</option>
                          {state.contas?.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} • {getPaymentMethodLabel(acc.type)} ({fmt(acc.current_balance, currency)})</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handlePay(debt.id)} className="btn btn-primary flex-1 py-1 text-[10px]">Pagar</button>
                          <button onClick={() => setShowPayForm(null)} className="btn bg-gray-100 dark:bg-gray-800 flex-1 py-1 text-[10px]">X</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
