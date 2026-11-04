import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import api from '../../utils/api';

const LEVELS = ['off', 'discreet', 'normal', 'close'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// How Binth behaves as an advisor: how often she speaks first, quiet hours,
// weekly summary, WhatsApp, tithe and savings rates, and what she remembers.
// Each change is saved straight away (not with the page's Save button).
export default function AdvisorSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [memory, setMemory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/advisor/settings'), api.get('/advisor/memory'), api.get('/advisor/reminders')])
      .then(([s, m, r]) => { if (!cancelled) { setSettings(s.data); setMemory(m.data || []); setReminders(r.data || []); } })
      .catch(() => { if (!cancelled) setMessage('error'); });
    return () => { cancelled = true; };
  }, []);

  async function change(patch) {
    const before = settings;
    setSettings({ ...settings, ...patch });
    setMessage('');
    try {
      const { data } = await api.put('/advisor/settings', patch);
      setSettings(s => ({ ...s, ...data }));
      setMessage('saved');
    } catch {
      setSettings(before);
      setMessage('error');
    }
  }

  async function forget(id) {
    try { await api.delete(id ? `/advisor/memory/${id}` : '/advisor/memory'); setMemory(id ? memory.filter(f => f.id !== id) : []); }
    catch { setMessage('error'); }
  }

  async function removeReminder(id) {
    try { await api.delete(`/advisor/reminders/${id}`); setReminders(reminders.filter(r => r.id !== id)); }
    catch { setMessage('error'); }
  }

  if (!settings) {
    return (
      <section className="glass-card p-6 mt-6" aria-busy={message !== 'error'}>
        <h2 className="text-base font-bold">{t('advisor.settings.title')}</h2>
        {message === 'error' && <p role="alert" className="mt-2 text-sm text-[var(--color-coral)]">{t('advisor.settings.error')}</p>}
      </section>
    );
  }

  const rate = (v) => (v === null || v === undefined ? '' : String(Math.round(v * 100)));
  const parseRate = (v, max) => { if (v === '') return null; const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) / 100 : null; };

  return (
    <section className="glass-card p-6 mt-6" aria-labelledby="advisor-settings-title">
      <h2 id="advisor-settings-title" className="text-base font-bold">{t('advisor.settings.title')}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{t('advisor.settings.intro')}</p>

      <fieldset className="mt-6">
        <legend className="text-sm font-bold">{t('advisor.settings.level')}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LEVELS.map(level => (
            <button key={level} type="button" aria-pressed={settings.level === level} onClick={() => change({ level })}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-bold ${settings.level === level ? 'bg-[var(--color-ocean)] text-white' : 'btn-secondary'}`}>
              {t(`advisor.settings.levels.${level}`)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{t(`advisor.settings.level_help.${settings.level}`)}</p>
      </fieldset>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <label className="text-sm font-bold">
          {t('advisor.settings.quiet_start')}
          <select value={settings.quietStart} onChange={e => change({ quietStart: Number(e.target.value) })} className="mt-1 block min-h-[44px] w-full rounded-xl border border-black/10 bg-transparent px-3 text-base dark:border-white/15">
            {HOURS.map(h => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t('advisor.settings.quiet_end')}
          <select value={settings.quietEnd} onChange={e => change({ quietEnd: Number(e.target.value) })} className="mt-1 block min-h-[44px] w-full rounded-xl border border-black/10 bg-transparent px-3 text-base dark:border-white/15">
            {HOURS.map(h => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-6 flex min-h-[44px] items-center justify-between gap-4 text-sm font-bold">
        {t('advisor.settings.weekly')}
        <input type="checkbox" checked={Boolean(settings.weekly)} onChange={e => change({ weekly: e.target.checked })} className="h-5 w-5" />
      </label>

      {settings.whatsappAvailable ? (
        <label className="mt-2 flex min-h-[44px] items-center justify-between gap-4 text-sm font-bold">
          <span>{t('advisor.settings.whatsapp')}<span className="block text-xs font-normal text-[var(--color-muted)]">{t('advisor.settings.whatsapp_help')}</span></span>
          <input type="checkbox" checked={Boolean(settings.whatsapp)} onChange={e => change({ whatsapp: e.target.checked })} className="h-5 w-5" />
        </label>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <label className="text-sm font-bold">
          {t('advisor.settings.tithe')}
          <input type="number" inputMode="numeric" min="0" max="50" defaultValue={rate(settings.titheRate)} placeholder="0"
            onBlur={e => change({ titheRate: parseRate(e.target.value, 50) })}
            className="mt-1 block min-h-[44px] w-full rounded-xl border border-black/10 bg-transparent px-3 text-base tabular-nums dark:border-white/15" />
        </label>
        <label className="text-sm font-bold">
          {t('advisor.settings.savings')}
          <input type="number" inputMode="numeric" min="0" max="80" defaultValue={rate(settings.savingsRate)} placeholder="10"
            onBlur={e => change({ savingsRate: parseRate(e.target.value, 80) })}
            className="mt-1 block min-h-[44px] w-full rounded-xl border border-black/10 bg-transparent px-3 text-base tabular-nums dark:border-white/15" />
        </label>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold">{t('advisor.settings.memory')}</h3>
        {memory.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t('advisor.settings.memory_empty')}</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-black/5 dark:divide-white/10">
              {memory.map(f => (
                <li key={f.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                  <span>{f.fact}</span>
                  <button type="button" onClick={() => forget(f.id)} aria-label={t('advisor.settings.forget_one', { fact: f.fact })} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-muted)]">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => forget(null)} className="btn-secondary mt-2 min-h-[44px] px-4 text-sm font-bold">{t('advisor.settings.forget_all')}</button>
          </>
        )}
      </div>

      {reminders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold">{t('advisor.settings.reminders')}</h3>
          <ul className="mt-2 divide-y divide-black/5 dark:divide-white/10">
            {reminders.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                <span><span className="tabular-nums text-[var(--color-muted)]">{String(r.remind_on).slice(0, 10)}</span> · {r.text}</span>
                <button type="button" onClick={() => removeReminder(r.id)} aria-label={t('advisor.settings.remove_reminder', { text: r.text })} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-muted)]">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p role="status" className="mt-4 text-xs text-[var(--color-muted)]">
        {message === 'saved' ? t('advisor.settings.saved') : message === 'error' ? t('advisor.settings.error') : ''}
      </p>
    </section>
  );
}
