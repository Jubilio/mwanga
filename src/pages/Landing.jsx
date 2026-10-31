import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Smartphone, Wallet, Target, Users, Home, ShieldCheck, MapPin, MessageCircle, Info } from 'lucide-react';
import { useUiLanguage } from '../utils/uiTranslation';
import { getSupportWhatsAppUrl } from '../utils/support';
import MwangaLogo from '../components/MwangaLogo';
import { getToken } from '../utils/authToken';

const FEATURE_ICONS = [Wallet, Target, Users, Home];
const REGISTER_PATH = '/login?modo=registo';

/**
 * Public page shown to visitors who are not signed in.
 * One primary action per screen: "Começar grátis".
 */
export default function Landing() {
  useUiLanguage();
  const { t } = useTranslation();
  const supportUrl = getSupportWhatsAppUrl();
  const features = t('landing.features', { returnObjects: true });
  const steps = t('landing.steps', { returnObjects: true });

  if (getToken()) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--color-cream)', color: 'var(--color-text)', padding: '1.5rem 1rem' }}>
      <div className="flex w-full max-w-5xl flex-col gap-14" style={{ margin: '0 auto' }}>
        <header className="flex items-center justify-between gap-4">
          <MwangaLogo variant="sidebar" />
          <Link to="/login" className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>
            {t('landing.login')}
          </Link>
        </header>

        {/* Primeiro ecrã: benefício, acção principal e confiança */}
        <section className="flex flex-col gap-6" style={{ paddingTop: '1.5rem' }}>
          <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl" style={{ maxWidth: '18ch' }}>
            {t('landing.title')}
          </h1>
          <p className="max-w-xl text-base sm:text-lg" style={{ color: 'var(--color-muted)' }}>
            {t('landing.subtitle')}
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link to={REGISTER_PATH} className="btn btn-primary inline-flex items-center gap-2" style={{ padding: '1rem 1.75rem', fontSize: '1rem' }}>
              {t('landing.cta')} <ArrowRight size={18} />
            </Link>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('landing.cta_note')}</p>
            <Link to="/login" className="text-sm font-semibold underline" style={{ color: 'var(--color-muted)' }}>
              {t('landing.login_link')}
            </Link>
            {!Capacitor.isNativePlatform() && (
              <Link to="/baixar" className="inline-flex items-center gap-1.5 text-sm font-semibold underline" style={{ color: 'var(--color-muted)' }}>
                <Smartphone size={16} /> {t('landing.download_link')}
              </Link>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>
            <li className="inline-flex items-center gap-1.5"><MapPin size={14} /> {t('landing.trust.local')}</li>
            <li className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> {t('landing.trust.security')}</li>
            {supportUrl && (
              <li>
                <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline">
                  <MessageCircle size={14} /> {t('landing.trust.whatsapp')}
                </a>
              </li>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-black">{t('landing.features_title')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] || Wallet;
              return (
                <div key={feature.title} className="glass-card flex gap-4" style={{ padding: '1.25rem' }}>
                  <Icon size={24} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                  <div>
                    <h3 className="font-bold">{feature.title}</h3>
                    <p className="text-sm" style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-black">{t('landing.steps_title')}</h2>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step} className="glass-card flex items-center gap-4" style={{ padding: '1.25rem' }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black" style={{ background: 'var(--color-gold)', color: 'var(--color-midnight)' }}>
                  {index + 1}
                </span>
                <span className="font-semibold">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="glass-card flex gap-4" style={{ padding: '1.25rem' }}>
          <Info size={22} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <div>
            <h2 className="font-bold">{t('landing.honest_title')}</h2>
            <p className="text-sm" style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>{t('landing.honest_body')}</p>
          </div>
        </section>

        <section className="flex flex-col items-start gap-4">
          <h2 className="text-2xl font-black">{t('landing.final_title')}</h2>
          <Link to={REGISTER_PATH} className="btn btn-primary inline-flex items-center gap-2" style={{ padding: '1rem 1.75rem', fontSize: '1rem' }}>
            {t('landing.cta')} <ArrowRight size={18} />
          </Link>
        </section>

        <footer className="border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', padding: '1.5rem 0 1rem' }}>
          {t('landing.footer')}
        </footer>
      </div>
    </div>
  );
}
