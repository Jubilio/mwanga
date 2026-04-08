import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Users, Shield, BarChart2, CheckCircle, XCircle, Clock,
  TrendingUp, AlertCircle, RefreshCw, FileCheck, UserX, MessageSquare
} from 'lucide-react';
import { Tooltip, PieChart, Pie, Cell } from 'recharts';

const G = {
  bg: '#07090f', bg2: '#0c1018',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  gold: '#F59E0B', gold2: '#F97316',
  text: '#e8f0fe', muted: '#6b7fa3',
  green: '#10B981', red: '#EF4444', blue: '#3B82F6',
};

const EMPTY_STATS = {
  totalUsers: 0,
  kyc: [],
  loans: { totalDisbursed: 0, totalCount: 0, avgRate: 0 },
  pendingApplications: 0,
  kycSummary: { approved: 0, pending: 0, rejected: 0 }
};

function getAdminHeaders() {
  const token = localStorage.getItem('mwanga-admin-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      setRefreshing(true);
    }

    setError('');

    try {
      const headers = getAdminHeaders();
      const [usersResp, statsResp] = await Promise.all([
        api.get('/admin/users', { headers }),
        api.get('/admin/stats', { headers })
      ]);
      setUsers(Array.isArray(usersResp.data) ? usersResp.data : []);
      setStats({ ...EMPTY_STATS, ...statsResp.data });
    } catch (fetchError) {
      console.error('Error fetching admin data:', fetchError);
      setError(fetchError.response?.data?.error || 'Não foi possível carregar o painel de administração.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleKycUpdate = async (userId, status) => {
    try {
      setError('');
      const headers = getAdminHeaders();
      await api.post('/admin/kyc/status', { userId, status }, { headers });
      fetchData();
    } catch (updateError) {
      console.error('Error updating KYC:', updateError);
      setError(updateError.response?.data?.error || 'Falha ao atualizar o estado KYC.');
    }
  };

  const kycChartData = (stats.kyc || [])
    .map((item) => ({ name: item.kyc_status, value: Number(item.count) }))
    .filter((item) => item.value > 0);

  const riskLevel = stats.kycSummary.rejected > 0
    ? 'Moderado'
    : stats.pendingApplications > 10 || stats.kycSummary.pending > 5
      ? 'Em atenção'
      : 'Baixo';

  const riskCopy = stats.kycSummary.rejected > 0
    ? 'Há rejeições KYC a exigir revisão manual e seguimento.'
    : stats.pendingApplications > 10 || stats.kycSummary.pending > 5
      ? 'O pipeline operacional está a crescer e pode precisar de triagem.'
      : 'A operação está estável com baixa pressão de risco neste momento.';


  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: G.muted }}>
        <div className="animate-pulse">Carregando painel de administração...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: G.text }}>
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Shield size={24} color={G.gold} />
              <h1 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Sora, sans-serif' }}>Administração Mwanga</h1>
            </div>
            <p style={{ color: G.muted, fontSize: '14px' }}>Monitoramento global da plataforma e gestão operacional com foco em KYC e risco.</p>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '12px',
              padding: '10px 14px',
              border: `1px solid ${G.border}`,
              background: G.card,
              color: G.text,
              cursor: refreshing ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={16} style={{ opacity: refreshing ? 0.6 : 1 }} />
            {refreshing ? 'Atualizando...' : 'Atualizar painel'}
          </button>
        </div>
      </header>

      {error && (
        <div style={{ marginBottom: '24px', background: `${G.red}14`, color: G.text, border: `1px solid ${G.red}40`, borderRadius: '16px', padding: '16px 18px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard label="Total de Utilizadores" value={stats.totalUsers} icon={<Users />} color={G.blue} />
        <StatCard label="Volume Desembolsado" value={`MT ${stats.loans.totalDisbursed.toLocaleString()}`} icon={<TrendingUp />} color={G.green} />
        <StatCard label="Pedidos Pendentes" value={stats.pendingApplications} icon={<Clock />} color={G.gold} />
        <StatCard label="KYC Aprovados" value={stats.kycSummary.approved} icon={<FileCheck />} color={G.green} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              Utilizadores Recentes
            </h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', color: G.muted, fontSize: '12px' }}>
              <span>Pendentes: <strong style={{ color: G.gold }}>{stats.kycSummary.pending}</strong></span>
              <span>Rejeitados: <strong style={{ color: G.red }}>{stats.kycSummary.rejected}</strong></span>
            </div>
          </div>
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
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${G.border}`, fontSize: '14px' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: '11px', color: G.muted }}>{user.email}</div>
                      <div style={{ fontSize: '10px', color: G.muted, marginTop: '4px' }}>{user.role === 'admin' ? 'Administrador' : 'Utilizador'}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <KycBadge status={user.kyc_status} />
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ fontWeight: 800, color: user.credit_score > 600 ? G.green : G.gold }}>{user.credit_score}</span>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {user.documents?.map((doc) => (
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
                            DOC {doc.document_type.split('_')[0].toUpperCase()}
                          </a>
                        ))}
                        {(!user.documents || user.documents.length === 0) && <span style={{ color: G.muted, fontSize: '11px' }}>Nenhum</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          disabled={user.kyc_status === 'approved'}
                          onClick={() => handleKycUpdate(user.id, 'approved')}
                          style={{ background: 'none', border: 'none', cursor: user.kyc_status === 'approved' ? 'not-allowed' : 'pointer', color: G.green, opacity: user.kyc_status === 'approved' ? 0.35 : 1 }}
                          title="Aprovar KYC"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          disabled={user.kyc_status === 'rejected'}
                          onClick={() => handleKycUpdate(user.id, 'rejected')}
                          style={{ background: 'none', border: 'none', cursor: user.kyc_status === 'rejected' ? 'not-allowed' : 'pointer', color: G.red, opacity: user.kyc_status === 'rejected' ? 0.35 : 1 }}
                          title="Rejeitar KYC"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px 12px', color: G.muted, textAlign: 'center' }}>
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Distribuição KYC</h3>
            <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kycChartData.length > 0 ? (
                <PieChart width={220} height={220}>
                  <Pie
                    data={kycChartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {kycChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === 'approved' ? G.green :
                          entry.name === 'pending' ? G.gold :
                          G.red
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '8px' }} />
                </PieChart>
              ) : (
                <div style={{ color: G.muted, fontSize: '13px', textAlign: 'center' }}>
                  Sem dados KYC para visualizar.
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gap: '8px', marginTop: '12px', fontSize: '12px' }}>
              <LegendRow label="Aprovado" value={stats.kycSummary.approved} color={G.green} />
              <LegendRow label="Pendente" value={stats.kycSummary.pending} color={G.gold} />
              <LegendRow label="Rejeitado" value={stats.kycSummary.rejected} color={G.red} />
            </div>
          </div>

          <div style={{ background: `linear-gradient(135deg, ${G.gold}20, transparent)`, borderRadius: '20px', border: `1px solid ${G.gold}30`, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: G.gold, marginBottom: '12px' }}>
              <AlertCircle size={20} />
              <div style={{ fontWeight: 700 }}>Risco da Plataforma</div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px' }}>{riskLevel}</div>
            <div style={{ fontSize: '12px', color: G.muted }}>{riskCopy}</div>
          </div>

          <div style={{ background: G.bg2, borderRadius: '20px', border: `1px solid ${G.border}`, padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Ações prioritárias</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <PriorityRow icon={<Clock size={16} color={G.gold} />} label="Rever pedidos KYC pendentes" value={stats.kycSummary.pending} />
              <PriorityRow icon={<MessageSquare size={16} color={G.blue} />} label="Ver novo feedback dos utilizadores" value={stats.feedbackCount || 0} />
              <PriorityRow icon={<UserX size={16} color={G.red} />} label="Analisar rejeições recentes" value={stats.kycSummary.rejected} />
            </div>
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
  }[status] || { bg: `${G.muted}18`, color: G.muted, label: status };

  return (
    <span
      style={{
        fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
        background: styles.bg, color: styles.color, border: `1px solid ${styles.color}30`
      }}
    >
      {styles.label}
    </span>
  );
}

function LegendRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: G.muted }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span>{label}</span>
      </div>
      <strong style={{ color: G.text }}>{value}</strong>
    </div>
  );
}

function PriorityRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: G.card, borderRadius: '14px', border: `1px solid ${G.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {icon}
        <span style={{ fontSize: '13px', color: G.text }}>{label}</span>
      </div>
      <strong style={{ color: G.text }}>{value}</strong>
    </div>
  );
}
