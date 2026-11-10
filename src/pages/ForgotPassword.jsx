import { useUiLanguage } from '../utils/uiTranslation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, KeyRound, MessageCircle, Eye, EyeOff, RotateCw } from 'lucide-react';
import { getSupportWhatsAppUrl } from '../utils/support';
import { useSeo } from '../utils/seo';

function getApiUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
}

async function postJson(path, body, fallback) {
  const resp = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || data.message || fallback);
  return data;
}

const RESEND_SECONDS = 60;

// Password recovery in two steps on one page: ask for the email, then take the
// 6-digit code from that email (or the link in it) and the new password.
export default function ForgotPassword() {
  useUiLanguage();
  const { t } = useTranslation();
  useSeo({ title: t('auth.seo_title'), path: '/forgot-password', noindex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('email'); // email | code | done
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const whatsappUrl = getSupportWhatsAppUrl(t('auth.forgot.whatsapp_message', { email: email || '...' }));

  async function requestEmail(e) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await postJson('/auth/forgot-password', { email: email.trim() }, t('auth.forgot.error_fallback'));
      setStep('code');
      setCooldown(RESEND_SECONDS);
      if (e === undefined) setNotice(t('auth.forgot.resent'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    if (password.length < 8) return setError(t('auth.reset.errors.length'));
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await postJson('/auth/reset-password', { email: email.trim(), code: code.trim(), password }, t('auth.reset.errors.fallback'));
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const errorBox = error && (
    <div role="alert" style={{
      padding: '12px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
      borderRadius: '10px', color: 'var(--color-red)', fontSize: '0.85rem'
    }}>{error}</div>
  );

  const helpBox = (
    <div style={{
      marginTop: '1.5rem', padding: '1rem 1rem', borderRadius: '12px',
      background: 'var(--color-surface-2, rgba(148,163,184,0.08))', border: '1px solid var(--color-border)'
    }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)' }}>{t('auth.forgot.help_title')}</p>
      <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1rem', color: 'var(--color-muted)', fontSize: '0.83rem', lineHeight: 1.55 }}>
        <li>{t('auth.forgot.help_spam')}</li>
        <li>{t('auth.forgot.help_wait')}</li>
        {googleEnabled && <li>{t('auth.forgot.help_google')}</li>}
      </ul>
      {whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{
          marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: '#16a34a', fontWeight: 700, fontSize: '0.86rem', textDecoration: 'none'
        }}>
          <MessageCircle size={16} /> {t('auth.forgot.whatsapp_cta')}
        </a>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        {step !== 'done' && (
          <button
            type="button"
            onClick={() => (step === 'code' ? (setStep('email'), setError(''), setNotice('')) : navigate('/login'))}
            style={{
              background: 'none', border: 'none', color: 'var(--color-muted)', marginBottom: '1rem', padding: 0,
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            <ArrowLeft size={16} /> {t('auth.forgot.back_link')}
          </button>
        )}

        {step === 'email' && (
          <>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.5rem' }}>
              {t('auth.forgot.title')}
            </h1>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              {t('auth.forgot.subtitle')}
            </p>

            {googleEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login?google=1')}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-[0.98]"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
                  <span>{t('auth.forgot.google_btn')}</span>
                </button>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                  {t('auth.forgot.google_tip')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{t('auth.forgot.or_email')}</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                </div>
              </>
            )}

            <form onSubmit={requestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="forgot-email" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} /> {t('auth.forgot.email_label')}
                </label>
                <input
                  id="forgot-email" type="email" required autoComplete="email" inputMode="email" className="form-input"
                  placeholder={t('auth.forgot.email_placeholder')}
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errorBox}
              <button
                type="submit" disabled={loading} className="btn btn-primary"
                style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? t('auth.login.btn_processing') : <><Send size={18} /> {t('auth.forgot.btn_send')}</>}
              </button>
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.5rem' }}>
              {t('auth.forgot.code_title')}
            </h1>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              {t('auth.forgot.code_desc_before')} <strong style={{ color: 'var(--color-text)' }}>{email}</strong>. {t('auth.forgot.code_desc_after')}
            </p>

            <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="forgot-code" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <KeyRound size={14} /> {t('auth.forgot.code_label')}
                </label>
                <input
                  id="forgot-code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
                  className="form-input" placeholder="000000"
                  style={{ fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center', fontWeight: 700 }}
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <div>
                <label htmlFor="forgot-password" className="form-label">{t('auth.forgot.new_password_label')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="forgot-password" type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={100}
                    autoComplete="new-password" className="form-input" style={{ paddingRight: '3rem' }}
                    placeholder={t('auth.forgot.new_password_placeholder')}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.forgot.hide_password') : t('auth.forgot.show_password')}
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {errorBox}
              {notice && <div style={{ color: 'var(--color-green)', fontSize: '0.85rem' }}>{notice}</div>}
              <button
                type="submit" disabled={loading || code.length !== 6} className="btn btn-primary"
                style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? t('auth.login.btn_processing') : t('auth.forgot.btn_save')}
              </button>
              <button
                type="button" onClick={() => requestEmail()} disabled={loading || cooldown > 0}
                style={{
                  background: 'none', border: 'none', cursor: cooldown > 0 ? 'default' : 'pointer',
                  color: cooldown > 0 ? 'var(--color-muted)' : 'var(--color-ocean)', fontWeight: 700, fontSize: '0.86rem',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <RotateCw size={14} /> {cooldown > 0 ? t('auth.forgot.resend_wait', { seconds: cooldown }) : t('auth.forgot.resend')}
              </button>
            </form>
            {helpBox}
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={60} strokeWidth={1.5} style={{ margin: '0 auto 1rem', color: 'var(--color-green)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>
              {t('auth.reset.success_title')}
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              {t('auth.reset.success_desc')}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none' }}>
              {t('auth.reset.btn_to_login')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
