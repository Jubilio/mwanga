import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Users, CheckCircle, XCircle, Clock,
  Search, RefreshCw, FileCheck
} from 'lucide-react';

const G = {
  bg: '#07090f', bg2: '#0c1018',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  gold: '#F59E0B',
  text: '#e8f0fe', muted: '#6b7fa3',
  green: '#10B981', red: '#EF4444', blue: '#3B82F6',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('mwanga-admin-token');
      const resp = await api.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao carregar utilizadores.');
    } finally {
      setLoading(false);
    }
  }

  async function handleKycUpdate(userId, status) {
    try {
      const token = localStorage.getItem('mwanga-admin-token');
      await api.post('/admin/kyc/status', { userId, status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao atualizar estado KYC.');
    }
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, fontFamily: "'Sora', sans-serif" }}>
            <Users size={22} style={{ verticalAlign: 'middle', marginRight: '10px', color: G.gold }} />
            Gestão de Utilizadores
          </h1>
          <p style={{ color: G.muted, fontSize: '13px', margin: '4px 0 0' }}>
            {users.length} utilizador{users.length !== 1 ? 'es' : ''} registado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '12px',
            background: G.card, border: `1px solid ${G.border}`,
            color: G.text, cursor: loading ? 'wait' : 'pointer',
            fontSize: '12px', fontWeight: 700,
          }}
        >
          <RefreshCw size={14} style={{ opacity: loading ? 0.4 : 1 }} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px',
        padding: '10px 16px', marginBottom: '20px',
      }}>
        <Search size={16} color={G.muted} />
        <input
          type="text"
          placeholder="Pesquisar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: G.text, fontSize: '14px',
          }}
        />
      </div>

      {error && (
        <div style={{
          marginBottom: '16px', background: `${G.red}14`, color: G.text,
          border: `1px solid ${G.red}40`, borderRadius: '14px', padding: '14px 16px',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: G.bg2, borderRadius: '20px',
        border: `1px solid ${G.border}`, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: G.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${G.border}` }}>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Utilizador</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>KYC</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Score</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Docs</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} style={{ borderBottom: `1px solid ${G.border}`, fontSize: '13px' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700 }}>{user.name}</div>
                    <div style={{ fontSize: '11px', color: G.muted }}>{user.email}</div>
                    <div style={{ fontSize: '10px', color: G.muted, marginTop: '2px' }}>
                      {user.role === 'admin' ? '🛡️ Admin' : 'Utilizador'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <KycBadge status={user.kyc_status} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontWeight: 800, color: user.credit_score > 600 ? G.green : G.gold }}>
                      {user.credit_score || 0}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {user.documents?.map((doc) => (
                        <a
                          key={doc.id}
                          href={`${api.defaults.baseURL.replace('/api', '')}/uploads/kyc/${doc.document_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '10px', padding: '3px 8px', borderRadius: '6px',
                            background: G.card, border: `1px solid ${G.border}`,
                            color: G.muted, textDecoration: 'none',
                          }}
                        >
                          {doc.document_type?.split('_')[0]?.toUpperCase() || 'DOC'}
                        </a>
                      ))}
                      {(!user.documents || user.documents.length === 0) && (
                        <span style={{ color: G.muted, fontSize: '11px' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        disabled={user.kyc_status === 'approved'}
                        onClick={() => handleKycUpdate(user.id, 'approved')}
                        style={{
                          background: 'none', border: 'none', cursor: user.kyc_status === 'approved' ? 'not-allowed' : 'pointer',
                          color: G.green, opacity: user.kyc_status === 'approved' ? 0.3 : 1,
                        }}
                        title="Aprovar"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button
                        disabled={user.kyc_status === 'rejected'}
                        onClick={() => handleKycUpdate(user.id, 'rejected')}
                        style={{
                          background: 'none', border: 'none', cursor: user.kyc_status === 'rejected' ? 'not-allowed' : 'pointer',
                          color: G.red, opacity: user.kyc_status === 'rejected' ? 0.3 : 1,
                        }}
                        title="Rejeitar"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: G.muted }}>
                    {loading ? 'A carregar...' : 'Nenhum utilizador encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KycBadge({ status }) {
  const styles = {
    pending: { bg: `${G.gold}18`, color: G.gold, label: 'Pendente' },
    approved: { bg: `${G.green}18`, color: G.green, label: 'Aprovado' },
    rejected: { bg: `${G.red}18`, color: G.red, label: 'Rejeitado' },
  }[status] || { bg: `${G.muted}18`, color: G.muted, label: status || 'N/A' };

  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
      background: styles.bg, color: styles.color, border: `1px solid ${styles.color}30`,
    }}>
      {styles.label}
    </span>
  );
}
