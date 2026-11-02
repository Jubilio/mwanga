import { ui, useUiLanguage } from '../utils/uiTranslation';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { openProtectedFile, protectedFilePath } from '../utils/protectedFiles';
import {
  Users, CheckCircle, XCircle, Clock,
  Search, RefreshCw, FileCheck, KeyRound, Copy, MessageCircle, X
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
  useUiLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [resetInfo, setResetInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  // When a user never gets the recovery email: confirm who they are first, then
  // send them this link or code yourself (it is valid for 24 hours).
  async function handlePasswordReset(user) {
    if (!window.confirm(`Gerar um link de recuperação de senha para ${user.name || user.email}? Envie-o só depois de confirmar que é mesmo a pessoa.`)) return;
    setError('');
    try {
      const token = localStorage.getItem('mwanga-admin-token');
      const resp = await api.post(`/admin/users/${user.id}/password-reset`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCopied(false);
      setResetInfo({ ...resp.data, name: user.name, whatsapp: user.whatsapp_number });
    } catch (err) {
      setError(err.response?.data?.error || ui("Não foi possível gerar o link de recuperação."));
    }
  }

  function resetMessage(info) {
    return `Olá ${info.name || ''}, aqui está o link para criar uma nova senha no Mwanga: ${info.url}\n\nOu abra "Esqueci a senha", escreva o seu email e este código: ${info.code}\n\nVale durante 24 horas.`;
  }

  async function copyReset() {
    try {
      await navigator.clipboard.writeText(resetMessage(resetInfo));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

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
      setError(err.response?.data?.error || ui("Falha ao carregar utilizadores."));
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
      setError(err.response?.data?.error || ui("Falha ao atualizar estado KYC."));
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
            <Users size={22} style={{ verticalAlign: 'middle', marginRight: '10px', color: G.gold }} /> {ui("Gestão de Utilizadores")} </h1>
          <p style={{ color: G.muted, fontSize: '13px', margin: '4px 0 0' }}>
            {ui(users.length === 1 ? "{{count}} utilizador registado" : "{{count}} utilizadores registados", { count: users.length })}
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
          {loading ? ui("Atualizando...") : ui("Atualizar")}
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
          placeholder={ui("Pesquisar por nome ou email...")}
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

      {resetInfo && (
        <div style={{
          marginBottom: '16px', background: `${G.blue}12`, color: G.text,
          border: `1px solid ${G.blue}40`, borderRadius: '14px', padding: '16px',
          fontSize: '13px', position: 'relative',
        }}>
          <button onClick={() => setResetInfo(null)} aria-label={ui("Fechar")} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: G.muted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
          <div style={{ fontWeight: 800, marginBottom: '6px' }}>{`Recuperação de senha para ${resetInfo.email}`}</div>
          <div style={{ color: G.muted, marginBottom: '10px' }}>{ui("Válido durante 24 horas. Envie só depois de confirmar que é a pessoa.")}</div>
          <div style={{ wordBreak: 'break-all', marginBottom: '6px' }}>{resetInfo.url}</div>
          <div style={{ marginBottom: '12px' }}>{ui("Código")}: <strong style={{ letterSpacing: '0.2em', fontSize: '15px' }}>{resetInfo.code}</strong></div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={copyReset} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', background: G.card, border: `1px solid ${G.border}`, color: G.text, cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
              <Copy size={14} /> {copied ? ui("Copiado") : ui("Copiar mensagem")}
            </button>
            <a
              href={`https://wa.me/${resetInfo.whatsapp ? String(resetInfo.whatsapp).replace(/\D/g, '') : ''}?text=${encodeURIComponent(resetMessage(resetInfo))}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', background: `${G.green}20`, border: `1px solid ${G.green}50`, color: G.green, textDecoration: 'none', fontWeight: 700, fontSize: '12px' }}
            >
              <MessageCircle size={14} /> {ui("Enviar no WhatsApp")}
            </a>
          </div>
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
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>{ui("Utilizador")}</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>KYC</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Score</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>Docs</th>
                <th style={{ padding: '14px 16px', textAlign: 'left' }}>{ui("Ações")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} style={{ borderBottom: `1px solid ${G.border}`, fontSize: '13px' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700 }}>{user.name}</div>
                    <div style={{ fontSize: '11px', color: G.muted }}>{user.email}</div>
                    <div style={{ fontSize: '10px', color: G.muted, marginTop: '2px' }}>
                      {user.role === 'admin' ? '🛡️ Admin' : ui("Utilizador")}
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
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => openProtectedFile(protectedFilePath('kyc', doc.document_url)).catch(() => {})}
                          style={{
                            fontSize: '10px', padding: '3px 8px', borderRadius: '6px',
                            background: G.card, border: `1px solid ${G.border}`,
                            color: G.muted, textDecoration: 'none', cursor: 'pointer',
                          }}
                        >
                          {doc.document_type?.split('_')[0]?.toUpperCase() || 'DOC'}
                        </button>
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
                        title={ui("Aprovar")}
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
                        title={ui("Rejeitar")}
                      >
                        <XCircle size={18} />
                      </button>
                      <button
                        onClick={() => handlePasswordReset(user)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.blue }}
                        title={ui("Gerar link de recuperação de senha")}
                        aria-label={ui("Gerar link de recuperação de senha")}
                      >
                        <KeyRound size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: G.muted }}>
                    {loading ? ui("A carregar...") : ui("Nenhum utilizador encontrado.")}
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
  useUiLanguage();
  const styles = {
    pending: { bg: `${G.gold}18`, color: G.gold, label: ui("Pendente") },
    approved: { bg: `${G.green}18`, color: G.green, label: ui("Aprovado") },
    rejected: { bg: `${G.red}18`, color: G.red, label: ui("Rejeitado") },
  }[status] || { bg: `${G.muted}18`, color: G.muted, label: status || 'N/A' };

  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
      background: styles.bg, color: styles.color, border: `1px solid ${styles.color}30`,
    }}>
      {ui(styles.label)}
    </span>
  );
}
