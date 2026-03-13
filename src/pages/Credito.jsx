import { useState, useRef } from "react";
import { useFinance } from "../hooks/useFinanceStore";
import { getFinancialMonthKey, calcMonthlyTotals } from "../utils/calculations";
import api from "../utils/api";
import { useToast } from "../components/Toast";

/* ═══════════════════════════════════════
   DESIGN TOKENS — Mwanga Midnight Gold
═══════════════════════════════════════ */
const G = {
  bg: "#07090f", bg2: "#0c1018", bg3: "#101620",
  card: "rgba(255,255,255,0.04)", cardHov: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.07)", borderS: "rgba(255,255,255,0.13)",
  gold: "#F59E0B", gold2: "#F97316", goldGlow: "rgba(245,158,11,0.28)",
  text: "#e8f0fe", muted: "#6b7fa3", muted2: "#3a4a62", muted3: "#1a2535",
  green: "#00D68F", red: "#FF4C4C", blue: "#60A5FA", purple: "#8B5CF6",
  credit: "#10B981",   // verde esmeralda — cor do módulo crédito
  credit2: "#059669",
  warn: "#F59E0B",
  danger: "#EF4444",
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
  installment(principal, rateMonthly, months) {
    if (rateMonthly === 0) return principal / months;
    return (principal * rateMonthly * Math.pow(1 + rateMonthly, months))
      / (Math.pow(1 + rateMonthly, months) - 1);
  },
  // Tabela de amortização completa
  amortizationTable(principal, rateMonthly, months) {
    const parc = this.installment(principal, rateMonthly, months);
    let saldo = principal;
    const rows = [];
    for (let i = 1; i <= months; i++) {
      const juros = saldo * rateMonthly;
      const amort = parc - juros;
      saldo -= amort;
      rows.push({
        n: i,
        parcela: parc,
        juros,
        amortizacao: amort,
        saldo: Math.max(0, saldo),
      });
    }
    return rows;
  },
  // CET aproximado (anualizado)
  cet(principal, rateMonthly, months) {
    return (Math.pow(1 + rateMonthly, 12) - 1) * 100;
  },
  // Score de crédito proprietário
  creditScore(userData) {
    let s = 0;
    const factors = [];

    // 1. Estabilidade de renda (25%)
    const incomeStab = Math.min(1, userData.monthsEmployed / 24);
    const incomePts = Math.round(incomeStab * 25);
    s += incomePts;
    factors.push({ name: "Estabilidade de renda", pts: incomePts, max: 25, icon: "💼" });

    // 2. Comportamento de poupança (20%)
    const savRate = userData.excedente / Math.max(1, userData.salario);
    const savPts = Math.min(20, Math.round(savRate * 80));
    s += savPts;
    factors.push({ name: "Taxa de poupança", pts: savPts, max: 20, icon: "🏦" });

    // 3. Rácio dívida/renda (25%) — menor = melhor
    const debtRatio = userData.dividas_parcelas / Math.max(1, userData.salario);
    const debtPts = debtRatio > 0.5 ? 0 : Math.round((1 - debtRatio * 2) * 25);
    s += debtPts;
    factors.push({ name: "Rácio dívida/renda", pts: debtPts, max: 25, icon: "⚖️" });

    // 4. Histórico Xitique (15%)
    const xitPts = userData.xitique_cycles_completed >= 3 ? 15
      : userData.xitique_cycles_completed >= 1 ? 8 : 0;
    s += xitPts;
    factors.push({ name: "Reputação Xitique", pts: xitPts, max: 15, icon: "✦" });

    // 5. Consistência de transações (15%)
    const txPts = Math.min(15, Math.round((userData.avg_monthly_transactions / 20) * 15));
    s += txPts;
    factors.push({ name: "Actividade financeira", pts: txPts, max: 15, icon: "↕" });

    return {
      score: Math.min(100, Math.max(0, s)),
      factors,
      label: s >= 85 ? "Excelente" : s >= 70 ? "Bom" : s >= 55 ? "Regular" : s >= 40 ? "Baixo" : "Muito Baixo",
      color: s >= 85 ? G.green : s >= 70 ? G.credit : s >= 55 ? G.gold : s >= 40 ? G.warn : G.red,
      eligible: s >= 55,
      maxAmount: s >= 85 ? 50000 : s >= 70 ? 25000 : s >= 55 ? 10000 : 0,
    };
  },
  // Elegibilidade: máximo que pode pedir
  eligibility(salario, dividas_parcelas, score) {
    const comprometimento_atual = dividas_parcelas / salario;
    const margem = Math.max(0, 0.40 - comprometimento_atual); // máx 40% comprometimento
    const rendaDisponivel = salario * margem;
    const maxParcela = rendaDisponivel;
    return {
      comprometimento_atual: comprometimento_atual * 100,
      margem: margem * 100,
      maxParcela,
      ok: margem > 0.05 && score >= 55,
    };
  },
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
═══════════════════════════════════════ */
function ProGate({ children, isPro, title = "Funcionalidade PRO", description = "Faz upgrade para desbloquear esta análise avançada." }) {
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
        <div style={{ fontSize: 16, fontWeight: 900, color: G.gold, fontFamily: "Sora,sans-serif", textAlign: "center" }}>{title}</div>
        <div style={{ fontSize: 13, color: G.muted, textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>{description}</div>
        <a href="/pricing" style={{
          marginTop: 4, padding: "11px 28px", borderRadius: 12,
          background: `linear-gradient(135deg,${G.gold},${G.gold2})`,
          color: "#000", fontWeight: 700, fontSize: 14, textDecoration: "none",
          boxShadow: `0 4px 18px ${G.goldGlow}`,
        }}>Upgrade para PRO →</a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: VISÃO GERAL
═══════════════════════════════════════ */
function TabOverview({ onApply, scoreData, eligData, hist, isPro }) {


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Score + Elegibilidade hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Score */}
        <Card glow={scoreData.color} style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: "0.12em", marginBottom: 14 }}>SCORE DE CRÉDITO</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <ScoreRing score={scoreData.score} color={scoreData.color} size={90} />
          </div>
          <Badge label={scoreData.label} color={scoreData.color} />
          <div style={{ fontSize: 11, color: G.muted, marginTop: 10 }}>
            {scoreData.eligible ? `Elegível até MT ${fmtShort(scoreData.maxAmount)}` : "Não elegível neste momento"}
          </div>
        </Card>

        {/* Elegibilidade */}
        <Card style={{ padding: "20px 18px" }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: "0.12em", marginBottom: 14 }}>CAPACIDADE DE CRÉDITO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: G.muted }}>Comprometimento actual</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: eligData.comprometimento_atual > 35 ? G.red : G.green }}>
                  {eligData.comprometimento_atual.toFixed(1)}%
                </span>
              </div>
              <ProgressBar value={eligData.comprometimento_atual} color={eligData.comprometimento_atual > 35 ? G.red : G.green} animated />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: G.muted }}>Margem disponível</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: G.gold }}>{eligData.margem.toFixed(1)}%</span>
              </div>
              <ProgressBar value={eligData.margem} color={G.gold} animated />
            </div>
            <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 4 }}>Parcela máxima segura</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif" }}>
                MT {fmtShort(eligData.maxParcela)}
              </div>
              <div style={{ fontSize: 11, color: G.muted }}>por mês</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Score factors */}
      <ProGate isPro={isPro} title="Factores Detalhados do Score" description="Veja exactamente quais os 5 critérios que definem o seu Nexo Score e como melhorar cada um.">
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>FACTORES DO SCORE BINTH CREDIT</div>
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
            <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, marginBottom: 6 }}>Transparência Total sobre Taxas</div>
            <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.7 }}>
              O Mwanga Credit opera como <strong style={{ color: G.text }}>marketplace</strong> — conecta-te com microfinanceiras parceiras.
              As taxas praticadas pelos nossos parceiros variam entre <strong style={{ color: G.gold }}>5% e 30% ao mês</strong>.
              Antes de qualquer contrato, verás o custo total, a parcela mensal, e o impacto no teu orçamento.
              O Mwanga não cobra taxa de originação. Receita via comissão do parceiro financiador.
            </div>
          </div>
        </div>
      </Card>

      {/* Histórico */}
      {hist.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, letterSpacing: "0.12em" }}>HISTÓRICO DE EMPRÉSTIMOS</div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {hist.map((l, i) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < hist.length - 1 ? `1px solid ${G.border}` : "none" }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: `${G.credit}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💸</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: G.text }}>MT {fmtShort(l.valor)} · {l.meses} meses</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{l.data} · Taxa {(l.taxa * 100).toFixed(0)}%/mês · Parcela MT {fmtShort(l.parcela)}</div>
                </div>
                <Badge label={l.status === "paid" ? "✓ Quitado" : "Em curso"} color={l.status === "paid" ? G.green : G.gold} />
              </div>
            ))}
          </Card>
        </>
      )}

      {/* CTA */}
      {scoreData.eligible ? (
        <Btn variant="green" size="lg" onClick={onApply} style={{ width: "100%" }}>
          💸 Solicitar Microcrédito
        </Btn>
      ) : (
        <Card style={{ background: "rgba(255,76,76,0.06)", border: `1px solid rgba(255,76,76,0.2)`, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: G.red, marginBottom: 8 }}>Score insuficiente para crédito</div>
          <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.7 }}>
            Precisas de pelo menos <strong style={{ color: G.text }}>55 pontos</strong> para aceder ao microcrédito.
            Aumenta o teu score completando mais ciclos de Xitique, aumentando a taxa de poupança e reduzindo dívidas existentes.
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: SIMULADOR
═══════════════════════════════════════ */
function TabSimulator({ scoreData, eligData, userData, isPro }) {
  const [amount, setAmount] = useState(5000);
  const [months, setMonths] = useState(3);
  const [rate, setRate] = useState(0.08); // 8% ao mês = parceiro conservador
  const [showTable, setShowTable] = useState(false);

  const maxAmount = scoreData.maxAmount;

  const parcela = FinancialEngine.installment(amount, rate, months);
  const totalDue = parcela * months;
  const totalJuros = totalDue - amount;
  const cet = FinancialEngine.cet(amount, rate, months);
  const table = FinancialEngine.amortizationTable(amount, rate, months);

  const isAffordable = parcela <= eligData.maxParcela;
  const percentSalary = userData.salario > 0 ? (parcela / userData.salario) * 100 : 0;
  const newComprometimento = userData.salario > 0 ? ((userData.dividas_parcelas + parcela) / userData.salario) * 100 : 0;

  const RATES = [
    { label: "Parceiro A — Conservador", value: 0.05, tag: "5%/mês" },
    { label: "Parceiro B — Padrão", value: 0.08, tag: "8%/mês" },
    { label: "Parceiro C — Informal", value: 0.20, tag: "20%/mês" },
    { label: "Mercado informal máx.", value: 0.30, tag: "30%/mês" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Inputs */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 18 }}>CONFIGURAR SIMULAÇÃO</div>

        {/* Valor */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>Valor solicitado</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif" }}>MT {fmtShort(amount)}</span>
          </div>
          <input type="range" min={1000} max={maxAmount} step={500} value={amount}
            onChange={e => setAmount(+e.target.value)}
            style={{ width: "100%", accentColor: G.credit, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: G.muted2 }}>MT 1,000</span>
            <span style={{ fontSize: 11, color: G.muted2 }}>MT {fmtShort(maxAmount)}</span>
          </div>
        </div>

        {/* Prazo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>Prazo</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: G.gold }}>{months} {months === 1 ? "mês" : "meses"}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 6, 12].map(m => (
              <button key={m} onClick={() => setMonths(m)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                background: months === m ? `linear-gradient(135deg,${G.credit},${G.credit2})` : G.muted3,
                color: months === m ? "#000" : G.muted, fontWeight: 700, fontSize: 13, fontFamily: "inherit",
              }}>{m}m</button>
            ))}
          </div>
        </div>

        {/* Taxa */}
        <div>
          <div style={{ fontSize: 13, color: G.text, fontWeight: 600, marginBottom: 10 }}>Parceiro / Taxa mensal</div>
          <ProGate isPro={isPro} title="Comparar Parceiros" description="Acede à comparação completa de taxas de todos os parceiros financiadores e escolhe a melhor oferta para o teu perfil.">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RATES.map((r, i) => (
                <div key={i} onClick={() => setRate(r.value)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 14px", borderRadius: 12, cursor: "pointer",
                  background: rate === r.value ? `${G.credit}15` : G.muted3,
                  border: `1px solid ${rate === r.value ? G.credit : "transparent"}`,
                  transition: "all 0.18s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${rate === r.value ? G.credit : G.muted2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {rate === r.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: G.credit }} />}
                    </div>
                    <span style={{ fontSize: 13, color: rate === r.value ? G.text : G.muted }}>{r.label}</span>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: r.value >= 0.20 ? "rgba(255,76,76,0.15)" : r.value >= 0.10 ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                    color: r.value >= 0.20 ? G.red : r.value >= 0.10 ? G.gold : G.credit,
                  }}>{r.tag}</span>
                </div>
              ))}
            </div>
          </ProGate>
        </div>
      </Card>

      {/* Resultados */}
      <Card glow={isAffordable ? G.credit : G.red} style={{ background: isAffordable ? "rgba(16,185,129,0.06)" : "rgba(255,76,76,0.05)", border: `1px solid ${isAffordable ? G.credit : G.red}30` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>RESULTADO DA SIMULAÇÃO</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { l: "Parcela mensal", v: `MT ${fmt(parcela)}`, c: isAffordable ? G.green : G.red, big: true },
            { l: "Total a pagar", v: `MT ${fmt(totalDue)}`, c: G.text, big: true },
            { l: "Total de juros", v: `MT ${fmt(totalJuros)}`, c: G.red },
            { l: "CET anual", v: `${cet.toFixed(0)}%`, c: rate >= 0.20 ? G.red : G.gold },
            { l: "% do salário", v: `${percentSalary.toFixed(1)}%`, c: percentSalary > 30 ? G.red : G.gold },
            { l: "Comprometimento", v: `${newComprometimento.toFixed(1)}%`, c: newComprometimento > 40 ? G.danger : G.green },
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
            <span style={{ fontSize: 12, color: G.muted }}>Comprometimento com este crédito</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: newComprometimento > 40 ? G.red : G.green }}>
              {newComprometimento.toFixed(1)}% / 40% máx
            </span>
          </div>
          <ProgressBar value={newComprometimento} color={newComprometimento > 40 ? G.red : G.credit} height={10} animated />
        </div>

        {/* Alerta */}
        {rate >= 0.20 && (
          <div style={{ padding: "10px 14px", background: "rgba(255,76,76,0.1)", border: "1px solid rgba(255,76,76,0.25)", borderRadius: 12, fontSize: 12, color: G.red, lineHeight: 1.6 }}>
            ⚠️ A taxa de {(rate * 100).toFixed(0)}% ao mês é muito elevada. Para MT {fmtShort(amount)}, pagas mais <strong>MT {fmt(totalJuros)}</strong> só em juros. Considera um prazo mais curto ou um parceiro com taxa menor.
          </div>
        )}

        {!isAffordable && (
          <div style={{ padding: "10px 14px", background: "rgba(255,76,76,0.1)", border: "1px solid rgba(255,76,76,0.25)", borderRadius: 12, fontSize: 12, color: G.red, marginTop: 10 }}>
            🚫 A parcela de MT {fmt(parcela)} excede a tua capacidade máxima de MT {fmt(eligData.maxParcela)}.
          </div>
        )}
      </Card>

      {/* Tabela de amortização */}
      <ProGate isPro={isPro} title="Tabela de Amortização Price" description="Veja o detalhe mês a mês de cada parcela: quanto vai a juros, quanto amortiza o capital e o saldo em dívida.">
        <div>
          <div onClick={() => setShowTable(s => !s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: G.text }}>📊 Tabela de Amortização Price</span>
            <span style={{ fontSize: 13, color: G.gold }}>{showTable ? "Ocultar ▲" : "Ver ▼"}</span>
          </div>
          {showTable && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: G.muted3 }}>
                      {["Mês", "Parcela", "Juros", "Amort.", "Saldo"].map(h => (
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

      {/* Comparação juros simples vs compostos */}
      <ProGate isPro={isPro} title="Educação Financeira Avançada" description="Aprende a diferença entre juros simples e compostos com valores reais da tua simulação.">
        <Card style={{ background: "rgba(96,165,250,0.05)", border: `1px solid ${G.blue}20` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.blue, letterSpacing: "0.1em", marginBottom: 14 }}>📚 EDUCAÇÃO FINANCEIRA</div>
          <div style={{ fontSize: 13, color: G.text, fontWeight: 700, marginBottom: 8 }}>Juros Simples vs Compostos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: G.muted3, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 6 }}>Juros Simples</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: G.green }}>
                MT {fmt(amount + (amount * rate * months))}
              </div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>Total = P(1 + i×n)</div>
            </div>
            <div style={{ background: G.muted3, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 6 }}>Juros Compostos</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: G.red }}>
                MT {fmt(FinancialEngine.compound(amount, rate, months))}
              </div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>Total = P(1+i)ⁿ</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: G.muted, marginTop: 12, lineHeight: 1.6 }}>
            💡 O mercado formal usa o sistema Price (parcelas iguais), baseado em juros compostos.
            A diferença entre os dois modelos torna-se significativa a taxas altas como 30%/mês.
          </div>
        </Card>
      </ProGate>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: APLICAÇÃO / FORMULÁRIO
═══════════════════════════════════════ */
function TabApplication({ scoreData, eligData, onSuccess }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1); // 1-pre | 2-form | 3-docs | 4-review | 5-submitted
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: 5000,
    months: 3,
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
    { id: "parceiro_a", name: "CapiMoz Microfinanças", rate: "5%/mês", rating: "⭐⭐⭐⭐⭐", tempo: "2–4h" },
    { id: "parceiro_b", name: "CrediFácil Moçambique", rate: "8%/mês", rating: "⭐⭐⭐⭐", tempo: "1–2h" },
    { id: "parceiro_c", name: "MicroFinance MZ", rate: "15%/mês", rating: "⭐⭐⭐", tempo: "30min" },
  ];

  const PURPOSES = ["Capital de giro", "Material escolar", "Despesas médicas", "Reforma da casa", "Equipamento", "Outro"];

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

      const res = await api.post('/credit/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setStep(5);
      showToast('Pedido de crédito submetido com sucesso! O parceiro irá analisar os documentos.');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      showToast('Erro ao submeter pedido. Tenta novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!scoreData.eligible) {
    return (
      <Card style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: G.red, marginBottom: 10 }}>Crédito não disponível</div>
        <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.7 }}>
          O teu score actual ({scoreData.score}/100) não atinge o mínimo de 55 pontos.<br />
          Consulta os factores do score no separador "Visão Geral" para melhorar.
        </div>
      </Card>
    );
  }

  const steps = ["Verificação", "Proposta", "Documentos", "Revisão"];

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
            <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>DETALHES DO CRÉDITO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Valor */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>Valor solicitado</label>
                  <span style={{ fontSize: 18, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif" }}>MT {fmtShort(form.amount)}</span>
                </div>
                <input type="range" min={1000} max={scoreData.maxAmount} step={500} value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))}
                  style={{ width: "100%", accentColor: G.credit }} />
              </div>
              {/* Prazo */}
              <div>
                <label style={{ fontSize: 13, color: G.text, fontWeight: 600, display: "block", marginBottom: 8 }}>Prazo de reembolso</label>
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
                <label style={{ fontSize: 13, color: G.text, fontWeight: 600, display: "block", marginBottom: 8 }}>Finalidade do crédito</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PURPOSES.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, purpose: p }))} style={{
                      padding: "7px 14px", borderRadius: 99, border: "none", cursor: "pointer",
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
            <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 14 }}>ESCOLHER PARCEIRO FINANCIADOR</div>
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
                  <span style={{ fontSize: 12, color: G.muted }}>⏱ Resposta: {p.tempo}</span>
                </div>
              </div>
            ))}
          </Card>

          {/* Resumo */}
          <Card style={{ background: `${G.credit}08`, border: `1px solid ${G.credit}25` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: G.muted3, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: G.muted }}>Parcela mensal</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif" }}>MT {fmt(parcela)}</div>
              </div>
              <div style={{ background: G.muted3, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: G.muted }}>Total a devolver</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: G.text, fontFamily: "Sora,sans-serif" }}>MT {fmt(totalDue)}</div>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Voltar</Btn>
            <Btn variant="green" onClick={() => setStep(3)} disabled={!form.purpose} style={{ flex: 2 }}>
              Continuar → Documentos
            </Btn>
          </div>
        </div>
      )}

      {/* Step 3 — Documentos */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>DOCUMENTOS NECESSÁRIOS</div>
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
              🔒 Os teus documentos são encriptados e transmitidos directamente ao parceiro financiador. O Mwanga não armazena cópias após a análise.
            </div>
          </Card>

          {!allDocs && (
            <div style={{ fontSize: 12, color: G.muted, textAlign: "center" }}>
              Clica em cada documento para marcar como carregado ({Object.values(docs).filter(Boolean).length}/4 concluídos)
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>← Voltar</Btn>
            <Btn variant="green" onClick={() => setStep(4)} disabled={!allDocs} style={{ flex: 2 }}>
              Continuar → Revisão
            </Btn>
          </div>
        </div>
      )}

      {/* Step 4 — Revisão final */}
      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ background: `${G.credit}06`, border: `1px solid ${G.credit}22` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.credit, letterSpacing: "0.12em", marginBottom: 18 }}>✦ REVISÃO FINAL DA SOLICITAÇÃO</div>
            {[
              { l: "Valor solicitado", v: `MT ${fmt(form.amount)}` },
              { l: "Prazo", v: `${form.months} ${form.months === 1 ? "mês" : "meses"}` },
              { l: "Taxa mensal (parceiro)", v: `${(rate * 100).toFixed(0)}%` },
              { l: "Parcela mensal", v: `MT ${fmt(parcela)}`, strong: true },
              { l: "Total a devolver", v: `MT ${fmt(totalDue)}`, strong: true },
              { l: "Total de juros", v: `MT ${fmt(totalDue - form.amount)}`, color: G.red },
              { l: "CET anual aproximado", v: `${FinancialEngine.cet(form.amount, rate, form.months).toFixed(0)}%` },
              { l: "Finalidade", v: form.purpose },
              { l: "Parceiro", v: PARTNERS.find(p => p.id === form.partner)?.name },
              { l: "Documentos enviados", v: "4 / 4 ✓", color: G.green },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${G.border}` }}>
                <span style={{ fontSize: 13, color: G.muted }}>{r.l}</span>
                <span style={{ fontSize: 13, fontWeight: r.strong ? 800 : 600, color: r.color || (r.strong ? G.credit : G.text) }}>{r.v}</span>
              </div>
            ))}
          </Card>

          <Card style={{ background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.2)` }}>
            <div style={{ fontSize: 12, color: G.gold, lineHeight: 1.7 }}>
              ⚠️ Ao submeter, confirmas que leste e aceitas os termos do empréstimo.
              Parcelas em atraso geram uma penalidade de <strong>2% ao dia</strong>.
              Após aprovação, o montante é creditado em <strong>24–48 horas</strong> via M-Pesa ou conta bancária.
            </div>
          </Card>

          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" onClick={() => setStep(3)} style={{ flex: 1 }} disabled={isSubmitting}>← Voltar</Btn>
            <Btn variant="green" size="lg" onClick={submitApplication} style={{ flex: 2 }} disabled={isSubmitting}>
              {isSubmitting ? "⏳ A Submeter..." : "✅ Submeter Solicitação"}
            </Btn>
          </div>
        </div>
      )}

      {/* Step 5 — Submetido */}
      {step === 5 && (
        <Card style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: G.credit, fontFamily: "Sora,sans-serif", marginBottom: 10 }}>
            Solicitação enviada!
          </div>
          <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.8, marginBottom: 24 }}>
            A tua solicitação de <strong style={{ color: G.text }}>MT {fmt(form.amount)}</strong> foi enviada ao <strong style={{ color: G.text }}>{PARTNERS.find(p => p.id === form.partner)?.name}</strong>.
            Receberás uma notificação via SMS e no Mwanga em <strong style={{ color: G.credit }}>2–4 horas</strong>.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            <div style={{ background: G.muted3, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: G.muted }}>Referência</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: G.text }}>MWG-2026-0{Math.floor(Math.random() * 999 + 100)}</div>
            </div>
            <div style={{ background: G.muted3, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: G.muted }}>Estado</div>
              <Badge label="Em análise" color={G.gold} />
            </div>
          </div>
          <Btn variant="ghost" style={{ width: "100%" }} onClick={() => setStep(1)}>
            Nova simulação
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
    payoffStrategy.push({ nome: "Sem dívidas activas", taxa: 0, restante: 0, parcela: 0, priority: 1, reason: "Parabéns!" });
  }

  const totalJuros = payoffStrategy.reduce((a, d) => a + (d.restante * (d.taxa / 100 / 12)), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>💡 ESTRATÉGIA BINTH CREDIT — AVALANCHE</div>
        <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.7, marginBottom: 16 }}>
          A estratégia <strong style={{ color: G.text }}>Avalanche</strong> paga primeiro as dívidas com maior taxa de juro.
          Poupa mais dinheiro a longo prazo vs a estratégia Snowball.
        </div>
        <div style={{ padding: "12px 14px", background: `${G.credit}10`, border: `1px solid ${G.credit}25`, borderRadius: 12, fontSize: 13, color: G.credit, fontWeight: 600, marginBottom: 16 }}>
          Juros mensais actuais: MT {fmt(totalJuros)} — poderiam ser eliminados em {payoffStrategy[0].restante > 0 ? `${Math.ceil(payoffStrategy[0].restante / payoffStrategy[0].parcela)} meses` : "em curso"}
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
                Restante: MT {fmtShort(d.restante)} · Parcela: MT {fmtShort(d.parcela)}/mês
              </div>
              <div style={{ fontSize: 11, color: G.credit, fontStyle: "italic" }}>✦ {d.reason}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Mapa de risco */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.muted, letterSpacing: "0.12em", marginBottom: 16 }}>🗺 MAPA DE RISCO FINANCEIRO</div>
        {[
          { zona: "Zona Verde", desc: "Crédito saudável, pagamentos em dia, score acima de 70", color: G.credit, icon: "✅", active: scoreData.score >= 70 },
          { zona: "Zona Amarela", desc: "Comprometimento entre 30–40%, atenção redobrada necessária", color: G.gold, icon: "⚠️", active: scoreData.score >= 55 && scoreData.score < 70 },
          { zona: "Zona Vermelha", desc: "Score abaixo de 55, crédito negado, risco de incumprimento", color: G.red, icon: "🚫", active: scoreData.score < 55 },
        ].map((z, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 14, marginBottom: 8, background: z.active ? `${z.color}12` : G.muted3, border: `1px solid ${z.active ? z.color : "transparent"}35` }}>
            <span style={{ fontSize: 20 }}>{z.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: z.active ? z.color : G.muted }}>{z.zona} {z.active ? "← Estás aqui" : ""}</div>
              <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{z.desc}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Como melhorar score */}
      <Card style={{ background: `${G.blue}05`, border: `1px solid ${G.blue}18` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.blue, letterSpacing: "0.12em", marginBottom: 16 }}>📈 COMO MELHORAR O SCORE</div>
        {[
          { acção: "Completar mais ciclos de Xitique", impacto: "+15 pts", prazo: "3–6 meses", icon: "✦" },
          { acção: "Aumentar taxa de poupança para 25%+", impacto: "+10 pts", prazo: "2 meses", icon: "🏦" },
          { acção: "Quitar o Cartão Millennium", impacto: "+8 pts", prazo: "6 meses", icon: "💳" },
          { acção: "Manter registo de transações no Mwanga", impacto: "+5 pts", prazo: "1 mês", icon: "↕" },
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
        <div style={{ fontSize: 11, fontWeight: 700, color: G.blue, letterSpacing: "0.1em", marginBottom: 10 }}>⚖️ NOTA REGULATÓRIA</div>
        <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.8 }}>
          O Mwanga Credit opera como <strong style={{ color: G.text }}>marketplace de crédito</strong> — não é uma instituição financeira.
          Actuamos como intermediários pré-qualificados entre utilizadores e microfinanceiras licenciadas pelo Banco de Moçambique.
          Todas as decisões de crédito finais são tomadas pelos parceiros financiadores.
          Taxas de juro sujeitas à regulação vigente. Crédito responsável: só solicita o que podes pagar.
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════
   ROOT — MÓDULO CRÉDITO
═══════════════════════════════════════ */
export default function MwangaCredito() {
  const { state } = useFinance();
  const [tab, setTab] = useState("overview");
  const [applyDirect, setApplyDirect] = useState(false);

  // Compute dynamic user data for the credit engine
  const startDay = state.settings.financial_month_start_day || 1;
  const monthKey = getFinancialMonthKey(new Date(), startDay);
  const mTotals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, startDay);
  
  // Estimate monthly transactions (last 30 days roughly)
  const recentTx = state.transacoes.filter(t => new Date(t.data) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const userData = {
    nome: state.user?.name || "Utilizador",
    salario: mTotals.totalIncome || 1, // Avoid division by zero
    excedente: Math.max(0, mTotals.totalIncome - mTotals.despesas),
    dividas_parcelas: state.dividas?.reduce((acc, d) => acc + (d.remaining_amount > 0 ? (d.total_amount / 12) : 0), 0) || 0, // Simplified estimation
    monthsEmployed: 24, // Placeholder until job history is added
    xitique_cycles_completed: state.xitiques?.length || 0,
    avg_monthly_transactions: recentTx.length || 0,
  };

  const scoreData = FinancialEngine.creditScore(userData);
  const eligData = FinancialEngine.eligibility(userData.salario, userData.dividas_parcelas, scoreData.score);
  const hist = []; // Empty for now, to be fetched from API later

  const isPro = state.settings?.plan === 'pro';

  const TABS = [
    { id: "overview",  label: "Visão Geral",  icon: "◎" },
    { id: "simulator", label: "Simulador",    icon: "🧭" },
    { id: "apply",     label: "Solicitar",    icon: "💸" },
    { id: "strategy",  label: "Estratégia 👑",  icon: "📈" },
  ];

  function handleApply() { setTab("apply"); setApplyDirect(true); }

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
                <div style={{ fontSize: 12, color: G.muted }}>Microcrédito inteligente · Powered by Binth</div>
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
        {tab === "simulator" && <TabSimulator  scoreData={scoreData} eligData={eligData} userData={userData} isPro={isPro} />}
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
