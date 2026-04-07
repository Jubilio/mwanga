import { useState, useRef } from "react";
import { useFinance } from "../hooks/useFinance";
import api from "../utils/api";
import { useToast } from "../components/Toast";
import VslaModule from "../components/credit/VslaModule";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";



/* ═══════════════════════════════════════
   DESIGN TOKENS — Mwanga Midnight Gold
═══════════════════════════════════════ */
const G = {
  bg: "var(--color-midnight)", bg2: "var(--color-midnight-light)", bg3: "#101620",
  card: "rgba(255,255,255,0.04)", cardHov: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.07)", borderS: "rgba(255,255,255,0.13)",
  gold: "var(--color-gold)", gold2: "var(--color-gold-light)", goldGlow: "rgba(245,158,11,0.28)",
  text: "#e8f0fe", muted: "#6b7fa3", muted2: "#3a4a62", muted3: "#1a2535",
  green: "var(--color-leaf)", red: "var(--color-coral)", blue: "var(--color-ocean)", purple: "#8B5CF6",
  credit: "var(--color-leaf)",   // verde esmeralda — cor do módulo crédito
  credit2: "#059669",
  warn: "var(--color-gold)",
  danger: "var(--color-coral)",
};

/* ═══════════════════════════════════════
   MOTOR FINANCEIRO
═══════════════════════════════════════ */
const FinancialEngine = {
  // Juros compostos: M = P(1+i)^n
  compound(principal, rateMonthly, months) {
    return principal * Math.pow(1 + rateMonthly, months);
  },
  // Parcela Price (anuidade)
  installment(principal, rate, months, isAnnual = false) {
    let i = isAnnual ? (Math.pow(1 + rate, 1/12) - 1) : rate;
    if (i === 0) return principal / months;
    const pow = Math.pow(1 + i, months);
    return (principal * i * pow) / (pow - 1);
  },
  // Imposto de Selo (Moz) - Aprox 0.5% do capital
  stampDuty(principal) {
    return principal * 0.005;
  },
  // Tabela de amortização completa
  amortizationTable(principal, rateMonthly, months) {
    const i = rateMonthly;
    const parc = this.installment(principal, i, months, false);
    let saldo = principal;
    const rows = [];
    for (let current = 1; current <= months; current++) {
      const juros = saldo * i;
      const amort = parc - juros;
      saldo -= amort;
      rows.push({
        n: current,
        parcela: parc,
        juros,
        amortizacao: amort,
        saldo: Math.max(0, saldo),
      });
    }
    return rows;
  },
  // CET aproximado (anualizado)
  cet(amount, rate, months, isAnnual = false) {
    const rateAnnual = isAnnual ? rate : (Math.pow(1 + rate, 12) - 1);
    return rateAnnual * 100;
  },
  // Encontrar n tal que a parcela P <= maxInstallment
  suggestMinMonths(amount, rate, maxInstallment, isAnnual = false) {
    if (maxInstallment <= 0) return 60;
    const i = isAnnual ? (Math.pow(1 + rate, 1/12) - 1) : rate;
    if (i <= 0) return Math.ceil(amount / maxInstallment);
    const check = (amount * i) / maxInstallment;
    if (check >= 1) return 120; // Inatingível com este salário
    const n = Math.log(1 - check) / -Math.log(1 + i);
    return Math.ceil(n);
  }
};

/* ═══════════════════════════════════════
   MOCK DATA — utilizador actual
═══════════════════════════════════════ */
// We will compute USER dynamically in the component
// const USER = { ... }

// Dummy LOAN_HISTORY until we have an actual API endpoint for loans
const LOAN_HISTORY = [];

const ACTIVE_APPLICATION = null; // null = sem aplicação activa

/* ═══════════════════════════════════════
   COMPONENTES BASE
═══════════════════════════════════════ */
function Card({ children, style = {}, onClick, glow }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => onClick && setH(true)}
      onMouseLeave={() => onClick && setH(false)}
      style={{
        background: h ? G.cardHov : G.card,
        border: `1px solid ${glow ? `${glow}35` : G.border}`,
        borderRadius: 20, padding: 20,
        backdropFilter: "blur(16px)",
        boxShadow: glow ? `0 0 24px ${glow}18` : "none",
        transition: "all 0.2s",
        cursor: onClick ? "pointer" : "default",
        ...style
      }}>{children}</div>
  );
}

function Btn({ children, onClick, variant = "gold", size = "md", disabled, style = {} }) {
  const bg = {
    gold: `linear-gradient(135deg,${G.gold},${G.gold2})`,
    green: `linear-gradient(135deg,${G.credit},${G.credit2})`,
    ghost: "transparent",
    danger: `linear-gradient(135deg,${G.danger},#b91c1c)`,
  }[variant];
  const clr = variant === "ghost" ? G.muted : "#000";
  const border = variant === "ghost" ? `1px solid ${G.border}` : "none";
  const pad = { sm: "8px 16px", md: "12px 24px", lg: "16px 32px" }[size];
  const fs = { sm: 12, md: 14, lg: 16 }[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? G.muted3 : bg,
      border: disabled ? `1px solid ${G.border}` : border,
      borderRadius: 13, padding: pad, color: disabled ? G.muted : clr,
      fontWeight: 700, fontSize: fs, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit",
      boxShadow: disabled ? "none" : variant !== "ghost" ? `0 4px 18px ${G.goldGlow}` : "none",
      transition: "all 0.18s", ...style
    }}>{children}</button>
  );
}

function ProgressBar({ value, color, height = 7, animated }) {
  return (
    <div style={{ height, background: G.muted3, borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, borderRadius: 99,
        boxShadow: `0 0 10px ${color}50`,
        transition: animated ? "width 1.4s cubic-bezier(0.4,0,0.2,1)" : "none",
      }} />
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

function ScoreRing({ score, color, size = 80 }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={G.muted3} strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ fill: color, fontSize: size * 0.24, fontWeight: 900, fontFamily: "Sora,sans-serif", transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}>
        {score}
      </text>
    </svg>
  );
}

function Divider() {
  return <div style={{ height: 1, background: G.border, margin: "4px 0" }} />;
}

function fmt(n) { return Math.abs(n).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtShort(n) { return Math.abs(n).toLocaleString("pt-MZ", { maximumFractionDigits: 0 }); }

/* ═══════════════════════════════════════
   PRO GATE — Protect premium features
/* ═══════════════════════════════════════ */
function ProGate({ children, isPro, title, description }) {
  const { t } = useTranslation();
  if (isPro) return children;
  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden" }}>
      {/* Blurred preview */}
      <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none", opacity: 0.45 }}>
        {children}
      </div>
      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, padding: 24,
        background: "rgba(7,9,15,0.72)", backdropFilter: "blur(2px)",
        borderRadius: 20, border: `1px solid ${G.gold}40`,
      }}>
        <div style={{ fontSize: 36 }}>👑</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: G.gold, fontFamily: "Sora,sans-serif", textAlign: "center" }}>
          {title || t('credit.pro_gate.title')}
        </div>
        <div style={{ fontSize: 13, color: G.muted, textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>
          {description || t('credit.pro_gate.desc')}
        </div>
        <a href="/pricing" style={{
          marginTop: 4, padding: "11px 28px", borderRadius: 12,
          background: `linear-gradient(135deg,${G.gold},${G.gold2})`,
          color: "#000", fontWeight: 700, fontSize: 14, textDecoration: "none",
          boxShadow: `0 4px 18px ${G.goldGlow}`,
        }}>{t('credit.pro_gate.btn')}</a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: VISÃO GERAL
═══════════════════════════════════════ */
function TabOverview({ onApply, scoreData, eligData, hist, isPro }) {
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

/* ═══════════════════════════════════════
   TAB: SIMULADOR
═══════════════════════════════════════ */
function TabSimulator({ eligData, userData, isPro }) {
  const { t } = useTranslation();
  const BANKS = [
    { id: "bim", name: "Millennium BIM", rate: 0.261, tag: "26.1% AA", color: G.red, isAnnual: true },
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

  const parcela = FinancialEngine.installment(amount, rate, months, isAnnual);
  const stampDuty = FinancialEngine.stampDuty(amount);
  const totalDue = (parcela * months) + stampDuty;
  const totalJuros = totalDue - amount - stampDuty;
  const cet = FinancialEngine.cet(amount, rate, months, isAnnual);
  const table = FinancialEngine.amortizationTable(amount, isAnnual ? (Math.pow(1 + rate, 1/12) - 1) : rate, months);

  const isAffordable = parcela <= maxAllowedInstallment;
  const suggestedMonths = !isAffordable ? FinancialEngine.suggestMinMonths(amount, rate, maxAllowedInstallment, isAnnual) : months;
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

/* ═══════════════════════════════════════
   TAB: COMPARADOR (BIM vs BCI vs Xitique)
═══════════════════════════════════════ */
function TabCompare({ userData }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(200000);
  const [months, setMonths] = useState(12);

  const salary = userData.salario || 0;
  const maxInstallment = salary / 3;

  const OPTIONS = [
    { id: 'bim', name: 'Millennium BIM', rate: 0.261, color: G.red, desc: t('credit.compare.partner_bim_desc'), isAnnual: true },
    { id: 'bci', name: 'BCI', rate: 0.281, color: G.blue, desc: t('credit.compare.partner_bci_desc'), isAnnual: true },
    { id: 'micro', name: t('credit.simulator.partner_micro'), rate: 0.10, color: G.gold, desc: t('credit.compare.partner_micro_desc'), isAnnual: false },
    { id: 'xitique', name: 'Xitique', rate: 0, color: G.green, desc: t('credit.compare.partner_xitique_desc'), isAnnual: false }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Inputs globais do comparador */}
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

        {/* Display dos cartões lado a lado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {OPTIONS.map(opt => {
            const isAnnual = opt.isAnnual;
            const parcela = FinancialEngine.installment(amount, opt.rate, months, isAnnual);
            const isAffordable = salary > 0 ? parcela <= maxInstallment : true;
            const stampDuty = isAnnual ? FinancialEngine.stampDuty(amount) : 0;
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

        {/* Biblical / Intelligence Veredict */}
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: `1px solid ${G.credit}30` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.credit, marginBottom: 4 }}>{t('credit.compare.verdict_title')}</div>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.6 }}>
                {t('credit.compare.verdict_desc_1')} <strong>MT {fmtShort(amount)}</strong> {t('credit.compare.verdict_desc_2')} <strong>{months} {months === 1 ? t('credit.simulator.month_single') : t('credit.simulator.months')}</strong>{t('credit.compare.verdict_desc_3')} <strong style={{color:G.red}}>Millennium BIM</strong> {t('credit.compare.verdict_desc_4')} <strong>MT {fmtShort((FinancialEngine.installment(amount, 0.10, months, false) * months) - (FinancialEngine.installment(amount, 0.261, months, true) * months))}</strong> {t('credit.compare.verdict_desc_5')}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: CONSOLIDAÇÃO DE DÍVIDAS
═══════════════════════════════════════ */
function TabConsolidate({ debts, userData }) {
  const { t } = useTranslation();
  const [rate, setRate] = useState(0.261); // BIM Reality
  const [months, setMonths] = useState(24);

  const salary = userData.salario || 0;
  const maxInstallment = salary / 3;

  const activeDebts = (debts || []).filter(d => d.status !== 'paid' && (d.remaining_amount > 0 || d.restante > 0 || d.total_amount > 0));
  const currentTotal = activeDebts.reduce((sum, d) => sum + (d.remaining_amount || d.restante || d.total_amount || 0), 0);
  
  const currentMonthly = activeDebts.reduce((sum, d) => sum + (d.monthly_payment || FinancialEngine.installment(d.remaining_amount || d.restante || d.total_amount, 0.20, 3)), 0);

  const isAnnual = rate < 1; // Real banks use annual, micro uses 0.10+
  const parcela = FinancialEngine.installment(currentTotal, rate, months, isAnnual);
  const newInstallment = parcela;
  const isAffordable = salary > 0 ? newInstallment <= maxInstallment : true;
  const savingsMonthly = currentMonthly - newInstallment;
  
  // Assumimos que a dívida antiga demorava mais X meses (vamos estimar 4 meses de média ponderada rápida)
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
            <div style={{ background: `linear-gradient(135deg,${G.credit}20,${G.credit2}10)`, padding: 16, borderRadius: 16, border: `1px solid ${G.credit}30` }}>
              <div style={{ fontSize: 12, color: G.credit, marginBottom: 4 }}>{t('credit.consolidate.new_install')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: G.credit, fontFamily: 'Sora,sans-serif' }}>MT {fmtShort(newInstallment)}</div>
              <div style={{ fontSize: 12, color: G.credit, marginTop: 8, opacity: 0.8 }}>{t('credit.consolidate.single_bank')} {months} {t('credit.simulator.months')}.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: G.text, marginBottom: 8, display: 'block' }}>{t('credit.consolidate.bank_select')}</label>
              <select style={{ width: '100%', padding: 12, borderRadius: 10, background: G.bg2, border: `1px solid ${G.border}`, color: G.text, outline: 'none' }}
                value={rate} onChange={e => setRate(parseFloat(e.target.value))}>
                <option value={0.261}>Millennium BIM (26.1% AA)</option>
                <option value={0.281}>BCI (28.1% AA)</option>
                <option value={0.10}>{t('credit.simulator.partner_micro')} (10%/mês)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: G.text, marginBottom: 8, display: 'block' }}>{t('credit.consolidate.term_select')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ flex: 1, padding: 12, borderRadius: 10, background: G.bg2, border: `1px solid ${G.border}`, color: G.text, outline: 'none' }}
                  value={months} onChange={e => setMonths(parseInt(e.target.value))}>
                  <option value={6}>6 {t('credit.simulator.months')}</option>
                  <option value={12}>12 {t('credit.simulator.months')}</option>
                  <option value={24}>24 {t('credit.simulator.months')}</option>
                  <option value={36}>36 {t('credit.simulator.months')}</option>
                  <option value={48}>48 {t('credit.simulator.months')}</option>
                </select>
                <input 
                  type="number" 
                  value={months} 
                  onChange={e => setMonths(+e.target.value)}
                  style={{ 
                    width: 65, background: G.bg2, border: `1px solid ${G.border}`, 
                    borderRadius: 10, padding: '0 8px', color: G.gold, fontWeight: 800, fontSize: 14, outline: 'none', textAlign: 'center' 
                  }}
                />
              </div>
            </div>
          </div>
          
          <div style={{ padding: 16, borderRadius: 12, background: isAffordable && savingsMonthly > 0 ? `${G.credit}15` : `${G.gold}15`, border: `1px solid ${isAffordable && savingsMonthly > 0 ? G.credit : G.gold}30` }}>
             {isAffordable && savingsMonthly > 0 && savingsTotal > 0 ? (
               <div>
                 <div style={{ fontSize: 14, fontWeight: 700, color: G.credit, marginBottom: 8 }}>{t('credit.consolidate.worth_it')}</div>
                 <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.5 }}>{t('credit.consolidate.worth_desc_1')} <strong>MT {fmtShort(savingsMonthly)}/mês</strong> {t('credit.consolidate.worth_desc_2')} <strong>MT {fmtShort(savingsTotal)}</strong> {t('credit.consolidate.worth_desc_3')}</div>
               </div>
             ) : !isAffordable && savingsMonthly > 0 ? (
               <div>
                 <div style={{ fontSize: 14, fontWeight: 700, color: G.gold, marginBottom: 8 }}>{t('credit.consolidate.worth_it')}</div>
                 <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.5 }}>{t('credit.consolidate.alert_desc_1')} <strong>MT {fmt(newInstallment)}</strong> {t('credit.consolidate.alert_desc_2')} (MT {fmt(maxInstallment)}){t('credit.consolidate.alert_desc_3')}</div>
               </div>
             ) : (
               <div>
                 <div style={{ fontSize: 14, fontWeight: 700, color: G.red, marginBottom: 8 }}>{t('credit.consolidate.not_worth')}</div>
                 <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.5 }}>{t('credit.consolidate.not_worth_desc')}</div>
               </div>
             )}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: APLICAÇÃO / FORMULÁRIO
═══════════════════════════════════════ */
function TabApplication({ scoreData, eligData, onSuccess }) {
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
  const parcela = FinancialEngine.installment(form.amount, rate, form.months);
  const totalDue = parcela * form.months;

  const PARTNERS = [
    { id: "parceiro_a", name: t('credit.apply.partner_a_name'), rate: "5%/mês", rating: "⭐⭐⭐⭐⭐", tempo: "2–4h" },
    { id: "parceiro_b", name: t('credit.apply.partner_b_name'), rate: "8%/mês", rating: "⭐⭐⭐⭐", tempo: "1–2h" },
    { id: "parceiro_c", name: t('credit.apply.partner_c_name'), rate: "15%/mês", rating: "⭐⭐⭐", tempo: "30min" },
  ];

  const PURPOSES = [
    t('credit.apply.purpose_capital', { defaultValue: "Capital de giro" }),
    t('credit.apply.purpose_school', { defaultValue: "Material escolar" }),
    t('credit.apply.purpose_medical', { defaultValue: "Despesas médicas" }),
    t('credit.apply.purpose_home', { defaultValue: "Reforma da casa" }),
    t('credit.apply.purpose_equip', { defaultValue: "Equipamento" }),
    t('credit.apply.purpose_other', { defaultValue: "Outro" })
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
            <div style={{ fontSize: 18, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif", marginBottom: 8 }}>Pré-qualificado!</div>
            <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.7, marginBottom: 20 }}>
              Com base no teu perfil financeiro, o Mwanga pré-aprovou-te para um crédito de até
              <strong style={{ color: G.text }}> MT {fmtShort(scoreData.maxAmount)}</strong>.
              Score: <strong style={{ color: G.credit }}>{scoreData.score}/100 — {scoreData.label}</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { l: "Máximo aprovado", v: `MT ${fmtShort(scoreData.maxAmount)}`, c: G.credit },
                { l: "Parcela máxima", v: `MT ${fmtShort(eligData.maxParcela)}`, c: G.gold },
                { l: "Comprometimento actual", v: `${eligData.comprometimento_atual.toFixed(0)}%`, c: eligData.comprometimento_atual > 30 ? G.warn : G.green },
              ].map((s, i) => (
                <div key={i} style={{ background: G.muted3, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            <Btn variant="green" size="lg" style={{ width: "100%" }} onClick={() => setStep(2)}>
              Continuar com a Solicitação →
            </Btn>
          </Card>
          <div style={{ fontSize: 12, color: G.muted, textAlign: "center", lineHeight: 1.7 }}>
            A pré-qualificação não é garantia de aprovação final. O parceiro financiador tomará a decisão definitiva após análise dos documentos.
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
                { key: "biDocument", label: "Bilhete de Identidade (BI)", desc: "Frente e verso, foto nítida", icon: "🪪" },
                { key: "residenciaDocument", label: "Comprovativo de Residência", desc: "Conta de electricidade ou água", icon: "🏠" },
                { key: "rendaDocument", label: "Comprovativo de Renda", desc: "Recibo de vencimento ou extracto bancário", icon: "💼" },
                { key: "selfieDocument", label: "Selfie com BI", desc: "Foto segurando o documento aberto", icon: "🤳" },
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
              { l: t('credit.apply.rev_cet'), v: `${FinancialEngine.cet(form.amount, rate, form.months).toFixed(0)}%` },
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

/* ═══════════════════════════════════════
   TAB: ESTRATÉGIA
═══════════════════════════════════════ */
function TabStrategy({ scoreData, debts }) {
  const { t } = useTranslation();
  const payoffStrategy = (debts || [])
    .filter(d => d.restante > 0)
    .map((d, i) => ({
      nome: d.name || `Dívida ${i + 1}`,
      taxa: d.interestRate || 0,
      restante: d.restante || 0,
      parcela: (d.total / 12) || 0, // simplified baseline 
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

      {/* Mapa de risco */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.strategy.risk_map_title')}</div>
        {[
          { zona: t('credit.strategy.risk_green_label', { defaultValue: "Zona Verde" }), desc: t('credit.strategy.risk_green_desc', { defaultValue: "Crédito saudável, pagamentos em dia, score acima de 70" }), color: G.credit, icon: "✅", active: scoreData.score >= 70 },
          { zona: t('credit.strategy.risk_yellow_label', { defaultValue: "Zona Amarela" }), desc: t('credit.strategy.risk_yellow_desc', { defaultValue: "Comprometimento entre 30–40%, atenção redobrada necessária" }), color: G.gold, icon: "⚠️", active: scoreData.score >= 55 && scoreData.score < 70 },
          { zona: t('credit.strategy.risk_red_label', { defaultValue: "Zona Vermelha" }), desc: t('credit.strategy.risk_red_desc', { defaultValue: "Score abaixo de 55, crédito negado, risco de incumprimento" }), color: G.red, icon: "🚫", active: scoreData.score < 55 },
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

      {/* Como melhorar score */}
      <Card style={{ background: `${G.blue}05`, border: `1px solid ${G.blue}18` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.blue, letterSpacing: "0.12em", marginBottom: 16 }}>{t('credit.strategy.improve_title')}</div>
        {[
          { acção: t('credit.strategy.tip_xitique', { defaultValue: "Completar mais ciclos de Xitique" }), impacto: "+15 pts", prazo: "3–6 meses", icon: "✦" },
          { acção: t('credit.strategy.tip_savings', { defaultValue: "Aumentar taxa de poupança para 25%+" }), impacto: "+10 pts", prazo: "2 meses", icon: "🏦" },
          { acção: t('credit.strategy.tip_card', { defaultValue: "Quitar o Cartão Millennium" }), impacto: "+8 pts", prazo: "6 meses", icon: "💳" },
          { acção: t('credit.strategy.tip_logging', { defaultValue: "Manter registo de transações no Mwanga" }), impacto: "+5 pts", prazo: "1 mês", icon: "↕" },
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

      {/* Disclaimer regulatório */}
      <Card style={{ background: "rgba(96,165,250,0.04)", border: `1px solid ${G.blue}18` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: G.blue, letterSpacing: "0.1em", marginBottom: 10 }}>{t('credit.strategy.reg_title')}</div>
        <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.8 }}>
          {t('credit.strategy.reg_desc')}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════
   ROOT — MÓDULO CRÉDITO
═══════════════════════════════════════ */
export default function MwangaCredito() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const [tab, setTab] = useState("overview");
  const salario = state.settings.user_salary || 0;
  const dividas_parcelas = state.dividas?.reduce((acc, curr) => acc + (curr.monthly_payment || 0), 0) || 0;
  const comprometimento_atual = salario > 0 ? (dividas_parcelas / salario) * 100 : 0;
  const margem = Math.max(0, 40 - comprometimento_atual);
  const maxParcela = (salario * margem) / 100;

  const userData = {
    salario,
    dividas_parcelas
  };

  const scoreData = {
    score: state.user?.credit_score || 0,
    label: (state.user?.credit_score || 0) >= 700 ? t('dashboard.health.excellent') : (state.user?.credit_score || 0) >= 500 ? t('dashboard.health.moderate') : t('dashboard.health.attention'),
    color: (state.user?.credit_score || 0) >= 700 ? G.green : (state.user?.credit_score || 0) >= 500 ? G.gold : G.red,
    eligible: (state.user?.credit_score || 0) >= 500,
    maxAmount: (state.user?.credit_score || 0) >= 700 ? 50000 : (state.user?.credit_score || 0) >= 500 ? 15000 : 0,
    factors: [
      { name: t('credit.overview.integrated_score'), pts: (state.user?.credit_score || 0), max: 1000, icon: "✦" },
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
    { id: "overview",  label: t('credit.tabs.overview', { defaultValue: "Visão Geral" }),  icon: "◎" },
    { id: "vsla",      label: t('credit.tabs.community', { defaultValue: "Comunidade" }),   icon: "🤝" },
    { id: "simulator", label: t('credit.tabs.simulator', { defaultValue: "Simulador" }),    icon: "🧭" },
    { id: "compare",   label: t('credit.tabs.compare', { defaultValue: "Comparar" }),     icon: "⚖️" },
    { id: "consolidate", label: t('credit.tabs.consolidate', { defaultValue: "Consolidar" }), icon: "🔄" },
    { id: "apply",     label: t('credit.tabs.apply', { defaultValue: "Solicitar" }),    icon: "💸" },
    { id: "strategy",  label: t('credit.tabs.strategy', { defaultValue: "Estratégia" }),  icon: "👑" },
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
                  Microcrédito inteligente · Powered by Binth
                  <button 
                    onClick={() => window.location.reload()}
                    title="Actualizar aplicação"
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
              <div style={{ fontSize: 11, color: G.muted }}>Score actual</div>
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
          <ProGate isPro={isPro} title="Estratégia de Pagamento" description="A análise Avalanche de dívidas e o Mapa de Risco são exclusivos para utilizadores PRO.">
            <TabStrategy scoreData={scoreData} debts={state.dividas} />
          </ProGate>
        )}
      </div>
    </div>
  );
}
