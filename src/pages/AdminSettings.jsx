import { useState } from 'react';
import { Settings, Shield, Database, Bell, Server, Key, Save, CheckCircle } from 'lucide-react';

const G = {
  bg: '#07090f', bg2: '#0c1018',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  gold: '#F59E0B', gold2: '#F97316',
  text: '#e8f0fe', muted: '#6b7fa3',
  green: '#10B981', red: '#EF4444',
};

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Sora', sans-serif" }}>
          <Settings size={22} style={{ verticalAlign: 'middle', marginRight: '10px', color: G.gold }} />
          Configuração da Plataforma
        </h1>
        <p style={{ color: G.muted, fontSize: '13px', margin: 0 }}>
          Gestão central das definições do Mwanga.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* System Info */}
        <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={16} color={G.gold} /> Informação do Sistema
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <InfoRow label="Versão" value="Mwanga 2.0 Intelligence" />
            <InfoRow label="Ambiente" value={import.meta.env.MODE || 'development'} />
            <InfoRow label="API" value={import.meta.env.VITE_API_URL || 'localhost:3001'} />
          </div>
        </div>

        {/* Security */}
        <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color={G.gold} /> Segurança
          </h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: G.card, borderRadius: '14px', border: `1px solid ${G.border}` }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Autenticação JWT</div>
                <div style={{ fontSize: '11px', color: G.muted }}>Token-based com expiração automática</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: G.green, background: `${G.green}15`, padding: '4px 10px', borderRadius: '8px' }}>Ativo</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: G.card, borderRadius: '14px', border: `1px solid ${G.border}` }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Google OAuth 2.0</div>
                <div style={{ fontSize: '11px', color: G.muted }}>Login social para utilizadores finais</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: G.green, background: `${G.green}15`, padding: '4px 10px', borderRadius: '8px' }}>Configurado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: G.card, borderRadius: '14px', border: `1px solid ${G.border}` }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>VAPID Push Keys</div>
                <div style={{ fontSize: '11px', color: G.muted }}>Web Push Notifications (FCM)</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: G.green, background: `${G.green}15`, padding: '4px 10px', borderRadius: '8px' }}>Ativo</span>
            </div>
          </div>
        </div>

        {/* Database */}
        <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} color={G.gold} /> Base de Dados
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <InfoRow label="Provider" value="Supabase (PostgreSQL)" />
            <InfoRow label="Região" value="EU West 1" />
            <InfoRow label="Estado" value="Conectado" valueColor={G.green} />
          </div>
        </div>

        {/* Notifications config */}
        <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} color={G.gold} /> Notificações
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <InfoRow label="Scheduler Interval" value="60s" />
            <InfoRow label="Push Engine" value="web-push (VAPID)" />
            <InfoRow label="Startup Delay" value="5s" />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '14px',
            background: saved ? G.green : `linear-gradient(135deg, ${G.gold}, ${G.gold2})`,
            border: 'none', color: '#fff', fontSize: '13px', fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.3s',
            boxShadow: saved ? 'none' : `0 8px 20px rgba(245,158,11,0.25)`,
          }}
        >
          {saved ? <><CheckCircle size={16} /> Guardado!</> : <><Save size={16} /> Guardar Configurações</>}
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px', background: G.card, borderRadius: '12px',
      border: `1px solid ${G.border}`,
    }}>
      <span style={{ fontSize: '12px', color: G.muted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: valueColor || G.text }}>{value}</span>
    </div>
  );
}
