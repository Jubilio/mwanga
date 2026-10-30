import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';

/** Shown when the server could not be reached, so empty figures are never mistaken for real ones. */
export default function DataLoadErrorBanner() {
  const { t } = useTranslation();
  const { state, reloadData } = useFinance();
  const [retrying, setRetrying] = useState(false);

  if (!state.loadError) return null;

  const status = state.loadError.status > 0 ? `HTTP ${state.loadError.status}` : t('dashboard.load_error.network');
  const retry = async () => {
    setRetrying(true);
    try { await reloadData(); } finally { setRetrying(false); }
  };

  return (
    <section role="alert" className="glass-card flex flex-col gap-3" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="shrink-0 text-amber-500" />
        <div>
          <h2 className="font-black text-base">{t('dashboard.load_error.title')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300" style={{ marginTop: '0.25rem' }}>
            {t('dashboard.load_error.body')}
          </p>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400" style={{ marginTop: '0.25rem' }}>{status}</p>
        </div>
      </div>
      <button type="button" className="btn btn-primary" style={{ width: 'auto', alignSelf: 'flex-start', padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} onClick={retry} disabled={retrying}>
        {retrying ? t('dashboard.load_error.retrying') : t('dashboard.load_error.retry')}
      </button>
    </section>
  );
}
