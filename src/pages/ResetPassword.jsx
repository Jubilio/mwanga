import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ShieldCheck, AlertCircle, Key } from 'lucide-react';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError(t('auth.reset.errors.token'));
    }
  }, [token, t]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError(t('auth.reset.errors.match'));
    }
    if (password.length < 8) {
      return setError(t('auth.reset.errors.length'));
    }

    setLoading(true);
    setError('');

    let apiUrl = import.meta.env.VITE_API_URL || '';
    if (!apiUrl.endsWith('/api')) apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;

    try {
      const resp = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || t('auth.reset.errors.fallback'));

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{
      minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        {!success ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '60px', height: '60px', background: 'var(--color-ocean)',
                borderRadius: '15px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem', color: 'white'
              }}>
                <ShieldCheck size={30} />
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-ocean)', marginBottom: '0.5rem' }}>
                {t('auth.reset.title')}
              </h1>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t('auth.reset.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={14} /> {t('auth.login.password_label')}
                </label>
                <input
                  type="password" required minLength={8} className="form-input"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={14} /> {t('auth.reset.confirm_label') || 'Confirmar Senha'}
                </label>
                <input
                  type="password" required minLength={8} className="form-input"
                  placeholder="••••••••"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px',
                  color: 'var(--color-red)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <button
                type="submit" disabled={loading || !token} className="btn btn-primary"
                style={{ width: '100%', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? t('auth.login.btn_processing') : <><Key size={18} /> {t('auth.reset.btn_update')}</>}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ color: 'var(--color-green)', marginBottom: '1rem' }}>
              <CheckCircle2 size={60} strokeWidth={1.5} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.8rem' }}>
              {t('auth.reset.success_title')}
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
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
