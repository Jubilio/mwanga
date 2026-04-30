import { useState } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../theme/tokens";
import { CreditEngine } from "../../utils/creditEngine";
import { fmt, fmtShort } from "../../utils/calculations";
import { Card, Badge } from "./CreditUI";

export default function TabCompare({ userData }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(200000);
  const [months, setMonths] = useState(12);

  const salary = userData.salario || 0;
  const maxInstallment = salary / 3;

  const OPTIONS = [
    { id: 'bim', name: 'Millennium BIM', rate: 0.28, color: G.red, desc: t('credit.compare.partner_bim_desc'), isAnnual: true },
    { id: 'bci', name: 'BCI', rate: 0.281, color: G.blue, desc: t('credit.compare.partner_bci_desc'), isAnnual: true },
    { id: 'micro', name: t('credit.simulator.partner_micro'), rate: 0.10, color: G.gold, desc: t('credit.compare.partner_micro_desc'), isAnnual: false },
    { id: 'xitique', name: 'Xitique', rate: 0, color: G.green, desc: t('credit.compare.partner_xitique_desc'), isAnnual: false }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 13, color: G.text, fontWeight: 600, display: 'block', marginBottom: 8 }}>{t('credit.compare.target_value')}</label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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
                <span style={{ fontSize: 11, color: G.muted }}>{fmtShort(amount)}</span>
            </div>
            <input type='range' min={1000} max={3000000} step={1000} value={amount}
              onChange={e => setAmount(+e.target.value)}
              style={{ width: '100%', accentColor: G.credit, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 13, color: G.text, fontWeight: 600, display: 'block', marginBottom: 8 }}>{t('credit.compare.term')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[3, 6, 12, 24, 36].map(m => (
                <button key={m} onClick={() => setMonths(m)} style={{
                  flex: "1 0 40px", padding: '9px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: months === m ? `linear-gradient(135deg,${G.credit},${G.credit2})` : G.muted3,
                  color: months === m ? '#000' : G.muted, fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                }}>{m}m</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {OPTIONS.map(opt => {
            const isAnnual = opt.isAnnual;
            const parcela = CreditEngine.installment(amount, opt.rate, months, isAnnual);
            const isAffordable = salary > 0 ? parcela <= maxInstallment : true;
            const stampDuty = isAnnual ? CreditEngine.stampDuty(amount) : 0;
            const total = (parcela * months) + stampDuty;
            const juros = total - amount - stampDuty;
            
            return (
              <div key={opt.id} style={{ padding: 16, borderRadius: 16, border: `1px solid ${opt.color}40`, background: `${opt.color}08` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: opt.color }}>{opt.name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={isAnnual ? `${(opt.rate * 100).toFixed(1)}% AA` : `${(opt.rate * 100).toFixed(0)}%/mês`} color={opt.color} />
                    {!isAffordable && <span style={{ fontSize: 9, fontWeight: 900, color: G.red, textTransform: 'uppercase' }}>{t('credit.compare.exceeds')}</span>}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: G.muted }}>{t('credit.compare.cost_month')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: G.text, fontFamily: 'Sora,sans-serif' }}>MT {fmt(parcela)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${opt.color}20`, paddingTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: G.muted }}>{t('credit.compare.total_pay')}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: G.text }}>MT {fmtShort(total)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: G.muted }}>{t('credit.compare.interest_only')}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: opt.rate > 0 ? G.red : G.green }}>MT {fmtShort(juros)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: `1px solid ${G.credit}30` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.credit, marginBottom: 4 }}>{t('credit.compare.verdict_title')}</div>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.6 }}>
                {t('credit.compare.verdict_desc_1')} <strong>MT {fmtShort(amount)}</strong> {t('credit.compare.verdict_desc_2')} <strong>{months} {months === 1 ? t('credit.simulator.month_single') : t('credit.simulator.months')}</strong>{t('credit.compare.verdict_desc_3')} <strong style={{color:G.red}}>Millennium BIM</strong> {t('credit.compare.verdict_desc_4')} <strong>MT {fmtShort((CreditEngine.installment(amount, 0.10, months, false) * months) - (CreditEngine.installment(amount, 0.28, months, true) * months))}</strong> {t('credit.compare.verdict_desc_5')}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
