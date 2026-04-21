import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, useLocation } from 'react-router-dom';
import { Send, Sparkles, Brain, Mic, MicOff } from 'lucide-react';
import api from '../utils/api';
import { db } from '../db/db';
import { useFinance } from '../hooks/useFinance';
import { parseMobileMoneySMS } from '../utils/smsParser';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Providers are now managed by backend .env variables

const INSIGHT_COLORS = {
  warning:     { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  dot: '#F59E0B' },
  opportunity: { bg: 'rgba(0,214,143,0.08)',   border: 'rgba(0,214,143,0.3)',   dot: '#00D68F' },
  celebration: { bg: 'rgba(0,214,143,0.1)',    border: 'rgba(0,214,143,0.4)',   dot: '#00D68F' },
  action:      { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.3)', dot: '#6366F1' },
  info:        { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', dot: '#8a9ab8' },
};

function renderBold(text) {
  // Support **bold** markdown
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: '#F59E0B' }}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '12px 16px' }}>
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
  const pct = score || 0;
  const color = pct >= 75 ? '#00D68F' : pct >= 50 ? '#F59E0B' : '#FF4C4C';
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
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{pct}</div>
        <div style={{ fontSize: 11, color: '#5a7a9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
        {biblicalLabel && (
          <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 3 }}>{biblicalLabel}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Insights() {
  const { t } = useTranslation();
  const { showToast } = useOutletContext();
  const { state } = useFinance();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);
  const recognitionRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);


  // Load messages from Dexie + score on mount
  useEffect(() => {
    const loadData = async () => {
      // 1. Load History from Dexie
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

      // 2. Load Score
      api.get('/binth/score')
        .then(r => setScore(r.data))
        .catch(() => {});
    };

    loadData();

    // 3. Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true; // Permite ver o que está a ser dito em tempo real
      recognition.lang = 'pt-PT';

      recognition.onstart = () => {
        setIsListening(true);
        console.log('[Binth] Microfone ativo...');
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
          showToast('Permissão de microfone negada. Verifica as definições do browser.', 'error');
        } else {
          showToast('Erro ao aceder ao microfone: ' + event.error, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('[Binth] Microfone desligado.');
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('[Binth] SpeechRecognition não suportado neste browser.');
    }
  }, [t, showToast]);

  const toggleListening = () => {
    try {
      if (isListening) {
        recognitionRef.current?.stop();
      } else {
        if (!recognitionRef.current) {
          showToast('O teu browser não suporta comandos de voz.', 'warning');
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

    if (msg === 'Sim, registar agora') {
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
          showToast('Transação registada pela Binth! 🚀', 'success');
          // Update state manually or reload
          window.location.reload(); 
        });
      }
    }

    setInput('');

    const userMsg = { role: 'user', content: msg, timestamp: Date.now() };
    const history = messages.filter(m => m.role !== 'system');

    // Verificação de SMS Mobile Money
    const smsData = parseMobileMoneySMS(msg);
    if (smsData) {
      setMessages(prev => [...prev, userMsg]);
      db.mensagens.add(userMsg);
      
      const assistantMsg = {
        role: 'assistant',
        content: `Detetei um SMS do **${smsData.service}**!\n\n**Valor:** ${smsData.amount} MT\n**Tipo:** ${smsData.type === 'receita' ? 'Entrada' : 'Saída'}\n**Origem/Destino:** ${smsData.description}\n\nQueres que eu registe esta transação agora?`,
        insight_type: 'action',
        quick_actions: ['Sim, registar agora', 'Não, obrigado'],
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
        history: history.map(m => ({ role: m.role, content: m.content || m.message || '' }))
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Binth <span style={{ color: '#7C3AED' }}>{t('insights.title').split(' ')[1]}</span>
            </h1>
            <p style={{ fontSize: 12, color: '#5a7a9a', margin: '2px 0 0', letterSpacing: '0.04em' }}>
              {t('insights.subtitle')}
            </p>
          </div>
        </div>

        {/* Score ring (if loaded) */}
        {score && <ScoreRing score={score.score} label={t('insights.score_label')} biblicalLabel={score.biblical_label} />}
      </div>

      {/* ─── Chat Window ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, overflow: 'hidden',
      }}>
        {/* Messages */}
        <div style={{ height: 480, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  color: '#e2eaf4',
                  fontSize: 14,
                  lineHeight: 1.65,
                  boxShadow: isUser ? '0 4px 20px rgba(124,58,237,0.3)' : 'none',
                }}>
                  {!isUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.7 }}>
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
                      marginTop: 10, paddingTop: 8,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', gap: 6, alignItems: 'flex-start',
                      fontSize: 11, color: '#c8a84b', lineHeight: 1.5,
                    }}>
                      <span style={{ flexShrink: 0 }}>&#128214;</span>
                      <em>{msg.biblical_insight}</em>
                    </div>
                  )}

                  {/* ─ Alerta ─ */}
                  {!isUser && msg.alerta && (
                    <div style={{
                      marginTop: 8, padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      fontSize: 11, fontWeight: 600, color: '#F59E0B',
                    }}>
                      {msg.alerta}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                {!isUser && msg.quick_actions?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: '85%' }}>
                    {msg.quick_actions.map((qa, qi) => (
                      <button
                        key={qi}
                        className="binth-qa"
                        onClick={() => sendMessage(qa)}
                        disabled={loading}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 12,
                          background: 'rgba(124,58,237,0.08)',
                          border: '1px solid rgba(124,58,237,0.25)',
                          color: '#a78bfa', cursor: 'pointer',
                          transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
                        }}
                      >{qa}</button>
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
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* Input bar */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={toggleListening}
            className={isListening ? 'animate-pulse' : ''}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: isListening ? '#EF4444' : 'rgba(255,255,255,0.05)',
              color: isListening ? '#fff' : '#5a7a9a',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <div style={{ flex: 1, position: 'relative' }}>
            <Sparkles size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5a7a9a', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              className="binth-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={t('insights.placeholder')}
              disabled={loading}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '11px 14px 11px 36px',
                color: '#e2eaf4', fontSize: 14,
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

      {/* ─── Score breakdown (if loaded) ──────────────────────────────────── */}
      {score?.factors?.length > 0 && (
        <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {t('insights.score_section.title')}
            </div>
            {score.biblical_label && (
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: score.score >= 75 ? '#00D68F' : score.score >= 50 ? '#F59E0B' : '#FF4C4C',
                background: 'rgba(255,255,255,0.05)', borderRadius: 20,
                padding: '3px 10px', border: '1px solid rgba(255,255,255,0.1)'
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
                      <span style={{ fontSize: 12, color: '#8a9ab8' }}>{f.name}</span>
                      {f.biblical_principle && (
                        <span style={{ fontSize: 10, color: '#c8a84b', marginLeft: 8, opacity: 0.8 }}>&#128214; {f.biblical_principle}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: col, fontWeight: 600 }}>{f.pts}/{f.max} · {f.value}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
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
