import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, LogIn, AlertTriangle } from 'lucide-react';

function getApiUrl() {
  let apiUrl = import.meta.env.VITE_API_URL || '';
  if (!apiUrl.endsWith('/api')) {
    apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
  }
  return apiUrl;
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const resp = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || data?.message || 'Autenticação falhou.');
      }

      if (data.user?.role !== 'admin') {
        throw new Error('Acesso negado. Esta conta não tem privilégios de administrador.');
      }

      localStorage.setItem('mwanga-admin-token', data.token);
      localStorage.setItem('mwanga-admin-user', JSON.stringify(data.user));
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #07090f 0%, #0c1018 40%, #111827 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: "'Inter', 'Sora', system-ui, sans-serif",
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
        }}>
          {/* Logo + Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #F59E0B, #F97316)',
              borderRadius: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.2rem',
              boxShadow: '0 8px 24px rgba(245,158,11,0.3)',
            }}>
              <Shield size={32} color="#fff" />
            </div>

            <h1 style={{
              fontSize: '1.6rem', fontWeight: 900, color: '#e8f0fe',
              fontFamily: "'Sora', sans-serif", margin: '0 0 0.3rem',
              letterSpacing: '-0.02em',
            }}>
              Mwanga <span style={{ color: '#F59E0B' }}>Admin</span>
            </h1>

            <p style={{
              color: '#6b7fa3', fontSize: '0.85rem', margin: 0, lineHeight: 1.6,
            }}>
              Acesso restrito à gestão da plataforma.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '1.5rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}>
              <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#EF4444' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.75rem', fontWeight: 700, color: '#6b7fa3',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '0.5rem',
              }}>
                <Mail size={13} /> Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@mwanga.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  color: '#e8f0fe',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(245,158,11,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.75rem', fontWeight: 700, color: '#6b7fa3',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '0.5rem',
              }}>
                <Lock size={13} /> Senha
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  color: '#e8f0fe',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(245,158,11,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '0.5rem',
                background: loading
                  ? 'rgba(245,158,11,0.4)'
                  : 'linear-gradient(135deg, #F59E0B, #F97316)',
                border: 'none',
                borderRadius: '14px',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(245,158,11,0.25)',
              }}
            >
              {loading ? 'A verificar...' : <><LogIn size={18} /> Entrar no Painel</>}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: 'center', marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: '#4a5568', fontSize: '0.75rem', margin: 0 }}>
              Área restrita Mwanga Intelligence ✦
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
