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
  const [showScheduleId, setShowScheduleId] = useState(null);

  const debts = state.dividas || [];

  const getMonthlyRate = (debt) => {
    const rawRate = Number(debt.interest_rate || 0);
    if (rawRate <= 0) return 0;
    // Fallback: if period doesn't exist, assume rate > 0.1 is annual, else monthly
    const isAnnual = debt.interest_period === 'annual' || (!debt.interest_period && rawRate > 0.1);
    return isAnnual ? rawRate / 12 : rawRate;
  };

  const getElapsedMonths = (startDateStr) => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const today = new Date();
    const yearsDiff = today.getFullYear() - start.getFullYear();
    const monthsDiff = today.getMonth() - start.getMonth();
    return Math.max(0, (yearsDiff * 12) + monthsDiff);
  };

  const getDynamicRemainingAmount = (debt) => {
    const total_amount = Number(debt.total_amount || 0);
    const remaining_amount = Number(debt.remaining_amount || 0);
    const principal_amount = Number(debt.principal_amount || 0);
    
    const rate = getMonthlyRate(debt);
    const principal = principal_amount > 0 ? principal_amount : total_amount;
    const elapsed = getElapsedMonths(debt.due_date || debt.created_at);
    
    if (elapsed > 0 && rate > 0 && debt.status !== 'paid') {
      // Cálculo de Juros Compostos (Compound Interest)
      // Fórmula: M = P * (1 + i)^n
      const compoundAmount = principal * Math.pow(1 + rate, elapsed);
      const accumInt = compoundAmount - principal;
      const paidAmount = total_amount - remaining_amount;
      return Math.max(0, principal + accumInt - paidAmount);
    }
    return remaining_amount;
  };

  const generateAmortizationSchedule = (debt) => {
    const principal_amount = Number(debt.principal_amount || 0);
    const total_amount = Number(debt.total_amount || 0);
    const remaining_amount = Number(debt.remaining_amount || 0);
    const months_duration = Number(debt.months_duration || debt.months || 12);

    const principal = principal_amount > 0 ? principal_amount : total_amount;
    const rate = getMonthlyRate(debt);
    const months = months_duration > 0 ? months_duration : 12;
    
    if (months <= 0) return [];
    
    let runningPaid = total_amount - remaining_amount;
    
    if (rate <= 0) {
      const payment = principal / months;
      const schedule = [];
      let balance = principal;
      for (let m = 1; m <= months; m++) {
        balance = Math.max(0, balance - payment);
        let status = 'pending';
        if (runningPaid >= payment) {
          status = 'paid';
          runningPaid -= payment;
        } else if (runningPaid > 0) {
          status = 'partial';
          runningPaid = 0;
        }
        schedule.push({
          period: m,
          payment: Number(payment.toFixed(2)),
          interest: 0,
          amortization: Number(payment.toFixed(2)),
          balance: Number(balance.toFixed(2)),
          status
        });
      }
      return schedule;
    }
    
    const schedule = [];
    let balance = principal;
    
    // Price Amortization Formula: P = (PV * r * (1+r)^n) / ((1+r)^n - 1)
    const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    
    for (let m = 1; m <= months; m++) {
      const interest = balance * rate;
      const amortization = payment - interest;
      balance = Math.max(0, balance - amortization);
      
      let status = 'pending';
      if (runningPaid >= payment) {
        status = 'paid';
        runningPaid -= payment;
      } else if (runningPaid > 0) {
        status = 'partial';
        runningPaid = 0;
      }
      
      schedule.push({
        period: m,
        payment: Number(payment.toFixed(2)),
        interest: Number(interest.toFixed(2)),
        amortization: Number(amortization.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        status
      });
    }
    return schedule;
  };

  const sortedDebts = [...debts].sort((a, b) => {
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (b.status === 'paid' && a.status !== 'paid') return -1;
    return getMonthlyRate(b) - getMonthlyRate(a); // Highest rate first
  });

  const hasToxicDebtsPending = sortedDebts.some(d => d.status !== 'paid' && getMonthlyRate(d) > 0.05);

  const totalRemaining = debts.reduce((sum, d) => sum + getDynamicRemainingAmount(d), 0);
  const totalPaid = debts.reduce((sum, d) => sum + (Number(d.total_amount || 0) - Number(d.remaining_amount || 0)), 0);
  const totalDebt = totalRemaining + totalPaid;

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
              <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-500 dark:text-gray-400">Depositar valor pedido na conta (Opcional)</label>
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
              {newDebt.account_id && (
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  💳 Apenas o <strong>Valor Pedido</strong> (capital) será depositado nesta conta — os juros não entram.
                </p>
              )}
            </div>

            {/* Live Loan Preview */}
            {(() => {
              const principal = Number(newDebt.principal_amount) || 0;
              const rawRate = Number(newDebt.interest_rate) || 0;
              const months = Number(newDebt.months) || 0;
              const isAnnual = newDebt.interest_period === 'annual';
              const monthlyRate = isAnnual ? rawRate / 100 / 12 : rawRate / 100;
              let parcela = 0;
              let totalPagar = principal;
              let totalJuros = 0;
              if (monthlyRate > 0 && months > 0) {
                parcela = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
                totalPagar = parcela * months;
                totalJuros = totalPagar - principal;
              } else if (months > 0 && principal > 0) {
                parcela = principal / months;
                totalPagar = principal;
              }
              if (principal <= 0) return null;
              return (
                <div className="md:col-span-2 rounded-xl border border-gold/30 bg-gradient-to-br from-gold/5 to-yellow-900/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gold mb-3">✦ Resumo do Empréstimo</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Valor Pedido</p>
                      <p className="text-sm font-black text-white">{fmt(principal, currency)}</p>
                      <p className="text-[9px] text-emerald-400">entra na conta</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Juros Total</p>
                      <p className="text-sm font-black text-red-400">{fmt(totalJuros, currency)}</p>
                      <p className="text-[9px] text-gray-500">
                        {rawRate > 0 ? `${rawRate}% ${isAnnual ? 'a.a.' : 'a.m.'}` : 'sem juros'}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-coral/10 border border-coral/20">
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Valor a Pagar</p>
                      <p className="text-sm font-black text-coral">{fmt(totalPagar, currency)}</p>
                      <p className="text-[9px] text-gray-500">{months > 0 ? `em ${months} meses` : '—'}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Parcela / Mês</p>
                      <p className="text-sm font-black text-sky">{parcela > 0 ? fmt(parcela, currency) : '—'}</p>
                      <p className="text-[9px] text-gray-500">{months > 0 ? `× ${months}` : ''}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                <th className="hide-mobile">Valor Pedido / Final</th>
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
                  <td className="hide-mobile text-muted">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-gray-800 dark:text-gray-200" title="Valor Pedido (Principal)">
                        {showBalance ? fmt(debt.principal_amount || debt.total_amount, currency) : '••••'}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-gray-500" title="Valor Final com Juros Projetados">
                        Final: {showBalance ? fmt(debt.total_amount, currency) : '••••'}
                      </span>
                    </div>
                  </td>
                  <td className="font-bold text-coral flex flex-col justify-center">
                    <span>{showBalance ? fmt(getDynamicRemainingAmount(debt), currency) : '••••'}</span>
                    {getElapsedMonths(debt.due_date || debt.created_at) > 0 && getMonthlyRate(debt) > 0 && debt.status !== 'paid' && (
                      <span className="text-[9px] text-red-500 uppercase tracking-wider font-bold animate-pulse">
                        + Juros Compostos
                      </span>
                    )}
                  </td>
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
                          onClick={() => {
                            setShowPayForm(showPayForm === debt.id ? null : debt.id);
                            setShowScheduleId(null);
                          }}
                          className="text-leaf hover:opacity-70 p-1"
                          title="Registar Pagamento"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      {debt.status !== 'paid' && (
                        <button
                          onClick={() => {
                            setShowScheduleId(showScheduleId === debt.id ? null : debt.id);
                            setShowPayForm(null);
                          }}
                          className={`p-1 transition-colors ${showScheduleId === debt.id ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-400'}`}
                          title="Ver Fluxo da Dívida"
                        >
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(debt.id)}
                        className="text-coral hover:opacity-70 p-1"
                        title="Eliminar Dívida"
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
                {showScheduleId === debt.id && (() => {
                  const interest_rate = Number(debt.interest_rate || 0);
                  const total_amount = Number(debt.total_amount || 0);
                  const remaining_amount = Number(debt.remaining_amount || 0);
                  const principal_amount = Number(debt.principal_amount || 0);
                  const months_duration = Number(debt.months_duration || debt.months || 12);
                  const monthly_payment = Number(debt.monthly_payment || 0);
                  
                  const mRate = getMonthlyRate(debt);
                  const principal = principal_amount > 0 ? principal_amount : total_amount;
                  const elapsed = getElapsedMonths(debt.due_date || debt.created_at);
                  
                  // Juros compostos: M = P * (1 + i)^n
                  const compoundAmount = principal * Math.pow(1 + mRate, elapsed);
                  const accumInt = compoundAmount - principal;
                  const updRemaining = Math.max(0, compoundAmount - (total_amount - remaining_amount));
                  
                  const projectedInterest = Math.max(0, total_amount - principal);
                  const realPaid = total_amount - remaining_amount;
                  const finalMonthlyPayment = monthly_payment > 0 ? monthly_payment : (total_amount / (months_duration > 0 ? months_duration : 12));
                  
                  return (
                    <tr className="bg-gray-50/70 dark:bg-[#0e1420]">
                      <td colSpan="5" className="p-6 border-t border-gray-100 dark:border-white/5">
                        <div className="space-y-5 animate-fade-in text-slate-800 dark:text-gray-200">
                          {/* Header Title */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-white/5 pb-3">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Fluxo da Dívida e Cronograma de Amortização</h4>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Calculado dinamicamente com base na Tabela Price (Amortização Francesa).</p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              Juros: {(interest_rate * 100).toFixed(1)}% {debt.interest_period === 'annual' ? 'ao Ano' : 'ao Mês'}
                            </span>
                          </div>

                          {/* Simulador de Taxa de Juro/Dívida Ativa */}
                          {interest_rate === 0 && (
                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs space-y-3 mb-4">
                              <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                💡 Ajustar Taxa de Juros e Data de Início
                              </div>
                              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-[11px]">
                                Esta dívida foi registrada com <strong>0% de juros</strong>. Para simular e acompanhar o acúmulo de juros de mora reais (ex: os 30% contraídos em Março), ajuste os valores abaixo para atualizar o banco de dados:
                              </p>
                              <form onSubmit={(e) => {
                                e.preventDefault();
                                const rateInput = Number(e.target.rate.value) / 100;
                                const dateInput = e.target.due_date.value;
                                const principalInput = Number(e.target.principal.value) || total_amount;
                                const durationInput = Number(e.target.duration.value) || 12;
                                
                                const newMonthlyPayment = (principalInput * rateInput * Math.pow(1 + rateInput, durationInput)) / (Math.pow(1 + rateInput, durationInput) - 1);
                                const newTotal = rateInput > 0 ? (newMonthlyPayment * durationInput) : principalInput;
                                
                                dispatch({
                                  type: 'UPDATE_DEBT',
                                  payload: {
                                    id: debt.id,
                                    creditor_name: debt.creditor_name,
                                    principal_amount: principalInput,
                                    interest_rate: rateInput,
                                    interest_period: 'monthly',
                                    months_duration: durationInput,
                                    monthly_payment: rateInput > 0 ? Number(newMonthlyPayment.toFixed(2)) : (principalInput / durationInput),
                                    total_amount: Number(newTotal.toFixed(2)),
                                    due_date: dateInput
                                  }
                                });
                              }} className="flex flex-wrap items-end gap-3 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase font-bold text-gray-400 block">Capital Principal</label>
                                  <input type="number" name="principal" defaultValue={principal} className="input py-1.5 px-2.5 text-xs bg-white dark:bg-[#0c1018] w-28 border border-gray-200 dark:border-gray-800" required />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase font-bold text-gray-400 block">Taxa de Juro (% ao Mês)</label>
                                  <input type="number" name="rate" defaultValue={30} className="input py-1.5 px-2.5 text-xs bg-white dark:bg-[#0c1018] w-24 border border-gray-200 dark:border-gray-800" required />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase font-bold text-gray-400 block">Duração (Meses)</label>
                                  <input type="number" name="duration" defaultValue={months_duration} className="input py-1.5 px-2.5 text-xs bg-white dark:bg-[#0c1018] w-24 border border-gray-200 dark:border-gray-800" required />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase font-bold text-gray-400 block">Início da Contração</label>
                                  <input type="date" name="due_date" defaultValue={debt.due_date || debt.created_at?.split('T')[0] || '2026-03-01'} className="input py-1.5 px-2.5 text-xs bg-white dark:bg-[#0c1018] w-32 border border-gray-200 dark:border-gray-800" required />
                                </div>
                                <button type="submit" className="btn py-1.5 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none shrink-0 shadow-md">
                                  Simular e Salvar
                                </button>
                              </form>
                            </div>
                          )}

                          {/* Arrears Warning Alert */}
                          {elapsed > 0 && mRate > 0.05 && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-200 text-xs space-y-2 mb-4">
                              <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
                                <span className="animate-pulse flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                                ALERTA DE ANÁLISE DE MORA: Dívida Tóxica em Acumulação!
                              </div>
                              <p className="leading-relaxed">
                                Esta dívida foi contraída em <strong className="text-black dark:text-white">Março/Início</strong> (há <strong>{elapsed} meses decorridos</strong>) e possui uma taxa de juro severa de <strong className="text-black dark:text-white">{(mRate * 100).toFixed(0)}% ao mês</strong>. Como não foram registados pagamentos suficientes, acumulou um montante significativo de juros de mora.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                <div className="p-2.5 rounded-lg bg-black/5 dark:bg-black/35">
                                  <span className="text-[9px] uppercase text-gray-500 dark:text-gray-400 block font-semibold">Juros Acumulados</span>
                                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{showBalance ? fmt(accumInt, currency) : '••••'}</span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-black/5 dark:bg-black/35">
                                  <span className="text-[9px] uppercase text-gray-500 dark:text-gray-400 block font-semibold">Total Amortizado</span>
                                  <span className="text-sm font-bold text-leaf">{showBalance ? fmt(realPaid, currency) : '••••'}</span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30">
                                  <span className="text-[9px] uppercase text-red-600 dark:text-red-300 block font-semibold">Saldo Atualizado Real</span>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">{showBalance ? fmt(updRemaining, currency) : '••••'}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-red-600 dark:text-red-300/80 italic pt-1">
                                * Nota: No mercado informal, taxas elevadas (como 30%) tornam a dívida insustentável rapidamente. Priorize a liquidação integral desta obrigação.
                              </p>
                            </div>
                          )}

                          {/* Dynamic Cards Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                              <span className="text-[9px] font-black uppercase text-gray-400">Valor Inicial (Principal)</span>
                              <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                {showBalance ? fmt(principal, currency) : '••••'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                              <span className="text-[9px] font-black uppercase text-gray-400">Total de Juros Projetados</span>
                              <div className="text-sm font-bold text-amber-600 dark:text-amber-500 mt-0.5">
                                {showBalance ? fmt(projectedInterest, currency) : '••••'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                              <span className="text-[9px] font-black uppercase text-gray-400">Parcela Mensal Projetada</span>
                              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                {showBalance ? fmt(finalMonthlyPayment, currency) : '••••'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                              <span className="text-[9px] font-black uppercase text-gray-400">Total Pago Acumulado</span>
                              <div className="text-sm font-bold text-leaf mt-0.5">
                                {showBalance ? fmt(realPaid, currency) : '••••'}
                              </div>
                            </div>
                          </div>

                        {/* Amortization Table */}
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
                          <table className="w-full text-left text-xs bg-gray-50/50 dark:bg-black/15">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-100/55 dark:bg-black/30 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <th className="p-2.5 pl-4">Período</th>
                                <th className="p-2.5">Prestação</th>
                                <th className="p-2.5">Juros Pagos</th>
                                <th className="p-2.5">Capital Amortizado</th>
                                <th className="p-2.5">Saldo Devedor Restante</th>
                                <th className="p-2.5 pr-4 text-right">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {generateAmortizationSchedule(debt).map((item) => (
                                <tr key={item.period} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-100/10 dark:hover:bg-white/5 transition-colors">
                                  <td className="p-2.5 pl-4 font-bold text-gray-500 dark:text-gray-400">Parcela {item.period}</td>
                                  <td className="p-2.5 font-semibold text-gray-900 dark:text-white">{showBalance ? fmt(item.payment, currency) : '••••'}</td>
                                  <td className="p-2.5 text-amber-600 dark:text-amber-500/90">{showBalance ? fmt(item.interest, currency) : '••••'}</td>
                                  <td className="p-2.5 text-indigo-600 dark:text-indigo-300">{showBalance ? fmt(item.amortization, currency) : '••••'}</td>
                                  <td className="p-2.5 font-bold text-gray-700 dark:text-gray-300">{showBalance ? fmt(item.balance, currency) : '••••'}</td>
                                  <td className="p-2.5 pr-4 text-right">
                                    {item.status === 'paid' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-leaf/10 text-leaf text-[9px] font-black uppercase tracking-wider border border-leaf/20">
                                        ✓ Pago
                                      </span>
                                    )}
                                    {item.status === 'partial' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[9px] font-black uppercase tracking-wider border border-amber-500/20">
                                        • Parcial
                                      </span>
                                    )}
                                    {item.status === 'pending' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[9px] font-black uppercase tracking-wider border border-gray-200 dark:border-white/5">
                                        A Vencer
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* CFO Insight Banner */}
                        <div className="flex gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[11px] leading-relaxed">
                          <span className="text-lg shrink-0 mt-0.5">💡</span>
                          <div className="space-y-1 text-left">
                            <span className="font-bold text-indigo-700 dark:text-white uppercase tracking-wider text-[9px] block">Conselho Estratégico do CFO Binth</span>
                            <span>
                              Ao amortizares mais do que a prestação mensal, reduzes diretamente o <strong>Saldo Devedor Restante</strong>. Como os juros são calculados sobre este saldo, qualquer pagamento extra diminui significativamente os juros totais que irás pagar nos próximos meses!
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })()}
                </React.Fragment>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
