import { useState } from 'react';
import { useFinance } from '../hooks/useFinanceStore';
import { Wallet, AlertTriangle, CheckCircle, Plus, Trash2, CalendarDays } from 'lucide-react';
import { fmt } from '../utils/calculations';

export default function Dividas() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDebt, setNewDebt] = useState({ creditor_name: '', total_amount: '', due_date: '' });
  
  const [showPayForm, setShowPayForm] = useState(null); // ID of debt being paid
  const [paymentAmount, setPaymentAmount] = useState('');

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
        payment_date: new Date().toISOString()
      }
    });
    
    setPaymentAmount('');
    setShowPayForm(null);
  };

  const handleDelete = (id) => {
    if (confirm('Tem a certeza que deseja eliminar esta dívida?')) {
      dispatch({ type: 'DELETE_DEBT', payload: id });
    }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Add Debt Form */}
      {showAddForm && (
        <div className="glass-card p-6 border border-gold/30 animate-fade-in-up">
          <h3 className="font-semibold mb-4 text-lg">Registar Nova Dívida</h3>
          <form onSubmit={handleAddDebt} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-l-4 border-l-gold pl-4">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide">Credor / Nome</label>
              <input type="text" className="input" required value={newDebt.creditor_name} onChange={e => setNewDebt({...newDebt, creditor_name: e.target.value})} placeholder="Ex: Banco A, Familiar..." />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide">Valor Total</label>
              <input type="number" className="input" required min="1" step="any" value={newDebt.total_amount} onChange={e => setNewDebt({...newDebt, total_amount: e.target.value})} placeholder="Valor da dívida" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide">Data Limite (Opcional)</label>
              <input type="date" className="input" value={newDebt.due_date} onChange={e => setNewDebt({...newDebt, due_date: e.target.value})} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {debts.map(debt => (
            <div key={debt.id} className={`glass-card p-5 relative overflow-hidden ${debt.status === 'paid' ? 'opacity-70 border border-leaf' : 'border border-gray-200 dark:border-gray-800'}`}>
              
              <div className="flex justify-between items-start mb-3">
                <div className="font-bold text-lg">{debt.creditor_name}</div>
                {debt.status === 'paid' ? (
                  <span className="badge badge-renda">Liquidado</span>
                ) : (
                  <span className="badge badge-despesa">Activo</span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Inicial:</span>
                  <span className="font-medium">{fmt(debt.total_amount, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Em Falta:</span>
                  <span className="font-bold text-coral">{fmt(debt.remaining_amount, currency)}</span>
                </div>
                {debt.due_date && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500"><CalendarDays size={14} className="inline mr-1"/> Limite:</span>
                    <span>{debt.due_date}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full mb-4 overflow-hidden">
                <div 
                  className={`h-full ${debt.status === 'paid' ? 'bg-leaf' : 'bg-gold'}`} 
                  style={{ width: `${Math.min(100, Math.max(0, ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100))}%` }}
                ></div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => handleDelete(debt.id)} className="p-2 text-gray-400 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
                
                {debt.status !== 'paid' && (
                  <button 
                    onClick={() => setShowPayForm(showPayForm === debt.id ? null : debt.id)} 
                    className="btn bg-gold text-dark py-1.5 px-3 text-sm font-semibold hover:bg-gold-light"
                  >
                    Pagar Parcela
                  </button>
                )}
              </div>

              {/* Pay Form Inline */}
              {showPayForm === debt.id && (
                <div className="mt-4 p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-gold/30">
                  <label className="block text-xs mb-1">Valor a pagar</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      className="input py-1 px-2 text-sm" 
                      value={paymentAmount}
                      max={debt.remaining_amount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      placeholder='Ex: 500'
                    />
                    <button onClick={() => handlePay(debt.id)} className="btn btn-primary py-1 px-3 text-sm whitespace-nowrap">
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
