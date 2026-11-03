import { useUiLanguage } from '../utils/uiTranslation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ShieldCheck, AlertCircle, Key, Eye, EyeOff } from 'lucide-react';

function getApiUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
}

// Opened from the link in the recovery email.
export default function ResetPassword() {
  useUiLanguage();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? '' : t('auth.reset.errors.token'));
  const [linkInvalid, setLinkInvalid] = useState(!token);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) return setError(t('auth.reset.errors.length'));
    if (password !== confirmPassword) return setError(t('auth.reset.errors.match'));

    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${getApiUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (resp.status === 400 && !data.details) setLinkInvalid(true);
        throw new Error(data.error || data.message || t('auth.reset.errors.fallback'));
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputType = showPassword ? 'text' : 'password';

  return (
    <div className="animate-fade-in" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        {!success ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '60px', height: '60px', background: 'var(--color-ocean)', borderRadius: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white'
              }}>
                <ShieldCheck size={30} />
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
                {t('auth.reset.title')}
              </h1>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: 0 }}>
                {t('auth.reset.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="reset-password" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={14} /> {t('auth.forgot.new_password_label')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-password" type={inputType} required minLength={8} maxLength={100} autoComplete="new-password"
                    className="form-input" style={{ paddingRight: '3rem' }}
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

              <div>
                <label htmlFor="reset-confirm" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={14} /> {t('auth.reset.confirm_label')}
                </label>
                <input
                  id="reset-confirm" type={inputType} required minLength={8} maxLength={100} autoComplete="new-password"
                  className="form-input" placeholder={t('auth.forgot.new_password_placeholder')}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && (
                <div role="alert" style={{
                  padding: '12px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px', color: 'var(--color-red)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '4px' }} />
                  <span>
                    {error}
                    {linkInvalid && (
                      <> <Link to="/forgot-password" style={{ color: 'var(--color-ocean)', fontWeight: 700 }}>{t('auth.reset.request_new')}</Link></>
                    )}
                  </span>
                </div>
              )}

              <button
                type="submit" disabled={loading || !token} className="btn btn-primary"
                style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? t('auth.login.btn_processing') : <><Key size={18} /> {t('auth.reset.btn_update')}</>}
              </button>
            </form>
          </>
        ) : (
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
