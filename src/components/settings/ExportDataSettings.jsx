import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

// "Exportar os meus dados": a JSON file with everything the server keeps about
// the person and their household (no passwords, codes or keys).
async function saveJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const file = typeof File === 'function' ? new File([blob], filename, { type: 'application/json' }) : null;
  // Android app (WebView) and phones: the share sheet can save to Files or Drive.
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export default function ExportDataSettings() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function run() {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      const res = await api.get('/auth/account/export');
      await saveJson(res.data, `mwanga-dados-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  return <section className="glass-card p-6 md:p-10 mt-6" aria-labelledby="export-data-title">
    <h2 id="export-data-title" className="text-xl font-bold">{t('settings.export_data.title')}</h2>
    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-6">{t('settings.export_data.body')}</p>
    <button type="button" onClick={run} disabled={busy} className="btn btn-primary w-full sm:w-auto">
      {t(busy ? 'settings.export_data.busy' : 'settings.export_data.button')}
    </button>
    {status ? <p className="text-sm mt-3" role={status === 'done' ? 'status' : 'alert'}>{t(`settings.export_data.${status}`)}</p> : null}
  </section>;
}
