import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Check, Star, Zap, Crown, Globe, Shield, Rocket, ArrowRight } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';

export default function Pricing() {
  const { t } = useTranslation();
  const { } = useFinance();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'

  const plans = [
    {
      name: t('pricing.plans.starter.name'),
      price: 0,
      desc: t('pricing.plans.starter.desc'),
      icon: Rocket,
      color: 'var(--color-ocean)',
      features: t('pricing.plans.starter.features', { returnObjects: true }),
      buttonText: t('pricing.plans.starter.btn'),
      premium: false
    },
    {
      name: t('pricing.plans.growth.name'),
      price: billingCycle === 'monthly' ? 399 : 320,
      desc: t('pricing.plans.growth.desc'),
      icon: Zap,
      color: 'var(--color-gold)',
      popular: true,
      popularBadge: t('pricing.plans.growth.popular_badge'),
      features: t('pricing.plans.growth.features', { returnObjects: true }),
      buttonText: t('pricing.plans.growth.btn'),
      premium: true
    },
    {
      name: t('pricing.plans.legacy.name'),
      price: billingCycle === 'monthly' ? 999 : 800,
      desc: t('pricing.plans.legacy.desc'),
      icon: Crown,
      color: 'var(--color-midnight)',
      features: t('pricing.plans.legacy.features', { returnObjects: true }),
      buttonText: t('pricing.plans.legacy.btn'),
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
          <Star size={14} /> {t('pricing.tag')}
        </div>
        <h1 style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '2.5rem', 
          fontWeight: 900, 
          color: 'var(--color-dark)',
          marginBottom: '1rem'
        }}>
          <Trans i18nKey="pricing.title" components={{ span: <span style={{ color: 'var(--color-gold)' }} /> }} />
        </h1>
        <p style={{ color: 'var(--color-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
          {t('pricing.description')}
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
            {t('pricing.billing.monthly')}
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
            {t('pricing.billing.annual')} <span style={{ color: 'var(--color-leaf)', fontSize: '0.7rem' }}>{t('pricing.billing.discount')}</span>
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
            background: plan.name === t('pricing.plans.legacy.name') ? 'linear-gradient(180deg, var(--color-midnight), #1c3545)' : 'var(--color-glass-bg)',
            color: plan.name === t('pricing.plans.legacy.name') ? 'white' : 'var(--color-text)'
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
                {plan.popularBadge}
              </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: plan.name === t('pricing.plans.legacy.name') ? 'rgba(255,255,255,0.1)' : `${plan.color}15`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: plan.name === t('pricing.plans.legacy.name') ? 'var(--color-gold)' : plan.color,
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
                  {t('pricing.billing.annual_total', { total: plan.price * 12 })}
                </div>
              )}
            </div>

            <div style={{ flex: 1, marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                {t('pricing.includes')}
              </div>
              <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
                {plan.features.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.88rem', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '18px', 
                      height: '18px', 
                      borderRadius: '50%', 
                      background: plan.name === t('pricing.plans.legacy.name') ? 'var(--color-leaf)' : 'var(--color-leaf)20',
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
              background: plan.premium ? (plan.name === t('pricing.plans.legacy.name') ? 'var(--color-gold)' : undefined) : 'rgba(0,0,0,0.05)',
              color: plan.name === t('pricing.plans.legacy.name') ? 'var(--color-dark)' : undefined
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
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{t('pricing.trust.security_title')}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{t('pricing.trust.security_desc')}</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Globe size={32} color="var(--color-gold)" />
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{t('pricing.trust.moza_pride_title')}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{t('pricing.trust.moza_pride_desc')}</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Zap size={32} color="var(--color-sky)" />
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{t('pricing.trust.cancel_title')}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{t('pricing.trust.cancel_desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
