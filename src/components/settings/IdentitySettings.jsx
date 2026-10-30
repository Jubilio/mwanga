import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import api from '../../utils/api';

const DOCUMENT_TYPES = ['bi_frente', 'bi_verso', 'selfie', 'comprovativo_residencia', 'comprovativo_rendimento'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function IdentitySettings({ showToast }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function load() {
    try {
      const { data } = await api.get('/kyc/documents');
      setStatus(data.status);
      setDocuments(data.documents || []);
    } catch { /* section stays in its empty state */ }
  }
  useEffect(() => { load(); }, []);

  async function upload(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) { showToast(t('settings.identity.too_large'), 'error'); return; }
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('document', file);
    setBusy(true);
    try {
      await api.post('/kyc/upload', formData);
      showToast(t('settings.identity.uploaded'), 'success');
      await load();
    } catch {
      showToast(t('settings.identity.error'), 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const sent = new Set(documents.map(document => document.document_type));

  return <section className="glass-card p-6 md:p-10 mt-6 space-y-5">
    <div>
      <h2 className="text-xl font-black">{t('settings.identity.title')}</h2>
      <p className="text-sm text-slate-500 mt-2">{t('settings.identity.description')}</p>
    </div>
    {status ? <p className="text-sm font-bold">{t(`settings.identity.status.${status}`, { defaultValue: status })}</p> : null}
    <ul className="space-y-1 text-sm">
      {DOCUMENT_TYPES.map(type => <li key={type} className="flex justify-between gap-3">
        <span>{t(`settings.identity.types.${type}`)}</span>
        <span className="text-slate-500">{sent.has(type) ? t('settings.identity.sent') : t('settings.identity.missing')}</span>
      </li>)}
    </ul>
    {status !== 'approved' ? <div className="flex flex-wrap items-end gap-3">
      <label className="block text-sm font-bold flex-1 min-w-[200px]">{t('settings.identity.type_label')}
        <select className="form-input block w-full mt-2" value={documentType} disabled={busy} onChange={event => setDocumentType(event.target.value)}>
          {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{t(`settings.identity.types.${type}`)}</option>)}
        </select>
      </label>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={event => upload(event.target.files?.[0])} />
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={16} />{t(busy ? 'settings.identity.uploading' : 'settings.identity.upload')}</button>
    </div> : null}
    <p className="text-xs text-slate-500">{t('settings.identity.privacy')}</p>
  </section>;
}
