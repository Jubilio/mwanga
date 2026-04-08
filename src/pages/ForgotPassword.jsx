import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    let apiUrl = import.meta.env.VITE_API_URL || '';
    if (!apiUrl.endsWith('/api')) apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;

    try {
      const resp = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || t('auth.forgot.error_fallback'));

      setSent(true);
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
        <div style={{ marginBottom: '1.5rem' }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', color: 'var(--color-muted)',
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem'
          }}>
            <ArrowLeft size={16} /> {t('auth.forgot.back_link')}
          </button>
        </div>

        {!sent ? (
          <>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-ocean)', marginBottom: '0.5rem' }}>
              {t('auth.forgot.title')}
            </h1>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {t('auth.forgot.subtitle')}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} /> {t('auth.login.email_label')}
                </label>
                <input
                  type="email" required className="form-input"
                  placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>

              {error && <div style={{ color: 'var(--color-red)', fontSize: '0.85rem' }}>❌ {error}</div>}

              <button
                type="submit" disabled={loading} className="btn btn-primary"
                style={{ width: '100%', height: '45px', display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '0.5rem' }}
              >
                {loading ? t('auth.login.btn_processing') : <><Send size={18} /> {t('auth.forgot.btn_send')}</>}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ color: 'var(--color-green)', marginBottom: '1rem' }}>
              <CheckCircle2 size={60} strokeWidth={1.5} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.8rem' }}>
              {t('auth.forgot.success_title')}
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              {t('auth.forgot.success_desc', { email })}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none' }}>
              {t('auth.forgot.btn_to_login')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
