import { useTranslation } from "react-i18next";
import { G } from "../../theme/tokens";
import { fmt, fmtShort } from "../../utils/calculations";
import { Card, Badge } from "./CreditUI";

export default function TabStrategy({ scoreData, debts }) {
  const { t } = useTranslation();
  const payoffStrategy = (debts || [])
    .filter(d => (d.restante || d.remaining_amount) > 0)
    .map((d, i) => ({
      nome: d.name || `Dívida ${i + 1}`,
      taxa: d.interestRate || 0,
      restante: d.restante || d.remaining_amount || 0,
      parcela: d.monthly_payment || (d.total / 12) || 0, 
    }))
    .sort((a, b) => b.taxa - a.taxa)
    .map((d, i) => ({
      ...d,
      priority: i + 1,
      reason: i === 0 ? "Taxa mais alta" : "Estratégia Avalanche"
    }));

  if (payoffStrategy.length === 0) {
    payoffStrategy.push({ nome: t('credit.consolidate.no_debts'), taxa: 0, restante: 0, parcela: 0, priority: 1, reason: "Parabéns!" });
  }

  const totalJuros = payoffStrategy.reduce((a, d) => a + (d.restante * (d.taxa / 100 / 12)), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.strategy.avalanche_title')}</div>
        <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.7, marginBottom: 16 }}>
          {t('credit.strategy.avalanche_desc')}
        </div>
        <div style={{ padding: "12px 14px", background: `${G.credit}10`, border: `1px solid ${G.credit}25`, borderRadius: 12, fontSize: 13, color: G.credit, fontWeight: 600, marginBottom: 16 }}>
          {t('credit.strategy.current_interest')} MT {fmt(totalJuros)} {payoffStrategy[0].restante > 0 ? `${t('credit.strategy.eliminated_in')} ${Math.ceil(payoffStrategy[0].restante / payoffStrategy[0].parcela)} ${t('credit.strategy.months')}` : t('credit.strategy.in_progress')}
        </div>
        {payoffStrategy.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: i < payoffStrategy.length - 1 ? `1px solid ${G.border}` : "none" }}>
            <div style={{
              width: 34, height: 34, borderRadius: 11, flexShrink: 0,
              background: i === 0 ? `linear-gradient(135deg,${G.credit},${G.credit2})` : G.muted3,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: i === 0 ? "#000" : G.muted
            }}>#{d.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: G.text }}>{d.nome}</span>
                <Badge label={`${d.taxa}% a.a.`} color={d.taxa >= 20 ? G.red : d.taxa >= 14 ? G.gold : G.green} />
              </div>
              <div style={{ fontSize: 12, color: G.muted, marginBottom: 6 }}>
                {t('credit.strategy.remaining')} MT {fmtShort(d.restante)} · {t('credit.strategy.installment')} MT {fmtShort(d.parcela)}{t('credit.strategy.per_month')}
              </div>
              <div style={{ fontSize: 11, color: G.credit, fontStyle: "italic" }}>✦ {d.reason}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.strategy.risk_map_title')}</div>
        {[
          { zona: t('credit.strategy.risk_green_label'), desc: t('credit.strategy.risk_green_desc'), color: G.credit, icon: "✅", active: scoreData.score >= 70 },
          { zona: t('credit.strategy.risk_yellow_label'), desc: t('credit.strategy.risk_yellow_desc'), color: G.gold, icon: "⚠️", active: scoreData.score >= 55 && scoreData.score < 70 },
          { zona: t('credit.strategy.risk_red_label'), desc: t('credit.strategy.risk_red_desc'), color: G.red, icon: "🚫", active: scoreData.score < 55 },
        ].map((z, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 14, marginBottom: 8, background: z.active ? `${z.color}12` : G.muted3, border: `1px solid ${z.active ? z.color : "transparent"}35` }}>
            <span style={{ fontSize: 20 }}>{z.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: z.active ? z.color : G.muted }}>{z.zona} {z.active ? t('credit.strategy.risk_here') : ""}</div>
              <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{z.desc}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card style={{ background: `${G.blue}05`, border: `1px solid ${G.blue}18` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.blue, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.strategy.improve_title')}</div>
        {[
          { acção: t('credit.strategy.tip_xitique'), impacto: "+15 pts", prazo: t('credit.strategy.term_3_6_months'), icon: "✦" },
          { acção: t('credit.strategy.tip_savings'), impacto: "+10 pts", prazo: t('credit.strategy.term_2_months'), icon: "🏦" },
          { acção: t('credit.strategy.tip_card'), impacto: "+8 pts", prazo: t('credit.strategy.term_6_months'), icon: "💳" },
          { acção: t('credit.strategy.tip_logging'), impacto: "+5 pts", prazo: t('credit.strategy.term_1_month'), icon: "↕" },
        ].map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${G.border}` : "none" }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>{a.acção}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{a.prazo}</div>
            </div>
            <Badge label={a.impacto} color={G.green} />
          </div>
        ))}
      </Card>

      <Card style={{ background: "rgba(96,165,250,0.04)", border: `1px solid ${G.blue}18` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: G.blue, letterSpacing: "0.1em", marginBottom: 10 }}>{t('credit.strategy.reg_title')}</div>
        <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.8 }}>
          {t('credit.strategy.reg_desc')}
        </div>
      </Card>
    </div>
  );
}
