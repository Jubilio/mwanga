import { useState } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../theme/tokens";

export function Card({ children, style = {}, onClick, glow }) {
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

export function Btn({ children, onClick, variant = "gold", size = "md", disabled, style = {} }) {
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

export function ProgressBar({ value, color, height = 7, animated }) {
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

export function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

export function ScoreRing({ score, color, size = 80 }) {
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

export function Divider() {
  return <div style={{ height: 1, background: G.border, margin: "4px 0" }} />;
}

export function ProGate({ children, isPro, title, description }) {
  const { t } = useTranslation();
  if (isPro) return children;
  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none", opacity: 0.45 }}>
        {children}
      </div>
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
