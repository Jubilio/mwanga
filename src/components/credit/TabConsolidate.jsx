import { useState } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../theme/tokens";
import { CreditEngine } from "../../utils/creditEngine";
import { fmt, fmtShort } from "../../utils/calculations";
import { Card, Btn, ProgressBar } from "./CreditUI";

export default function TabConsolidate({ debts, userData }) {
  const { t } = useTranslation();
  const [rate, setRate] = useState(0.261); // BIM Reality
  const [months, setMonths] = useState(24);

  const salary = userData.salario || 0;
  const maxInstallment = salary / 3;

  const activeDebts = (debts || []).filter(d => d.status !== 'paid' && (d.remaining_amount > 0 || d.restante > 0 || d.total_amount > 0));
  const currentTotal = activeDebts.reduce((sum, d) => sum + (d.remaining_amount || d.restante || d.total_amount || 0), 0);
  
  const currentMonthly = activeDebts.reduce((sum, d) => sum + (d.monthly_payment || CreditEngine.installment(d.remaining_amount || d.restante || d.total_amount, 0.20, 3)), 0);

  const isAnnual = rate < 1; 
  const parcela = CreditEngine.installment(currentTotal, rate, months, isAnnual);
  const newInstallment = parcela;
  const isAffordable = salary > 0 ? newInstallment <= maxInstallment : true;
  const savingsMonthly = currentMonthly - newInstallment;
  
  const oldTotalCost = currentMonthly * 4; 
  const newTotalCost = newInstallment * months;
  const savingsTotal = oldTotalCost - newTotalCost;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {activeDebts.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: G.credit, marginBottom: 10 }}>{t('credit.consolidate.no_debts')}</div>
        </Card>
      ) : (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: '0.12em', marginBottom: 16 }}>{t('credit.consolidate.sim_title')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: G.muted3, padding: 16, borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: G.muted, marginBottom: 4 }}>{t('credit.consolidate.current_debt')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: G.red, fontFamily: 'Sora,sans-serif' }}>MT {fmtShort(currentTotal)}</div>
              <div style={{ fontSize: 12, color: G.muted, marginTop: 8 }}>{t('credit.consolidate.current_pay')} <strong style={{ color: G.text }}>MT {fmtShort(currentMonthly)}{t('credit.consolidate.per_month_in')}</strong> {activeDebts.length} {t('credit.consolidate.debts')}</div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.1)', border: `1px solid ${G.credit}30`, padding: 16, borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: G.muted, marginBottom: 4 }}>{t('credit.consolidate.new_pay')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: G.credit, fontFamily: 'Sora,sans-serif' }}>MT {fmtShort(newInstallment)}</div>
              <div style={{ fontSize: 12, color: G.muted, marginTop: 8 }}>{t('credit.consolidate.savings')} <strong style={{ color: G.green }}>MT {fmtShort(savingsMonthly)}{t('credit.consolidate.per_month')}</strong></div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: G.text, fontWeight: 600, display: 'block', marginBottom: 12 }}>{t('credit.consolidate.config_term')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[12, 24, 36, 48, 60].map(m => (
                <button key={m} onClick={() => setMonths(m)} style={{
                  flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: months === m ? `linear-gradient(135deg,${G.credit},${G.credit2})` : G.muted3,
                  color: months === m ? '#000' : G.muted, fontWeight: 700, fontSize: 13,
                }}>{m}m</button>
              ))}
            </div>
          </div>

          <div style={{ padding: 16, background: 'rgba(139,92,246,0.06)', borderRadius: 16, border: `1px solid ${G.purple}20` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.purple, marginBottom: 12 }}>{t('credit.consolidate.benefits_title')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: G.muted }}>{t('credit.consolidate.complexity_reduction')}</span>
                <span style={{ color: G.text, fontWeight: 700 }}>{activeDebts.length} ➔ 1</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: G.muted }}>{t('credit.consolidate.monthly_relief')}</span>
                <span style={{ color: G.green, fontWeight: 700 }}>{((savingsMonthly / currentMonthly) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <Btn variant='green' size='lg' style={{ width: '100%', marginTop: 24 }}>{t('credit.consolidate.apply_btn')}</Btn>
        </Card>
      )}
    </div>
  );
}
