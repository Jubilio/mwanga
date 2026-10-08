import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';
import { fmt } from '../utils/calculations';
import { uiCategory } from '../utils/uiTranslation';
const GROUPS = ['balances', 'commitments', 'plan'];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export default function RealityReview() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const userId = state.user?.id;
  const [data, setData] = useState(null);
  const [section, setSection] = useState('balances');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => { const response = await api.get('/reality-review'); setData(response.data); return response.data; }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.patch('/reality-review', { action: 'start' });
        const response = await api.get('/reality-review');
        if (!cancelled) setData(response.data);
      } catch { if (!cancelled) setError('load_error'); }
    })();
    return () => { cancelled = true; };
  }, [userId]);
  const reportError = failure => {
    const code = failure.response?.data?.error;
    setError(['BALANCE_CHANGED', 'DATA_CHANGED'].includes(code) ? 'conflict' : code === 'ACCOUNT_NOT_FOUND' ? 'missing_account' : 'save_error');
  };
  async function command(action, extra = {}) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    let saved = false;
    try {
      await api.patch('/reality-review', { action, ...extra }); saved = true;
      if (action === 'finish') setNotice('completed');
      if (action === 'defer') setNotice('deferred');
      if (action === 'confirm') setNotice('confirmed');
      await refresh();
      window.dispatchEvent(new Event('mwanga-reality-reviewed'));
    } catch (failure) { if (saved) setError('refresh_error'); else reportError(failure); }
    finally { lock.current = false; setBusy(false); }
  }
  function edit(account) {
    setEditor({ accountId: account.id, name: account.name, expectedBalance: account.balance, balance: String(account.balance), asOf: today(), reason: '', requestId: crypto.randomUUID() });
    setError(''); setNotice('');
  }
  async function reconcile(event) {
    event.preventDefault();
    if (lock.current || !editor) return;
    const balance = Number(editor.balance);
    if (editor.balance.trim() === '' || !Number.isFinite(balance) || Math.abs(balance) > 1e12 || (editor.accountId === null && balance < 0) || editor.reason.trim().length < 3) { setError('invalid_adjustment'); return; }
    lock.current = true; setBusy(true); setError(''); setNotice('');
    let saved = false;
    try {
      await api.post('/reality-review/adjustments', { requestId: editor.requestId, accountId: editor.accountId, expectedBalance: editor.expectedBalance, balance, asOf: editor.asOf, reason: editor.reason.trim() });
      saved = true; setEditor(null); setNotice('adjusted');
      await refresh();
      await dispatch({ type: 'REFRESH_REALITY' });
    } catch (failure) { if (saved) setError('refresh_error'); else reportError(failure); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!data) return <div className="glass-card p-6"><h1 className="text-2xl font-black">{t('reality.title')}</h1><p className="mt-4" role={error ? 'alert' : 'status'}>{t(error ? `reality.${error}` : 'reality.loading')}</p>{error ? <button className="btn btn-primary mt-4" onClick={() => refresh().then(() => setError('')).catch(() => setError('load_error'))}>{t('reality.refresh')}</button> : null}</div>;
  const { snapshot, status, adjustments } = data;
  const confirmedCount = GROUPS.filter(group => status.sections[group].confirmed).length;
  const selected = status.sections[section];
  const money = value => value === null ? t('reality.not_recorded') : fmt(value, 'MT');
  const accounts = [{ id: null, name: t('reality.cash'), balance: snapshot.balances.cash }, ...snapshot.balances.accounts];
  return <div className="space-y-6 pb-28">
    <header><h1 className="text-3xl font-black">{t('reality.title')}</h1><p className="text-slate-500 mt-3">{t('reality.intro')}</p><p className="text-xs text-slate-500 mt-3">{t('reality.scope')}</p></header>
    <section className="glass-card p-5"><p className="font-bold">{t('reality.progress', { count: confirmedCount })}</p><progress max={3} value={confirmedCount} className="w-full accent-emerald-500 mt-3" aria-label={t('reality.progress', { count: confirmedCount })} /><div className="flex flex-wrap gap-2 mt-4">{GROUPS.map((group, index) => <button key={group} disabled={busy} aria-pressed={section === group} onClick={() => { setSection(group); setEditor(null); }} className={`btn ${section === group ? 'btn-primary' : 'btn-ghost'}`}>{index + 1}. {t(`reality.sections.${group}`)}{status.sections[group].confirmed ? ' ✓' : ''}</button>)}</div></section>
    {notice ? <p role="status" className="text-emerald-600 dark:text-emerald-400">{t(`reality.${notice}`)}</p> : null}
    {error ? <div role="alert"><p className="text-red-600 dark:text-red-400">{t(`reality.${error}`)}</p><button disabled={busy} className="btn btn-ghost mt-2" onClick={() => refresh().then(async () => { if (notice === 'adjusted') await dispatch({ type: 'REFRESH_REALITY' }); setEditor(null); setError(''); }).catch(() => setError('load_error'))}>{t('reality.refresh')}</button></div> : null}
    <section className="glass-card p-5 sm:p-7 space-y-4">
      <h2 className="text-xl font-black">{t(`reality.sections.${section}`)}</h2>
      <p className="text-sm text-slate-500">{t(`reality.explain.${section}`)}</p>
      <p className="text-xs text-slate-500">{selected.confirmedAt ? t('reality.last_confirmed', { date: selected.confirmedAt.slice(0, 10) }) : t('reality.unconfirmed')}{selected.changed ? ` ${t('reality.changed')}` : ''}</p>
      {section === 'balances' ? <div className="space-y-3">{accounts.map(account => <div key={account.id ?? 'cash'} className="rounded-2xl p-4 bg-black/5 dark:bg-white/5 flex flex-wrap justify-between items-center gap-3"><div><h3 className="font-bold">{account.name}</h3><p className="mt-1">{money(account.balance)}</p></div><button disabled={busy} onClick={() => edit(account)} className="btn btn-ghost">{t('reality.adjust')}</button></div>)}</div> : null}
      {section === 'commitments' ? <>
        <div className="grid sm:grid-cols-2 gap-4"><p>{t('reality.salary')}<strong className="block mt-2">{money(snapshot.commitments.salary)}</strong></p><p>{t('reality.rent')}<strong className="block mt-2">{money(snapshot.commitments.rent)}</strong><span className="text-xs">{snapshot.commitments.landlord}</span></p></div>
        <h3 className="font-black">{t('reality.debts')}</h3>
        {snapshot.commitments.debts.length ? snapshot.commitments.debts.map(debt => <div key={debt.id} className="rounded-xl bg-black/5 dark:bg-white/5 p-4"><p className="font-bold">{debt.creditor_name}</p><p className="text-sm mt-2">{t('reality.outstanding')}: {money(debt.remaining_amount)}</p><p className="text-sm mt-1">{t('reality.due_date')}: {debt.due_date ? String(debt.due_date).slice(0, 10) : t('reality.not_recorded')}</p></div>) : <p className="text-sm">{t('reality.no_debts')}</p>}
        <div className="flex flex-wrap gap-3"><Link to="/settings" className="btn btn-ghost">{t('reality.edit_commitments')}</Link><Link to="/dividas" className="btn btn-ghost">{t('reality.edit_debts')}</Link><Link to="/habitacao" className="btn btn-ghost">{t('reality.edit_housing')}</Link></div>
      </> : null}
      {section === 'plan' ? <>
        <h3 className="font-black">{t('reality.goals')}</h3>
        {snapshot.plan.goals.length ? snapshot.plan.goals.map(goal => <div key={goal.id} className="rounded-xl bg-black/5 dark:bg-white/5 p-4"><p className="font-bold">{goal.name}</p><p className="text-sm mt-2">{money(goal.saved_amount)} / {money(goal.target_amount)}</p><p className="text-sm mt-1">{t('reality.deadline')}: {goal.deadline ? String(goal.deadline).slice(0, 10) : t('reality.not_recorded')}</p></div>) : <p className="text-sm">{t('reality.no_goals')}</p>}
        <h3 className="font-black">{t('reality.budgets')}</h3>{snapshot.plan.budgets.map(budget => <p key={budget.category} className="text-sm">{uiCategory(budget.category)}: {money(budget.limit_amount)}</p>)}
        <div className="flex flex-wrap gap-3"><Link to="/metas" className="btn btn-ghost">{t('reality.edit_goals')}</Link><Link to="/orcamento" className="btn btn-ghost">{t('reality.edit_budget')}</Link><Link to="/jornada" className="btn btn-ghost">{t('journey.nav')}</Link></div>
      </> : null}
      <div className="flex flex-wrap gap-3 pt-4"><button disabled={busy || selected.confirmed || Boolean(editor)} onClick={() => command('confirm', { section, fingerprint: selected.fingerprint })} className="btn btn-primary disabled:opacity-50">{t(selected.confirmed ? 'reality.section_confirmed' : 'reality.confirm_section')}</button><button disabled={busy} onClick={() => command('defer')} className="btn btn-ghost">{t('reality.later')}</button></div>
      <p className="text-xs text-slate-500">{t('reality.confirm_note')}</p>
    </section>
    {editor ? <section className="glass-card p-5 sm:p-7"><h2 className="text-xl font-black">{t('reality.adjust_title', { name: editor.name })}</h2><p className="text-sm text-slate-500 mt-3">{t('reality.adjust_note')}</p>
      <form onSubmit={reconcile}><fieldset disabled={busy} className="space-y-4 mt-5">
        <p className="text-sm">{t('reality.previous')}: {money(editor.expectedBalance)}</p>
        <label htmlFor="reality-balance" className="block font-bold text-sm">{t('reality.current_balance')}<input id="reality-balance" type="number" required min={editor.accountId === null ? 0 : -1e12} max={1e12} step="0.01" value={editor.balance} onChange={event => setEditor(previous => ({ ...previous, balance: event.target.value }))} className="form-input block w-full mt-2" /></label>
        <p className="text-sm">{t('reality.difference')}: {money(Number(editor.balance) - editor.expectedBalance)}</p>
        <label htmlFor="reality-date" className="block font-bold text-sm">{t('reality.as_of')}<input id="reality-date" type="date" required max={today()} value={editor.asOf} onChange={event => setEditor(previous => ({ ...previous, asOf: event.target.value }))} className="form-input block w-full mt-2" /></label>
        <label htmlFor="reality-reason" className="block font-bold text-sm">{t('reality.reason')}<input id="reality-reason" required minLength={3} maxLength={200} value={editor.reason} onChange={event => setEditor(previous => ({ ...previous, reason: event.target.value }))} className="form-input block w-full mt-2" /></label>
        <div className="flex flex-wrap gap-3"><button type="submit" className="btn btn-primary">{t('reality.save_adjustment')}</button><button type="button" onClick={() => setEditor(null)} className="btn btn-ghost">{t('reality.cancel')}</button></div>
      </fieldset></form></section> : null}
    <section className="glass-card p-5"><h2 className="font-black">{t('reality.history')}</h2><p className="text-xs text-slate-500 mt-2">{t('reality.history_note')}</p>{adjustments.map(adjustment => <div key={adjustment.requestId} className="border-t border-black/10 dark:border-white/10 mt-4 pt-4 text-sm"><p className="font-bold">{adjustment.accountName || t('reality.cash')}: {money(adjustment.difference)}</p><p className="mt-1">{money(adjustment.previousBalance)} → {money(adjustment.newBalance)} · {adjustment.asOf}</p><p className="mt-1 break-words">{adjustment.reason}</p><p className="mt-1 text-xs text-slate-500">{t('reality.recorded_by', { user: adjustment.userId, date: new Date(adjustment.recordedAt).toLocaleString() })}</p></div>)}</section>
    <div className="flex flex-wrap gap-3"><button disabled={busy || confirmedCount !== 3 || !status.needsReview} onClick={() => command('finish')} className="btn btn-primary disabled:opacity-50">{t('reality.finish')}</button><Link to="/" className="btn btn-ghost">{t('reality.back')}</Link></div>
  </div>;
}
