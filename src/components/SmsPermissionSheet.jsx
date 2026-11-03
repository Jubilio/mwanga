import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Lock, MessageSquareText, Settings2, Share2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { onSmsAccessRequest } from '../services/smsAccess';
import {
  getInstallInfo,
  getSmsPermission,
  needsRestrictedSettings,
  openAppSettings,
  requestSmsPermission,
  restrictedSettingsBlocker,
} from '../services/moneySms';

/**
 * Explains why Mwanga reads SMS before Android's own dialog, and walks the user
 * through app settings when Android stops showing that dialog ("denied" for good,
 * or "restricted settings" on Android 13+ for APKs installed outside the Play Store).
 */
export default function SmsPermissionSheet() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [phase, setPhase] = useState('explain');
  const [restricted, setRestricted] = useState(false);
  const [blocker, setBlocker] = useState(null);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef(null);

  const finish = useCallback((granted) => {
    requestRef.current?.resolve(granted);
    requestRef.current = null;
    setRequest(null);
  }, []);

  useEffect(() => onSmsAccessRequest((next) => {
    requestRef.current?.resolve(false);
    requestRef.current = next;
    setPhase(next.state === 'denied' ? 'blocked' : 'explain');
    setRequest(next);
    getInstallInfo().then((info) => {
      setRestricted(needsRestrictedSettings(info));
      setBlocker(restrictedSettingsBlocker(info));
    });
  }), []);

  // Coming back from Android settings: check again and carry on if access was given.
  useEffect(() => {
    if (!request) return undefined;
    const recheck = async () => {
      if (document.visibilityState !== 'visible') return;
      if (await getSmsPermission() === 'granted') finish(true);
    };
    document.addEventListener('visibilitychange', recheck);
    return () => document.removeEventListener('visibilitychange', recheck);
  }, [request, finish]);

  async function handleAllow() {
    setBusy(true);
    try {
      const state = await requestSmsPermission();
      if (state === 'granted') finish(true);
      else setPhase(state === 'denied' ? 'blocked' : 'denied_once');
    } finally {
      setBusy(false);
    }
  }

  const list = (key) => t(key, { returnObjects: true });

  // Without READ_SMS, the user can still share or paste each SMS into the import page.
  function openShareFallback() {
    finish(false);
    navigate('/sms-import');
  }

  return (
    <AnimatePresence>
      {request && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sms-permission-title">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => finish(false)}
            className="absolute inset-0 bg-midnight/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-cream dark:bg-[#0c1c2e] rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-white/5 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <button type="button" onClick={() => finish(false)} aria-label={t('sms_permission.close')} className="absolute top-4 right-4 p-2 text-slate-600 dark:text-slate-400 hover:text-gray-200">
              <X size={18} />
            </button>

            {phase === 'blocked' ? (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gold/10 text-gold">
                  <Lock size={28} />
                </div>
                <h3 id="sms-permission-title" className="text-lg font-bold text-midnight dark:text-white mb-2">{t('sms_permission.blocked_title')}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed mb-4">{t('sms_permission.blocked_body')}</p>

                {restricted && blocker === 'advanced_protection' && (
                  <div role="alert" className="rounded-2xl border border-coral/40 bg-coral/10 p-4 mb-3 flex gap-3">
                    <ShieldAlert size={18} className="text-coral shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-bold text-midnight dark:text-white mb-1">{t('sms_permission.advanced_protection_title')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t('sms_permission.advanced_protection_body')}</p>
                    </div>
                  </div>
                )}

                {restricted ? (
                  <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gold mb-2">{t('sms_permission.restricted_title')}</p>
                    <ol className="list-decimal pl-6 space-y-2 text-sm text-midnight dark:text-slate-200">
                      {list('sms_permission.restricted_steps').map(step => <li key={step}>{step}</li>)}
                    </ol>
                    <p className="text-xs text-slate-600 dark:text-gray-400 mt-2">{t('sms_permission.restricted_note')}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 p-4 mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-sky mb-2">{t('sms_permission.settings_title')}</p>
                    <ol className="list-decimal pl-6 space-y-1 text-sm text-midnight dark:text-slate-200">
                      {list('sms_permission.settings_steps').map(step => <li key={step}>{step}</li>)}
                    </ol>
                  </div>
                )}

                {restricted && (
                  <details className="rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 p-4 mb-6 text-sm text-midnight dark:text-slate-200">
                    <summary className="font-bold cursor-pointer">{t('sms_permission.missing_title')}</summary>
                    <ul className="list-disc pl-6 space-y-2 mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {list('sms_permission.missing_reasons').map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </details>
                )}

                <button type="button" onClick={openAppSettings} className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, var(--color-ocean), var(--color-sky))' }}>
                  <Settings2 size={16} /> {t('sms_permission.open_settings')}
                </button>
                <button type="button" onClick={openShareFallback} className="w-full py-3 mt-2 rounded-2xl font-bold text-sm text-sky border border-sky/30 hover:bg-sky/10 flex items-center justify-center gap-2">
                  <Share2 size={16} /> {t('sms_permission.share_instead')}
                </button>
                <p className="text-xs text-center text-slate-600 dark:text-gray-400 mt-2">{t('sms_permission.share_instead_hint')}</p>
                <p className="text-xs text-center text-slate-600 dark:text-gray-400 mt-3">{t('sms_permission.come_back')}</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-sky/10 text-sky">
                  <MessageSquareText size={28} />
                </div>
                <h3 id="sms-permission-title" className="text-lg font-bold text-midnight dark:text-white mb-2">
                  {phase === 'denied_once' ? t('sms_permission.denied_title') : t('sms_permission.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed mb-4">
                  {phase === 'denied_once' ? t('sms_permission.denied_body') : t('sms_permission.body')}
                </p>
                <ul className="space-y-2 mb-6">
                  {list('sms_permission.promises').map(item => (
                    <li key={item} className="flex gap-2 text-sm text-midnight dark:text-slate-200">
                      <ShieldCheck size={16} className="text-aurora shrink-0 mt-1" /> <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" disabled={busy} onClick={handleAllow} className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, var(--color-ocean), var(--color-sky))' }}>
                  {phase === 'denied_once' ? t('sms_permission.try_again') : t('sms_permission.allow')}
                </button>
                <button type="button" onClick={() => finish(false)} className="w-full py-3 mt-2 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5">
                  {t('sms_permission.not_now')}
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
