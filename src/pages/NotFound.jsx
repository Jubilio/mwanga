import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Compass } from 'lucide-react';
import MwangaLogo from '../components/MwangaLogo';
import { useUiLanguage } from '../utils/uiTranslation';
import { useSeo } from '../utils/seo';
import { getToken } from '../utils/authToken';

/**
 * Shown for any address the app does not know. Marked noindex so search engines
 * do not keep these pages (the host answers 200 for every path of the app).
 */
export default function NotFound() {
  useUiLanguage();
  const { t } = useTranslation();
  useSeo({ title: t('not_found.seo_title'), description: t('not_found.body'), path: '/404', noindex: true });
  const home = getToken() ? '/' : '/bem-vindo';

  return (
    <main className="flex min-h-screen w-full items-center justify-center" style={{ background: 'var(--color-cream)', color: 'var(--color-text)', padding: '1.5rem 1rem' }}>
      <div className="flex w-full max-w-md flex-col items-start gap-6">
        <MwangaLogo variant="sidebar" adaptive />
        <Compass size={40} aria-hidden="true" style={{ color: 'var(--color-muted)' }} />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold" style={{ color: 'var(--color-muted)' }}>{t('not_found.code')}</p>
          <h1 className="font-display text-3xl font-bold leading-tight">{t('not_found.title')}</h1>
          <p className="text-base" style={{ color: 'var(--color-muted)' }}>{t('not_found.body')}</p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <Link to={home} className="btn btn-primary inline-flex items-center gap-2" style={{ padding: '0.9rem 1.6rem' }}>
            <ArrowLeft size={18} /> {t('not_found.cta')}
          </Link>
          <Link to="/baixar" className="text-sm font-bold underline" style={{ color: 'var(--color-muted)' }}>
            {t('not_found.download')}
          </Link>
        </div>
      </div>
    </main>
  );
}
