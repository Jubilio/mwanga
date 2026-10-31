import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, LifeBuoy, MessageCircle, MessageSquareWarning, Search, ShieldAlert, X } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';
import Toast, { useToast } from '../components/Toast';
import { PLAN_PRICES, SMS_FREE_MONTHLY_LIMIT, TRIAL } from '../config/features';
import { getSupportWhatsAppUrl } from '../utils/support';
import { HELP_CATEGORIES, HELP_FAQS, matchesQuery } from './help/helpTopics';

// Layout uses inline styles on purpose: unlayered global CSS (.glass-card padding,
// h1-h3 sizes, mobile .btn width) beats Tailwind utilities in this app.

const FAQ_VALUES = {
  limit: SMS_FREE_MONTHLY_LIMIT,
  growth: PLAN_PRICES.growth.monthly,
  pro: PLAN_PRICES.pro.monthly,
  days: TRIAL.DAYS,
  age: TRIAL.MIN_ACCOUNT_AGE_DAYS,
};

function CategoryChip({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border text-sm font-bold transition-colors ${
        active
          ? 'border-ocean bg-ocean text-white dark:border-sky dark:bg-sky/20 dark:text-sky-light'
          : 'border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
      }`}
      style={{ padding: '8px 14px', width: 'auto' }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function FaqItem({ faq, open, onToggle }) {
  const { t } = useTranslation();
  const panelId = useId();
  return (
    <div className="border-b border-slate-200/70 last:border-0 dark:border-white/5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 text-left"
        style={{ padding: '14px 4px' }}
      >
        <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-midnight dark:text-white">
          {t(`help.faq.${faq.id}.q`)}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180 text-ocean dark:text-sky-light' : ''}`}
        />
      </button>
      {open && (
        <div id={panelId} className="animate-fade-in" style={{ padding: '0 4px 16px' }}>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-600 dark:text-slate-300" style={{ margin: 0 }}>
            {t(`help.faq.${faq.id}.a`, FAQ_VALUES)}
          </p>
          {faq.to && (
            <Link
              to={faq.to}
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-ocean/10 text-sm font-bold text-ocean dark:bg-sky/15 dark:text-sky-light"
              style={{ padding: '6px 14px' }}
            >
              {t('help.open_page', { page: t(faq.page) })}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [category, setCategory] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const whatsappUrl = getSupportWhatsAppUrl(t('help.contact.whatsapp_message'));
  const searching = query.trim().length > 0;

  const results = useMemo(() => HELP_FAQS.filter((faq) => {
    if (searching) {
      const text = [
        t(`help.faq.${faq.id}.q`),
        t(`help.faq.${faq.id}.a`, FAQ_VALUES),
        t(`help.categories.${faq.cat}`),
      ].join(' ');
      return matchesQuery(text, query);
    }
    return category === 'all' || faq.cat === category;
  }), [query, searching, category, t]);

  // With a single match, show the answer straight away (until the user closes it).
  const autoOpenId = searching && results.length === 1 ? results[0].id : null;
  const currentOpenId = openId ?? autoOpenId;

  const groups = HELP_CATEGORIES
    .map((cat) => ({ ...cat, items: results.filter((faq) => faq.cat === cat.id) }))
    .filter((group) => group.items.length);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 112, width: '100%', minWidth: 0, maxWidth: 760, margin: '0 auto' }}>
      {/* Hero: ocean to aurora, with the search inside so it is the first thing a thumb reaches. */}
      <section
        className="relative overflow-hidden text-white shadow-xl shadow-ocean/20"
        style={{
          borderRadius: 28,
          padding: '22px 18px 18px',
          marginBottom: 16,
          background: 'linear-gradient(140deg, var(--color-ocean) 0%, var(--color-sky) 62%, #2a9d8f 100%)',
        }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
            <LifeBuoy size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display font-black leading-tight text-white" style={{ fontSize: '1.45rem', margin: 0 }}>
              {t('help.title')}
            </h1>
            <p className="mt-1 text-sm leading-snug text-white/75" style={{ marginBottom: 0 }}>{t('help.subtitle')}</p>
          </div>
        </div>

        <div className="relative" style={{ marginTop: 16 }}>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpenId(null); }}
            placeholder={t('help.search_placeholder')}
            aria-label={t('help.search_placeholder')}
            className="w-full rounded-2xl border-0 bg-white text-[16px] text-midnight shadow-lg outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:ring-white/60"
            style={{ padding: '13px 44px 13px 42px' }}
          />
          {searching && (
            <button
              type="button"
              onClick={() => { setQuery(''); setOpenId(null); }}
              aria-label={t('help.search_clear')}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              style={{ width: 32 }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {/* Categories scroll sideways on narrow phones instead of wrapping into a wall of chips. */}
      {!searching && (
        <div className="flex gap-2 overflow-x-auto" style={{ margin: '0 -4px 14px', padding: '2px 4px', maxWidth: 'calc(100% + 8px)', scrollbarWidth: 'none' }}>
          <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>{t('help.all')}</CategoryChip>
          {HELP_CATEGORIES.map((cat) => (
            <CategoryChip key={cat.id} icon={cat.icon} active={category === cat.id} onClick={() => setCategory(cat.id)}>
              {t(`help.categories.${cat.id}`)}
            </CategoryChip>
          ))}
        </div>
      )}

      {searching && (
        <p className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400" style={{ margin: '0 0 10px' }} aria-live="polite">
          {t('help.results', { count: results.length })}
        </p>
      )}

      {groups.length > 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {groups.map((group) => (
            <section key={group.id} className="glass-card" style={{ margin: 0, padding: '14px 16px 4px' }}>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-ocean dark:text-sky-light">
                <group.icon size={14} /> {t(`help.categories.${group.id}`)}
              </div>
              <div style={{ marginTop: 4 }}>
                {group.items.map((faq) => (
                  <FaqItem
                    key={faq.id}
                    faq={faq}
                    open={currentOpenId === faq.id}
                    onToggle={() => setOpenId(currentOpenId === faq.id ? '' : faq.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="glass-card text-center" style={{ margin: 0, padding: 24 }}>
          <p className="font-bold text-midnight dark:text-white" style={{ margin: 0 }}>{t('help.empty_title', { query: query.trim() })}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400" style={{ marginBottom: 0 }}>{t('help.empty_body')}</p>
        </div>
      )}

      {/* Contact: a real person on WhatsApp, or the in-app report with a screenshot. */}
      <section className="glass-card" style={{ margin: '20px 0 0', padding: 16 }}>
        <h2 className="font-display font-black text-midnight dark:text-white" style={{ fontSize: '1.15rem', margin: 0 }}>
          {t('help.contact.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400" style={{ marginBottom: 14 }}>{t('help.contact.body')}</p>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))' }}>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl bg-[#1f9d55] text-white shadow-lg shadow-emerald-900/20 transition-transform active:scale-[0.98]"
              style={{ padding: '12px 14px' }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><MessageCircle size={20} /></span>
              <span className="min-w-0">
                <span className="block font-bold">{t('help.contact.whatsapp')}</span>
                <span className="block text-xs text-white/80">{t('help.contact.whatsapp_desc')}</span>
              </span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-ocean/20 bg-ocean/5 text-left text-midnight transition-transform active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-white"
            style={{ padding: '12px 14px', width: '100%' }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-sky/15 dark:text-sky-light">
              <MessageSquareWarning size={20} />
            </span>
            <span className="min-w-0">
              <span className="block font-bold">{t('help.contact.feedback')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{t('help.contact.feedback_desc')}</span>
            </span>
          </button>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-gold/10 text-[13px] leading-snug text-slate-700 dark:text-slate-200" style={{ margin: '14px 0 0', padding: '10px 12px' }}>
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-gold" />
          {t('help.contact.safety')}
        </p>
      </section>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} showToast={showToast} />
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onClose={hideToast} />
    </div>
  );
}
