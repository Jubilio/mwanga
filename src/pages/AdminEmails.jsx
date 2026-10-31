import { ui, useUiLanguage, uiLocale } from '../utils/uiTranslation';
import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { Mail, Send, RefreshCw, FlaskConical, AlertCircle, XCircle, Users } from 'lucide-react';
import Toast, { useToast } from '../components/Toast';

const G = {
  bg: '#07090f', bg2: '#0c1018',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  gold: '#F59E0B',
  text: '#e8f0fe', muted: '#6b7fa3',
  green: '#10B981', red: '#EF4444', blue: '#3B82F6',
};

const STATUS_LABEL = {
  sending: { label: 'A enviar', color: G.blue },
  sent: { label: 'Enviada', color: G.green },
  cancelled: { label: 'Cancelada', color: G.muted },
};

function headers() {
  const token = localStorage.getItem('mwanga-admin-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: G.card, border: `1px solid ${G.border}`, borderRadius: '12px',
  padding: '12px 14px', color: G.text, fontSize: '14px', outline: 'none',
  fontFamily: 'inherit',
};

function buttonStyle(color, disabled) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px 18px', borderRadius: '12px',
    background: color, border: color === G.card ? `1px solid ${G.border}` : 'none',
    color: color === G.card ? G.text : '#fff',
    fontSize: '13px', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  };
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(uiLocale(), { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminEmails() {
  useUiLanguage();
  const [status, setStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [testedKey, setTestedKey] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      const [statusResp, listResp] = await Promise.all([
        api.get('/admin/emails/status', { headers: headers() }),
        api.get('/admin/emails/campaigns', { headers: headers() }),
      ]);
      setStatus(statusResp.data);
      setCampaigns(Array.isArray(listResp.data) ? listResp.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || ui('Não foi possível carregar os emails.'));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sending = campaigns.some((c) => c.status === 'sending');
  useEffect(() => {
    if (!sending) return undefined;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [sending, load]);

  const contentKey = `${subject}\u0000${body}`;
  const hasContent = subject.trim() && body.trim();
  const tested = hasContent && testedKey === contentKey;

  async function sendTest() {
    setBusy('test');
    setError('');
    try {
      const resp = await api.post('/admin/emails/test', { subject, body }, { headers: headers() });
      setTestedKey(contentKey);
      showToast(resp.data.message || ui('Email de teste enviado.'), 'success');
    } catch (err) {
      const msg = err.response?.data?.error || ui('Falha ao enviar o teste.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy('');
    }
  }

  async function sendAll() {
    const total = status?.audience ?? 0;
    if (!window.confirm(ui(`Enviar este email para ${total} utilizadores? Não é possível desfazer os emails já enviados.`))) return;
    setBusy('send');
    setError('');
    try {
      const resp = await api.post('/admin/emails/campaigns', { subject, body }, { headers: headers() });
      showToast(ui(`Campanha criada para ${resp.data.total} utilizadores. O envio é feito em lotes.`), 'success');
      setSubject('');
      setBody('');
      setTestedKey('');
      await load();
    } catch (err) {
      const msg = err.response?.data?.error || ui('Falha ao criar a campanha.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy('');
    }
  }

  async function cancel(id) {
    if (!window.confirm(ui('Cancelar o resto desta campanha? Os emails já enviados não voltam atrás.'))) return;
    try {
      await api.post(`/admin/emails/campaigns/${id}/cancel`, {}, { headers: headers() });
      showToast(ui('Campanha cancelada.'), 'success');
      await load();
    } catch (err) {
      showToast(err.response?.data?.error || ui('Falha ao cancelar.'), 'error');
    }
  }

  const perHour = status ? Math.round((status.batchSize * 3600000) / Math.max(status.batchDelayMs, 1)) : 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, fontFamily: "'Sora', sans-serif" }}>
            <Mail size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px', color: G.gold }} /> {ui('Emails aos utilizadores')}
          </h1>
          <p style={{ color: G.muted, fontSize: '13px', margin: '4px 0 0' }}>
            {status?.from ? <>{ui('Enviados de')} <strong style={{ color: G.text }}>{status.from}</strong></> : ui('Escreva uma mensagem e envie a todos os utilizadores com email.')}
          </p>
        </div>
        <button onClick={load} style={buttonStyle(G.card, false)}>
          <RefreshCw size={14} /> {ui('Atualizar')}
        </button>
      </div>

      {status && !status.configured && (
        <div style={{ marginBottom: '16px', background: `${G.gold}14`, border: `1px solid ${G.gold}40`, borderRadius: '14px', padding: '14px 16px', fontSize: '13px', display: 'flex', gap: '10px' }}>
          <AlertCircle size={18} color={G.gold} style={{ flexShrink: 0 }} />
          <span>{ui('O envio de email ainda não está configurado no servidor. Defina EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER e EMAIL_PASS no Render e reinicie o serviço.')}</span>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '16px', background: `${G.red}14`, border: `1px solid ${G.red}40`, borderRadius: '14px', padding: '14px 16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: ui('Vão receber'), value: status.audience, hint: ui('utilizadores com email e subscritos') },
            { label: ui('Enviados nas últimas 24h'), value: `${status.sentToday} / ${status.dailyLimit}`, hint: ui('limite diário') },
            { label: ui('Ritmo'), value: `~${perHour}/h`, hint: ui(`lotes de ${status.batchSize}`) },
          ].map((item) => (
            <div key={item.label} style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: G.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, margin: '6px 0 2px' }}>{item.value}</div>
              <div style={{ fontSize: '11px', color: G.muted }}>{item.hint}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: G.muted }}>
          {ui('Assunto')}
          <input value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder={ui('Ex.: Novidades do Mwanga em novembro')} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: G.muted }}>
          {ui('Mensagem')}
          <textarea value={body} maxLength={20000} onChange={(e) => setBody(e.target.value)} placeholder={ui('Olá {nome},\n\nEscreva aqui a sua mensagem. Deixe uma linha em branco entre parágrafos.')} style={{ ...inputStyle, minHeight: '220px', resize: 'vertical', lineHeight: 1.6 }} />
        </label>
        <p style={{ fontSize: '12px', color: G.muted, margin: 0, lineHeight: 1.6 }}>
          {ui('Escreva {nome} para usar o primeiro nome de cada pessoa. Os links (https://...) ficam clicáveis. Cada email leva no fim um link para cancelar a subscrição.')}
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={sendTest} disabled={!hasContent || busy !== ''} style={buttonStyle(G.card, !hasContent || busy !== '')}>
            {busy === 'test' ? <RefreshCw size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            {ui('Enviar teste para mim')}
          </button>
          <button
            onClick={sendAll}
            disabled={!tested || busy !== '' || sending || !status?.configured || !status?.audience}
            title={!tested ? ui('Envie primeiro um teste com este texto') : undefined}
            style={buttonStyle(G.gold, !tested || busy !== '' || sending || !status?.configured || !status?.audience)}
          >
            {busy === 'send' ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {ui('Enviar a todos')}
          </button>
        </div>
        {hasContent && !tested && (
          <p style={{ fontSize: '12px', color: G.gold, margin: 0 }}>{ui('Envie um teste para si com este texto antes de enviar a todos.')}</p>
        )}
        {sending && (
          <p style={{ fontSize: '12px', color: G.blue, margin: 0 }}>{ui('Há uma campanha a ser enviada. Pode criar outra quando terminar.')}</p>
        )}
      </div>

      <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px' }}>{ui('Campanhas recentes')}</h2>
      {campaigns.length === 0 && (
        <div style={{ color: G.muted, fontSize: '13px', padding: '20px', textAlign: 'center', background: G.bg2, borderRadius: '16px', border: `1px solid ${G.border}` }}>
          {ui('Ainda não enviou nenhuma campanha.')}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {campaigns.map((c) => {
          const meta = STATUS_LABEL[c.status] || { label: c.status, color: G.muted };
          const done = c.sent + c.failed + c.skipped;
          const pct = c.total ? Math.round((done / c.total) * 100) : 100;
          return (
            <div key={c.id} style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', overflowWrap: 'anywhere' }}>{c.subject}</div>
                  <div style={{ fontSize: '11px', color: G.muted, marginTop: '4px' }}>
                    {formatDate(c.created_at)}{c.created_by_name ? ` · ${c.created_by_name}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: meta.color, background: `${meta.color}1f`, padding: '4px 10px', borderRadius: '999px' }}>{ui(meta.label)}</span>
                  {c.status === 'sending' && (
                    <button onClick={() => cancel(c.id)} style={{ ...buttonStyle(G.card, false), padding: '6px 10px', fontSize: '11px' }}>
                      <XCircle size={12} /> {ui('Cancelar')}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ height: '6px', background: G.card, borderRadius: '999px', margin: '12px 0 8px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: meta.color }} />
              </div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: G.muted }}>
                <span style={{ whiteSpace: 'nowrap' }}><Users size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {c.total}</span>
                <span style={{ color: G.green }}>{ui('Enviados')}: {c.sent}</span>
                {c.pending > 0 && <span>{ui('Por enviar')}: {c.pending}</span>}
                {c.failed > 0 && <span style={{ color: G.red }}>{ui('Falharam')}: {c.failed}</span>}
                {c.skipped > 0 && <span>{ui('Cancelaram subscrição')}: {c.skipped}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onClose={hideToast} />
    </div>
  );
}
