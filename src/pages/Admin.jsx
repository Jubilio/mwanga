import { useState, useEffect } from 'react';
import { useFinance } from '../hooks/useFinanceStore';
import api from '../utils/api';
import { 
  Users, Shield, BarChart2, CheckCircle, XCircle, Clock, 
  ArrowUpRight, TrendingUp, AlertCircle 
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const G = {
  bg: "#07090f", bg2: "#0c1018",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.07)",
  gold: "#F59E0B", gold2: "#F97316",
  text: "#e8f0fe", muted: "#6b7fa3",
  green: "#10B981", red: "#EF4444", blue: "#3B82F6",
};

export default function Admin() {
  const { state } = useFinance();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersResp, statsResp] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats')
      ]);
      setUsers(usersResp.data);
      setStats(statsResp.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKycUpdate = async (userId, status) => {
    try {
      await api.post('/admin/kyc/status', { userId, status });
      fetchData();
    } catch (error) {
      console.error('Error updating KYC:', error);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: G.muted }}>
      <div className="animate-pulse">Carregando painel de administração...</div>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: G.text }}>
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Shield size={24} color={G.gold} />
          <h1 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Sora, sans-serif' }}>Administração Mwanga</h1>
        </div>
        <p style={{ color: G.muted, fontSize: '14px' }}>Monitoramento global da plataforma e gestão de risco.</p>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard label="Total de Utilizadores" value={stats?.totalUsers} icon={<Users />} color={G.blue} />
        <StatCard label="Volume Desembolsado" value={`MT ${stats?.loans.totalDisbursed.toLocaleString()}`} icon={<TrendingUp />} color={G.green} />
        <StatCard label="Pedidos Pendentes" value={stats?.pendingApplications} icon={<Clock />} color={G.gold} />
        <StatCard label="NEXO Médio" value="742" icon={<BarChart2 />} color={G.gold} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* User Table */}
        <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Utilizadores Recentes
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: G.muted, fontSize: '12px', textAlign: 'left', borderBottom: `1px solid ${G.border}` }}>
                  <th style={{ padding: '12px' }}>NOME</th>
                  <th style={{ padding: '12px' }}>KYC</th>
                   <th style={{ padding: '12px' }}>SCORE</th>
                   <th style={{ padding: '12px' }}>DOCS</th>
                   <th style={{ padding: '12px' }}>ACÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${G.border}`, fontSize: '14px' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: '11px', color: G.muted }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <KycBadge status={user.kyc_status} />
                    </td>
                     <td style={{ padding: '16px 12px' }}>
                       <span style={{ fontWeight: 800, color: user.credit_score > 600 ? G.green : G.gold }}>{user.credit_score}</span>
                     </td>
                     <td style={{ padding: '16px 12px' }}>
                       <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                         {user.documents?.map(doc => (
                           <a 
                             key={doc.id} 
                             href={`${api.defaults.baseURL.replace('/api', '')}/uploads/kyc/${doc.document_url}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             style={{ 
                               fontSize: '10px', padding: '2px 6px', borderRadius: '4px', 
                               background: G.card, border: `1px solid ${G.border}`, color: G.muted,
                               textDecoration: 'none'
                             }}
                            title={doc.document_type}
                           >
                             📄 {doc.document_type.split('_')[0].toUpperCase()}
                           </a>
                         ))}
                         {(!user.documents || user.documents.length === 0) && <span style={{ color: G.muted, fontSize: '11px' }}>Nenhum</span>}
                       </div>
                     </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleKycUpdate(user.id, 'approved')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.green }} title="Aprovar KYC"><CheckCircle size={18} /></button>
                        <button onClick={() => handleKycUpdate(user.id, 'rejected')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.red }} title="Rejeitar KYC"><XCircle size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Distribuição KYC</h3>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.kyc.map(k => ({ name: k.kyc_status, value: Number(k.count) })) || []}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill={G.green} />
                    <Cell fill={G.gold} />
                    <Cell fill={G.red} />
                  </Pie>
                  <Tooltip contentStyle={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div style={{ background: `linear-gradient(135deg, ${G.gold}20, transparent)`, borderRadius: '20px', border: `1px solid ${G.gold}30`, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: G.gold, marginBottom: '12px' }}>
              <AlertCircle size={20} />
              <div style={{ fontWeight: 700 }}>Risco da Plataforma</div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px' }}>Baixo</div>
            <div style={{ fontSize: '12px', color: G.muted }}>Based on current portfolio performance.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color }}>
        {icon}
      </div>
      <div style={{ color: G.muted, fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Sora, sans-serif' }}>{value}</div>
    </div>
  );
}

function KycBadge({ status }) {
  const styles = {
    pending: { bg: `${G.gold}18`, color: G.gold, label: 'Pendente' },
    approved: { bg: `${G.green}18`, color: G.green, label: 'Aprovado' },
    rejected: { bg: `${G.red}18`, color: G.red, label: 'Rejeitado' },
  }[status] || { bg: G.muted3, color: G.muted, label: status };

  return (
    <span style={{ 
      fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
      background: styles.bg, color: styles.color, border: `1px solid ${styles.color}30`
    }}>
      {styles.label}
    </span>
  );
}
