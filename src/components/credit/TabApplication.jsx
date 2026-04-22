import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../theme/tokens";
import { CreditEngine } from "../../utils/creditEngine";
import { fmt, fmtShort } from "../../utils/calculations";
import api from "../../utils/api";
import { useToast } from "../Toast";
import { Card, Btn, Badge } from "./CreditUI";

export default function TabApplication({ scoreData, eligData, onSuccess }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [step, setStep] = useState(1); // 1-pre | 2-form | 3-docs | 4-review | 5-submitted
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: 200000,
    months: 12,
    partner: "parceiro_a",
    purpose: "",
    renda_comprovada: "",
    empregador: "",
  });
  
  // File states
  const [docs, setDocs] = useState({ biDocument: null, residenciaDocument: null, rendaDocument: null, selfieDocument: null });
  const docRefs = {
    biDocument: useRef(null),
    residenciaDocument: useRef(null),
    rendaDocument: useRef(null),
    selfieDocument: useRef(null),
  };

  const allDocs = Object.values(docs).every(Boolean);

  const rate = form.partner === "parceiro_a" ? 0.05 : form.partner === "parceiro_b" ? 0.08 : 0.15;
  const parcela = CreditEngine.installment(form.amount, rate, form.months);
  const totalDue = parcela * form.months;

  const PARTNERS = [
    { id: "parceiro_a", name: t('credit.apply.partner_a_name'), rate: "5%/mês", rating: "⭐⭐⭐⭐⭐", tempo: "2–4h" },
    { id: "parceiro_b", name: t('credit.apply.partner_b_name'), rate: "8%/mês", rating: "⭐⭐⭐⭐", tempo: "1–2h" },
    { id: "parceiro_c", name: t('credit.apply.partner_c_name'), rate: "15%/mês", rating: "⭐⭐⭐", tempo: "30min" },
  ];

  const PURPOSES = [
    t('credit.apply.purpose_capital'),
    t('credit.apply.purpose_school'),
    t('credit.apply.purpose_medical'),
    t('credit.apply.purpose_home'),
    t('credit.apply.purpose_equip'),
    t('credit.apply.purpose_other')
  ];

  const handleFileChange = (docKey, e) => {
    const file = e.target.files[0];
    if (file) {
      setDocs(prev => ({ ...prev, [docKey]: file }));
    }
  };

  const submitApplication = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', form.amount);
      formData.append('months', form.months);
      formData.append('partner', form.partner);
      formData.append('purpose', form.purpose);
      
      if (docs.biDocument) formData.append('biDocument', docs.biDocument);
      if (docs.residenciaDocument) formData.append('residenciaDocument', docs.residenciaDocument);
      if (docs.rendaDocument) formData.append('rendaDocument', docs.rendaDocument);
      if (docs.selfieDocument) formData.append('selfieDocument', docs.selfieDocument);

      await api.post('/credit/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setStep(5);
      showToast(t('credit.apply.toast_success'));
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      showToast(t('credit.apply.toast_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!scoreData?.eligible && step !== 5) {
    return (
      <Card style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: G.red, marginBottom: 10 }}>{t('credit.apply.not_avail')}</div>
        <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.7 }}>
          {t('credit.apply.not_avail_desc_1')}{scoreData?.score}/1000{t('credit.apply.not_avail_desc_2')}
        </div>
      </Card>
    );
  }

  const steps = t('credit.apply.steps', { returnObjects: true }) || ["Verificação", "Proposta", "Documentos", "Revisão"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stepper */}
      {step <= 4 && (
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {steps.map((s, i) => {
            const sn = i + 1;
            const done = step > sn;
            const active = step === sn;
            return (
              <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? G.credit : active ? `linear-gradient(135deg,${G.credit},${G.credit2})` : G.muted3,
                    color: done || active ? "#000" : G.muted, fontSize: 12, fontWeight: 900,
                    boxShadow: active ? `0 0 16px ${G.credit}50` : "none",
                    transition: "all 0.3s"
                  }}>{done ? "✓" : sn}</div>
                  <span style={{ fontSize: 10, color: active ? G.credit : done ? G.green : G.muted2, fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>{s}</span>
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: done ? G.credit : G.muted3, marginBottom: 16, transition: "background 0.3s" }} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Step 1 — Pre-qualificação */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card glow={G.credit} style={{ textAlign: "center", padding: "28px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif", marginBottom: 8 }}>{t('credit.apply.pre_title')}</div>
            <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.7, marginBottom: 20 }}>
              {t('credit.apply.pre_desc_1')}
              <strong style={{ color: G.text }}> MT {fmtShort(scoreData.maxAmount)}</strong>.
              {t('credit.apply.pre_desc_2')} <strong style={{ color: G.credit }}>{scoreData.score}/100 — {scoreData.label}</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { l: t('credit.apply.pre_grid_1'), v: `MT ${fmtShort(scoreData.maxAmount)}`, c: G.credit },
                { l: t('credit.apply.pre_grid_2'), v: `MT ${fmtShort(eligData.maxParcela)}`, c: G.gold },
                { l: t('credit.apply.pre_grid_3'), v: `${eligData.comprometimento_atual.toFixed(0)}%`, c: eligData.comprometimento_atual > 30 ? G.warn : G.green },
              ].map((s, i) => (
                <div key={i} style={{ background: G.muted3, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            <Btn variant="green" size="lg" style={{ width: "100%" }} onClick={() => setStep(2)}>
              {t('credit.apply.pre_btn')}
            </Btn>
          </Card>
          <div style={{ fontSize: 12, color: G.muted, textAlign: "center", lineHeight: 1.7 }}>
            {t('credit.apply.pre_disclaimer')}
          </div>
        </div>
      )}

      {/* Step 2 — Formulário */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.apply.details_title')}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Valor */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>{t('credit.apply.req_amount')}</label>
                  <span style={{ fontSize: 18, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif" }}>MT {fmtShort(form.amount)}</span>
                </div>
                <input type="range" min={1000} max={scoreData.maxAmount} step={500} value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))}
                  style={{ width: "100%", accentColor: G.credit }} />
              </div>
              {/* Prazo */}
              <div>
                <label style={{ fontSize: 13, color: G.text, fontWeight: 600, display: "block", marginBottom: 8 }}>{t('credit.apply.req_term')}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 6, 12].map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, months: m }))} style={{
                      flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: form.months === m ? `linear-gradient(135deg,${G.credit},${G.credit2})` : G.muted3,
                      color: form.months === m ? "#000" : G.muted, fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                    }}>{m}m</button>
                  ))}
                </div>
              </div>
              {/* Propósito */}
              <div>
                <label style={{ fontSize: 13, color: G.text, fontWeight: 600, display: "block", marginBottom: 8 }}>{t('credit.apply.req_purpose')}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PURPOSES.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, purpose: p }))} style={{
                      padding: "7px 14px", borderRadius: 99, cursor: "pointer",
                      background: form.purpose === p ? `${G.credit}25` : G.muted3,
                      border: `1px solid ${form.purpose === p ? G.credit : "transparent"}`,
                      color: form.purpose === p ? G.credit : G.muted, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Parceiro */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 14 }}>{t('credit.apply.choose_partner')}</div>
            {PARTNERS.map(p => (
              <div key={p.id} onClick={() => setForm(f => ({ ...f, partner: p.id }))} style={{
                padding: "14px 16px", borderRadius: 14, cursor: "pointer", marginBottom: 10,
                background: form.partner === p.id ? `${G.credit}10` : G.muted3,
                border: `1px solid ${form.partner === p.id ? G.credit : "transparent"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: G.text }}>{p.name}</span>
                  <Badge label={p.rate} color={parseFloat(p.rate) >= 15 ? G.red : parseFloat(p.rate) >= 8 ? G.gold : G.credit} />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 12, color: G.muted }}>{p.rating}</span>
                  <span style={{ fontSize: 12, color: G.muted }}>{t('credit.apply.partner_res_time')} {p.tempo}</span>
                </div>
              </div>
            ))}
          </Card>

          {/* Resumo */}
          <Card style={{ background: `${G.credit}08`, border: `1px solid ${G.credit}25` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: G.muted3, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: G.muted }}>{t('credit.apply.summary_install')}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif" }}>MT {fmt(parcela)}</div>
              </div>
              <div style={{ background: G.muted3, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: G.muted }}>{t('credit.apply.summary_total')}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: G.text, fontFamily: "Sora,sans-serif" }}>MT {fmt(totalDue)}</div>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>{t('credit.apply.btn_back')}</Btn>
            <Btn variant="green" onClick={() => setStep(3)} disabled={!form.purpose} style={{ flex: 2 }}>
              {t('credit.apply.btn_next_docs')}
            </Btn>
          </div>
        </div>
      )}

      {/* Step 3 — Documentos */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.apply.docs_title')}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "biDocument", label: t('credit.apply.doc_bi_label'), desc: t('credit.apply.doc_bi_desc'), icon: "🪪" },
                { key: "residenciaDocument", label: t('credit.apply.doc_res_label'), desc: t('credit.apply.doc_res_desc'), icon: "🏠" },
                { key: "rendaDocument", label: t('credit.apply.doc_rent_label'), desc: t('credit.apply.doc_rent_desc'), icon: "💼" },
                { key: "selfieDocument", label: t('credit.apply.doc_selfie_label'), desc: t('credit.apply.doc_selfie_desc'), icon: "🤳" },
              ].map(doc => (
                <div key={doc.key} onClick={() => docRefs[doc.key].current?.click()} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14,
                  background: docs[doc.key] ? `${G.credit}10` : G.muted3,
                  border: `1px solid ${docs[doc.key] ? G.credit : "transparent"}`,
                  cursor: "pointer", transition: "all 0.2s"
                }}>
                  <input type="file" ref={docRefs[doc.key]} style={{ display: "none" }} accept="image/*,application/pdf" onChange={(e) => handleFileChange(doc.key, e)} />
                  <div style={{ width: 42, height: 42, borderRadius: 13, background: docs[doc.key] ? `${G.credit}20` : G.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {docs[doc.key] ? "✅" : doc.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: docs[doc.key] ? G.credit : G.text }}>{doc.label}</div>
                    <div style={{ fontSize: 12, color: docs[doc.key] ? G.credit : G.muted }}>
                      {docs[doc.key] ? docs[doc.key].name : doc.desc}
                    </div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${docs[doc.key] ? G.credit : G.muted2}`, background: docs[doc.key] ? G.credit : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000" }}>
                    {docs[doc.key] ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(96,165,250,0.08)", border: `1px solid ${G.blue}25`, borderRadius: 12, fontSize: 12, color: G.blue, lineHeight: 1.6 }}>
              {t('credit.apply.docs_crypto')}
            </div>
          </Card>

          {!allDocs && (
            <div style={{ fontSize: 12, color: G.muted, textAlign: "center" }}>
              {t('credit.apply.docs_status', { count: Object.values(docs).filter(Boolean).length })}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>{t('credit.apply.btn_back')}</Btn>
            <Btn variant="green" onClick={() => setStep(4)} disabled={!allDocs} style={{ flex: 2 }}>
              {t('credit.apply.btn_next_review')}
            </Btn>
          </div>
        </div>
      )}

      {/* Step 4 — Revisão final */}
      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ background: `${G.credit}06`, border: `1px solid ${G.credit}22` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.credit, letterSpacing: "0.12em", marginBottom: 18 }}>{t('credit.apply.review_title')}</div>
            {[
              { l: t('credit.apply.rev_amount'), v: `MT ${fmt(form.amount)}` },
              { l: t('credit.apply.rev_term'), v: `${form.months} ${form.months === 1 ? t('credit.simulator.month_single') : t('credit.simulator.months')}` },
              { l: t('credit.apply.rev_rate'), v: `${(rate * 100).toFixed(0)}%` },
              { l: t('credit.apply.rev_install'), v: `MT ${fmt(parcela)}`, strong: true },
              { l: t('credit.apply.rev_total'), v: `MT ${fmt(totalDue)}`, strong: true },
              { l: t('credit.apply.rev_interest'), v: `MT ${fmt(totalDue - form.amount)}`, color: G.red },
              { l: t('credit.apply.rev_cet'), v: `${CreditEngine.cet(form.amount, rate, form.months).toFixed(0)}%` },
              { l: t('credit.apply.rev_purpose'), v: form.purpose },
              { l: t('credit.apply.rev_partner'), v: PARTNERS.find(p => p.id === form.partner)?.name },
              { l: t('credit.apply.rev_docs'), v: "4 / 4 ✓", color: G.green },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${G.border}` }}>
                <span style={{ fontSize: 13, color: G.muted }}>{r.l}</span>
                <span style={{ fontSize: 13, fontWeight: r.strong ? 800 : 600, color: r.color || (r.strong ? G.credit : G.text) }}>{r.v}</span>
              </div>
            ))}
          </Card>

          <Card style={{ background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.2)` }}>
            <div style={{ fontSize: 12, color: G.gold, lineHeight: 1.7 }}>
              {t('credit.apply.rev_disclaimer')}
            </div>
          </Card>

          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" onClick={() => setStep(3)} style={{ flex: 1 }} disabled={isSubmitting}>{t('credit.apply.btn_back')}</Btn>
            <Btn variant="green" size="lg" onClick={submitApplication} style={{ flex: 2 }} disabled={isSubmitting}>
              {isSubmitting ? t('credit.apply.btn_submitting') : t('credit.apply.btn_submit')}
            </Btn>
          </div>
        </div>
      )}

      {/* Step 5 — Submetido */}
      {step === 5 && (
        <Card style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif", marginBottom: 10 }}>
            {t('credit.apply.sub_title')}
          </div>
          <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.8, marginBottom: 24 }}>
            {t('credit.apply.sub_desc_1')} <strong style={{ color: G.text }}>MT {fmt(form.amount)}</strong> {t('credit.apply.sub_desc_2')} <strong style={{ color: G.text }}>{PARTNERS.find(p => p.id === form.partner)?.name}</strong>.
            {t('credit.apply.sub_desc_3')} <strong style={{ color: G.credit }}>{t('credit.apply.sub_desc_4')}</strong>.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            <div style={{ background: G.muted3, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: G.muted }}>{t('credit.apply.sub_ref')}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: G.text }}>MWG-2026-0{Math.floor(Math.random() * 999 + 100)}</div>
            </div>
            <div style={{ background: G.muted3, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: G.muted }}>{t('credit.apply.sub_status')}</div>
              <Badge label={t('credit.apply.sub_status_val')} color={G.gold} />
            </div>
          </div>
          <Btn variant="ghost" style={{ width: "100%" }} onClick={() => setStep(1)}>
            {t('credit.apply.btn_new')}
          </Btn>
        </Card>
      )}
    </div>
  );
}
