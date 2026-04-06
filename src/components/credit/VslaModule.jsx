import { useState } from 'react';
import { useVsla } from '../../hooks/useVsla';
import { useFinance } from '../../hooks/useFinance';
import { Plus, Users, TrendingUp, ShieldCheck, Calendar, Info, ArrowRight } from 'lucide-react';

const G = {
  bg: "var(--color-midnight)", bg2: "var(--color-midnight-light)", bg3: "#101620",
  card: "rgba(255,255,255,0.04)", cardHov: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.07)", borderS: "rgba(255,255,255,0.13)",
  gold: "var(--color-gold)", gold2: "var(--color-gold-light)", goldGlow: "rgba(245,158,11,0.28)",
  text: "#e8f0fe", muted: "#6b7fa3", muted2: "#3a4a62", muted3: "#1a2535",
  green: "var(--color-leaf)", red: "var(--color-coral)", blue: "var(--color-ocean)", purple: "#8B5CF6",
  credit: "var(--color-leaf)",
  credit2: "#059669",
};

export default function VslaModule() {
  const { state } = useFinance();
  const { groups, loading, createGroup, activeGroup, getGroupDetails } = useVsla();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: state.settings.currency || 'MT',
    shareValue: 100,
    interestRate: 0.05,
    meetingFrequency: 'weekly',
    maxShares: 5,
    socialFund: 50
  });

  const currency = state.settings.currency || 'MT';

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createGroup(formData);
      setShowCreate(false);
      setFormData({
        name: '', description: '', currency: state.settings.currency || 'MT',
        shareValue: 100, interestRate: 0.05, meetingFrequency: 'weekly',
        maxShares: 5, socialFund: 50
      });
    } catch {
      // Toast handles error
    }
  };

  const fmt = (n) => Math.abs(n).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: G.muted }}>Carregando comunidades...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Intro Header */}
      {!activeGroup && (
        <div style={{ 
          background: "rgba(16,185,129,0.08)", 
          border: `1px solid ${G.green}30`, 
          borderRadius: 20, 
          padding: 24,
          marginBottom: 10 
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 32 }}>🤝</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: G.green }}>Crédito Comunitário (Digital VSLA)</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: 13, color: G.muted, lineHeight: 1.6 }}>
                O Mwanga Community permite que cries ou participes em grupos de poupança autogeridos. 
                Poupa em conjunto, recebe empréstimos a taxas justas e recebe os lucros no final do ciclo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Group List or Selection */}
      {!activeGroup ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, letterSpacing: '0.12em' }}>OS TEUS GRUPOS</div>
            <button 
              onClick={() => setShowCreate(!showCreate)} 
              style={{ 
                background: G.green, color: '#000', border: 'none', 
                borderRadius: 12, padding: '8px 16px', fontWeight: 800, 
                fontSize: 12, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' 
              }}
            >
              <Plus size={16} /> {showCreate ? 'Cancelar' : 'Criar Grupo'}
            </button>
          </div>

          {showCreate && (
            <div style={{ 
              background: G.card, border: `1px solid ${G.border}`, borderRadius: 20, 
              padding: 24, animation: 'slideUp 0.3s ease' 
            }}>
              <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: G.muted, display: 'block', marginBottom: 6 }}>Nome do Grupo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Associação de Poupança da Mafalala"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    style={{ width: '100%', background: G.muted3, border: `1px solid ${G.border}`, borderRadius: 12, padding: 12, color: G.text, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: G.muted, display: 'block', marginBottom: 6 }}>Valor da Share ({currency})</label>
                  <input 
                    type="number"
                    required
                    value={formData.shareValue}
                    onChange={e => setFormData({...formData, shareValue: +e.target.value})}
                    style={{ width: '100%', background: G.muted3, border: `1px solid ${G.border}`, borderRadius: 12, padding: 12, color: G.text, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: G.muted, display: 'block', marginBottom: 6 }}>Juros Mensais (%)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={formData.interestRate * 100}
                    onChange={e => setFormData({...formData, interestRate: (+e.target.value / 100)})}
                    style={{ width: '100%', background: G.muted3, border: `1px solid ${G.border}`, borderRadius: 12, padding: 12, color: G.text, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: G.muted, display: 'block', marginBottom: 6 }}>Frequência</label>
                  <select 
                    value={formData.meetingFrequency}
                    onChange={e => setFormData({...formData, meetingFrequency: e.target.value})}
                    style={{ width: '100%', background: G.muted3, border: `1px solid ${G.border}`, borderRadius: 12, padding: 12, color: G.text, outline: 'none' }}
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: G.muted, display: 'block', marginBottom: 6 }}>Fundo Social ({currency})</label>
                  <input 
                    type="number"
                    required
                    value={formData.socialFund}
                    onChange={e => setFormData({...formData, socialFund: +e.target.value})}
                    style={{ width: '100%', background: G.muted3, border: `1px solid ${G.border}`, borderRadius: 12, padding: 12, color: G.text, outline: 'none' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: 10 }}>
                  <button type="submit" style={{ width: '100%', padding: 14, background: G.green, color: '#000', border: 'none', borderRadius: 12, fontWeight: 900, cursor: 'pointer' }}>
                    Confirmar e Iniciar Grupo
                  </button>
                </div>
              </form>
            </div>
          )}

          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: G.card, borderRadius: 20, border: `1px dashed ${G.border}` }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌴</div>
              <h3 style={{ margin: 0, fontWeight: 700, color: G.text }}>Ainda não fazes parte de nenhum grupo</h3>
              <p style={{ color: G.muted, fontSize: 14, marginTop: 10 }}>Começa uma associação comunitária com os teus amigos ou família hoje mesmo.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {groups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => getGroupDetails(group.id)}
                  style={{ 
                    background: G.card, border: `1px solid ${G.border}`, 
                    borderRadius: 20, padding: 24, cursor: 'pointer', transition: 'all 0.2s',
                    hover: { background: G.cardHov }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: G.text }}>{group.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: G.muted, marginTop: 4 }}>
                        <ShieldCheck size={12} color={G.green} /> {group.role.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ fontSize: 24 }}>🏦</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: G.muted3, padding: 12, borderRadius: 12 }}>
                      <div style={{ fontSize: 10, color: G.muted, textTransform: 'uppercase' }}>Valor Share</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: G.green }}>{fmt(group.share_value)} {group.currency}</div>
                    </div>
                    <div style={{ background: G.muted3, padding: 12, borderRadius: 12 }}>
                      <div style={{ fontSize: 10, color: G.muted, textTransform: 'uppercase' }}>Meeting</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: G.gold }}>{group.meeting_frequency}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color={G.muted} />
                      <span style={{ fontSize: 12, color: G.muted }}>Grupo Comunitário</span>
                    </div>
                    <ArrowRight size={18} color={G.green} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Render Group Detail View */
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <button onClick={() => getGroupDetails(null)} style={{ background: 'transparent', border: 'none', color: G.muted, cursor: 'pointer', fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
             ← Voltar à lista
          </button>
          
          <div style={{ background: G.card, borderRadius: 24, padding: 32, border: `1px solid ${G.border}` }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                   <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: G.text }}>{activeGroup.name}</h2>
                   <p style={{ margin: '8px 0 0 0', color: G.muted }}>Comunidade de Poupança e Crédito</p>
                </div>
                <div style={{ padding: '8px 16px', background: `${G.green}15`, borderRadius: 12, border: `1px solid ${G.green}30`, color: G.green, fontWeight: 800, fontSize: 12 }}>
                   {activeGroup.status.toUpperCase()}
                </div>
             </div>

             <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🚧</div>
                <h3 style={{ color: G.text }}>Painel de Gestão desta Comunidade</h3>
                <p style={{ color: G.muted }}>Estamos a preparar o módulo de reuniões e empréstimos internos para este grupo.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                   <div style={{ padding: '12px 24px', background: G.muted3, borderRadius: 12, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Calendar size={18} color={G.gold} /> Proxima Reunião: N/A
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div style={{ padding: 16, background: "rgba(96,165,250,0.05)", border: `1px solid ${G.blue}20`, borderRadius: 16, display: 'flex', gap: 12 }}>
        <Info size={20} color={G.blue} />
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          <strong>Segurança Mwanga:</strong> O Mwanga apenas regista as movimentações para garantir transparência total. 
          O dinheiro físico ou digital deve continuar a ser gerido pelo Tesoureiro eleito do vosso grupo na "Box" ou conta mobile money dedicada.
        </div>
      </div>
    </div>
  );
}
