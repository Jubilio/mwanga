import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Share, SquarePlus, Check, Smartphone, Compass, Copy, MessageSquareOff, ArrowDown } from 'lucide-react';

const STEP_ICONS = [Share, SquarePlus, Check, Smartphone];
const muted = { color: 'var(--color-muted)' };

function Steps({ steps }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[index] || Check;
        return (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ background: 'var(--color-gold)', color: 'var(--color-midnight)' }}>
              {index + 1}
            </span>
            <span className="flex-1">{step}</span>
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-sky) 14%, transparent)', color: 'var(--color-sky)' }}>
              <Icon size={18} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SmsNote({ text }) {
  return (
    <p className="flex gap-2 text-xs" style={muted}>
      <MessageSquareOff size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

function OpenInSafari() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div role="note" className="flex flex-col gap-3 rounded-2xl" style={{ padding: '1rem 1.1rem', border: '1px solid color-mix(in srgb, var(--color-coral) 45%, transparent)', background: 'color-mix(in srgb, var(--color-coral) 10%, transparent)' }}>
      <p className="inline-flex items-center gap-2 font-black"><Compass size={18} style={{ color: 'var(--color-coral)' }} /> {t('download.ios.not_safari_title')}</p>
      <p className="text-sm">{t('download.ios.not_safari_body')}</p>
      <button type="button" onClick={copy} className="btn btn-ghost inline-flex items-center gap-2 self-start" aria-live="polite">
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('download.ios.copied') : t('download.ios.copy_link')}
      </button>
    </div>
  );
}

/**
 * How to put the Mwanga web app on an iPhone Home Screen. There is no native iOS app:
 * Safari installs the PWA. `primary` is the full guide for iPhone visitors; otherwise a
 * short card for people reading the Android page who also have an iPhone.
 */
export default function IosInstallGuide({ platform, primary = false }) {
  const { t } = useTranslation();
  const steps = t('download.ios.steps', { returnObjects: true });

  if (!primary) {
    const url = typeof window === 'undefined' ? 'mwanga' : `${window.location.host}${window.location.pathname}`;
    return (
      <section className="glass-card flex flex-col gap-4" style={{ padding: '1.25rem' }}>
        <h2 className="inline-flex items-center gap-2 text-xl font-black"><Smartphone size={20} /> {t('download.ios.other_title')}</h2>
        <p className="text-sm" style={muted}>{t('download.ios.other_body', { url })}</p>
        <Steps steps={steps} />
        <SmsNote text={t('download.ios.sms_note')} />
      </section>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-5">
        <h1 className="font-display text-3xl font-black leading-tight sm:text-4xl">{t('download.ios.title')}</h1>
        <p className="max-w-xl text-base" style={muted}>{t('download.ios.subtitle')}</p>
      </section>

      {platform.standalone ? (
        <section className="glass-card flex flex-col gap-3" style={{ padding: '1.25rem' }}>
          <h2 className="inline-flex items-center gap-2 text-xl font-black"><Check size={20} style={{ color: 'var(--color-leaf-light)' }} /> {t('download.ios.installed_title')}</h2>
          <p className="text-sm" style={muted}>{t('download.ios.installed_body')}</p>
          <Link to="/" className="btn btn-primary inline-flex items-center gap-2 self-start">{t('download.ios.open_app')}</Link>
        </section>
      ) : (
        <section className="glass-card flex flex-col gap-4" style={{ padding: '1.25rem' }}>
          <h2 className="inline-flex items-center gap-2 text-xl font-black"><Smartphone size={20} /> {t('download.ios.steps_title')}</h2>
          {!platform.safari && <OpenInSafari />}
          <Steps steps={steps} />
          <SmsNote text={t('download.ios.sms_note')} />
        </section>
      )}

      <p className="inline-flex items-center gap-1 text-xs" style={muted}><ArrowDown size={14} aria-hidden="true" /> {t('download.ios.android_hint')}</p>
    </>
  );
}
