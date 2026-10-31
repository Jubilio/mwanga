import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { getEffectiveTier, hasFeatureAccess } from '../../config/features';

/** Big tappable tiles with an icon, a name and one line on what is inside. */
export function HubTiles({ items }) {
  const { t } = useTranslation();
  const { state } = useFinance();
  const tier = getEffectiveTier(state.settings);

  return (
    // Inline layout: unlayered global CSS (.glass-card, h2) beats Tailwind utilities here.
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
      {items.map((item) => {
        const locked = item.feature && !hasFeatureAccess(tier, item.feature);
        const paidPlan = item.feature && hasFeatureAccess('growth', item.feature)
          ? t('pricing.plans.growth.name')
          : 'Pro';
        return (
          <Link
            key={item.to}
            to={item.to}
            className="glass-card flex items-center gap-4 p-4 transition-transform active:scale-[0.98]"
            style={{ margin: 0 }}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ocean/10 text-ocean dark:bg-sky/15 dark:text-sky-light">
              <item.icon size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-base font-bold text-midnight dark:text-white">{t(item.label)}</span>
                {locked && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold">
                    {paidPlan}
                  </span>
                )}
              </span>
              {item.desc && (
                <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{t(item.desc)}</span>
              )}
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </Link>
        );
      })}
    </div>
  );
}

export function HubHeader({ title, subtitle }) {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 className="font-display text-2xl font-black text-midnight dark:text-white">{t(title)}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(subtitle)}</p>
    </div>
  );
}

export function HubSection({ title, children }) {
  const { t } = useTranslation();
  return (
    <section style={{ marginBottom: 24 }}>
      <div className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400" style={{ marginBottom: 10 }}>{t(title)}</div>
      {children}
    </section>
  );
}
