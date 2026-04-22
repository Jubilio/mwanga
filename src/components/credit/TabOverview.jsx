import { useTranslation } from "react-i18next";
import { G } from "../../theme/tokens";
import { fmtShort } from "../../utils/calculations";
import { Card, ScoreRing, Badge, ProgressBar, ProGate, Btn } from "./CreditUI";

export default function TabOverview({ onApply, scoreData, eligData, hist, isPro }) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Score + Elegibilidade hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Score */}
        <Card glow={scoreData.color} style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: "0.12em", marginBottom: 14 }}>{t('credit.overview.score_title')}</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <ScoreRing score={scoreData.score} color={scoreData.color} size={90} />
          </div>
          <Badge label={scoreData.label} color={scoreData.color} />
          <div style={{ fontSize: 11, color: G.muted, marginTop: 10 }}>
            {scoreData.eligible ? `${t('credit.overview.eligible')} MT ${fmtShort(scoreData.maxAmount)}` : t('credit.overview.not_eligible')}
          </div>
        </Card>

        {/* Elegibilidade */}
        <Card style={{ padding: "20px 18px" }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: "0.12em", marginBottom: 14 }}>{t('credit.overview.capacity_title')}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: G.muted }}>{t('credit.overview.current_commitment')}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: eligData.comprometimento_atual > 35 ? G.red : G.green }}>
                  {eligData.comprometimento_atual.toFixed(1)}%
                </span>
              </div>
              <ProgressBar value={eligData.comprometimento_atual} color={eligData.comprometimento_atual > 35 ? G.red : G.green} animated />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: G.muted }}>{t('credit.overview.available_margin')}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: G.gold }}>{eligData.margem.toFixed(1)}%</span>
              </div>
              <ProgressBar value={eligData.margem} color={G.gold} animated />
            </div>
            <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 4 }}>{t('credit.overview.max_safe_installment')}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif" }}>
                MT {fmtShort(eligData.maxParcela)}
              </div>
              <div style={{ fontSize: 11, color: G.muted }}>{t('credit.overview.per_month')}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Score factors */}
      <ProGate isPro={isPro} title={t('credit.overview.factors_detail_title')} description={t('credit.overview.factors_detail_desc')}>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.overview.score_factors')}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {scoreData.factors.map((f, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{f.icon}</span>
                    <span style={{ fontSize: 13, color: G.text }}>{f.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: f.pts >= f.max * 0.7 ? G.green : f.pts >= f.max * 0.4 ? G.gold : G.red }}>
                    {f.pts}/{f.max}
                  </span>
                </div>
                <ProgressBar value={(f.pts / f.max) * 100} color={f.pts >= f.max * 0.7 ? G.credit : f.pts >= f.max * 0.4 ? G.gold : G.red} animated />
              </div>
            ))}
          </div>
        </Card>
      </ProGate>

      {/* Aviso transparência */}
      <Card style={{ background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.22)` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, marginBottom: 6 }}>{t('credit.overview.transparency_title')}</div>
            <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.7 }}>
              {t('credit.overview.transparency_desc')}
            </div>
          </div>
        </div>
      </Card>

      {/* Histórico */}
      {hist.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, letterSpacing: "0.12em" }}>{t('credit.overview.history_title')}</div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {hist.map((l, i) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < hist.length - 1 ? `1px solid ${G.border}` : "none" }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: `${G.credit}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💸</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: G.text }}>MT {fmtShort(l.valor)} · {l.meses} {t('credit.overview.history_months')}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{l.data} · {t('credit.overview.history_rate')} {(l.taxa * 100).toFixed(0)}%/mês · {t('credit.overview.history_installment')} MT {fmtShort(l.parcela)}</div>
                </div>
                <Badge label={l.status === "paid" ? t('credit.overview.history_paid') : t('credit.overview.history_ongoing')} color={l.status === "paid" ? G.green : G.gold} />
              </div>
            ))}
          </Card>
        </>
      )}

      {/* CTA */}
      {scoreData.eligible ? (
        <Btn variant="green" size="lg" onClick={onApply} style={{ width: "100%" }}>
          {t('credit.overview.cta_apply')}
        </Btn>
      ) : (
        <Card style={{ background: "rgba(255,76,76,0.06)", border: `1px solid rgba(255,76,76,0.2)`, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: G.red, marginBottom: 8 }}>{t('credit.overview.insufficient_score')}</div>
          <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.7 }}>
            {t('credit.overview.insufficient_desc')}
          </div>
        </Card>
      )}
    </div>
  );
}
