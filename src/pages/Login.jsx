import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Wallet, LogIn, UserPlus, Lock, Mail, User } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import MwangaLogo from '../components/MwangaLogo';

function getApiUrl() {
  let apiUrl = import.meta.env.VITE_API_URL || '';

  if (!apiUrl.endsWith('/api')) {
    apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
  }

  return apiUrl;
}

function getApiErrorMessage(data, fallback) {
  return data?.error || data?.message || fallback;
}

function getCurrentOrigin() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

export default function Login() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', householdName: '' });
  const [loading, setLoading] = useState(false);
  const { reloadData } = useFinance();
  const navigate = useNavigate();
  const { showToast } = useOutletContext?.() || { showToast: console.log };
  const currentOrigin = getCurrentOrigin();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body = isLogin
      ? { email: form.email, password: form.password }
      : form;

    try {
      const resp = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(getApiErrorMessage(data, t('auth.forgot.error_fallback')));
      }

      localStorage.setItem('mwanga-token', data.token);
      await reloadData({ preferredUser: data.user });

      showToast(isLogin ? t('auth.login.toasts.success') : t('auth.register.toasts.success'));
      navigate('/');
    } catch (err) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setLoading(true);

    try {
      const resp = await fetch(`${getApiUrl()}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(getApiErrorMessage(data, t('auth.login.toasts.google_failed')));
      }

      if (!data?.token || !data?.user) {
        throw new Error(t('auth.login.toasts.google_failed'));
      }

      localStorage.setItem('mwanga-token', data.token);
      await reloadData({ preferredUser: data.user });

      showToast(data.created ? t('auth.register.toasts.google_success') : t('auth.login.toasts.welcome_google'));
      navigate('/');
    } catch (err) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    const originLabel = currentOrigin || 'origem atual';
    showToast(t('auth.login.toasts.google_unavailable', { origin: originLabel }));
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MwangaLogo variant="login" />
          </div>

          <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {isLogin ? t('auth.login.subtitle') : t('auth.register.subtitle')}
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              shape="pill"
              locale={t('auth.login.google_locale') || 'pt_BR'}
              text="continue_with"
            />
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              lineHeight: 1.5,
              color: 'var(--color-muted)',
              textAlign: 'center'
            }}
          >
            {t('auth.login.google_tip')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{t('auth.login.or_divider')}</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {!isLogin && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> {t('auth.register.name_label')}
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                className="form-input"
                placeholder={t('auth.register.name_placeholder')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={14} /> {t('auth.login.email_label')}
            </label>
            <input
              type="email"
              required
              maxLength={100}
              className="form-input"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={14} /> {t('auth.login.password_label')}
            </label>
            <input
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              maxLength={100}
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {!isLogin && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                {t('auth.register.password_tip')}
              </p>
            )}
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    color: 'var(--color-ocean)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {t('auth.login.forgot_password')}
                </button>
              </div>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="form-label">{t('auth.register.family_label')}</label>
              <input
                type="text"
                maxLength={100}
                className="form-input"
                placeholder={t('auth.register.family_placeholder')}
                value={form.householdName}
                onChange={(e) => setForm({ ...form, householdName: e.target.value })}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '45px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            {loading ? t('auth.login.btn_processing') : isLogin ? <><LogIn size={18} /> {t('auth.login.btn_login')}</> : <><UserPlus size={18} /> {t('auth.register.btn_register')}</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
          {isLogin ? (
            <p>
              {t('auth.login.no_account')}{' '}
              <button
                onClick={() => setIsLogin(false)}
                style={{ color: 'var(--color-ocean)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('auth.login.register_link')}
              </button>
            </p>
          ) : (
            <p>
              {t('auth.register.already_have')}{' '}
              <button
                onClick={() => setIsLogin(true)}
                style={{ color: 'var(--color-ocean)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('auth.register.login_link')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
