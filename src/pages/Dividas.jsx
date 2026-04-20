import { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { Wallet, AlertTriangle, CheckCircle, Plus, Trash2, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmt } from '../utils/calculations';
import { getPaymentMethodLabel } from '../utils/paymentMethods';
import BinthContextual from '../components/BinthContextual';

export default function Dividas() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDebt, setNewDebt] = useState({ 
    creditor_name: '', 
    principal_amount: '', 
    interest_rate: '', 
    months: '', 
    due_date: '',
    account_id: '' 
  });

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
    if (!newDebt.creditor_name || !newDebt.principal_amount) return;

    const principal = Number(newDebt.principal_amount);
    const rate = Number(newDebt.interest_rate) / 100; // Transform from 20 to 0.20
    const months = Number(newDebt.months);

    // Calculate actual total using Price Table 
    // M = P * i * (1+i)^n / ((1+i)^n - 1)
    let parcela = 0;
    let total = principal;

    if (rate > 0 && months > 0) {
      parcela = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      total = parcela * months;
    } else if (months > 0) {
      parcela = principal / months;
    }

    dispatch({
      type: 'ADD_DEBT',
      payload: {
        creditor_name: newDebt.creditor_name,
        principal_amount: principal,
        interest_rate: rate,
        months_duration: months,
        monthly_payment: parcela,
        total_amount: Number(total.toFixed(2)),
        remaining_amount: Number(total.toFixed(2)),
        due_date: newDebt.due_date,
        account_id: newDebt.account_id || null,
        status: 'pending'
      }
    });

    setNewDebt({ creditor_name: '', principal_amount: '', interest_rate: '', months: '', due_date: '', account_id: '' });
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
          <h1 className="text-2xl font-display font-bold text-dark dark:text-white">{t('debts.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('debts.subtitle')}</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} /> {t('debts.new_debt')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="responsive-grid mb-6">
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-coral">
          <div className="text-xs uppercase tracking-widest text-muted mb-1">{t('debts.total_debt')}</div>
          <div className="text-2xl font-bold text-coral">{fmt(totalRemaining, currency)}</div>
          <Wallet size={32} className="absolute right-4 bottom-4 text-coral opacity-20" />
        </div>
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-leaf">
          <div className="text-xs uppercase tracking-widest text-muted mb-1">{t('debts.total_paid')}</div>
          <div className="text-2xl font-bold text-leaf">{fmt(totalPaid, currency)}</div>
          <CheckCircle size={32} className="absolute right-4 bottom-4 text-leaf opacity-20" />
        </div>
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-gold text-white bg-linear-to-br from-gray-900 to-black">
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">{t('debts.active_debts')}</div>
          <div className="text-2xl font-bold text-gold">{debts.filter(d => d.status !== 'paid').length}</div>
          <AlertTriangle size={32} className="absolute right-4 bottom-4 text-gold opacity-20" />
        </div>
      </div>

      <BinthContextual page="dividas" />

      {/* Biblical Principle Banner — Evitar Dívidas Excessivas */}
      {debts.filter(d => d.status !== 'paid').length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30 text-red-700 dark:text-red-400">
          <span className="text-base shrink-0">📖</span>
          <div className="text-[12px] leading-relaxed">
            <span className="font-bold">{t('debts.bible_principle_title')}: </span>
            {t('debts.bible_principle_text')}
          </div>
        </div>
      )}

      {/* Add Debt Form */}
      {showAddForm && (
        <div className="glass-card p-6 border border-gold/30 animate-fade-in-up mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><span className="text-gold">✦</span> {t('debts.form.title')}</h3>
            <span className="text-xs px-2 py-1 bg-gold/10 text-gold rounded-full border border-gold/20 font-medium">BETA Calculator</span>
          </div>
          <form onSubmit={handleAddDebt} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-l-4 border-l-gold pl-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('debts.form.creditor_label')}</label>
              <input type="text" className="input bg-gray-50 dark:bg-[#0c1018]" required value={newDebt.creditor_name} onChange={e => setNewDebt({ ...newDebt, creditor_name: e.target.value })} placeholder={t('debts.form.creditor_placeholder')} />
            </div>
            
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('debts.form.amount_label')}</label>
              <input type="number" className="input bg-gray-50 dark:bg-[#0c1018]" required min="1" step="any" value={newDebt.principal_amount} onChange={e => setNewDebt({ ...newDebt, principal_amount: e.target.value })} placeholder={t('debts.form.amount_placeholder')} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('debts.form.date_label')}</label>
              <input type="date" className="input bg-gray-50 dark:bg-[#0c1018]" value={newDebt.due_date} onChange={e => setNewDebt({ ...newDebt, due_date: e.target.value })} />
            </div>

            {/* Smart Credit Fields */}
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('debts.form.rate_label')}</label>
              <input type="number" className="input bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 focus:border-blue-500" step="any" min="0" value={newDebt.interest_rate} onChange={e => setNewDebt({ ...newDebt, interest_rate: e.target.value })} placeholder={t('debts.form.rate_placeholder')} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('debts.form.months_label')}</label>
              <input type="number" className="input bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 focus:border-blue-500" step="1" min="0" value={newDebt.months} onChange={e => setNewDebt({ ...newDebt, months: e.target.value })} placeholder={t('debts.form.months_placeholder')} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">Receber dinheiro na conta (Opcional)</label>
              <select 
                className="input bg-green-50/30 dark:bg-green-900/10 border-green-200/50 focus:border-green-500"
                value={newDebt.account_id}
                onChange={e => setNewDebt({ ...newDebt, account_id: e.target.value })}
              >
                <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="">Não registar entrada em conta</option>
                {state.contas?.map(acc => (
                  <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={acc.id} value={acc.id}>{acc.name} • {fmt(acc.current_balance, currency)}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1 italic">Ao selecionar uma conta, o sistema criará automaticamente uma transação de "Empréstimo" e aumentará o saldo dessa conta.</p>
            </div>

            {/* Live Calculation Preview */}
            {(newDebt.principal_amount && newDebt.interest_rate > 0 && newDebt.months > 0) && (
              <div className="md:col-span-2 mt-2 p-4 rounded-xl bg-gray-50 dark:bg-[#101620] border border-gray-200 dark:border-white/10">
                <div className="text-xs text-muted font-bold tracking-widest uppercase mb-3">{t('debts.form.simulation_title')}</div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] text-gray-500">{t('debts.form.installment_label')}</div>
                    <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                      MT {fmt( (Number(newDebt.principal_amount) * (Number(newDebt.interest_rate)/100) * Math.pow(1+(Number(newDebt.interest_rate)/100), Number(newDebt.months))) / (Math.pow(1+(Number(newDebt.interest_rate)/100), Number(newDebt.months)) - 1) )} <span className="text-xs font-normal text-muted">/mês</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">{t('debts.form.total_cost_label')}</div>
                    <div className="font-bold text-lg text-red-500">
                      MT {fmt( ((Number(newDebt.principal_amount) * (Number(newDebt.interest_rate)/100) * Math.pow(1+(Number(newDebt.interest_rate)/100), Number(newDebt.months))) / (Math.pow(1+(Number(newDebt.interest_rate)/100), Number(newDebt.months)) - 1)) * Number(newDebt.months) )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <button type="button" className="btn bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6" onClick={() => setShowAddForm(false)}>{t('debts.form.cancel')}</button>
              <button type="submit" className="btn bg-linear-to-r from-gold to-yellow-600 border-none text-black font-bold px-8 shadow-lg shadow-gold/20">{t('debts.form.save')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Debts List */}
      <div className="section-title mt-8">{t('debts.list_title')}</div>
      {debts.length === 0 ? (
        <div className="glass-card p-10 text-center text-gray-500">
          <CheckCircle size={48} className="mx-auto mb-3 text-leaf/50" />
          <p>{t('debts.empty_state')}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('debts.table.debt')}</th>
                <th className="hide-mobile">{t('debts.table.total_value')}</th>
                <th>{t('debts.table.remaining')}</th>
                <th className="hide-mobile">{t('debts.table.due_date')}</th>
                <th>{t('debts.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {debts.map(debt => (
                <tr key={`debt-${debt.id}`} style={{ opacity: debt.status === 'paid' ? 0.6 : 1 }}>
                  <td>
                    <div className="font-semibold">{debt.creditor_name}</div>
                    <div className="text-[10px] text-muted hide-desktop">{debt.due_date || t('debts.table.no_date')}</div>
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
                          title={t('debts.actions.pay')}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(debt.id)}
                        className="text-coral hover:opacity-70 p-1"
                        title={t('debts.actions.delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {confirmDelete === debt.id && (
                      <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-black border border-coral/30 rounded-xl shadow-xl z-10 animate-fade-in">
                        <p className="text-[10px] font-bold text-coral mb-2">{t('debts.delete_confirm')}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(debt.id)} className="bg-coral text-white text-[10px] px-2 py-1 rounded">{t('debts.yes')}</button>
                          <button onClick={() => setConfirmDelete(null)} className="bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded">{t('debts.no')}</button>
                        </div>
                      </div>
                    )}
                    {showPayForm === debt.id && (
                      <div className="absolute right-0 mt-2 p-4 bg-white dark:bg-black border border-gold/30 rounded-xl shadow-xl z-20 animate-fade-in w-56">
                        <label className="block text-[10px] font-bold mb-1">{t('debts.payment.title')}</label>
                        <input
                          type="number"
                          className="form-input text-xs py-1 mb-2"
                          value={paymentAmount}
                          max={debt.remaining_amount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          placeholder={t('debts.payment.placeholder')}
                        />
                        <label className="block text-[10px] font-bold mb-1">{t('debts.payment.method_label')}</label>
                        <select
                          className="form-input text-xs py-1 mb-3"
                          value={paymentAccount}
                          onChange={e => setPaymentAccount(e.target.value)}
                        >
                          <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="">{t('debts.payment.no_account')}</option>
                          {state.contas?.map(acc => (
                            <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={acc.id} value={acc.id}>{acc.name} • {getPaymentMethodLabel(acc.type)} ({fmt(acc.current_balance, currency)})</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handlePay(debt.id)} className="btn btn-primary flex-1 py-1 text-[10px]">{t('debts.payment.pay_btn')}</button>
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
