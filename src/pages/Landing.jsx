import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, ChevronDown, Smartphone, Wallet, Target, Users, Home, ShieldCheck, MapPin, MessageCircle, Info } from 'lucide-react';
import { useUiLanguage } from '../utils/uiTranslation';
import { getSupportWhatsAppUrl } from '../utils/support';
import MwangaLogo from '../components/MwangaLogo';
import Reveal from '../components/landing/Reveal';
import LightUpText from '../components/landing/LightUpText';
import { getToken } from '../utils/authToken';
import { useSeo, DEFAULT_SEO } from '../utils/seo';
import { trackEvent } from '../utils/analytics';
import { PLAN_PRICES, SMS_FREE_MONTHLY_LIMIT, TRIAL } from '../config/features';

const FEATURE_ICONS = [Wallet, Target, Users, Home];
const REGISTER_PATH = '/login?modo=registo';

// Answers come from the Help centre (help.faq.*) so the public page never says
// something the app does not do. Order: what it is, the usual objections, then price.
const FAQ_IDS = ['what_is', 'devices', 'sms_privacy', 'security', 'xitique_money', 'plans_list', 'cancel', 'scams'];
const FAQ_VALUES = {
  limit: SMS_FREE_MONTHLY_LIMIT,
  growth: PLAN_PRICES.growth.monthly,
  pro: PLAN_PRICES.pro.monthly,
  days: TRIAL.DAYS,
  age: TRIAL.MIN_ACCOUNT_AGE_DAYS,
};

const SECTION = { display: 'flex', flexDirection: 'column', gap: 24 };
const MUTED = { color: 'var(--color-muted)' };
const PRETTY = { textWrap: 'pretty' };

/** FAQPage structured data, so search and AI answers can quote the FAQ. */
function useFaqJsonLd(faqs) {
  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  });
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.mwanga = 'landing-faq';
    script.textContent = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [json]);
}

function PrimaryCta({ location, label, note }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Link
        to={REGISTER_PATH}
        onClick={() => trackEvent('cta_click', { location })}
        className="btn btn-primary inline-flex items-center gap-2"
        style={{ padding: '12px 32px', fontSize: '1rem' }}
      >
        {label} <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <p className="text-xs" style={MUTED}>{note}</p>
    </div>
  );
}

/**
 * Public page shown to visitors who are not signed in.
 * One offer, one audience, one primary action: "Começar grátis".
 * Rules: .claude/skills/mwanga-landing/SKILL.md
 */
export default function Landing() {
  useUiLanguage();
  const { t } = useTranslation();
  const supportUrl = getSupportWhatsAppUrl();
  const features = t('landing.features', { returnObjects: true });
  const steps = t('landing.steps', { returnObjects: true });
  const faqs = FAQ_IDS.map((id) => ({
    id,
    q: t(`help.faq.${id}.q`),
    a: t(`help.faq.${id}.a`, FAQ_VALUES),
  }));
  useSeo({ description: DEFAULT_SEO.description, path: '/bem-vindo' });
  useFaqJsonLd(faqs);

  if (getToken()) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--color-cream)', color: 'var(--color-text)', padding: '24px 16px' }}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only"
        style={{ position: 'absolute', top: 8, left: 8, zIndex: 50, padding: '8px 16px', borderRadius: 12, background: 'var(--color-surface)', color: 'var(--color-text)' }}
      >
        {t('landing.skip')}
      </a>

      <div className="flex w-full max-w-5xl flex-col gap-16" style={{ margin: '0 auto' }}>
        <header className="flex items-center justify-between gap-4">
          <MwangaLogo variant="sidebar" />
          <nav>
            <Link to="/login" className="inline-flex items-center text-sm font-bold" style={MUTED}>
              {t('landing.login')}
            </Link>
          </nav>
        </header>

        <main id="conteudo" className="flex flex-col gap-16" tabIndex={-1} style={{ outline: 'none' }}>
          {/* Primeiro ecrã: benefício, uma acção principal e um sinal de confiança */}
          <section style={{ ...SECTION, paddingTop: 24 }}>
            <h1 className="font-display font-bold" style={{ maxWidth: 680, lineHeight: 1.1, textWrap: 'balance' }}>
              {t('landing.title')}
            </h1>
            <p className="text-base sm:text-lg" style={{ ...MUTED, ...PRETTY, maxWidth: 680 }}>
              {t('landing.subtitle')}
            </p>
            <PrimaryCta location="landing_hero" label={t('landing.cta')} note={t('landing.cta_note')} />
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold" style={MUTED}>
              <li className="inline-flex items-center gap-2"><MapPin size={14} aria-hidden="true" /> {t('landing.trust.local')}</li>
              <li className="inline-flex items-center gap-2"><ShieldCheck size={14} aria-hidden="true" /> {t('landing.trust.security')}</li>
              {supportUrl && (
                <li>
                  <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline">
                    <MessageCircle size={14} aria-hidden="true" /> {t('landing.trust.whatsapp')}
                  </a>
                </li>
              )}
            </ul>
          </section>

          {/* Vídeo de apresentação: vertical no telemóvel, horizontal em ecrãs largos.
              preload="none" para que só o vídeo visível seja descarregado ao tocar. */}
          <Reveal style={SECTION} aria-labelledby="landing-video-title">
            <div className="flex flex-col gap-2">
              <h2 id="landing-video-title" className="font-bold">{t('landing.video_title')}</h2>
              <p className="max-w-xl text-sm" style={{ ...MUTED, ...PRETTY }}>{t('landing.video_subtitle')}</p>
            </div>
            <video
              className="w-full sm:hidden"
              style={{ maxWidth: 360, borderRadius: 24, background: '#050C12', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
              src="/videos/mwanga-30s-vertical.mp4"
              poster="/videos/mwanga-30s-vertical.jpg"
              controls
              playsInline
              preload="none"
              aria-label={t('landing.video_title')}
            />
            <video
              className="hidden w-full sm:block"
              style={{ borderRadius: 24, background: '#050C12', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
              src="/videos/mwanga-60s-horizontal.mp4"
              poster="/videos/mwanga-60s-horizontal.jpg"
              controls
              playsInline
              preload="none"
              aria-label={t('landing.video_title')}
            />
          </Reveal>

          {/* Frase-luz: Mwanga quer dizer luz, as palavras acendem ao rolar */}
          <section aria-label={t('landing.tagline')} style={{ padding: '48px 0' }}>
            <LightUpText
              text={t('landing.tagline')}
              highlight={t('landing.tagline_highlight')}
              className="font-display font-bold"
              style={{ maxWidth: 680, fontSize: 'clamp(1.875rem, 6vw, 3rem)', lineHeight: 1.15 }}
              aria-hidden="true"
            />
          </section>

          <Reveal style={SECTION} aria-labelledby="landing-features-title">
            <h2 id="landing-features-title" className="font-bold">{t('landing.features_title')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = FEATURE_ICONS[index] || Wallet;
                return (
                  <div key={feature.title} className="glass-card flex gap-4" style={{ padding: 24 }}>
                    <Icon size={24} aria-hidden="true" style={{ color: 'var(--color-gold-text)', flexShrink: 0 }} />
                    <div className="flex flex-col gap-2">
                      <h3 className="font-bold" style={{ fontSize: '1rem' }}>{feature.title}</h3>
                      <p className="text-sm" style={{ ...MUTED, ...PRETTY }}>{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal style={SECTION} aria-labelledby="landing-steps-title">
            <h2 id="landing-steps-title" className="font-bold">{t('landing.steps_title')}</h2>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step} className="glass-card flex items-center gap-4" style={{ padding: 24 }}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold" style={{ background: 'var(--color-midnight)', color: 'var(--color-gold)' }}>
                    {index + 1}
                  </span>
                  <span className="font-bold">{step}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal style={SECTION} aria-labelledby="landing-faq-title">
            <h2 id="landing-faq-title" className="font-bold">{t('landing.faq_title')}</h2>
            <div className="glass-card flex flex-col" style={{ padding: 8 }}>
              {faqs.map((faq, index) => (
                <details
                  key={faq.id}
                  className="group"
                  style={{ borderTop: index ? '1px solid var(--color-border)' : 'none' }}
                >
                  <summary
                    className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden"
                    style={{ padding: 16, minHeight: 48 }}
                  >
                    <span style={PRETTY}>{faq.q}</span>
                    <ChevronDown size={18} aria-hidden="true" className="shrink-0 transition-transform duration-300 group-open:rotate-180" style={MUTED} />
                  </summary>
                  <p className="text-sm" style={{ ...MUTED, ...PRETTY, whiteSpace: 'pre-line', padding: '0 16px 16px' }}>
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>

          <Reveal className="glass-card flex gap-4" style={{ padding: 24 }} aria-labelledby="landing-honest-title">
            <Info size={22} aria-hidden="true" style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
            <div className="flex flex-col items-start gap-2">
              <h2 id="landing-honest-title" className="font-bold" style={{ fontSize: '1rem' }}>{t('landing.honest_title')}</h2>
              <p className="text-sm" style={{ ...MUTED, ...PRETTY }}>{t('landing.honest_body')}</p>
              {!Capacitor.isNativePlatform() && (
                <Link to="/baixar" className="inline-flex items-center gap-2 text-sm font-bold underline" style={{ color: 'var(--color-text)' }}>
                  <Smartphone size={16} aria-hidden="true" /> {t('landing.download_link')}
                </Link>
              )}
            </div>
          </Reveal>

          <Reveal style={{ ...SECTION, alignItems: 'flex-start' }} aria-labelledby="landing-final-title">
            <h2 id="landing-final-title" className="font-bold" style={{ textWrap: 'balance' }}>{t('landing.final_title')}</h2>
            <PrimaryCta location="landing_final" label={t('landing.cta')} note={t('landing.cta_note')} />
          </Reveal>
        </main>

        <footer className="border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', padding: '24px 0 16px' }}>
          {t('landing.footer')}
          <span style={{ display: 'inline-flex', gap: 16, marginLeft: 16 }}>
            <Link to="/privacidade" className="underline">Privacidade</Link>
            <Link to="/termos" className="underline">Termos</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
