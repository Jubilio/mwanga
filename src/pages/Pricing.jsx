import React, { useState } from 'react';
import { Check, Star, Zap, Crown, Globe, Shield, Rocket, ArrowRight } from 'lucide-react';
import { useFinance } from '../hooks/useFinanceStore';

export default function Pricing() {
  const { } = useFinance();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'

  const plans = [
    {
      name: 'Starter',
      price: 0,
      desc: 'Para quem está a começar a organizar a casa.',
      icon: Rocket,
      color: 'var(--color-ocean)',
      features: [
        '1 Agregado Familiar',
        'Até 2 utilizadores',
        'Dashboard Essencial',
        'Transações Ilimitadas',
        '1 Xitique Ativo',
        'Relatórios Simples (PDF)',
        'Histórico de 12 meses'
      ],
      buttonText: 'Plano Actual',
      premium: false
    },
    {
      name: 'Crescimento',
      price: billingCycle === 'monthly' ? 399 : 320,
      desc: 'O poder da inteligência financeira na sua mão.',
      icon: Zap,
      color: 'var(--color-gold)',
      popular: true,
      features: [
        'Utilizadores Ilimitados',
        'Xitiques Ilimitados',
        'Score Financeiro Avançado',
        'Simuladores Inteligentes',
        'Gestão de Património',
        'Exportação Excel/CSV',
        'Alertas Proactivos',
        'Histórico Ilimitado'
      ],
      buttonText: 'Evoluir para Crescimento',
      premium: true
    },
    {
      name: 'Património',
      price: billingCycle === 'monthly' ? 999 : 800,
      desc: 'Domine o seu legado e garanta o futuro.',
      icon: Crown,
      color: 'var(--color-midnight)',
      features: [
        'Tudo do plano Crescimento',
        'Projeções Financeiras (BI)',
        'Simulador de Juros Compostos',
        'Planeamento de Reforma',
        'Suporte Prioritário 24/7',
        'Relatórios de Auditoria FAM',
        'Acesso Antecipado a Novas Funcionalidades'
      ],
      buttonText: 'Dominar Património',
      premium: true
    }
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.4rem 1rem', 
          background: 'var(--color-gold)15', 
          color: 'var(--color-gold)',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '1rem'
        }}>
          <Star size={14} /> Planos Mwanga ✦
        </div>
        <h1 style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '2.5rem', 
          fontWeight: 900, 
          color: 'var(--color-dark)',
          marginBottom: '1rem'
        }}>
          Escolha o seu nível de <span style={{ color: 'var(--color-gold)' }}>Prosperidade</span>
        </h1>
        <p style={{ color: 'var(--color-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Mwanga é mais que controle de gastos. É a sua jornada para o crescimento patrimonial em Moçambique.
        </p>

        {/* Toggle billing */}
        <div style={{ 
          display: 'inline-flex', 
          background: 'var(--color-cream)', 
          padding: '0.4rem', 
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          marginBottom: '1rem'
        }}>
          <button 
            onClick={() => setBillingCycle('monthly')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '12px', 
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: billingCycle === 'monthly' ? 'white' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--color-dark)' : 'var(--color-muted)',
              boxShadow: billingCycle === 'monthly' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Mensal
          </button>
          <button 
            onClick={() => setBillingCycle('annual')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '12px', 
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: billingCycle === 'annual' ? 'white' : 'transparent',
              color: billingCycle === 'annual' ? 'var(--color-dark)' : 'var(--color-muted)',
              boxShadow: billingCycle === 'annual' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Anual <span style={{ color: 'var(--color-leaf)', fontSize: '0.7rem' }}>(-20%)</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem',
        alignItems: 'stretch'
      }}>
        {plans.map((plan, idx) => (
          <div key={idx} className="glass-card animate-fade-in-up" style={{ 
            padding: '2.5rem 2rem', 
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            animationDelay: `${idx * 0.1}s`,
            border: plan.popular ? '2px solid var(--color-gold)' : '1px solid var(--color-glass-border)',
            background: plan.name === 'Património' ? 'linear-gradient(180deg, var(--color-midnight), #1c3545)' : 'var(--color-glass-bg)',
            color: plan.name === 'Património' ? 'white' : 'var(--color-text)'
          }}>
            {plan.popular && (
              <div style={{ 
                position: 'absolute', 
                top: '-14px', 
                left: '50%', 
                transform: 'translateX(-50%)',
                background: 'var(--color-gold)',
                color: 'white',
                padding: '0.25rem 1rem',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(201,150,58,0.3)'
              }}>
                Mais Popular
              </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: plan.name === 'Património' ? 'rgba(255,255,255,0.1)' : `${plan.color}15`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: plan.name === 'Património' ? 'var(--color-gold)' : plan.color,
                marginBottom: '1.5rem'
              }}>
                <plan.icon size={26} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{plan.name}</h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem' }}>{plan.desc}</p>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900 }}>{plan.price}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.7 }}>MZN</span>
                <span style={{ fontSize: '0.85rem', opacity: 0.5 }}>/mês</span>
              </div>
              {billingCycle === 'annual' && plan.price > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-leaf)', fontWeight: 600, marginTop: '0.2rem' }}>
                  Cobrado anualmente ({plan.price * 12} MZN)
                </div>
              )}
            </div>

            <div style={{ flex: 1, marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                O que inclui:
              </div>
              <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
                {plan.features.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.88rem', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '18px', 
                      height: '18px', 
                      borderRadius: '50%', 
                      background: plan.name === 'Património' ? '#var(--color-leaf)' : 'var(--color-leaf)20',
                      color: 'var(--color-leaf)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.1rem'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <button className={plan.premium ? 'btn btn-primary' : 'btn btn-ghost'} style={{ 
              width: '100%', 
              padding: '1rem', 
              fontSize: '0.95rem',
              background: plan.premium ? (plan.name === 'Património' ? 'var(--color-gold)' : undefined) : 'rgba(0,0,0,0.05)',
              color: plan.name === 'Património' ? 'var(--color-dark)' : undefined
            }}>
              {plan.buttonText} {plan.premium && <ArrowRight size={18} />}
            </button>
          </div>
        ))}
      </div>

      {/* Footer / FAQ / Trust */}
      <div style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Shield size={32} color="var(--color-ocean)" />
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Segurança Bancária</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Dados encriptados de ponta a ponta.</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Globe size={32} color="var(--color-gold)" />
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Orgulho Moçambicano</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Tecnologia local para o mundo.</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Zap size={32} color="var(--color-sky)" />
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Cancelamento Fácil</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Sem contratos, cancele quando quiser.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
