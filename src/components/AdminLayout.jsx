import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

const G = {
  bg: '#07090f',
  bg2: '#0c1018',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  gold: '#F59E0B',
  gold2: '#F97316',
  text: '#e8f0fe',
  muted: '#6b7fa3',
};

const adminNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Painel Geral', end: true },
  { to: '/admin/users', icon: Users, label: 'Utilizadores', end: false },
  { to: '/admin/feedback', icon: MessageSquare, label: 'Feedback', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Configuração', end: false },
];

function getAdminUser() {
  try {
    const raw = localStorage.getItem('mwanga-admin-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = localStorage.getItem('mwanga-admin-token');
  const user = getAdminUser();
  const isAuthenticated = Boolean(token && user && user.role === 'admin');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  function handleLogout() {
    localStorage.removeItem('mwanga-admin-token');
    localStorage.removeItem('mwanga-admin-user');
    navigate('/admin/login', { replace: true });
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: G.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: G.muted,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div className="animate-pulse">A carregar painel...</div>
      </div>
    );
  }

  const currentTitle = adminNavItems.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  })?.label || 'Admin';

  return (
    <div style={{
      minHeight: '100vh',
      background: G.bg,
      color: G.text,
      fontFamily: "'Inter', 'Sora', system-ui, sans-serif",
      display: 'flex',
    }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: sidebarOpen ? 0 : '-280px',
        width: '260px',
        height: '100vh',
        background: G.bg2,
        borderRight: `1px solid ${G.border}`,
        zIndex: 50,
        transition: 'left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="admin-sidebar"
      >
        {/* Sidebar header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: `1px solid ${G.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px',
              background: `linear-gradient(135deg, ${G.gold}, ${G.gold2})`,
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px rgba(245,158,11,0.3)`,
            }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Mwanga <span style={{ color: G.gold }}>Admin</span>
              </div>
              <div style={{ fontSize: '10px', color: G.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Gestão de plataforma
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none', border: 'none', color: G.muted, cursor: 'pointer',
              padding: '4px', borderRadius: '8px',
            }}
            className="admin-sidebar-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px',
                borderRadius: '14px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? G.gold : G.muted,
                background: isActive ? `${G.gold}12` : 'transparent',
                transition: 'all 0.2s',
              })}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
            </NavLink>
          ))}
        </nav>

        {/* User info + Logout */}
        <div style={{
          padding: '16px 12px',
          borderTop: `1px solid ${G.border}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: G.card,
            marginBottom: '8px',
          }}>
            <div style={{
              width: '32px', height: '32px',
              background: `linear-gradient(135deg, ${G.gold}, ${G.gold2})`,
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 800, color: '#fff',
            }}>
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'Admin'}
              </div>
              <div style={{ fontSize: '10px', color: G.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 14px',
              borderRadius: '14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={14} /> Terminar Sessão Admin
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
        {/* Top header */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '64px',
          background: `${G.bg2}e6`,
          borderBottom: `1px solid ${G.border}`,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: '12px',
                padding: '8px',
                color: G.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Mwanga Admin
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {currentTitle}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: '12px',
                padding: '8px 14px',
                color: G.muted,
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              Ir para App
            </button>
            <div style={{
              width: '36px', height: '36px',
              background: `linear-gradient(135deg, ${G.gold}, ${G.gold2})`,
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, color: '#fff',
              cursor: 'pointer',
            }}
              onClick={() => setSidebarOpen(true)}
            >
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          background: G.bg,
        }}>
          <Outlet />
        </main>
      </div>

      {/* Desktop sidebar always visible */}
      <style>{`
        @media (min-width: 768px) {
          .admin-sidebar {
            left: 0 !important;
            position: relative !important;
          }
          .admin-sidebar-close {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
