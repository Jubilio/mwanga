import { useState } from "react";
import { useFinance } from "../hooks/useFinance";
import VslaModule from "../components/credit/VslaModule";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { G } from "../theme/tokens";

// Components
import { Badge, ProGate } from "../components/credit/CreditUI";
import TabOverview from "../components/credit/TabOverview";
import TabSimulator from "../components/credit/TabSimulator";
import TabCompare from "../components/credit/TabCompare";
import TabConsolidate from "../components/credit/TabConsolidate";
import TabApplication from "../components/credit/TabApplication";
import TabStrategy from "../components/credit/TabStrategy";

export default function MwangaCredito() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const [tab, setTab] = useState("overview");

  // State derived calculations
  const salario = state.settings.user_salary || 0;
  const dividas_parcelas = state.dividas?.reduce((acc, curr) => acc + (curr.monthly_payment || 0), 0) || 0;
  const comprometimento_atual = salario > 0 ? (dividas_parcelas / salario) * 100 : 0;
  const margem = Math.max(0, 40 - comprometimento_atual);
  const maxParcela = (salario * margem) / 100;

  const userData = {
    salario,
    dividas_parcelas
  };

  const score = state.user?.credit_score || 0;
  const scoreData = {
    score,
    label: score >= 700 ? t('dashboard.health.excellent') : score >= 500 ? t('dashboard.health.moderate') : t('dashboard.health.attention'),
    color: score >= 700 ? G.green : score >= 500 ? G.gold : G.red,
    eligible: score >= 500,
    maxAmount: score >= 700 ? 50000 : score >= 500 ? 15000 : 0,
    factors: [
      { name: t('credit.overview.integrated_score'), pts: score, max: 1000, icon: "✦" },
      { name: t('credit.overview.capacity_factor'), pts: Math.min(400, Math.round(margem * 10)), max: 400, icon: "🏦" },
      { name: t('credit.overview.burden_factor'), pts: Math.max(0, Math.round(300 - comprometimento_atual * 3)), max: 300, icon: "⚖️" },
    ]
  };

  const eligData = {
    comprometimento_atual,
    margem,
    maxParcela,
    ok: scoreData.eligible && margem > 5
  };

  const hist = state.loans || [];
  const isPro = state.settings?.plan === 'pro';

  const TABS = [
    { id: "overview",  label: t('credit.tabs.overview'),  icon: "◎" },
    { id: "vsla",      label: t('credit.tabs.community'),   icon: "🤝" },
    { id: "simulator", label: t('credit.tabs.simulator'),    icon: "🧭" },
    { id: "compare",   label: t('credit.tabs.compare'),     icon: "⚖️" },
    { id: "consolidate", label: t('credit.tabs.consolidate'), icon: "🔄" },
    { id: "apply",     label: t('credit.tabs.apply'),    icon: "💸" },
    { id: "strategy",  label: t('credit.tabs.strategy'),  icon: "👑" },
  ];

  function handleApply() { setTab("apply"); }

  return (
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif", color: G.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Sora:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 99px; background: rgba(255,255,255,0.1); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #10B981; cursor: pointer; box-shadow: 0 0 8px #10B98180; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        button:active { transform: scale(0.97); }
        input,button,select,textarea { font-family: inherit; }
      `}</style>

      {/* Header */}
      <div style={{ background: G.bg2, borderBottom: `1px solid ${G.border}`, padding: "20px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${G.credit},${G.credit2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 4px 16px ${G.credit}40` }}>💸</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "Sora,sans-serif", color: G.text, letterSpacing: "-0.01em" }}>
                  Mwanga <span style={{ color: G.credit }}>Credit</span>
                </div>
                <div style={{ fontSize: 12, color: G.muted, display: "flex", alignItems: "center", gap: 8 }}>
                  {t('credit.header.subtitle')}
                  <button 
                    onClick={() => window.location.reload()}
                    title={t('credit.header.refresh_title')}
                    style={{ 
                      background: "transparent", border: "none", cursor: "pointer", 
                      padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
                      color: G.muted, transition: "all 0.2s ease",
                      opacity: 0.6
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = G.gold; e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={e => { e.currentTarget.style.color = G.muted; e.currentTarget.style.opacity = 0.6; }}
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: G.muted }}>{t('credit.header.score_label')}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: scoreData.color, fontFamily: "Sora,sans-serif" }}>{scoreData.score}</span>
                <Badge label={scoreData.label} color={scoreData.color} />
              </div>
              <div style={{ marginTop: 6 }}>
                {isPro
                  ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${G.gold}20`, color: G.gold, border: `1px solid ${G.gold}40` }}>👑 PRO</span>
                  : <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${G.muted2}40`, color: G.muted, border: `1px solid ${G.muted2}` }}>BASIC</span>
                }
              </div>
            </div>
          </div>
          {/* Tab nav */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 5, overflowX: "auto", scrollbarWidth: "none" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: "1 0 auto", padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                background: tab === t.id ? `linear-gradient(135deg,${G.credit},${G.credit2})` : "transparent",
                color: tab === t.id ? "#000" : G.muted,
                fontWeight: 700, fontSize: 12, fontFamily: "inherit", transition: "all 0.18s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap"
              }}>
                <span>{t.icon}</span> <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 100px", animation: "fadeIn 0.3s ease" }} key={tab}>
        {tab === "overview"  && <TabOverview   onApply={handleApply} scoreData={scoreData} eligData={eligData} hist={hist} isPro={isPro} />}
        {tab === "vsla"      && <VslaModule />}
        {tab === "simulator" && <TabSimulator  eligData={eligData} userData={userData} isPro={isPro} />}
        {tab === "compare"   && <TabCompare    userData={userData} />}
        {tab === "consolidate" && <TabConsolidate debts={state.dividas} userData={userData} />}
        {tab === "apply"     && <TabApplication scoreData={scoreData} eligData={eligData} />}
        {tab === "strategy"  && (
          <ProGate isPro={isPro} title={t('credit.strategy.strategy_title')} description={t('credit.strategy.strategy_desc')}>
            <TabStrategy scoreData={scoreData} debts={state.dividas} />
          </ProGate>
        )}
      </div>
    </div>
  );
}
