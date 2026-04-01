import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de recuperação em falta ou inválido.');
    }
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return setError('As senhas não coincidem');
    }
    if (form.password.length < 8) {
      return setError('A senha deve ter pelo menos 8 caracteres');
    }

    setLoading(true);
    setError('');

    let apiUrl = import.meta.env.VITE_API_URL || '';
    if (!apiUrl.endsWith('/api')) apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;

    try {
      const resp = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao redefinir senha');

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
                Nova senha
              </h1>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                Crie uma senha forte para proteger a sua conta.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={14} /> Nova senha
                </label>
                <input
                  type="password" required className="form-input"
                  placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={14} /> Confirmar senha
                </label>
                <input
                  type="password" required className="form-input"
                  placeholder="••••••••"
                  value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
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
                type="submit" disabled={loading || (!!error && !token)} className="btn btn-primary"
                style={{ width: '100%', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? 'A processar...' : 'Atualizar senha'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ color: 'var(--color-green)', marginBottom: '1rem' }}>
              <CheckCircle2 size={60} strokeWidth={1.5} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.8rem' }}>
              Senha atualizada!
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              A sua senha foi redefinida com sucesso. Já pode aceder à sua conta Mwanga.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none' }}>
              Fazer login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
