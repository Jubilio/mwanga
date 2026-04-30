import { useState } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../theme/tokens";
import { CreditEngine } from "../../utils/creditEngine";
import { fmt, fmtShort } from "../../utils/calculations";
import { Card, ProgressBar, ProGate, Badge } from "./CreditUI";

export default function TabSimulator({ eligData, userData, isPro }) {
  const { t } = useTranslation();
  const BANKS = [
    { id: "bim", name: "Millennium BIM", rate: 0.28, tag: "28.0% AA", color: G.red, isAnnual: true },
    { id: "bci", name: "BCI", rate: 0.281, tag: "28.1% AA", color: G.blue, isAnnual: true },
    { id: "micro", name: t('credit.simulator.partner_micro', { defaultValue: "Microcrédito Informal" }), rate: 0.10, tag: "10%/mês", color: G.gold, isAnnual: false },
    { id: "xitique", name: "Xitique", rate: 0.00, tag: "0%/mês", color: G.green, isAnnual: false },
  ];

  const [amount, setAmount] = useState(200000);
  const [months, setMonths] = useState(8);
  const [rate, setRate] = useState(BANKS[0].rate);
  const [showTable, setShowTable] = useState(false);

  const salary = userData.salario || 0;
  const maxAllowedInstallment = salary / 3;

  const selectedBank = BANKS.find(b => b.rate === rate) || BANKS[0];
  const isAnnual = selectedBank.isAnnual;

  const parcela = CreditEngine.installment(amount, rate, months, isAnnual);
  const stampDuty = CreditEngine.stampDuty(amount);
  const totalDue = (parcela * months) + stampDuty;
  const totalJuros = totalDue - amount - stampDuty;
  const cet = CreditEngine.cet(amount, rate, months, isAnnual);
  const table = CreditEngine.amortizationTable(amount, isAnnual ? (Math.pow(1 + rate, 1/12) - 1) : rate, months);

  const isAffordable = parcela <= maxAllowedInstallment;
  const suggestedMonths = !isAffordable ? CreditEngine.suggestMinMonths(amount, rate, maxAllowedInstallment, isAnnual) : months;
  const newComprometimento = salary > 0 ? ((userData.dividas_parcelas + parcela) / salary) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Alerta Inteligente se exceder 1/3 */}
      {!isAffordable && salary > 0 && (
        <div style={{ 
          padding: "16px 20px", 
          background: "rgba(239, 68, 68, 0.12)", 
          border: "1px solid rgba(239, 68, 68, 0.3)", 
          borderRadius: 20,
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ fontSize: 24 }}>🛑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: G.red, marginBottom: 2 }}>{t('credit.simulator.alert_exceeded_title')}</div>
            <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5 }}>
              {t('credit.simulator.alert_exceeded_desc_1')} <strong>MT {fmt(parcela)}</strong> {t('credit.simulator.alert_exceeded_desc_2')} (MT {fmt(salary)}){t('credit.simulator.alert_exceeded_desc_3')} <strong>MT {fmt(amount)}</strong>{t('credit.simulator.alert_exceeded_desc_4')} <strong>{suggestedMonths} {t('credit.simulator.months')}</strong> {t('credit.simulator.alert_exceeded_desc_5')}
            </div>
          </div>
          <button 
            onClick={() => setMonths(suggestedMonths)}
            style={{ padding: '8px 16px', background: G.red, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
          >
            {t('credit.simulator.alert_adjust_btn')} {suggestedMonths}m
          </button>
        </div>
      )}

      {/* Alerta Se inatingível (Salário zero) */}
      {!isAffordable && salary <= 0 && (
        <div style={{ padding: "16px 20px", background: "rgba(201, 150, 58, 0.1)", border: `1px solid ${G.gold}30`, borderRadius: 16 }}>
           <div style={{ fontSize: 13, color: G.gold, fontWeight: 700 }}>{t('credit.simulator.alert_tip_title')}</div>
           <div style={{ fontSize: 12, color: G.muted }}>{t('credit.simulator.alert_tip_desc')}</div>
        </div>
      )}

      {/* Inputs */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 18 }}>{t('credit.simulator.config_title')}</div>

        {/* Valor */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>{t('credit.simulator.amount_req')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: G.muted }}>MT</span>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(+e.target.value)}
                style={{ 
                  width: 100, background: G.muted3, border: `1px solid ${G.border}`, 
                  borderRadius: 8, padding: '4px 8px', color: G.credit, fontWeight: 900, fontSize: 14, outline: 'none' 
                }}
              />
            </div>
          </div>
          <input type="range" min={1000} max={3000000} step={1000} value={amount}
            onChange={e => setAmount(+e.target.value)}
            style={{ width: "100%", accentColor: G.credit, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: G.muted2 }}>MT 1,000</span>
            <span style={{ fontSize: 11, color: G.muted2 }}>MT 3,000,000</span>
          </div>
        </div>

        {/* Prazo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>{t('credit.simulator.term')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <input 
                type="number" 
                value={months} 
                onChange={e => setMonths(+e.target.value)}
                style={{ 
                  width: 60, background: G.muted3, border: `1px solid ${G.border}`, 
                  borderRadius: 8, padding: '4px 8px', color: G.gold, fontWeight: 900, fontSize: 14, outline: 'none', textAlign: 'center' 
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: G.gold }}>{months === 1 ? t('credit.simulator.month_single') : t('credit.simulator.months')}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[3, 6, 12, 24, 36, 48, 60].map(m => (
              <button key={m} onClick={() => setMonths(m)} style={{
                flex: "1 0 50px", padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                background: months === m ? `linear-gradient(135deg,${G.credit},${G.credit2})` : G.muted3,
                color: months === m ? "#000" : G.muted, fontWeight: 700, fontSize: 13, fontFamily: "inherit",
              }}>{m}m</button>
            ))}
          </div>
        </div>

        {/* Taxa */}
        <div>
          <div style={{ fontSize: 13, color: G.text, fontWeight: 600, marginBottom: 10 }}>{t('credit.simulator.partner_rate')}</div>
          <ProGate isPro={isPro} title={t('credit.simulator.compare_title')} description={t('credit.simulator.compare_desc')}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {BANKS.map((b, i) => (
                <div key={i} onClick={() => setRate(b.rate)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 14px", borderRadius: 12, cursor: "pointer",
                  background: rate === b.rate ? `${b.color}15` : G.muted3,
                  border: `1px solid ${rate === b.rate ? b.color : "transparent"}`,
                  transition: "all 0.18s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${rate === b.rate ? b.color : G.muted2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {rate === b.rate && <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />}
                    </div>
                    <span style={{ fontSize: 13, color: rate === b.rate ? G.text : G.muted }}>{b.name}</span>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: `${b.color}15`,
                    color: b.color,
                  }}>{b.tag}</span>
                </div>
              ))}
            </div>
          </ProGate>
        </div>
      </Card>

      {/* Resultados */}
      <Card glow={isAffordable ? G.credit : G.red} style={{ background: isAffordable ? "rgba(16,185,129,0.06)" : "rgba(255,76,76,0.05)", border: `1px solid ${isAffordable ? G.credit : G.red}30` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.simulator.result_title')}</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { l: t('credit.simulator.monthly_installment'), v: `MT ${fmt(parcela)}`, c: isAffordable ? G.green : G.red, big: true },
            { l: t('credit.simulator.total_payable'), v: `MT ${fmt(totalDue)}`, c: G.text, big: true },
            { l: t('credit.simulator.total_interest'), v: `MT ${fmt(totalJuros)}`, c: G.red },
            { l: t('credit.simulator.stamp_duty'), v: `MT ${fmt(stampDuty)}`, c: G.muted },
            { l: t('credit.simulator.effective_rate'), v: `${cet.toFixed(1)}%`, c: cet >= 50 ? G.red : G.gold },
            { l: t('credit.simulator.commitment'), v: `${newComprometimento.toFixed(1)}%`, c: newComprometimento > 40 ? G.danger : G.green },
          ].map((r, i) => (
            <div key={i} style={{ background: G.muted3, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 4 }}>{r.l}</div>
              <div style={{ fontSize: r.big ? 18 : 15, fontWeight: 800, color: r.c, fontFamily: "Sora,sans-serif" }}>{r.v}</div>
            </div>
          ))}
        </div>

        {/* Impacto no orçamento */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: G.muted }}>{t('credit.simulator.impact_title')}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: newComprometimento > 40 ? G.red : G.green }}>
              {newComprometimento.toFixed(1)}% {t('credit.simulator.impact_max')}
            </span>
          </div>
          <ProgressBar value={newComprometimento} color={newComprometimento > 40 ? G.red : G.credit} height={10} animated />
        </div>

        {/* Alerta */}
        {rate >= 0.20 && (
          <div style={{ padding: "12px 16px", background: "rgba(255,76,76,0.08)", border: "1px solid rgba(255,76,76,0.25)", borderRadius: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18 }}>📖</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.red, marginBottom: 4 }}>{t('credit.simulator.debt_warning_title')}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                  {t('credit.simulator.debt_warning_desc_1')} {(rate * 100).toFixed(0)}% {t('credit.simulator.debt_warning_desc_2')} MT {fmtShort(amount)}{t('credit.simulator.debt_warning_desc_3')} <strong>MT {fmt(totalJuros)}</strong> {t('credit.simulator.debt_warning_desc_4')}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isAffordable && (
          <div style={{ padding: "10px 14px", background: "rgba(255,76,76,0.1)", border: "1px solid rgba(255,76,76,0.25)", borderRadius: 12, fontSize: 12, color: G.red, marginTop: 10 }}>
            {t('credit.simulator.capacity_block')} MT {fmt(parcela)} {t('credit.simulator.capacity_block_2')} MT {fmt(eligData.maxParcela)}.
          </div>
        )}
      </Card>

      {/* Tabela de amortização */}
      <ProGate isPro={isPro} title={t('credit.simulator.amort_title')} description={t('credit.simulator.amort_desc')}>
        <div>
          <div onClick={() => setShowTable(s => !s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: G.text }}>{t('credit.simulator.amort_table_title')}</span>
            <span style={{ fontSize: 13, color: G.gold }}>{showTable ? t('credit.simulator.amort_hide') : t('credit.simulator.amort_see')}</span>
          </div>
          {showTable && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: G.muted3 }}>
                      {Object.values(t('credit.simulator.amort_headers', { returnObjects: true })).map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: G.muted, fontWeight: 700, letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${G.border}` }}>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: G.muted, fontWeight: 700 }}>{row.n}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: G.text, fontWeight: 600 }}>MT {fmt(row.parcela)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: G.red }}>MT {fmt(row.juros)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: G.green }}>MT {fmt(row.amortizacao)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: row.saldo < 100 ? G.green : G.text }}>MT {fmt(row.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </ProGate>

      {/* Educação Financeira */}
      <Card style={{ background: "rgba(139,92,246,0.06)", border: `1px solid ${G.purple}30` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: G.purple, marginBottom: 4 }}>{t('credit.simulator.edu_label')}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: G.text, marginBottom: 12 }}>{t('credit.simulator.edu_vs')}</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: G.muted, marginBottom: 4 }}>{t('credit.simulator.edu_simple')}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.text }}>MT {fmt(amount + (amount * (isAnnual ? (rate/12) : rate) * months))}</div>
                <div style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>{t('credit.simulator.edu_total1')}</div>
              </div>
              <div style={{ background: "rgba(139,92,246,0.1)", padding: 12, borderRadius: 12, border: `1px solid ${G.purple}20` }}>
                <div style={{ fontSize: 11, color: G.muted, marginBottom: 4 }}>{t('credit.simulator.edu_compound')}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.purple }}>MT {fmt(totalDue)}</div>
                <div style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>{t('credit.simulator.edu_total2')}</div>
              </div>
            </div>
            
            <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.6, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 10 }}>
              {t('credit.simulator.edu_tip')}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
