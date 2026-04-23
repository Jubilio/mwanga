import React, { useState } from 'react';
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
  const [showBalance] = useState(() => localStorage.getItem('mwanga-show-balance') !== 'false');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDebt, setNewDebt] = useState({ 
    creditor_name: '', 
    principal_amount: '', 
    interest_rate: '', 
    interest_period: 'monthly',
    months: '', 
    due_date: '',
    account_id: '' 
  });

  const [showPayForm, setShowPayForm] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);

  const debts = state.dividas || [];

  const getMonthlyRate = (debt) => {
    if (!debt.interest_rate) return 0;
    // Fallback: if period doesn't exist, assume rate > 0.1 is annual, else monthly
    const isAnnual = debt.interest_period === 'annual' || (!debt.interest_period && debt.interest_rate > 0.1);
    return isAnnual ? debt.interest_rate / 12 : debt.interest_rate;
  };

  const sortedDebts = [...debts].sort((a, b) => {
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (b.status === 'paid' && a.status !== 'paid') return -1;
    return getMonthlyRate(b) - getMonthlyRate(a); // Highest rate first
  });

  const hasToxicDebtsPending = sortedDebts.some(d => d.status !== 'paid' && getMonthlyRate(d) > 0.05);

  const totalDebt = debts.reduce((sum, d) => sum + d.total_amount, 0);
  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining_amount, 0);
  const totalPaid = totalDebt - totalRemaining;

  const handleAddDebt = (e) => {
    e.preventDefault();
    if (!newDebt.creditor_name || !newDebt.principal_amount) return;

    const principal = Number(newDebt.principal_amount);
    const rawRate = Number(newDebt.interest_rate) / 100;
    const isAnnual = newDebt.interest_period === 'annual';
    const effectiveMonthlyRate = isAnnual ? rawRate / 12 : rawRate;
    const months = Number(newDebt.months);

    let parcela = 0;
    let total = principal;

    if (effectiveMonthlyRate > 0 && months > 0) {
      parcela = (principal * effectiveMonthlyRate * Math.pow(1 + effectiveMonthlyRate, months)) / (Math.pow(1 + effectiveMonthlyRate, months) - 1);
      total = parcela * months;
    } else if (months > 0) {
      parcela = principal / months;
    }

    dispatch({
      type: 'ADD_DEBT',
      payload: {
        creditor_name: newDebt.creditor_name,
        principal_amount: principal,
        interest_rate: rawRate,
        interest_period: newDebt.interest_period,
        months_duration: months,
        monthly_payment: parcela,
        total_amount: Number(total.toFixed(2)),
        remaining_amount: Number(total.toFixed(2)),
        due_date: newDebt.due_date,
        account_id: newDebt.account_id || null,
        status: 'pending'
      }
    });

    setNewDebt({ creditor_name: '', principal_amount: '', interest_rate: '', interest_period: 'monthly', months: '', due_date: '', account_id: '' });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark dark:text-white">{t('debts.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('debts.subtitle')}</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2 w-full sm:w-auto justify-center" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} /> {t('debts.new_debt')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="responsive-grid mb-6">
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-coral">
          <div className="text-xs uppercase tracking-widest text-muted mb-1">{t('debts.total_debt')}</div>
          <div className="text-2xl font-bold text-coral">{showBalance ? fmt(totalRemaining, currency) : '••••'}</div>
          <Wallet size={32} className="absolute right-4 bottom-4 text-coral opacity-20" />
        </div>
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-leaf">
          <div className="text-xs uppercase tracking-widest text-muted mb-1">{t('debts.total_paid')}</div>
          <div className="text-2xl font-bold text-leaf">{showBalance ? fmt(totalPaid, currency) : '••••'}</div>
          <CheckCircle size={32} className="absolute right-4 bottom-4 text-leaf opacity-20" />
        </div>
        <div className="glass-card p-5 relative overflow-hidden border-t-4 border-t-gold text-white bg-linear-to-br from-gray-900 to-black">
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">{t('debts.active_debts')}</div>
          <div className="text-2xl font-bold text-gold">{debts.filter(d => d.status !== 'paid').length}</div>
          <AlertTriangle size={32} className="absolute right-4 bottom-4 text-gold opacity-20" />
        </div>
      </div>

      <BinthContextual page="dividas" />

      {/* Biblical Principle Banner */}
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

            <div>
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('debts.form.rate_label')}</label>
              <div className="flex gap-2">
                <input type="number" className="input bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 focus:border-blue-500 flex-1" step="any" min="0" value={newDebt.interest_rate} onChange={e => setNewDebt({ ...newDebt, interest_rate: e.target.value })} placeholder={t('debts.form.rate_placeholder')} />
                <select 
                  className="input bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 focus:border-blue-500 w-28 px-2"
                  value={newDebt.interest_period}
                  onChange={e => setNewDebt({ ...newDebt, interest_period: e.target.value })}
                >
                  <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="monthly">Ao Mês</option>
                  <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="annual">Ao Ano</option>
                </select>
              </div>
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
            </div>

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
              {sortedDebts.map(debt => {
                const monthlyRate = getMonthlyRate(debt);
                const isToxic = debt.status !== 'paid' && monthlyRate > 0.05; // > 5% per month

                return (
                <React.Fragment key={`debt-${debt.id}`}>
                <tr className={isToxic ? 'bg-red-50/50 dark:bg-red-900/10' : ''} style={{ opacity: debt.status === 'paid' ? 0.6 : 1 }}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{debt.creditor_name}</div>
                      {isToxic && (
                        <span className="flex h-2 w-2 relative" title="Dívida Tóxica (Juros muito altos)">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted hide-desktop">{debt.due_date || t('debts.table.no_date')}</div>
                  </td>
                  <td className="hide-mobile text-muted">{showBalance ? fmt(debt.total_amount, currency) : '••••'}</td>
                  <td className="font-bold text-coral">{showBalance ? fmt(debt.remaining_amount, currency) : '••••'}</td>
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
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(debt.id)}
                        className="text-coral hover:opacity-70 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                {showPayForm === debt.id && (
                  <tr className="bg-gray-50/50 dark:bg-[#151c27]">
                    <td colSpan="5" className="p-4 border-t border-gray-100 dark:border-white/5">
                      <div className="flex flex-col gap-4">
                        {!isToxic && hasToxicDebtsPending && (
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-700/30 text-orange-700 dark:text-orange-400 shadow-sm">
                            <span className="text-sm shrink-0 mt-0.5">⚠️</span>
                            <div className="text-[12px] leading-snug">
                              <span className="font-bold">Intervenção Binth: </span>
                              Estás prestes a pagar uma dívida mais barata enquanto uma <strong>Dívida Tóxica</strong> continua a sugar o teu dinheiro com juros altíssimos. Recomendamos fechar a dívida tóxica primeiro!
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                          <input 
                            type="number" 
                            className="input py-2 text-sm w-32 border-gray-200 dark:border-gray-700 focus:border-gold" 
                            placeholder="Valor a Pagar..." 
                            value={paymentAmount} 
                            onChange={e => setPaymentAmount(e.target.value)} 
                            autoFocus
                          />
                          <select 
                            className="input py-2 text-sm max-w-[200px] border-gray-200 dark:border-gray-700"
                            value={paymentAccount}
                            onChange={e => setPaymentAccount(e.target.value)}
                          >
                            <option value="">Sem Saída de Conta</option>
                            {state.contas?.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name} • {fmt(acc.current_balance, currency)}</option>
                            ))}
                          </select>
                          <button 
                            className="btn bg-leaf hover:bg-green-600 border-none text-white font-bold py-2 px-5 text-sm shadow-md shadow-leaf/20"
                            onClick={() => handlePay(debt.id)}
                          >
                            Confirmar Pagamento
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
