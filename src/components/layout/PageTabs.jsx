import { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Tabs for pages that hold what used to be several menu entries.
 * The active tab is kept in `?tab=` so old URLs can redirect straight to it.
 */
export default function PageTabs({ tabs }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const active = tabs.find((tab) => tab.id === requested) || tabs[0];

  function select(id) {
    const next = new URLSearchParams(params);
    if (id === tabs[0].id) next.delete('tab');
    else next.set('tab', id);
    setParams(next, { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Inline styles: the global unlayered button rules beat Tailwind utilities. */}
      <div
        role="tablist"
        style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 18,
          background: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)',
        }}
      >
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => select(tab.id)}
              style={{
                flex: 1, minHeight: 44, padding: '10px 16px', borderRadius: 14, border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: 800, transition: 'background 0.2s, color 0.2s',
                background: selected ? 'linear-gradient(135deg, var(--color-ocean), var(--color-sky))' : 'transparent',
                color: selected ? '#fff' : 'var(--color-muted, #8a9ab8)',
                boxShadow: selected ? '0 6px 18px rgba(10, 77, 104, 0.35)' : 'none',
              }}
            >
              {t(tab.label)}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        <Suspense fallback={<div className="py-16 text-center text-sm text-slate-400">…</div>}>
          {active.element}
        </Suspense>
      </div>
    </div>
  );
}
