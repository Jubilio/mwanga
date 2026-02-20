import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, ArrowRightLeft, Home, Target, 
  PieChart, Calculator, Moon, Sun, Menu, X, Wallet, Globe, Settings as SettingsIcon
} from 'lucide-react';
import { useFinance } from '../hooks/useFinanceStore';
import { getCurrentMonthLabel } from '../utils/calculations';
import { usePWAInstall } from '../hooks/usePWAInstall';
import Toast from './Toast';
import { useToast } from './Toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transacoes', icon: ArrowRightLeft, label: 'Transações' },
  { to: '/orcamento', icon: PieChart, label: 'Orçamento' },
  { to: '/habitacao', icon: Home, label: 'Habitação' },
  { to: '/xitique', icon: Wallet, label: 'Xitique' },
  { to: '/metas', icon: Target, label: 'Metas' },
  { to: '/patrimonio', icon: PieChart, label: 'Património' },
  { to: '/simuladores', icon: Calculator, label: 'Simuladores' },
  { to: '/nexovibe', icon: Globe, label: 'NEXO VIBE' },
  { to: '/relatorio', icon: PieChart, label: 'Relatório' },
  { to: '/settings', icon: SettingsIcon, label: 'Definições' },
];

export default function Layout() {
  const { state, dispatch } = useFinance();
  const { toast, showToast } = useToast();
  const { isInstallable, installApp } = usePWAInstall();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ═══ HEADER ═══ */}
      <header
        style={{
          background: 'var(--color-dark)',
          height: '64px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-ghost hide-desktop"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: 'var(--color-sand)' }}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-sand)',
              fontSize: '1.4rem',
              fontWeight: 900,
              letterSpacing: '1px',
              lineHeight: 1.1,
            }}>
              Mwanga <span style={{ color: 'var(--color-gold)' }}>✦</span>
            </div>
            <div style={{ color: 'var(--color-sand)', fontSize: '0.7rem', opacity: 0.5 }}>
              Gestão Financeira
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="hide-mobile" style={{ color: 'var(--color-sand)', fontSize: '0.8rem', opacity: 0.7 }}>
            {getCurrentMonthLabel()}
          </span>
          <button
            className="btn-ghost"
            onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
            style={{ color: 'var(--color-gold)' }}
            aria-label="Modo escuro"
          >
            {state.darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isInstallable && (
            <button
              onClick={installApp}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Globe size={14} /> <span className="hide-mobile">Instalar</span>
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* ═══ SIDEBAR (Desktop) ═══ */}
        <nav
          className="hide-mobile"
          style={{
            width: '220px',
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-ocean)' : 'var(--color-muted)',
                background: isActive ? 'rgba(10, 77, 104, 0.08)' : 'transparent',
                borderRight: isActive ? '3px solid var(--color-ocean)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          
          {isInstallable && (
            <div style={{ padding: '0 1rem 1rem' }}>
              <button 
                onClick={installApp}
                className="btn btn-primary" 
                style={{ width: '100%', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              >
                <Globe size={16} /> Instalar Mwanga
              </button>
            </div>
          )}

          <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                background: 'var(--color-surface-variant)', 
                overflow: 'hidden',
                border: '2px solid rgba(10, 77, 104, 0.1)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {state.settings.profile_pic ? (
                  <img src={state.settings.profile_pic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-ocean)' }}>
                    {state.user?.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {state.user?.name || 'Utilizador'}
                  </div>
                  <span className="premium-badge">Premium</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-ocean)', fontWeight: 600, opacity: 0.8, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {state.settings.household_name || 'Família Mwanga'}
                </div>
              </div>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('mwanga-token'); window.location.reload(); }}
              className="btn btn-ghost" 
              style={{ width: '100%', fontSize: '0.75rem', color: '#ff5252', justifyContent: 'flex-start', padding: '0.4rem', marginTop: '0.5rem' }}
            >
              Terminar Sessão
            </button>
          </div>
        </nav>

        {/* ═══ MOBILE MENU OVERLAY ═══ */}
        {mobileMenuOpen && (
          <div
            className="hide-desktop"
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 90,
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <nav
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--color-surface)',
                width: '260px',
                height: '100%',
                padding: '1rem 0',
                boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
                animation: 'slideInRight 0.2s ease-out',
              }}
            >
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1.5rem',
                    fontSize: '0.95rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--color-ocean)' : 'var(--color-text)',
                    background: isActive ? 'rgba(10, 77, 104, 0.08)' : 'transparent',
                    textDecoration: 'none',
                  })}
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <main style={{
          flex: 1,
          padding: '1.5rem',
          maxWidth: '960px',
          margin: '0 auto',
          width: '100%',
        }}>
          <Outlet context={{ showToast }} />
        </main>
      </div>

      {/* ═══ BOTTOM NAV (Mobile) ═══ */}
      <nav
        className="hide-desktop"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '0.4rem 0 env(safe-area-inset-bottom, 0.4rem)',
          zIndex: 80,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {navItems.slice(0, 5).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
              padding: '0.3rem 0.5rem',
              fontSize: '0.62rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--color-ocean)' : 'var(--color-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            })}
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
