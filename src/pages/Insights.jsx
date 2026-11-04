import { ui, useUiLanguage } from '../utils/uiTranslation';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { Send, Sparkles, Brain, Mic, MicOff, Database, Layers, Compass, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { db } from '../db/db';
import { ensureChatOwner } from '../utils/localChat';
import { toRequestId } from '../utils/offlineQueue';
import { runProposal } from '../utils/advisorProposal';
import { useFinance } from '../hooks/useFinance';
import { useStewardship } from '../hooks/useStewardship';
import { parseMobileMoneySMS } from '../utils/smsParser';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Providers are now managed by backend .env variables

const INSIGHT_COLORS = {
  warning:     { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  dot: 'var(--ins-amber)' },
  opportunity: { bg: 'rgba(0,214,143,0.08)',   border: 'rgba(0,214,143,0.3)',   dot: 'var(--ins-green)' },
  celebration: { bg: 'rgba(0,214,143,0.1)',    border: 'rgba(0,214,143,0.4)',   dot: 'var(--ins-green)' },
  action:      { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.3)', dot: 'var(--ins-violet)' },
  info:        { bg: 'var(--ins-surface)', border: 'var(--ins-border)', dot: 'var(--ins-soft)' },
  wisdom:      { bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.4)',  dot: 'var(--ins-gold)' },
};

function renderBold(text) {
  // Support **bold** markdown
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--ins-amber)' }}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  useUiLanguage();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 16px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#7C3AED',
          animation: `binthBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, biblicalLabel }) {
  useUiLanguage();
  const pct = score || 0;
  const color = pct >= 75 ? 'var(--ins-green)' : pct >= 50 ? 'var(--ins-amber)' : 'var(--ins-red)';
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{pct}</div>
        <div style={{ fontSize: 11, color: 'var(--ins-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{ui(label)}</div>
        {biblicalLabel && (
          <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 4 }}>{ui(biblicalLabel)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Insights() {
  useUiLanguage();
  const { t, i18n } = useTranslation();
  const { showToast } = useOutletContext();
  const { state, dispatch } = useFinance();
  const navigate = useNavigate();
  const { stats } = useStewardship();
  const [actionBusy, setActionBusy] = useState(null);

  // A Binth proposal (expense, debt payment, xitique, plan, goal, budget, reminder,
  // memory) is only written when the person taps "Confirmar"; see runProposal.
  async function resolveProposal(msg, confirmed) {
    if (actionBusy !== null) return;
    const action = msg.pending_action;
    let status = 'cancelled';
    if (confirmed) {
      setActionBusy(msg.timestamp);
      // One key per proposal: confirming the same card again can never record twice.
      const requestId = toRequestId(`binth-${action.action}-${msg.timestamp}`) || undefined;
      try {
        status = await runProposal(action, { dispatch, state, requestId });
        showToast(t(`binth_actions.${status}`), status === 'done' ? 'success' : 'info');
      } catch {
        status = null;
        showToast(t('binth_actions.failed'), 'error');
      } finally {
        setActionBusy(null);
      }
    }
    if (!status) return;
    setMessages(prev => prev.map(m => (m === msg ? { ...m, action_status: status } : m)));
    if (msg.timestamp) db.mensagens.where('timestamp').equals(msg.timestamp).modify({ action_status: status }).catch(() => {});
  }

  // Chat state
  const [messages, setMessages] = useState([]);
  const location = useLocation();
  const [input, setInput] = useState(() => typeof location.state?.journeyPrompt === 'string' ? location.state.journeyPrompt.slice(0, 4000) : '');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);
  const recognitionRef = useRef(null);
  const micRetryRef = useRef(0); // Retry counter for network errors
  const micSupportedRef = useRef(false);

  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.lang = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'pt-PT';
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/binth/score', { signal: controller.signal })
      .then(response => setScore(response.data))
      .catch(() => {});
    return () => controller.abort();
  }, [i18n.resolvedLanguage]);

  // Scroll to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);


  // Load messages from Dexie + score on mount
  useEffect(() => {
    const loadData = async () => {
      // 1. Load History from Dexie (only if it belongs to whoever is signed in)
      await ensureChatOwner();
      const history = await db.mensagens.orderBy('timestamp').toArray();
      if (history.length > 0) {
        setMessages(history);
      } else {
        // Default welcome if no history
        api.get('/binth/insights/dashboard')
          .then((r) => {
            const { message, insight_type, quick_actions, biblical_insight, alerta } = r.data || {};
            const welcomeMsg = {
              role: 'assistant',
              content: message || t('insights.welcome_default'),
              insight_type: insight_type || 'info',
              quick_actions: quick_actions || t('insights.qa_defaults', { returnObjects: true }),
              biblical_insight,
              alerta,
              timestamp: Date.now()
            };
            setMessages([welcomeMsg]);
            db.mensagens.add(welcomeMsg);
          })
          .catch(() => {
            const fallback = {
              role: 'assistant',
              content: t('insights.welcome_default'),
              insight_type: 'info',
              quick_actions: t('insights.qa_defaults', { returnObjects: true }),
              timestamp: Date.now()
            };
            setMessages([fallback]);
            db.mensagens.add(fallback);
          });
      }

    };

    loadData();

    // 3. Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      micSupportedRef.current = true;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'pt-PT';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        micRetryRef.current = 0; // Reset retry on successful start
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('[Binth] Erro no microfone:', event.error);
        setIsListening(false);

        if (event.error === 'not-allowed') {
          // Permissão negada — mostrar guia
          showToast(ui("Permissão do microfone negada. Clica no cadeado na barra de endereços para autorizar."), 'error');
        } else if (event.error === 'network') {
          // Erro de rede — tentar novamente automaticamente até 2x
          if (micRetryRef.current < 2) {
            micRetryRef.current += 1;
            setTimeout(() => {
              try { recognition.start(); } catch (_) { setIsListening(false); }
            }, 1200);
            showToast(ui("Reconhecimento de voz sem rede — tentando novamente ({{p0}}/2)...", { p0: micRetryRef.current }), 'warning');
          } else {
            micRetryRef.current = 0;
            showToast(ui("O reconhecimento de voz precisa de ligação à internet (Chrome/Edge). Escreve a mensagem diretamente."), 'warning');
          }
        } else if (event.error === 'no-speech') {
          showToast(ui("Não foi detetada nenhuma voz. Tenta novamente."), 'warning');
        } else if (event.error === 'aborted') {
          // Ignorar — utilizador cancelou intencionalmente
        } else {
          showToast(`Erro no microfone: ${event.error}`, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      micSupportedRef.current = false;
      console.warn('[Binth] SpeechRecognition não suportado neste browser.');
    }
  }, [t, showToast]);

  const toggleListening = () => {
    try {
      if (isListening) {
        recognitionRef.current?.stop();
      } else {
        if (!recognitionRef.current) {
          showToast(ui("O teu browser não suporta comandos de voz."), 'warning');
          return;
        }
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('Erro ao alternar microfone:', err);
      setIsListening(false);
    }
  };

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    if (['Sim, registar agora', 'Yes, record now'].includes(msg)) {
      const lastMsg = messages.filter(m => m.pending_transaction).pop();
      if (lastMsg?.pending_transaction) {
        const tr = lastMsg.pending_transaction;
        api.post('/transactions', {
          data: tr.formattedDate,
          tipo: tr.type,
          desc: tr.description,
          valor: tr.amount,
          cat: tr.category,
          account_id: state.settings.default_expense_account_id || null
        }).then(() => {
          showToast(ui("Transação registada pela Binth! 🚀"), 'success');
          // Update state manually or reload
          window.location.reload(); 
        });
      }
    }

    setInput('');

    const userMsg = { role: 'user', content: msg, timestamp: Date.now() };
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-30);

    // Verificação de SMS Mobile Money
    const smsData = parseMobileMoneySMS(msg);
    if (smsData) {
      setMessages(prev => [...prev, userMsg]);
      db.mensagens.add(userMsg);
      
      const assistantMsg = {
        role: 'assistant',
        content: ui("Detetei um SMS do **{{p0}}**! **Valor:** {{p1}} MT **Tipo:** {{p2}} **Origem/Destino:** {{p3}} Queres que eu registe esta transação agora?", { p0: smsData.service, p1: smsData.amount, p2: smsData.type === 'receita' ? ui("Entrada") : ui("Saída"), p3: smsData.description }),
        insight_type: 'action',
        quick_actions: [ui("Sim, registar agora"), ui("Não, obrigado")],
        pending_transaction: smsData,
        timestamp: Date.now()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMsg]);
        db.mensagens.add(assistantMsg);
      }, 600);
      return;
    }

    setMessages(prev => [...prev, userMsg]);
    db.mensagens.add(userMsg);
    setLoading(true);

    try {
      const res = await api.post('/binth/chat', {
        message: msg,
        language: i18n.resolvedLanguage || 'pt',
        history: history.map(m => ({ role: m.role, content: String(m.content || m.message || '').slice(0, 4000) }))
      });

      const { message: aiMessage, ...rest } = res.data;
      const assistantMsg = { 
        role: 'assistant', 
        content: aiMessage || t('insights.error_invalid_response'), 
        timestamp: Date.now(),
        ...rest 
      };
      setMessages(prev => [...prev, assistantMsg]);
      db.mensagens.add(assistantMsg);
    } catch (err) {
      const errMsg = err.response?.data?.message || t('insights.welcome_error');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errMsg,
        insight_type: 'info',
        quick_actions: [t('insights.btn_retry')],
      }]);
      showToast(t('common.toasts.error_prefix') + 'Binth', 'error');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }


  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes binthBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .binth-input:focus { outline: none; border-color: rgba(124,58,237,0.4) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .binth-send:hover:not(:disabled) { background: #6D28D9 !important; transform: scale(1.05); }
        .binth-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .binth-qa:hover { background: rgba(124,58,237,0.15) !important; border-color: rgba(124,58,237,0.4) !important; }
        .cfg-input:focus { outline: none; border-color: rgba(245,158,11,0.4) !important; }
        .msg-appear { animation: msgIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes msgIn { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Binth Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>
            <Brain size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Binth <span style={{ color: '#7C3AED' }}>{t('insights.title').split(' ')[1]}</span>
            </h1>
            <p style={{ fontSize: 12, color: 'var(--ins-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
              {t('insights.subtitle')}
            </p>
          </div>
        </div>

        {/* Score ring (if loaded) */}
        {score && <ScoreRing score={score.score} label={t('insights.score_label')} biblicalLabel={score.biblical_label} />}
      </div>

      {/* ─── Chat Window ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--ins-surface)', border: '1px solid var(--ins-border)',
        borderRadius: 20, overflow: 'hidden',
      }}>
        {/* Messages */}
        <div style={{ height: 480, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const colors = INSIGHT_COLORS[msg.insight_type] || INSIGHT_COLORS.info;

            return (
              <div key={i} className="msg-appear" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: 8,
              }}>
                {/* Bubble */}
                <div style={{
                  maxWidth: '85%',
                  background: isUser
                    ? 'linear-gradient(135deg, #7C3AED, #4F46E5)'
                    : colors.bg,
                  border: isUser ? 'none' : `1px solid ${colors.border}`,
                  borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  padding: '12px 16px',
                  color: 'var(--color-text)',
                  fontSize: 14,
                  lineHeight: 1.65,
                  boxShadow: isUser ? '0 4px 20px rgba(124,58,237,0.3)' : 'none',
                }}>
                  {!isUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot }} />
                      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.dot, fontWeight: 700 }}>Binth</span>
                    </div>
                  )}
                  {(msg.content || '').split('\n').map((line, li) => (
                    <span key={li}>{renderBold(line)}{li < (msg.content || '').split('\n').length - 1 && <br />}</span>
                  ))}

                  {/* ─ Biblical Insight ─ */}
                  {!isUser && msg.biblical_insight && (
                    <div style={{
                      marginTop: 12, paddingTop: 8,
                      borderTop: '1px solid var(--ins-border)',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      fontSize: 11, color: 'var(--ins-gold)', lineHeight: 1.5,
                    }}>
                      <span style={{ flexShrink: 0 }}>&#128214;</span>
                      <em>{msg.biblical_insight}</em>
                    </div>
                  )}

                  {/* ─ Alerta ─ */}
                  {!isUser && msg.alerta && (
                    <div style={{
                      marginTop: 8, padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      fontSize: 11, fontWeight: 700, color: 'var(--ins-amber)',
                    }}>
                      {msg.alerta}
                    </div>
                  )}
                </div>

                {/* Proposal waiting for confirmation */}
                {!isUser && msg.pending_action && (
                  msg.action_status ? (
                    <div role="status" style={{ fontSize: 12, fontWeight: 700, color: msg.action_status === 'done' ? 'var(--ins-green)' : msg.action_status === 'queued' ? 'var(--ins-amber)' : 'var(--ins-soft)' }}>
                      {t(['done', 'queued', 'already_done'].includes(msg.action_status) ? `binth_actions.${msg.action_status}` : 'binth_actions.cancelled')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => resolveProposal(msg, true)} disabled={actionBusy !== null} style={{
                        minHeight: 44, padding: '8px 20px', borderRadius: 22, fontSize: 13, fontWeight: 700,
                        background: '#7C3AED', color: '#fff', border: 'none', cursor: 'pointer',
                      }}>{actionBusy === msg.timestamp ? t('binth_actions.saving') : t('binth_actions.confirm')}</button>
                      <button type="button" onClick={() => resolveProposal(msg, false)} disabled={actionBusy !== null} style={{
                        minHeight: 44, padding: '8px 20px', borderRadius: 22, fontSize: 13, fontWeight: 700,
                        background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--ins-border)', cursor: 'pointer',
                      }}>{t('binth_actions.cancel')}</button>
                    </div>
                  )
                )}

                {/* AI connection notice (own key out of credits, Mwanga AI offline) */}
                {!isUser && (msg.data?.ai_status || msg.data?.ai_notice) && (() => {
                  const reason = msg.data.ai_status?.reason || msg.data.ai_notice;
                  const personal = String(reason).startsWith('personal_');
                  return (
                    <div role="status" style={{
                      maxWidth: '85%', padding: '12px 12px', borderRadius: 12,
                      background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)',
                      fontSize: 12, lineHeight: 1.5,
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--ins-amber)' }}>{t(`ai_status.${reason}`, { defaultValue: t('ai_status.service_unavailable') })}</div>
                      <div style={{ marginTop: 4 }}>{msg.data.ai_notice ? t('ai_status.used_mwanga') + ' ' : ''}{t(personal ? 'ai_status.fix_hint' : 'ai_status.connect_hint')}</div>
                      {(msg.data.ai_status?.detail || msg.data.ai_detail) && (
                        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8, wordBreak: 'break-word' }}>
                          {t('ai_status.detail_label')} {msg.data.ai_status?.detail || msg.data.ai_detail}
                        </div>
                      )}
                      <button type="button" onClick={() => navigate('/settings?tab=ai')} style={{
                        marginTop: 8, padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: '#F59E0B', color: '#1f1300', border: 'none', cursor: 'pointer',
                      }}>{t(personal ? 'ai_status.fix_btn' : 'ai_status.connect_btn')}</button>
                    </div>
                  );
                })()}

                {/* Quick actions */}
                {!isUser && msg.quick_actions?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: '85%' }}>
                    {msg.quick_actions.map((qa, qi) => (
                      <button
                        key={qi}
                        className="binth-qa"
                        onClick={() => sendMessage(qa)}
                        disabled={loading}
                        style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 12,
                          background: 'rgba(124,58,237,0.08)',
                          border: '1px solid rgba(124,58,237,0.25)',
                          color: 'var(--ins-violet)', cursor: 'pointer',
                          transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
                        }}
                      >{ui(qa)}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="msg-appear" style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: '4px 18px 18px 18px',
              }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--ins-surface-2)' }} />

        {/* Input bar */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Mic button — only shown when browser supports Web Speech API */}
          {micSupportedRef.current && (
            <button
              onClick={toggleListening}
              title={isListening ? ui("Parar gravação") : ui("Falar com a Binth (requer internet no Chrome/Edge)")}
              className={isListening ? 'animate-pulse' : ''}
              style={{
                width: 44, height: 44, borderRadius: 12, border: 'none',
                background: isListening ? '#EF4444' : 'var(--ins-surface-2)',
                color: isListening ? '#fff' : '#5a7a9a',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
                boxShadow: isListening ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
              }}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          )}
          <div style={{ flex: 1, position: 'relative' }}>
            <Sparkles size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ins-muted)', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              className="binth-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={t('insights.placeholder')}
              disabled={loading}
              style={{
                width: '100%', background: 'var(--ins-surface-2)',
                border: '1px solid var(--ins-border)',
                borderRadius: 12, padding: '12px 16px 12px 40px',
                color: 'var(--color-text)', fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>
          <button
            className="binth-send"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none', flexShrink: 0,
              background: '#7C3AED', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* ─── Painel de Aprendizado & Inteligência ─── */}
      <div style={{
        marginTop: 24,
        background: 'var(--ins-surface)',
        border: '1px solid var(--ins-border)',
        borderRadius: 20,
        padding: '24px 24px',
        fontFamily: "'DM Sans', sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(124,58,237,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(124,58,237,0.2)'
            }}>
              <Database size={18} color="#a78bfa" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}> {ui("Como a Binth Aprende dos Teus Dados")} </h3>
              <p style={{ fontSize: 11, color: 'var(--ins-muted)', margin: '4px 0 0' }}> {ui("IA ativa a mapear o teu ecossistema financeiro real")} </p>
            </div>
          </div>
          
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,214,143,0.12)',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 700, color: 'var(--ins-green)'
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#00D68F',
              animation: 'binthBounce 1.2s infinite'
            }} /> {ui("APRENDIZADO ATIVO (100%)")} </div>
        </div>

        {/* Dynamic Learning Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 24
        }}>
          {/* 1. Transactions Synced */}
          <div style={{ background: 'var(--ins-surface)', border: '1px solid var(--ins-border)', borderRadius: 14, padding: 16 }}>
            <span style={{ fontSize: 10, color: 'var(--ins-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{ui("Dados Mapeados")}</span>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {state.transacoes?.length || 0}
              <span style={{ fontSize: 11, color: 'var(--ins-muted)', fontWeight: 400 }}>{ui("itens")}</span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--ins-soft)', margin: '8px 0 0', lineHeight: 1.4 }}> {ui("Padrões de gastos e receitas analisados automaticamente.")} </p>
          </div>

          {/* 2. Savings Rate */}
          <div style={{ background: 'var(--ins-surface)', border: '1px solid var(--ins-border)', borderRadius: 14, padding: 16 }}>
            <span style={{ fontSize: 10, color: 'var(--ins-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{ui("Taxa de Poupança")}</span>
            <div style={{
              fontSize: 20, fontWeight: 700,
              color: stats.savingsRate > 20 ? 'var(--ins-green)' : stats.savingsRate > 0 ? 'var(--ins-amber)' : 'var(--ins-red)',
              marginTop: 4
            }}>
              {stats.savingsRate ? `${Math.round(stats.savingsRate)}%` : '0%'}
            </div>
            <p style={{ fontSize: 10, color: 'var(--ins-soft)', margin: '8px 0 0', lineHeight: 1.4 }}> {ui("Margem livre detetada após subtrair despesas de receitas.")} </p>
          </div>

          {/* 3. Cash Runway */}
          <div style={{ background: 'var(--ins-surface)', border: '1px solid var(--ins-border)', borderRadius: 14, padding: 16 }}>
            <span style={{ fontSize: 10, color: 'var(--ins-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{ui("Reserva de Emergência")}</span>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {stats.runwayMonths || 0}
              <span style={{ fontSize: 11, color: 'var(--ins-muted)', fontWeight: 400 }}>{ui("meses")}</span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--ins-soft)', margin: '8px 0 0', lineHeight: 1.4 }}> {ui("Tempo que sobreviverias com os saldos líquidos atuais.")} </p>
          </div>

          {/* 4. Active Accounts */}
          <div style={{ background: 'var(--ins-surface)', border: '1px solid var(--ins-border)', borderRadius: 14, padding: 16 }}>
            <span style={{ fontSize: 10, color: 'var(--ins-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{ui("Canais Conectados")}</span>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {state.contas?.length || 0}
              <span style={{ fontSize: 11, color: 'var(--ins-muted)', fontWeight: 400 }}>{ui("contas")}</span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--ins-soft)', margin: '8px 0 0', lineHeight: 1.4 }}> {ui("M-Pesa, e-mola, carteira física e contas sincronizadas.")} </p>
          </div>
        </div>

        {/* AI Recommendations */}
        <div style={{
          background: 'rgba(124,58,237,0.04)',
          border: '1px solid rgba(124,58,237,0.12)',
          borderRadius: 16,
          padding: '16px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sparkles size={14} color="#a78bfa" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ins-violet)', textTransform: 'uppercase', letterSpacing: '0.05em' }}> {ui("Intervenções Inteligentes Recomendadas")} </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Liquidity Recommendation */}
            {state.contas?.reduce((acc, c) => acc + Number(c.current_balance || 0), 0) < 1000 ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <AlertTriangle size={14} color="#FF4C4C" style={{ marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{ui("Alerta de Liquidez Crítica")}</div>
                  <p style={{ fontSize: 11, color: 'var(--ins-soft)', margin: '4px 0 0', lineHeight: 1.4 }}> {ui("O teu caixa disponível é muito baixo.")} <strong>{ui("Evita qualquer despesa supérflua")}</strong> {ui("nas próximas 72 horas para proteger a tua estabilidade básica.")} </p>
                </div>
              </div>
            ) : null}

            {/* 2. Budget Recommendation */}
            {state.budgets?.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Layers size={14} color="#F59E0B" style={{ marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{ui("Mapeamento Orçamental Ativo")}</div>
                  <p style={{ fontSize: 11, color: 'var(--ins-soft)', margin: '4px 0 0', lineHeight: 1.4 }}> {ui("A Binth detetou que os teus limites de orçamentos cobrem todas as categorias essenciais. Rever orçamentos pode liberar até 15% de margem no teu mês.")} </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Layers size={14} color="#F59E0B" style={{ marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{ui("Criar Limites de Orçamento")}</div>
                  <p style={{ fontSize: 11, color: 'var(--ins-soft)', margin: '4px 0 0', lineHeight: 1.4 }}> {ui("Sem limites definidos, o teu dinheiro flui sem direção. Cria o teu primeiro orçamento para ensinar a IA a proteger o teu consumo.")} </p>
                </div>
              </div>
            )}

            {/* 3. Goal Recommendation */}
            {state.metas?.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Compass size={14} color="#00D68F" style={{ marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{ui("Reforçar a meta \"")}{state.metas[0].name}"</div>
                  <p style={{ fontSize: 11, color: 'var(--ins-soft)', margin: '4px 0 0', lineHeight: 1.4 }}> {ui("Aproveita as entradas livres para aproximar-te do teu sonho. Que tal alocar um aporte extra de 10% do teu caixa nesta meta?")} </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Compass size={14} color="#00D68F" style={{ marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{ui("Criar uma Meta de Poupança (Pé de Meia)")}</div>
                  <p style={{ fontSize: 11, color: 'var(--ins-soft)', margin: '4px 0 0', lineHeight: 1.4 }}> {ui("O sábio guarda para o amanhã. Inicia uma meta de poupança comunitária (como Xitique) ou uma meta individual no Mwanga hoje.")} </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Score breakdown (if loaded) ──────────────────────────────────── */}
      {score?.factors?.length > 0 && (
        <div style={{ marginTop: 24, background: 'var(--ins-surface)', border: '1px solid var(--ins-border)', borderRadius: 16, padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ins-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {t('insights.score_section.title')}
            </div>
            {score.biblical_label && (
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: score.score >= 75 ? 'var(--ins-green)' : score.score >= 50 ? 'var(--ins-amber)' : 'var(--ins-red)',
                background: 'var(--ins-surface-2)', borderRadius: 20,
                padding: '4px 12px', border: '1px solid var(--ins-border)'
              }}>
                {score.biblical_label}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {score.factors.map((f, i) => {
              const pct = Math.round((f.pts / f.max) * 100);
              const col = pct >= 75 ? '#00D68F' : pct >= 40 ? '#F59E0B' : '#FF4C4C';
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--ins-soft)' }}>{ui(f.name)}</span>
                      {f.biblical_principle && (
                        <span style={{ fontSize: 10, color: 'var(--ins-gold)', marginLeft: 8, opacity: 0.8 }}>&#128214; {f.biblical_principle}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: col, fontWeight: 700 }}>{f.pts}/{f.max} · {f.value}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--ins-surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 999, transition: 'width 1s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
