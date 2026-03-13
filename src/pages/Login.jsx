import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { useOutletContext } from 'react-router-dom';
import { Wallet, LogIn, UserPlus, Lock, Mail, User } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', householdName: '' });
  const [loading, setLoading] = useState(false);
  const { dispatch } = useFinance();
  const navigate = useNavigate();
  const { showToast } = useOutletContext?.() || { showToast: console.log };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body = isLogin 
      ? { email: form.email, password: form.password }
      : form;

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Autenticação falhou');

      localStorage.setItem('mwanga-token', data.token);
      dispatch({ type: 'SET_USER', payload: data.user });
      
      showToast(isLogin ? '👋 Bem-vindo de volta!' : '🎉 Conta criada com sucesso!');
      navigate('/');
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-card" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            background: 'var(--color-ocean)', 
            borderRadius: '15px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: 'white'
          }}>
            <Wallet size={30} />
          </div>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '1.8rem', 
            fontWeight: 800,
            color: 'var(--color-ocean)'
          }}>
            Mwanga <span style={{ color: 'var(--color-gold)' }}>✦</span>
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {isLogin ? 'Faça login para gerir as suas finanças' : 'Crie uma conta para a sua família'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {!isLogin && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Nome Completo
              </label>
              <input 
                type="text" required className="form-input" 
                placeholder="Ex: João Silva"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
          )}

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={14} /> Email
            </label>
            <input 
              type="email" required className="form-input" 
              placeholder="seu@email.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={14} /> Senha
            </label>
            <input 
              type="password" required className="form-input" 
              placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="form-label">Nome da Família (Opcional)</label>
              <input 
                type="text" className="form-input" 
                placeholder="Ex: Família Silva"
                value={form.householdName} onChange={e => setForm({...form, householdName: e.target.value})}
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

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
          {isLogin ? (
            <p>
              Não tem uma conta? {' '}
              <button 
                onClick={() => setIsLogin(false)} 
                style={{ color: 'var(--color-ocean)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Registe-se
              </button>
            </p>
          ) : (
            <p>
              Já tem uma conta? {' '}
              <button 
                onClick={() => setIsLogin(true)} 
                style={{ color: 'var(--color-ocean)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Faça Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
