import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { Wallet, LogIn, UserPlus, Lock, Mail, User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

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
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', householdName: '' });
  const [loading, setLoading] = useState(false);
  const { dispatch } = useFinance();
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
        throw new Error(getApiErrorMessage(data, 'Autenticacao falhou'));
      }

      localStorage.setItem('mwanga-token', data.token);
      dispatch({ type: 'SET_USER', payload: data.user });

      showToast(isLogin ? 'Bem-vindo de volta!' : 'Conta criada com sucesso!');
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
        throw new Error(getApiErrorMessage(data, 'Autenticacao com Google falhou'));
      }

      localStorage.setItem('mwanga-token', data.token);
      dispatch({ type: 'SET_USER', payload: data.user });

      showToast('Bem-vindo via Google!');
      navigate('/');
    } catch (err) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    const originLabel = currentOrigin || 'origem atual';
    showToast(
      `Google Login indisponivel: autorize ${originLabel} no Google Cloud Console em Authorized JavaScript origins.`
    );
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
          maxWidth: '400px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              background: 'var(--color-ocean)',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'white'
            }}
          >
            <Wallet size={30} />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--color-ocean)'
            }}
          >
            Mwanga <span style={{ color: 'var(--color-gold)' }}>✦</span>
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {isLogin ? 'Faca login para gerir as suas financas' : 'Crie uma conta para a sua familia'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {!isLogin && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Nome Completo
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                className="form-input"
                placeholder="Ex: Joao Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={14} /> Email
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
              <Lock size={14} /> Senha
            </label>
            <input
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              maxLength={100}
              className="form-input"
              placeholder="********"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {!isLogin && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                Usa pelo menos 8 caracteres.
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
                  Esqueci-me da senha?
                </button>
              </div>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="form-label">Nome da Familia (Opcional)</label>
              <input
                type="text"
                maxLength={100}
                className="form-input"
                placeholder="Ex: Familia Silva"
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
            {loading ? 'Processando...' : isLogin ? <><LogIn size={18} /> Entrar</> : <><UserPlus size={18} /> Criar Conta</>}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>OU</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              shape="pill"
              locale="pt_BR"
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
            Se o Google falhar em preview ou localhost, adiciona <strong>{currentOrigin || 'esta origem'}</strong> em
            {' '}Authorized JavaScript origins no Google Cloud Console.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
          {isLogin ? (
            <p>
              Nao tem uma conta?{' '}
              <button
                onClick={() => setIsLogin(false)}
                style={{ color: 'var(--color-ocean)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Registe-se
              </button>
            </p>
          ) : (
            <p>
              Ja tem uma conta?{' '}
              <button
                onClick={() => setIsLogin(true)}
                style={{ color: 'var(--color-ocean)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Faca Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
