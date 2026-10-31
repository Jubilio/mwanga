import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download as DownloadIcon, ShieldCheck, Smartphone, ExternalLink, ArrowLeft } from 'lucide-react';
import { uiLocale, useUiLanguage } from '../utils/uiTranslation';
import { fetchLatestRelease, LATEST_APK_URL, RELEASES_PAGE } from '../utils/latestRelease';
import MwangaLogo from '../components/MwangaLogo';

/**
 * Public page with the official Android download (GitHub Releases), install steps
 * and the fingerprints people can use to check the file is the original one.
 */
export default function Download() {
  useUiLanguage();
  const { t } = useTranslation();
  const [release, setRelease] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetchLatestRelease(controller.signal)
      .then(result => { setRelease(result); setStatus(result ? 'ready' : 'none'); })
      .catch(error => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, []);

  const steps = t('download.steps', { returnObjects: true });
  const downloadUrl = release?.url || LATEST_APK_URL;
  const muted = { color: 'var(--color-muted)' };

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--color-cream)', color: 'var(--color-text)', padding: '1.5rem 1rem' }}>
      <div className="flex w-full max-w-3xl flex-col gap-10" style={{ margin: '0 auto' }}>
        <header className="flex items-center justify-between gap-4">
          <MwangaLogo variant="sidebar" />
          <Link to="/bem-vindo" className="inline-flex items-center gap-1 text-sm font-semibold" style={muted}>
            <ArrowLeft size={16} /> {t('download.back')}
          </Link>
        </header>

        <section className="flex flex-col gap-5">
          <h1 className="font-display text-3xl font-black leading-tight sm:text-4xl">{t('download.title')}</h1>
          <p className="max-w-xl text-base" style={muted}>{t('download.subtitle')}</p>
          <div className="flex flex-col items-start gap-2">
            <a href={downloadUrl} className="btn btn-primary inline-flex items-center gap-2" style={{ padding: '1rem 1.75rem', fontSize: '1rem' }}>
              <DownloadIcon size={18} /> {t('download.cta')}
            </a>
            <p className="text-xs" style={muted} aria-live="polite">
              {status === 'loading' && t('download.loading')}
              {status === 'ready' && t('download.meta', {
                version: release.version,
                size: release.sizeMb,
                date: new Date(release.publishedAt).toLocaleDateString(uiLocale()),
              })}
              {(status === 'none' || status === 'error') && t('download.unavailable')}
            </p>
          </div>
        </section>

        <section className="glass-card flex flex-col gap-4" style={{ padding: '1.25rem' }}>
          <h2 className="inline-flex items-center gap-2 text-xl font-black"><Smartphone size={20} /> {t('download.steps_title')}</h2>
          <ol className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ background: 'var(--color-gold)', color: 'var(--color-midnight)' }}>
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs" style={muted}>{t('download.update_note')}</p>
        </section>

        <section className="glass-card flex flex-col gap-3" style={{ padding: '1.25rem' }}>
          <h2 className="inline-flex items-center gap-2 text-xl font-black"><ShieldCheck size={20} /> {t('download.verify_title')}</h2>
          <p className="text-sm" style={muted}>{t('download.verify_body')}</p>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-bold">{t('download.package')}</dt>
              <dd><code>com.mwanga.app</code></dd>
            </div>
            {release?.certSha256 && (
              <div>
                <dt className="font-bold">{t('download.cert')}</dt>
                <dd><code style={{ wordBreak: 'break-all' }}>{release.certSha256}</code></dd>
              </div>
            )}
            {release?.apkSha256 && (
              <div>
                <dt className="font-bold">{t('download.apk_hash')}</dt>
                <dd><code style={{ wordBreak: 'break-all' }}>{release.apkSha256}</code></dd>
              </div>
            )}
          </dl>
          <p className="text-xs" style={muted}>{t('download.not_play')}</p>
          <a href={release?.pageUrl || RELEASES_PAGE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold underline">
            {t('download.history')} <ExternalLink size={14} />
          </a>
        </section>
      </div>
    </div>
  );
}
