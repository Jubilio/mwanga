import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import MwangaLogo from '../MwangaLogo';

// ─── PRO Badge ───────────────────────────────────────────────────────────────
// ... [rest of the component stays similar]
function ProBadge() {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
      background: 'linear-gradient(135deg, #F59E0B, #F97316)',
      color: '#000', borderRadius: 4, padding: '2px 6px',
      flexShrink: 0,
    }}>PRO</span>
  );
}

// ─── Pro Locked Modal ─────────────────────────────────────────────────────────
function ProLockedPanel({ item, onClose, onUpgrade }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111827', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 20, padding: '36px 32px', width: 360, maxWidth: '90vw',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.08)',
          animation: 'sidebarPopIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))',
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
          }}>{item?.icon || '🔒'}</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: 8 }}>
            {item?.label || 'Funcionalidade PRO'}
          </div>
          <div style={{ fontSize: 13, color: '#5a7a9a', lineHeight: 1.7 }}>
            {item?.highlight
              ? 'Importa SMS bancários automaticamente e deixa a IA extrair as transações por ti.'
              : 'Esta funcionalidade está disponível apenas no plano PRO.'
            }
          </div>
        </div>

        {/* Features (only for SMS import) */}
        {item?.highlight && (
          <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📩', text: 'Parse automático de SMS do Millennium BIM, BCI, M-Pesa, mKesh' },
              { icon: '⚡', text: 'Extracção instantânea de valor, data, banco e tipo' },
              { icon: '🔒', text: 'Processamento 100% seguro, sem armazenamento externo' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 12.5, color: '#8a9ab8', lineHeight: 1.55 }}>{f.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* PRO badge row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          padding: '10px 14px', background: 'rgba(245,158,11,0.07)',
          borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <span style={{ fontSize: 14 }}>👑</span>
          <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Funcionalidade exclusiva do plano</span>
          <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, background: 'linear-gradient(135deg,#F59E0B,#F97316)', color: '#000', borderRadius: 4, padding: '2px 7px' }}>PRO</span>
        </div>

        {/* Buttons */}
        <button
          onClick={onUpgrade}
          style={{
            width: '100%', padding: 14, borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #F59E0B, #F97316)',
            color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.01em', boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
            marginBottom: 10, transition: 'opacity 0.2s',
          }}
        >✦ Fazer Upgrade para PRO</button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: 12, borderRadius: 12,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            color: '#5a7a9a', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >Talvez mais tarde</button>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
  const [proModal, setProModal] = useState(null); // stores the nav item object
  const { state } = useFinance();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userName   = state.user?.name || 'Utilizador';
  const familyName = state.settings?.household_name || 'Mwanga';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('mwanga-token');
    window.location.reload();
  };

  const NAV = [
    {
      section: 'GESTÃO FINANCEIRA',
      items: [
        { icon: '▦', label: t('layout.dashboard'),          to: '/',            end: true },
        { icon: '↕', label: t('layout.transactions'),        to: '/transacoes' },
        { icon: '◎', label: t('layout.budget'),              to: '/orcamento' },
      ],
    },
    {
      section: 'FINANCIAMENTO',
      items: [
        { icon: '💸', label: t('layout.credit'),            to: '/credito' },
        { icon: '⊟', label: t('layout.debts'),              to: '/dividas' },
        { icon: '⌂', label: t('layout.housing'),            to: '/habitacao' },
      ],
    },
    {
      section: 'POUPANÇA & METAS',
      items: [
        { icon: '✦', label: t('layout.xitique'),            to: '/xitique' },
        { icon: '◉', label: t('layout.goals'),              to: '/metas' },
        { icon: '🗺', label: t('layout.nexovibe'),          to: '/nexovibe' },
      ],
    },
    {
      section: 'INTELIGÊNCIA PRO',
      items: [
        { icon: '◈', label: t('layout.insights'),           to: '/insights',    pro: true },
        { icon: '⇩', label: t('layout.sms_import'),         to: '/sms-import',  pro: true, highlight: true },
        { icon: '◧', label: t('layout.patrimony'),          to: '/patrimonio',  pro: true },
        { icon: '⧉', label: t('layout.simulators'),         to: '/simuladores', pro: true },
        { icon: '↗', label: t('layout.report'),             to: '/relatorio',   pro: true },
      ],
    },
  ];

  const ADMIN_NAV = [
    {
      section: 'ADMINISTRAÇÃO',
      items: [
        { icon: '⚙', label: t('layout.admin'),      to: '/admin' },
      ],
    },
  ];

  return (
    <>
      <style>{`
        @keyframes sidebarPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        .sb-item {
          display: flex; align-items: center; gap: 14px;
          padding: 11px 20px; border-radius: 12px; cursor: pointer;
          transition: all 0.18s ease; position: relative;
          border: 1px solid transparent; text-decoration: none;
          user-select: none;
        }
        .sb-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.06); }
        .sb-item.sb-active  { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.25); }
        .sb-item.sb-highlight { background: rgba(245,158,11,0.07); border-color: rgba(245,158,11,0.18); }
        .sb-item.sb-highlight:hover { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.28); }
        .sb-item.sb-pro:not(.sb-highlight):hover { background: rgba(255,255,255,0.03); }
        .sb-settings-btn, .sb-logout-btn {
          background: transparent; border-radius: 10px; padding: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .sb-settings-btn { border: 1px solid rgba(255,255,255,0.1); color: #888; }
        .sb-settings-btn:hover { background: rgba(255,255,255,0.07); color: #ccc; }
        .sb-logout-btn   { border: 1px solid rgba(255,80,80,0.2); color: #FF5050; }
        .sb-logout-btn:hover { background: rgba(255,80,80,0.1); }
        .sb-upgrade-btn {
          background: linear-gradient(135deg, #F59E0B, #F97316);
          border: none; border-radius: 12px; padding: 13px 20px;
          color: #000; font-weight: 700; font-size: 14px; cursor: pointer;
          width: 100%; letter-spacing: 0.01em; transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 4px 20px rgba(245,158,11,0.3);
        }
        .sb-upgrade-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        /* Mobile overlay */
        .sb-backdrop { display: none; }
        @media (max-width: 768px) {
          .sb-shell {
            position: fixed !important; left: -280px; top: 0; height: 100vh;
            transition: left 0.28s cubic-bezier(0.4,0,0.2,1); z-index: 90;
            will-change: left;
          }
          .sb-shell.sb-open { left: 0; }
          .sb-backdrop { display: block; position: fixed; inset: 0; z-index: 89;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
        }
        .sb-scroll::-webkit-scrollbar { width: 3px; }
        .sb-scroll::-webkit-scrollbar-track { background: transparent; }
        .sb-scroll::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      `}</style>

      {/* Mobile backdrop */}
      {isOpen && <div className="sb-backdrop hide-desktop" onClick={onClose} />}

      <aside
        className={`sb-shell sb-scroll ${isOpen ? 'sb-open' : ''}`}
        style={{
          width: 268, background: '#111827',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', flexShrink: 0,
        }}
      >
        {/* Logo and Language Switcher */}
        <div style={{ padding: '28px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <MwangaLogo variant="sidebar" />
            </div>
            
            <LanguageSwitcher />
            
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px 8px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((group, gi) => (
            <div key={gi} style={{ marginBottom: gi === 0 ? 20 : 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                color: '#4a5568', padding: '14px 6px 8px', textTransform: 'uppercase',
              }}>
                {group.section}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map(item =>
                  item.pro ? (
                    // PRO items — navigable (payment not yet implemented)
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `sb-item sb-pro ${isActive ? 'sb-active' : ''} ${item.highlight ? 'sb-highlight' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div style={{
                              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                              width: 3, height: 20, background: '#F59E0B', borderRadius: '0 3px 3px 0',
                            }} />
                          )}
                          <span style={{
                            fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0,
                            color: isActive ? '#F59E0B' : item.highlight ? '#F59E0B' : '#4a5568',
                          }}>{item.icon}</span>
                          <span style={{
                            fontSize: 14.5, flex: 1,
                            color: isActive ? '#F59E0B' : item.highlight ? '#e0a840' : '#4a5568',
                            fontWeight: isActive ? 600 : item.highlight ? 500 : 400,
                          }}>{item.label}</span>
                          <ProBadge />
                        </>
                      )}
                    </NavLink>
                  ) : (
                    // Regular items — use NavLink
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `sb-item ${isActive ? 'sb-active' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div style={{
                              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                              width: 3, height: 20, background: '#F59E0B', borderRadius: '0 3px 3px 0',
                            }} />
                          )}
                          <span style={{
                            fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0,
                            color: isActive ? '#F59E0B' : '#8a9ab8',
                            transition: 'color 0.18s',
                          }}>{item.icon}</span>
                          <span style={{
                            fontSize: 14.5, flex: 1,
                            color: isActive ? '#F59E0B' : '#c8d6e8',
                            fontWeight: isActive ? 600 : 400,
                            transition: 'color 0.18s',
                          }}>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Admin Nav */}
          {state.user?.role === 'admin' && ADMIN_NAV.map((group, gi) => (
            <div key={gi}>
               <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                color: '#4a5568', padding: '14px 6px 8px', textTransform: 'uppercase',
              }}>{group.section}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) => `sb-item ${isActive ? 'sb-active' : ''}`}
                  >
                    {({ isActive }) => (
                      <>
                        <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0, color: isActive ? '#F59E0B' : '#F59E0B' }}>{item.icon}</span>
                        <span style={{ fontSize: 14.5, flex: 1, color: isActive ? '#F59E0B' : '#F59E0B', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Premium CTA */}
        <div style={{ padding: '0 16px 20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.08))',
            border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: '18px 18px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 15 }}>👑</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.04em' }}>
                NEXO VIBE PREMIUM
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: '#7a8fa8', lineHeight: 1.6, marginBottom: 14 }}>
              Desbloqueie Inteligência Avançada, Relatórios Detalhados e Simuladores Exclusivos.
            </p>
            <button className="sb-upgrade-btn" onClick={() => navigate('/pricing')}>
              ✦ Fazer Upgrade
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />

        {/* User */}
        <div style={{ padding: '16px 20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, #F59E0B, #F97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#000', flexShrink: 0,
          }}>{userInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2eaf4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName}
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>
              {familyName}
            </div>
          </div>
          <button className="sb-settings-btn" title="Definições" onClick={() => { navigate('/settings'); onClose(); }}>
            <Settings size={15} />
          </button>
          <button className="sb-logout-btn" title="Sair" onClick={() => { handleLogout(); onClose(); }}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Pro Locked Modal */}
      {proModal && (
        <ProLockedPanel
          item={proModal}
          onClose={() => setProModal(null)}
          onUpgrade={() => { setProModal(null); navigate('/pricing'); }}
        />
      )}
    </>
  );
}
