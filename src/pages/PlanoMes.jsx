import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Check, X, RefreshCw, MessageSquare, Archive } from 'lucide-react';
import { apiCall } from '../services/finance.service';
import { useFinance } from '../hooks/useFinance';
import { runProposal } from '../utils/advisorProposal';
import { toRequestId } from '../utils/offlineQueue';
import { normalizeCategory } from '../utils/categories';
import { fmt } from '../utils/calculations';

const shortDay = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—');

function Section({ id, title, children, highlight = false }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`glass-card p-6 ${highlight ? 'ring-2 ring-[var(--color-sky)]' : ''}`}>
      <h2 id={`${id}-title`} className="text-base font-bold text-[var(--color-text)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value, tone }) {
  const color = tone === 'good' ? 'text-[var(--color-leaf)]' : tone === 'bad' ? 'text-[var(--color-coral)]' : 'text-[var(--color-text)]';
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={`font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

// "Plano do mês": Binth's plan for this month in one place. Numbers come from
// rules on the server; saving a plan is a tap the person makes.
export default function PlanoMes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const showToast = outlet.showToast || (() => {});
  const [params] = useSearchParams();
  const { state, dispatch } = useFinance();
  const [plan, setPlan] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [close, setClose] = useState(null);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState(null);
  const closeMonth = params.get('fecho');
  const focusSalary = params.has('salario');
  const focusWeek = params.has('semana');
  const cat = useCallback((c) => t(`common.categories.${normalizeCategory(c)}`, { defaultValue: c }), [t]);

  const fetchPlan = useCallback(async () => {
    try {
      const [p, w, c] = await Promise.all([
        apiCall('advisor/plan'),
        apiCall('advisor/weekly').catch(() => null),
        closeMonth ? apiCall(`advisor/month-close?month=${encodeURIComponent(closeMonth)}`).catch(() => null) : Promise.resolve(null),
      ]);
      setPlan(p); setWeekly(w); setClose(c);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [closeMonth]);

  const load = useCallback(() => { setStatus('loading'); return fetchPlan(); }, [fetchPlan]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  useEffect(() => {
    if (status !== 'ready') return;
    const target = closeMonth ? 'fecho' : focusSalary ? 'salario' : focusWeek ? 'semana' : null;
    if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' });
  }, [status, closeMonth, focusSalary, focusWeek]);

  async function save(kind, title, data) {
    setSaving(kind);
    try {
      const outcome = await runProposal({ action: 'save_plan', payload: { kind, title, data } }, { dispatch, state, requestId: toRequestId(`plan-${kind}-${plan?.today}`) || undefined });
      showToast(t(`binth_actions.${outcome}`), 'success');
      await fetchPlan();
    } catch {
      showToast(t('binth_actions.failed'), 'error');
    } finally {
      setSaving(null);
    }
  }

  async function archive(id) {
    try { await apiCall(`advisor/plans/${id}`, 'DELETE'); await fetchPlan(); }
    catch { showToast(t('binth_actions.failed'), 'error'); }
  }

  const ask = (prompt) => navigate('/insights', { state: { journeyPrompt: prompt } });
  const chartData = useMemo(() => (plan?.forecast?.days || []).map(d => ({ ...d, label: shortDay(d.date) })), [plan]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-6 pb-24" aria-busy="true">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">{t('advisor.plan.title')}</h1>
        {[0, 1, 2].map(i => <div key={i} className="glass-card h-40" />)}
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col gap-6 pb-24">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">{t('advisor.plan.title')}</h1>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--color-muted)]">{t('advisor.plan.error')}</p>
          <button type="button" onClick={load} className="btn-secondary mt-4 inline-flex min-h-[44px] items-center gap-2 px-4">
            <RefreshCw size={16} aria-hidden="true" /> {t('advisor.retry')}
          </button>
        </div>
      </div>
    );
  }

  const { forecast, monthly, salary, debt, emergency, credit, recurring, goals, plans } = plan;
  const runout = forecast.runoutDate && forecast.runoutDate < forecast.horizon;
  const activeKinds = new Set((plans || []).map(p => p.kind));

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">{t('advisor.plan.title')}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t('advisor.plan.subtitle')}</p>
      </header>

      {close && (
        <Section id="fecho" title={t('advisor.close.title', { month: close.month })} highlight>
          <Row label={t('advisor.close.income')} value={fmt(close.income)} />
          <Row label={t('advisor.close.expenses')} value={fmt(close.expenses)} />
          <Row label={t('advisor.close.saved')} value={fmt(close.saved)} tone={close.saved >= 0 ? 'good' : 'bad'} />
          <ol className="mt-4 flex flex-col gap-2 text-sm text-[var(--color-text)]">
            {close.highlight && <li>{t('advisor.close.highlight', { category: cat(close.highlight.category), amount: fmt(close.highlight.saved) })}</li>}
            {close.challenge && <li>{t('advisor.close.challenge', { category: cat(close.challenge.category), amount: fmt(close.challenge.over) })}</li>}
            {close.opportunity && <li>{t('advisor.close.opportunity', { name: close.opportunity.description, amount: fmt(close.opportunity.yearly) })}</li>}
          </ol>
        </Section>
      )}

      <Section id="previsao" title={t('advisor.forecast.title')}>
        <p className="text-sm text-[var(--color-muted)]">
          {forecast.horizonIsPayday ? t('advisor.forecast.until_payday', { date: shortDay(forecast.horizon) }) : t('advisor.forecast.next_30')}
        </p>
        <p className={`mt-2 text-2xl font-bold tabular-nums ${runout ? 'text-[var(--color-coral)]' : 'text-[var(--color-text)]'}`}>
          {runout ? t('advisor.forecast.runs_out', { date: shortDay(forecast.runoutDate) }) : fmt(forecast.endBalance)}
        </p>
        {runout && <p className="mt-1 text-sm text-[var(--color-muted)]">{t('advisor.forecast.cut', { amount: fmt(forecast.cutPerDay) })}</p>}
        {chartData.length > 1 && (
          <div className="mt-4" style={{ height: 250 }} role="img" aria-label={t('advisor.forecast.chart_label')}>
            <ResponsiveContainer width="100%" height={250} minWidth={0}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} interval={Math.max(0, Math.ceil(chartData.length / 5) - 1)} tickLine={false} axisLine={false} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => l} />
                <ReferenceLine y={0} stroke="var(--color-coral)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="balance" stroke="var(--color-ocean)" fill="var(--color-ocean)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <Row label={t('advisor.forecast.daily')} value={fmt(forecast.dailySpend)} />
        {forecast.commitments.length > 0 && (
          <ul className="mt-2 divide-y divide-black/5 dark:divide-white/10">
            {forecast.commitments.map(c => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--color-text)]">{shortDay(c.date)} · {t(`advisor.kinds.${c.kind}`)}{c.label ? ` · ${c.label}` : ''}</span>
                <span className={`font-bold tabular-nums ${c.overdue ? 'text-[var(--color-coral)]' : 'text-[var(--color-text)]'}`}>{fmt(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {salary.income > 0 && (
        <Section id="salario" title={t('advisor.salary.title', { amount: fmt(salary.income) })} highlight={focusSalary}>
          {salary.lines.map(l => <Row key={l.key} label={t(`advisor.salary.${l.key}`)} value={fmt(l.amount)} />)}
          <Row label={t('advisor.salary.free')} value={fmt(salary.free)} tone={salary.short ? 'bad' : 'good'} />
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t('advisor.salary.per_day', { amount: fmt(salary.perDay) })}</p>
          {!activeKinds.has('salary') && (
            <button type="button" onClick={() => save('salary', t('advisor.salary.plan_title'), salary)} disabled={saving !== null} className="btn-secondary mt-4 min-h-[44px] px-4 font-bold">
              {saving === 'salary' ? t('binth_actions.saving') : t('advisor.salary.save')}
            </button>
          )}
        </Section>
      )}

      <Section id="envelopes" title={t('advisor.monthly.title')}>
        {monthly.envelopes.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{t('advisor.monthly.empty')}</p>
        ) : (
          <>
            <Row label={t('advisor.monthly.income')} value={fmt(monthly.income)} />
            <Row label={t('advisor.monthly.commitments')} value={fmt(monthly.commitments)} />
            <Row label={t('advisor.monthly.savings')} value={fmt(monthly.savings)} tone="good" />
            <ul className="mt-2 divide-y divide-black/5 dark:divide-white/10">
              {monthly.envelopes.map(e => (
                <li key={e.category} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-[var(--color-text)]">{cat(e.category)}</span>
                  <span className="tabular-nums text-[var(--color-muted)]">
                    {t('advisor.monthly.average', { amount: fmt(e.average) })} · <strong className="text-[var(--color-text)]">{fmt(e.limit)}</strong>
                  </span>
                </li>
              ))}
            </ul>
            {monthly.tight && <p className="mt-2 text-sm text-[var(--color-coral)]">{t('advisor.monthly.tight')}</p>}
            <button type="button" onClick={() => save('monthly', t('advisor.monthly.plan_title'), monthly)} disabled={saving !== null} className="btn-primary mt-4 min-h-[48px] w-full font-bold">
              {saving === 'monthly' ? t('binth_actions.saving') : t('advisor.monthly.save')}
            </button>
          </>
        )}
      </Section>

      {weekly && (weekly.spent > 0 || weekly.previous > 0) && (
        <Section id="semana" title={t('advisor.weekly.title')} highlight={focusWeek}>
          <Row label={t('advisor.weekly.spent')} value={fmt(weekly.spent)} />
          <Row label={t('advisor.weekly.previous')} value={fmt(weekly.previous)} />
          {weekly.change !== null && (
            <p className={`mt-2 text-sm font-bold ${weekly.change <= 0 ? 'text-[var(--color-leaf)]' : 'text-[var(--color-coral)]'}`}>
              {weekly.change <= 0 ? t('advisor.weekly.less', { pct: Math.abs(weekly.change) }) : t('advisor.weekly.more', { pct: weekly.change })}
            </p>
          )}
          {weekly.topCategory && <p className="mt-1 text-sm text-[var(--color-muted)]">{t('advisor.weekly.top', { category: cat(weekly.topCategory.category), amount: fmt(weekly.topCategory.amount) })}</p>}
        </Section>
      )}

      {debt.debts.length > 0 && (
        <Section id="dividas" title={t('advisor.debt.title')}>
          {['avalanche', 'snowball'].map(k => {
            const sim = debt[k];
            return (
              <div key={k} className="py-2">
                <p className="text-sm font-bold text-[var(--color-text)]">{t(`advisor.debt.${k}`)}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {sim.feasible
                    ? t('advisor.debt.result', { months: sim.months, amount: fmt(sim.monthlyPayment), interest: fmt(sim.totalInterest) })
                    : t('advisor.debt.not_feasible')}
                </p>
              </div>
            );
          })}
          <button type="button" onClick={() => ask(t('advisor.debt.ask'))} className="btn-secondary mt-2 inline-flex min-h-[44px] items-center gap-2 px-4 font-bold">
            <MessageSquare size={16} aria-hidden="true" /> {t('advisor.debt.ask_button')}
          </button>
        </Section>
      )}

      {emergency.target > 0 && (
        <Section id="emergencia" title={t('advisor.emergency.title')}>
          <Row label={t('advisor.emergency.target', { months: emergency.months })} value={fmt(emergency.target)} />
          <Row label={t('advisor.emergency.saved')} value={fmt(emergency.saved)} tone="good" />
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t('advisor.emergency.pace', { amount: fmt(emergency.monthlySuggested), months: emergency.monthsToGoal ?? '—' })}</p>
          {!activeKinds.has('emergency') && emergency.gap > 0 && (
            <button type="button" onClick={() => save('emergency', t('advisor.emergency.plan_title', { months: emergency.months }), emergency)} disabled={saving !== null} className="btn-secondary mt-4 min-h-[44px] px-4 font-bold">
              {saving === 'emergency' ? t('binth_actions.saving') : t('advisor.emergency.save')}
            </button>
          )}
        </Section>
      )}

      <Section id="credito" title={t('advisor.credit.title')}>
        <p className={`text-sm font-bold ${credit.ready ? 'text-[var(--color-leaf)]' : 'text-[var(--color-text)]'}`}>
          {credit.ready ? t('advisor.credit.ready', { amount: fmt(credit.maxNewInstalment) }) : t('advisor.credit.not_yet')}
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {credit.checks.map(c => (
            <li key={c.key} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
              {c.ok
                ? <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-leaf)]" aria-label={t('advisor.credit.ok')} />
                : <X size={16} className="mt-0.5 shrink-0 text-[var(--color-coral)]" aria-label={t('advisor.credit.missing')} />}
              <span>{t(`advisor.credit.checks.${c.key}`, { value: c.value ?? '' })}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--color-muted)]">{t('advisor.credit.note')}</p>
        {credit.ready && (
          <button type="button" onClick={() => navigate('/dividas?tab=credito')} className="btn-secondary mt-4 min-h-[44px] px-4 font-bold">
            {t('advisor.credit.open')}
          </button>
        )}
      </Section>

      {recurring.length > 0 && (
        <Section id="recorrentes" title={t('advisor.recurring.title')}>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {recurring.map(r => (
              <li key={r.label} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--color-text)]">{r.description}</span>
                <span className="tabular-nums text-[var(--color-muted)]">{t('advisor.recurring.per_month', { amount: fmt(r.amount) })}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {goals.some(g => g.behind) && (
        <Section id="metas" title={t('advisor.goals.title')}>
          {goals.filter(g => g.behind).map(g => (
            <p key={g.id} className="py-1 text-sm text-[var(--color-text)]">{t('advisor.goals.behind', { name: g.name, amount: fmt(g.neededPerMonth) })}</p>
          ))}
        </Section>
      )}

      {plans.length > 0 && (
        <Section id="planos" title={t('advisor.plans.title')}>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {plans.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-[var(--color-text)]">{p.title}</span>
                <button type="button" onClick={() => archive(p.id)} aria-label={t('advisor.plans.archive', { title: p.title })} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-muted)]">
                  <Archive size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="text-xs text-[var(--color-muted)]">{plan.disclaimer}</p>
    </div>
  );
}
