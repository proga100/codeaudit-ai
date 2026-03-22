import { useState, useEffect, useRef, useCallback } from "react";

// ─── Theme & Constants ───────────────────────────────────────────────
const SEVERITY = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Critical" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "High" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "Medium" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Low" },
  info: { color: "#71717a", bg: "rgba(113,113,122,0.12)", label: "Info" },
};

const PHASES = [
  "Bootstrap", "Orientation", "Dependency Health", "Code Complexity",
  "Security Scan", "Secret Detection", "Auth & Access", "API Security",
  "Data Protection", "Test Coverage", "Documentation", "Git History", "CI/CD"
];

const themes = {
  dark: {
    bg: "#0a0a0b", bgSurface: "#111113", bgElevated: "#18181b",
    bgHover: "#1f1f23", border: "#27272a", borderSubtle: "#1e1e22",
    text: "#fafafa", textSecondary: "#a1a1aa", textMuted: "#71717a",
    accent: "#facc15", accentHover: "#fde047", accentSubtle: "rgba(250,204,21,0.12)",
    success: "#22c55e", successSubtle: "rgba(34,197,94,0.1)",
    destructive: "#ef4444", destructiveSubtle: "rgba(239,68,68,0.1)",
    warning: "#f97316", warningSubtle: "rgba(249,115,22,0.1)",
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    sans: "'Geist', 'SF Pro Display', -apple-system, sans-serif",
  },
  light: {
    bg: "#fafafa", bgSurface: "#ffffff", bgElevated: "#f4f4f5",
    bgHover: "#e4e4e7", border: "#e4e4e7", borderSubtle: "#f0f0f2",
    text: "#09090b", textSecondary: "#52525b", textMuted: "#a1a1aa",
    accent: "#ca8a04", accentHover: "#a16207", accentSubtle: "rgba(202,138,4,0.1)",
    success: "#16a34a", successSubtle: "rgba(22,163,74,0.08)",
    destructive: "#dc2626", destructiveSubtle: "rgba(220,38,38,0.08)",
    warning: "#ea580c", warningSubtle: "rgba(234,88,12,0.08)",
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    sans: "'Geist', 'SF Pro Display', -apple-system, sans-serif",
  },
};

// ─── Icons (inline SVG) ──────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    sun: <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    code: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    chevronRight: <><polyline points="9 18 15 12 9 6"/></>,
    chevronLeft: <><polyline points="15 18 9 12 15 6"/></>,
    folder: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    play: <><polygon points="5 3 19 12 5 21 5 3"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    compare: <><polyline points="18 15 22 19 18 23"/><polyline points="6 9 2 5 6 1"/><line x1="2" y1="5" x2="22" y2="5"/><line x1="22" y1="19" x2="2" y2="19"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─── Global Styles ───────────────────────────────────────────────────
const GlobalStyles = ({ t }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
    
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    
    body, html, #root {
      font-family: ${t.sans};
      background: ${t.bg};
      color: ${t.text};
      height: 100%;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${t.textMuted}; }
    
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
    @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
    @keyframes progressPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(250,204,21,0.4); } 50% { box-shadow: 0 0 12px 4px rgba(250,204,21,0.15); } }
    
    .fade-in { animation: fadeIn 0.35s ease-out forwards; }
    .stagger-1 { animation-delay: 0.05s; opacity:0; }
    .stagger-2 { animation-delay: 0.1s; opacity:0; }
    .stagger-3 { animation-delay: 0.15s; opacity:0; }
    .stagger-4 { animation-delay: 0.2s; opacity:0; }
    .stagger-5 { animation-delay: 0.25s; opacity:0; }
  `}</style>
);

// ─── Shared Components ───────────────────────────────────────────────
const Badge = ({ children, color, t }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 8px",
    borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
    background: color ? `${color}18` : t.accentSubtle,
    color: color || t.accent, border: `1px solid ${color ? `${color}30` : t.accent + "30"}`,
  }}>{children}</span>
);

const Button = ({ children, variant = "primary", size = "md", icon, onClick, disabled, t, style }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8, border: "none",
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: t.sans,
    fontWeight: 500, borderRadius: 10, transition: "all 0.15s ease",
    opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap",
    ...(size === "sm" ? { padding: "6px 12px", fontSize: 13 } :
       size === "lg" ? { padding: "12px 24px", fontSize: 15 } :
       { padding: "8px 16px", fontSize: 13 }),
    ...(variant === "primary" ? {
      background: t.accent, color: "#0a0a0b",
    } : variant === "destructive" ? {
      background: t.destructiveSubtle, color: t.destructive, border: `1px solid ${t.destructive}30`,
    } : variant === "ghost" ? {
      background: "transparent", color: t.textSecondary,
    } : {
      background: t.bgElevated, color: t.text, border: `1px solid ${t.border}`,
    }),
    ...style,
  };
  return (
    <button style={base} onClick={onClick} disabled={disabled}
      onMouseEnter={e => { if (!disabled) { e.target.style.opacity = "0.85"; e.target.style.transform = "translateY(-1px)"; }}}
      onMouseLeave={e => { e.target.style.opacity = disabled ? "0.5" : "1"; e.target.style.transform = "none"; }}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
};

const Card = ({ children, t, style, hover, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      background: t.bgSurface, border: `1px solid ${hovered && hover ? t.accent + "40" : t.border}`,
      borderRadius: 14, padding: 20, transition: "all 0.2s ease",
      cursor: onClick ? "pointer" : "default",
      transform: hovered && hover ? "translateY(-2px)" : "none",
      boxShadow: hovered && hover ? `0 8px 24px ${t.accent}10` : "none",
      ...style,
    }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick}>
      {children}
    </div>
  );
};

const SelectCard = ({ children, selected, onClick, t, style }) => (
  <div onClick={onClick} style={{
    padding: 16, borderRadius: 12, cursor: "pointer",
    transition: "all 0.2s ease",
    background: selected ? t.accentSubtle : t.bgSurface,
    border: `2px solid ${selected ? t.accent : t.border}`,
    boxShadow: selected ? `0 0 0 1px ${t.accent}, 0 4px 12px ${t.accent}20` : "none",
    ...style,
  }}>{children}</div>
);

const Input = ({ t, ...props }) => (
  <input {...props} style={{
    width: "100%", padding: "10px 14px", borderRadius: 10,
    background: t.bgElevated, border: `1px solid ${t.border}`,
    color: t.text, fontSize: 13, fontFamily: props.mono ? t.mono : t.sans,
    outline: "none", transition: "border-color 0.15s",
    ...props.style,
  }} onFocus={e => e.target.style.borderColor = t.accent}
     onBlur={e => e.target.style.borderColor = t.border} />
);

const HealthScore = ({ score, size = "lg", t }) => {
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 50 ? "D" : "F";
  const color = score > 70 ? t.success : score > 40 ? t.warning : t.destructive;
  const sz = size === "lg" ? 110 : 56;
  const strokeW = size === "lg" ? 6 : 4;
  const r = (sz - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: sz, height: sz }}>
      <svg width={sz} height={sz} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={t.border} strokeWidth={strokeW} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size === "lg" ? 28 : 16, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        {size === "lg" && <span style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>{grade}</span>}
      </div>
    </div>
  );
};

const SeverityBar = ({ data, t }) => {
  const maxVal = Math.max(...Object.values(data), 1);
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 100 }}>
      {Object.entries(SEVERITY).map(([key, sev]) => {
        const val = data[key] || 0;
        const h = Math.max((val / maxVal) * 80, 4);
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: sev.color }}>{val}</span>
            <div style={{
              width: "100%", maxWidth: 36, height: h, borderRadius: 6,
              background: sev.color, opacity: 0.85, transition: "height 0.6s ease",
            }} />
            <span style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {sev.label.slice(0, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Modal / Dialog ──────────────────────────────────────────────────
const Modal = ({ open, onClose, children, t }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      }} onClick={onClose} />
      <div className="fade-in" style={{
        position: "relative", background: t.bgSurface,
        border: `1px solid ${t.border}`, borderRadius: 18,
        padding: 28, maxWidth: 480, width: "90%",
        boxShadow: `0 24px 48px rgba(0,0,0,0.3)`,
      }}>
        {children}
      </div>
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────
const Sidebar = ({ page, setPage, theme, toggleTheme, t }) => {
  const navItems = [
    { id: "dashboard", icon: "grid", label: "Dashboard" },
    { id: "new-audit", icon: "plus", label: "New Audit" },
    { id: "history", icon: "clock", label: "History" },
    { id: "settings", icon: "key", label: "API Keys" },
  ];
  return (
    <div style={{
      width: 252, height: "100vh", background: t.bgSurface,
      borderRight: `1px solid ${t.border}`, display: "flex",
      flexDirection: "column", padding: "20px 12px", flexShrink: 0,
      position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "4px 12px", marginBottom: 28,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `linear-gradient(135deg, ${t.accent}, #f59e0b)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="shield" size={16} color="#0a0a0b" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: t.text }}>CodeAudit</div>
          <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 500, letterSpacing: "0.04em", marginTop: -1 }}>AI</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {navItems.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 10, border: "none", cursor: "pointer",
              background: active ? t.accentSubtle : "transparent",
              color: active ? t.accent : t.textSecondary,
              fontFamily: t.sans, fontSize: 13, fontWeight: active ? 600 : 400,
              transition: "all 0.15s ease", width: "100%", textAlign: "left",
            }}
            onMouseEnter={e => { if (!active) e.target.style.background = t.bgHover; }}
            onMouseLeave={e => { if (!active) e.target.style.background = "transparent"; }}>
              <Icon name={item.icon} size={18} color={active ? t.accent : t.textMuted} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div style={{
        padding: "12px 12px 4px", borderTop: `1px solid ${t.border}`, marginTop: 8,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px",
        }}>
          <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>Theme</span>
          <div style={{
            display: "flex", borderRadius: 10, overflow: "hidden",
            border: `1px solid ${t.border}`, background: t.bgElevated,
          }}>
            <button onClick={() => theme !== "light" && toggleTheme()} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 28, border: "none", cursor: "pointer",
              background: theme === "light" ? t.text : "transparent",
              transition: "all 0.2s ease", padding: 0,
            }}>
              <Icon name="sun" size={14} color={theme === "light" ? t.bg : t.textMuted} />
            </button>
            <button onClick={() => theme !== "dark" && toggleTheme()} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 28, border: "none", cursor: "pointer",
              background: theme === "dark" ? t.text : "transparent",
              transition: "all 0.2s ease", padding: 0,
            }}>
              <Icon name="moon" size={14} color={theme === "dark" ? t.bg : t.textMuted} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Setup Wizard ────────────────────────────────────────────────────
const SetupWizard = ({ onComplete, t, theme, toggleTheme }) => {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [validating, setValidating] = useState(false);

  const providers = [
    { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-api03-..." },
    { id: "openai", label: "OpenAI", placeholder: "sk-proj-..." },
    { id: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  ];

  const features = [
    { icon: "shield", title: "13-phase audit", desc: "Security, quality, dependencies, and more" },
    { icon: "key", title: "Multi-provider", desc: "Anthropic, OpenAI, Google Gemini" },
    { icon: "activity", title: "Live tracking", desc: "Real-time progress and cost monitoring" },
    { icon: "compare", title: "Compare audits", desc: "Track improvements over time" },
  ];

  if (step === 1) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: t.bg, position: "relative",
      }}>
        {/* Floating theme toggle */}
        <div style={{ position: "absolute", top: 20, right: 24, display: "flex",
          borderRadius: 10, overflow: "hidden", border: `1px solid ${t.border}`, background: t.bgElevated }}>
          <button onClick={() => theme !== "light" && toggleTheme()} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 28, border: "none", cursor: "pointer",
            background: theme === "light" ? t.text : "transparent", padding: 0,
          }}><Icon name="sun" size={14} color={theme === "light" ? t.bg : t.textMuted} /></button>
          <button onClick={() => theme !== "dark" && toggleTheme()} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 28, border: "none", cursor: "pointer",
            background: theme === "dark" ? t.text : "transparent", padding: 0,
          }}><Icon name="moon" size={14} color={theme === "dark" ? t.bg : t.textMuted} /></button>
        </div>
        <div className="fade-in" style={{ maxWidth: 500, textAlign: "center", padding: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 28px",
            background: `linear-gradient(135deg, ${t.accent}, #f59e0b)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 12px 40px ${t.accent}40`,
          }}>
            <Icon name="shield" size={32} color="#0a0a0b" />
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>
            Welcome to CodeAudit AI
          </h1>
          <p style={{ fontSize: 15, color: t.textSecondary, lineHeight: 1.6, marginBottom: 36 }}>
            Run comprehensive code audits on your local codebase using AI.
            <br />Your code never leaves your machine.
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
            textAlign: "left", marginBottom: 40,
          }}>
            {features.map((f, i) => (
              <div key={i} className={`fade-in stagger-${i+1}`} style={{
                display: "flex", gap: 12, padding: 14,
                background: t.bgSurface, border: `1px solid ${t.border}`,
                borderRadius: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: t.accentSubtle, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={f.icon} size={16} color={t.accent} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="primary" size="lg" onClick={() => setStep(2)} t={t}
            style={{ width: "100%", justifyContent: "center" }}>
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: t.bg, position: "relative",
    }}>
      {/* Floating theme toggle */}
      <div style={{ position: "absolute", top: 20, right: 24, display: "flex",
        borderRadius: 10, overflow: "hidden", border: `1px solid ${t.border}`, background: t.bgElevated }}>
        <button onClick={() => theme !== "light" && toggleTheme()} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 28, border: "none", cursor: "pointer",
          background: theme === "light" ? t.text : "transparent", padding: 0,
        }}><Icon name="sun" size={14} color={theme === "light" ? t.bg : t.textMuted} /></button>
        <button onClick={() => theme !== "dark" && toggleTheme()} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 28, border: "none", cursor: "pointer",
          background: theme === "dark" ? t.text : "transparent", padding: 0,
        }}><Icon name="moon" size={14} color={theme === "dark" ? t.bg : t.textMuted} /></button>
      </div>
      <div className="fade-in" style={{ maxWidth: 460, width: "100%", padding: 40 }}>
        <button onClick={() => setStep(1)} style={{
          background: "none", border: "none", color: t.textMuted, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, fontSize: 13,
          fontFamily: t.sans, marginBottom: 24,
        }}>
          <Icon name="chevronLeft" size={16} /> Back
        </button>

        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Add your API key
        </h2>
        <p style={{ fontSize: 13, color: t.textSecondary, marginBottom: 28 }}>
          Choose a provider and enter your API key to get started.
        </p>

        {/* Provider selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, display: "block", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Provider
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {providers.map(p => (
              <SelectCard key={p.id} selected={provider === p.id} onClick={() => setProvider(p.id)} t={t}
                style={{ flex: 1, padding: "10px 14px", textAlign: "center" }}>
                <span style={{ fontSize: 13, fontWeight: provider === p.id ? 600 : 400, color: provider === p.id ? t.accent : t.textSecondary }}>
                  {p.label}
                </span>
              </SelectCard>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, display: "block", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            API Key
          </label>
          <Input t={t} type="password" placeholder={providers.find(p => p.id === provider)?.placeholder}
            value={apiKey} onChange={e => setApiKey(e.target.value)} mono />
        </div>

        {/* Label */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, display: "block", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Label <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
          </label>
          <Input t={t} placeholder="e.g. Personal, Work" value={label}
            onChange={e => setLabel(e.target.value)} />
        </div>

        <Button variant="primary" size="lg" onClick={() => {
          setValidating(true);
          setTimeout(() => { setValidating(false); onComplete(); }, 1500);
        }} disabled={!apiKey || validating} t={t}
          style={{ width: "100%", justifyContent: "center" }}>
          {validating ? "Validating..." : "Add Key & Continue"}
        </Button>

        <p style={{ fontSize: 12, color: t.textMuted, marginTop: 16, textAlign: "center" }}>
          You can add more keys in Settings → API Keys
        </p>
      </div>
    </div>
  );
};

// ─── Dashboard ───────────────────────────────────────────────────────
const Dashboard = ({ setPage, t }) => {
  const recentAudits = [
    { folder: "my-saas-app", date: "Mar 20, 2026", type: "Full Audit", depth: "Deep", score: 72, status: "completed" },
    { folder: "api-gateway", date: "Mar 18, 2026", type: "Security Only", depth: "Quick", score: 58, status: "completed" },
    { folder: "frontend-v2", date: "Mar 15, 2026", type: "Code Quality", depth: "Deep", score: 85, status: "completed" },
    { folder: "my-saas-app", date: "Mar 10, 2026", type: "Full Audit", depth: "Deep", score: 64, status: "completed" },
  ];

  const quickActions = [
    { icon: "plus", label: "New Audit", desc: "Start a new codebase audit", page: "new-audit", color: t.accent },
    { icon: "clock", label: "View History", desc: "Browse all past audits", page: "history", color: t.textMuted },
    { icon: "key", label: "Manage Keys", desc: "Add or edit API keys", page: "settings", color: t.textMuted },
  ];

  return (
    <div style={{ padding: "36px 40px", maxWidth: 920 }}>
      <h1 className="fade-in" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 28 }}>
        Dashboard
      </h1>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        {quickActions.map((a, i) => (
          <Card key={i} t={t} hover onClick={() => setPage(a.page)}
            style={{ padding: 18 }}>
            <div className={`fade-in stagger-${i+1}`}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, marginBottom: 14,
                background: a.color === t.accent ? t.accentSubtle : t.bgElevated,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={a.icon} size={18} color={a.color} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>{a.desc}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent audits */}
      <div className="fade-in stagger-3">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Audits</h2>
          <button onClick={() => setPage("history")} style={{
            background: "none", border: "none", color: t.accent,
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: t.sans,
          }}>View all →</button>
        </div>

        <div style={{
          background: t.bgSurface, border: `1px solid ${t.border}`,
          borderRadius: 14, overflow: "hidden",
        }}>
          {recentAudits.map((audit, i) => (
            <div key={i} onClick={() => setPage("results")} style={{
              display: "grid", gridTemplateColumns: "1.5fr 1fr 0.8fr 0.6fr 80px 40px",
              alignItems: "center", padding: "14px 20px", cursor: "pointer",
              borderBottom: i < recentAudits.length - 1 ? `1px solid ${t.borderSubtle}` : "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = t.bgHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="folder" size={16} color={t.textMuted} />
                <span style={{ fontSize: 13, fontWeight: 500, fontFamily: t.mono }}>{audit.folder}</span>
              </div>
              <span style={{ fontSize: 12, color: t.textMuted }}>{audit.date}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Badge t={t}>{audit.type}</Badge>
              </div>
              <Badge color={audit.depth === "Deep" ? t.accent : t.textMuted} t={t}>{audit.depth}</Badge>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <HealthScore score={audit.score} size="sm" t={t} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={e => { e.stopPropagation(); setPage("new-audit"); }} style={{
                  width: 30, height: 30, borderRadius: 8, border: "none",
                  background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = t.bgElevated}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Icon name="edit" size={14} color={t.textMuted} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── New Audit Page ──────────────────────────────────────────────────
const NewAudit = ({ setPage, t }) => {
  const [folder, setFolder] = useState("");
  const [auditType, setAuditType] = useState("full");
  const [depth, setDepth] = useState("deep");
  const [showConfirm, setShowConfirm] = useState(false);

  const auditTypes = [
    { id: "full", icon: "shield", label: "Full Audit", desc: "All 13 phases: security, quality, dependencies, git history, docs, CI/CD" },
    { id: "security", icon: "lock", label: "Security Only", desc: "5 phases: secrets, auth, injection, API security, data protection" },
    { id: "team", icon: "users", label: "Team & Collab", desc: "4 phases: git history, PR patterns, ownership, contributor health" },
    { id: "quality", icon: "code", label: "Code Quality", desc: "4 phases: maintainability, test coverage, documentation, complexity" },
  ];

  const depths = [
    { id: "quick", icon: "zap", label: "Quick Scan", desc: "~30 min, 30% sampling, subset of phases" },
    { id: "deep", icon: "shield", label: "Deep Audit", desc: "1–3 hrs, full analysis, all phases" },
  ];

  const SectionLabel = ({ children }) => (
    <label style={{
      display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted,
      letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10,
    }}>{children}</label>
  );

  return (
    <div style={{ padding: "36px 40px", maxWidth: 720 }}>
      <h1 className="fade-in" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 32 }}>
        New Audit
      </h1>

      {/* Folder */}
      <div className="fade-in stagger-1" style={{ marginBottom: 28 }}>
        <SectionLabel>Folder to Audit</SectionLabel>
        <div style={{ position: "relative" }}>
          <Input t={t} mono placeholder="/Users/you/Projects/my-repo"
            value={folder} onChange={e => setFolder(e.target.value)} />
          {folder && (
            <div style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            }}>
              <Icon name="check" size={16} color={t.success} />
            </div>
          )}
        </div>
        {folder && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 8,
            padding: "6px 10px", borderRadius: 8, background: t.warningSubtle,
            fontSize: 12, color: t.warning,
          }}>
            <Icon name="alert" size={14} color={t.warning} />
            Not a git repo — git-specific phases will be skipped
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {["my-saas-app", "api-gateway", "frontend-v2"].map(f => (
            <button key={f} onClick={() => setFolder(`/Users/you/Projects/${f}`)} style={{
              padding: "4px 10px", borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.bgElevated, color: t.textSecondary, fontSize: 12,
              fontFamily: t.mono, cursor: "pointer",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Audit Type */}
      <div className="fade-in stagger-2" style={{ marginBottom: 28 }}>
        <SectionLabel>Audit Type</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {auditTypes.map(at => (
            <SelectCard key={at.id} selected={auditType === at.id}
              onClick={() => setAuditType(at.id)} t={t}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: auditType === at.id ? `${t.accent}20` : t.bgElevated,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={at.icon} size={16} color={auditType === at.id ? t.accent : t.textMuted} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3,
                    color: auditType === at.id ? t.text : t.textSecondary }}>
                    {at.label}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>{at.desc}</div>
                </div>
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      {/* Depth */}
      <div className="fade-in stagger-3" style={{ marginBottom: 28 }}>
        <SectionLabel>Audit Depth</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {depths.map(d => (
            <SelectCard key={d.id} selected={depth === d.id}
              onClick={() => setDepth(d.id)} t={t}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Icon name={d.icon} size={18} color={depth === d.id ? t.accent : t.textMuted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: depth === d.id ? t.text : t.textSecondary }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{d.desc}</div>
                </div>
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      {/* Provider & Model */}
      <div className="fade-in stagger-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <div>
          <SectionLabel>Provider & Key</SectionLabel>
          <select style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            background: t.bgElevated, border: `1px solid ${t.border}`,
            color: t.text, fontSize: 13, fontFamily: t.sans,
            appearance: "none", cursor: "pointer",
          }}>
            <option>Anthropic — Personal (••••3f7a)</option>
            <option>OpenAI — Work (••••nAoA)</option>
          </select>
        </div>
        <div>
          <SectionLabel>Model</SectionLabel>
          <select style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            background: t.bgElevated, border: `1px solid ${t.border}`,
            color: t.text, fontSize: 13, fontFamily: t.sans,
            appearance: "none", cursor: "pointer",
          }}>
            <option>Auto (recommended)</option>
            <option>claude-sonnet-4-5</option>
            <option>claude-haiku-3-5</option>
          </select>
        </div>
      </div>

      {/* Cost estimate */}
      <div className="fade-in stagger-4" style={{
        padding: "14px 18px", borderRadius: 12, marginBottom: 28,
        background: t.bgSurface, border: `1px solid ${t.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 2 }}>Estimated cost</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: t.mono }}>$0.47 – $1.10</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: t.textMuted }}>142 files · ~48k tokens</div>
        </div>
      </div>

      {/* Start */}
      <Button variant="primary" size="lg" onClick={() => setShowConfirm(true)} t={t}
        disabled={!folder}
        style={{ width: "100%", justifyContent: "center", height: 48, fontSize: 15 }}>
        Start Audit
      </Button>

      {/* Confirmation Modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} t={t}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Start Audit?</h3>
        <div style={{
          display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px",
          marginBottom: 20, fontSize: 13,
        }}>
          {[
            ["Folder", folder || "—"],
            ["Type", auditTypes.find(a => a.id === auditType)?.label],
            ["Depth", depths.find(d => d.id === depth)?.label],
            ["Model", "Auto (recommended)"],
            ["Est. Cost", "$0.47 – $1.10"],
          ].map(([k, v]) => (
            <>
              <span style={{ color: t.textMuted, fontWeight: 500 }}>{k}</span>
              <span style={{ fontFamily: t.mono, fontSize: 12 }}>{v}</span>
            </>
          ))}
        </div>
        <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 24, padding: "10px 12px", background: t.bgElevated, borderRadius: 8 }}>
          The target folder will be locked read-only during the audit.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setShowConfirm(false)} t={t}>Go Back</Button>
          <Button variant="primary" onClick={() => { setShowConfirm(false); setPage("progress"); }} t={t}>
            Start Audit
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// ─── Progress Page ───────────────────────────────────────────────────
const ProgressPage = ({ setPage, t }) => {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setDone(true); return 100; }
        const next = p + Math.random() * 3 + 0.5;
        setCurrentPhase(Math.min(Math.floor(next / (100 / PHASES.length)), PHASES.length - 1));
        return Math.min(next, 100);
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const phaseStatus = (i) => {
    const phaseEnd = ((i + 1) / PHASES.length) * 100;
    const phaseStart = (i / PHASES.length) * 100;
    if (progress >= phaseEnd) return "done";
    if (progress >= phaseStart) return "running";
    return "pending";
  };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 720 }}>
      <div className="fade-in" style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: t.mono, fontSize: 13, color: t.textMuted }}>my-saas-app</span>
        <span style={{ margin: "0 8px", color: t.border }}>·</span>
        <Badge t={t}>Full Audit</Badge>
        <span style={{ margin: "0 4px" }} />
        <Badge color={t.accent} t={t}>Deep</Badge>
      </div>

      <h1 className="fade-in" style={{
        fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em",
        marginBottom: 32, color: done ? t.success : t.text,
      }}>
        {done ? "Audit Complete" : "Audit in Progress..."}
      </h1>

      {/* Progress bar */}
      <div className="fade-in stagger-1" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {done ? "All phases complete" : `Phase ${currentPhase + 1}: ${PHASES[currentPhase]}`}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: t.mono }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{
          height: 8, borderRadius: 4, background: t.bgElevated, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 4, transition: "width 0.3s ease",
            width: `${progress}%`,
            background: done
              ? `linear-gradient(90deg, ${t.success}, #4ade80)`
              : `linear-gradient(90deg, ${t.accent}, #f59e0b)`,
            animation: done ? "none" : "progressPulse 2s infinite",
          }} />
        </div>
      </div>

      {/* Stats */}
      <div className="fade-in stagger-2" style={{
        display: "flex", gap: 24, marginBottom: 28, fontSize: 13, color: t.textMuted,
      }}>
        <span style={{ fontFamily: t.mono }}>{Math.round(progress * 124.5).toLocaleString()} tokens</span>
        <span>·</span>
        <span style={{ fontFamily: t.mono }}>${(progress * 0.0427).toFixed(2)}</span>
        <span>·</span>
        <span>{Math.round(progress * 0.45)}s elapsed</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {done ? (
          <Button variant="primary" size="lg" icon="chevronRight" onClick={() => setPage("results")} t={t}
            style={{ background: t.success }}>
            View Results
          </Button>
        ) : (
          <Button variant="destructive" icon="x" t={t}>Cancel Audit</Button>
        )}
        <Button variant="ghost" onClick={() => setExpanded(!expanded)} t={t}>
          {expanded ? "Hide" : "Show"} details
        </Button>
      </div>

      {/* Phase list */}
      {expanded && (
        <div className="fade-in" style={{
          background: t.bgSurface, border: `1px solid ${t.border}`,
          borderRadius: 14, overflow: "hidden",
        }}>
          {PHASES.map((phase, i) => {
            const status = phaseStatus(i);
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "28px 1fr 80px 70px 60px",
                alignItems: "center", padding: "12px 18px",
                borderBottom: i < PHASES.length - 1 ? `1px solid ${t.borderSubtle}` : "none",
                opacity: status === "pending" ? 0.4 : 1,
              }}>
                <div>{status === "done" ? (
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: t.successSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check" size={12} color={t.success} />
                  </div>
                ) : status === "running" ? (
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: t.accentSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", border: `2px solid ${t.accent}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  </div>
                ) : (
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: t.bgElevated, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.textMuted, opacity: 0.3 }} />
                  </div>
                )}</div>
                <span style={{ fontSize: 13, fontWeight: status === "running" ? 600 : 400 }}>{phase}</span>
                <span style={{ fontSize: 12, color: t.textMuted }}>
                  {status === "done" ? `${Math.floor(Math.random()*15+3)} findings` : "—"}
                </span>
                <span style={{ fontSize: 12, fontFamily: t.mono, color: t.textMuted }}>
                  {status === "done" ? `${Math.floor(Math.random()*3)}m ${Math.floor(Math.random()*50+10)}s` : "—"}
                </span>
                <span style={{ fontSize: 12, fontFamily: t.mono, color: t.textMuted }}>
                  {status === "done" ? `$${(Math.random()*0.4+0.05).toFixed(2)}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Results Page ────────────────────────────────────────────────────
const ResultsPage = ({ setPage, t }) => {
  const [filter, setFilter] = useState("all");
  const [expandedFinding, setExpandedFinding] = useState(null);

  const severityData = { critical: 3, high: 7, medium: 14, low: 9, info: 22 };
  const findings = [
    { severity: "critical", title: "Hardcoded AWS credentials in config", file: "src/config/aws.ts", line: 23, evidence: "const AWS_SECRET = \"AKIA3E...\" found in plaintext", remediation: "Move to environment variables or use AWS Secrets Manager. Never commit credentials to source control." },
    { severity: "critical", title: "SQL injection vulnerability in user query", file: "src/api/users.ts", line: 87, evidence: "String concatenation used in SQL query with user input: `WHERE id = '${req.params.id}'`", remediation: "Use parameterized queries or an ORM. Never interpolate user input into SQL strings." },
    { severity: "high", title: "Missing rate limiting on authentication endpoint", file: "src/api/auth.ts", line: 12, evidence: "POST /api/auth/login has no rate limiting middleware applied", remediation: "Add rate limiting middleware (e.g., express-rate-limit) to prevent brute force attacks." },
    { severity: "high", title: "Outdated dependency with known CVE", file: "package.json", line: 45, evidence: "lodash@4.17.15 has CVE-2021-23337 (prototype pollution)", remediation: "Update lodash to >=4.17.21 to patch the vulnerability." },
    { severity: "medium", title: "Missing input validation on API endpoint", file: "src/api/posts.ts", line: 34, evidence: "Request body is used directly without schema validation", remediation: "Add Zod or Joi validation schemas for all API inputs." },
    { severity: "medium", title: "Console.log statements in production code", file: "src/utils/helpers.ts", line: 112, evidence: "12 console.log statements found across utility files", remediation: "Replace with a proper logging library (e.g., pino, winston) with log level controls." },
    { severity: "low", title: "Unused imports detected", file: "src/components/Dashboard.tsx", line: 3, evidence: "Import { useEffect } is declared but never used", remediation: "Remove unused imports. Consider using eslint-plugin-unused-imports." },
    { severity: "info", title: "Missing JSDoc on exported functions", file: "src/utils/format.ts", line: 1, evidence: "8 exported functions lack JSDoc documentation", remediation: "Add JSDoc comments to all exported functions for better IDE support." },
  ];

  const filtered = filter === "all" ? findings : findings.filter(f => f.severity === filter);

  return (
    <div style={{ padding: "36px 40px", maxWidth: 920 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 500 }}>my-saas-app</span>
          <Badge t={t}>Full Audit</Badge>
          <Badge color={t.accent} t={t}>Deep</Badge>
        </div>
        <span style={{ fontSize: 12, color: t.textMuted }}>Completed Mar 20, 2026 · 47m 23s · $4.27</span>
      </div>

      {/* Score + Severity */}
      <div className="fade-in stagger-1" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28,
      }}>
        <Card t={t} style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <HealthScore score={72} size="lg" t={t} />
          <div>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 4 }}>Health Score</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: t.mono, letterSpacing: "-0.03em" }}>72 / 100</div>
            <div style={{ fontSize: 12, color: t.warning, marginTop: 4 }}>Needs improvement</div>
          </div>
        </Card>
        <Card t={t}>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>Severity Breakdown</div>
          <SeverityBar data={severityData} t={t} />
        </Card>
      </div>

      {/* Cost banner */}
      <div className="fade-in stagger-2" style={{
        padding: "12px 18px", borderRadius: 12, marginBottom: 28,
        background: t.bgSurface, border: `1px solid ${t.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 13,
      }}>
        <span>Total cost: <strong style={{ fontFamily: t.mono }}>$4.27</strong> (12,450 tokens)</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" size="sm" icon="download" t={t}>Executive Report</Button>
          <Button variant="outline" size="sm" icon="download" t={t}>Technical Report</Button>
          <Button variant="outline" size="sm" icon="download" t={t}>Download All</Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="fade-in stagger-3" style={{
        display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap",
      }}>
        {["all", ...Object.keys(SEVERITY)].map(key => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "5px 12px", borderRadius: 8, border: `1px solid ${filter === key ? (key === "all" ? t.accent : SEVERITY[key]?.color) + "50" : t.border}`,
            background: filter === key ? (key === "all" ? t.accentSubtle : SEVERITY[key]?.bg) : "transparent",
            color: filter === key ? (key === "all" ? t.accent : SEVERITY[key]?.color) : t.textMuted,
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: t.sans,
            textTransform: "capitalize",
          }}>
            {key === "all" ? `All (${findings.length})` : `${SEVERITY[key].label} (${severityData[key]})`}
          </button>
        ))}
      </div>

      {/* Findings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((f, i) => {
          const sev = SEVERITY[f.severity];
          const isExpanded = expandedFinding === i;
          return (
            <div key={i} className={`fade-in stagger-${Math.min(i+1, 5)}`}
              onClick={() => setExpandedFinding(isExpanded ? null : i)}
              style={{
                background: t.bgSurface, border: `1px solid ${t.border}`,
                borderRadius: 12, borderLeft: `3px solid ${sev.color}`,
                padding: "14px 18px", cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = sev.color + "60"}
              onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Badge color={sev.color} t={t}>{sev.label}</Badge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, fontFamily: t.mono, color: t.accent, marginBottom: 6 }}>
                    {f.file}:{f.line}
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{f.evidence}</div>
                  {isExpanded && (
                    <div className="fade-in" style={{
                      marginTop: 12, padding: "12px 14px", borderRadius: 8,
                      background: t.bgElevated, fontSize: 12, lineHeight: 1.6,
                      color: t.textSecondary, borderLeft: `2px solid ${t.accent}`,
                    }}>
                      <strong style={{ color: t.text }}>Remediation:</strong> {f.remediation}
                    </div>
                  )}
                </div>
                <Icon name={isExpanded ? "arrowUp" : "arrowDown"} size={14} color={t.textMuted} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── History Page ────────────────────────────────────────────────────
const HistoryPage = ({ setPage, t }) => {
  const [selected, setSelected] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // null | "single:gi-i" | "bulk"

  const groups = [
    {
      folder: "my-saas-app",
      audits: [
        { id: "a1", date: "Mar 20, 2026", type: "Full Audit", depth: "Deep", score: 72, status: "completed" },
        { id: "a2", date: "Mar 10, 2026", type: "Full Audit", depth: "Deep", score: 64, status: "completed" },
        { id: "a3", date: "Feb 28, 2026", type: "Security Only", depth: "Quick", score: 51, status: "completed" },
      ],
    },
    {
      folder: "api-gateway",
      audits: [
        { id: "a4", date: "Mar 18, 2026", type: "Security Only", depth: "Quick", score: 58, status: "completed" },
      ],
    },
    {
      folder: "frontend-v2",
      audits: [
        { id: "a5", date: "Mar 15, 2026", type: "Code Quality", depth: "Deep", score: 85, status: "completed" },
        { id: "a6", date: "Mar 1, 2026", type: "Code Quality", depth: "Deep", score: 78, status: "completed" },
      ],
    },
  ];

  const allIds = groups.flatMap(g => g.audits.map(a => a.id));
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const Checkbox = ({ checked, onChange }) => (
    <button onClick={e => { e.stopPropagation(); onChange(); }} style={{
      width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${checked ? t.accent : t.border}`,
      background: checked ? t.accent : "transparent", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s ease", flexShrink: 0, padding: 0,
    }}>
      {checked && <Icon name="check" size={12} color="#0a0a0b" />}
    </button>
  );

  return (
    <div style={{ padding: "36px 40px", maxWidth: 920 }}>
      <div className="fade-in" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>History</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={toggleAll} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent",
            color: t.textMuted, fontSize: 12, cursor: "pointer", fontFamily: t.sans,
          }}>
            <Checkbox checked={allSelected} onChange={toggleAll} />
            Select all
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fade-in" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", borderRadius: 12, marginBottom: 18,
          background: t.bgSurface, border: `1px solid ${t.accent}30`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: t.accent, fontWeight: 700 }}>{selected.size}</span>
            <span style={{ color: t.textSecondary }}> audit{selected.size > 1 ? "s" : ""} selected</span>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())} t={t}>
              Deselect
            </Button>
            <Button variant="destructive" size="sm" icon="trash"
              onClick={() => setShowDeleteConfirm("bulk")} t={t}>
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {groups.map((group, gi) => (
        <div key={gi} className={`fade-in stagger-${Math.min(gi+1, 5)}`} style={{ marginBottom: 28 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="folder" size={16} color={t.textMuted} />
              <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 500 }}>{group.folder}</span>
              <span style={{ fontSize: 12, color: t.textMuted }}>({group.audits.length} audits)</span>
            </div>
            {group.audits.length >= 2 && (
              <Button variant="ghost" size="sm" icon="compare" onClick={() => setPage("compare")} t={t}>
                Compare
              </Button>
            )}
          </div>

          <div style={{
            background: t.bgSurface, border: `1px solid ${t.border}`,
            borderRadius: 14, overflow: "hidden",
          }}>
            {group.audits.map((audit, i) => (
              <div key={audit.id} style={{
                display: "grid", gridTemplateColumns: "32px 1fr 1fr 0.7fr 80px 40px",
                alignItems: "center", padding: "14px 20px", cursor: "pointer",
                borderBottom: i < group.audits.length - 1 ? `1px solid ${t.borderSubtle}` : "none",
                transition: "background 0.15s",
                background: selected.has(audit.id) ? t.accentSubtle : "transparent",
              }}
              onMouseEnter={e => { if (!selected.has(audit.id)) e.currentTarget.style.background = t.bgHover; }}
              onMouseLeave={e => { if (!selected.has(audit.id)) e.currentTarget.style.background = "transparent"; }}
              onClick={() => setPage("results")}>
                <Checkbox checked={selected.has(audit.id)} onChange={() => toggleOne(audit.id)} />
                <span style={{ fontSize: 13, color: t.textSecondary }}>{audit.date}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge t={t}>{audit.type}</Badge>
                  <Badge color={audit.depth === "Deep" ? t.accent : t.textMuted} t={t}>{audit.depth}</Badge>
                </div>
                <span style={{ fontSize: 12, color: t.success }}>● {audit.status}</span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <HealthScore score={audit.score} size="sm" t={t} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(`single:${audit.id}`); }} style={{
                    width: 30, height: 30, borderRadius: 8, border: "none",
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.destructiveSubtle; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    <Icon name="trash" size={14} color={t.textMuted} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Delete confirmation modal */}
      <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} t={t}>
        <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: t.destructiveSubtle, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="trash" size={20} color={t.destructive} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Delete audit{showDeleteConfirm === "bulk" && selected.size > 1 ? "s" : ""}?</h3>
            <p style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
              {showDeleteConfirm === "bulk"
                ? `This will permanently delete ${selected.size} selected audit${selected.size > 1 ? "s" : ""} and all associated reports.`
                : "This will permanently delete this audit and all associated reports."
              }
            </p>
          </div>
        </div>
        <p style={{
          fontSize: 12, color: t.warning, padding: "10px 12px",
          background: t.warningSubtle, borderRadius: 8, marginBottom: 20,
        }}>
          This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} t={t}>Cancel</Button>
          <Button variant="destructive" icon="trash" onClick={() => {
            setShowDeleteConfirm(null);
            setSelected(new Set());
          }} t={t}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

// ─── Comparison Page ─────────────────────────────────────────────────
const ComparePage = ({ t }) => {
  const prev = { score: 64, severities: { critical: 5, high: 9, medium: 18, low: 12, info: 25 } };
  const curr = { score: 72, severities: { critical: 3, high: 7, medium: 14, low: 9, info: 22 } };
  const delta = curr.score - prev.score;

  const resolved = [
    { severity: "critical", title: "Exposed database connection string in .env.example" },
    { severity: "high", title: "CORS wildcard allowing any origin" },
    { severity: "high", title: "Missing CSRF protection on form endpoints" },
  ];
  const newFindings = [
    { severity: "high", title: "Missing rate limiting on authentication endpoint" },
    { severity: "medium", title: "Console.log statements in production code" },
  ];

  return (
    <div style={{ padding: "36px 40px", maxWidth: 920 }}>
      <div className="fade-in" style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 500 }}>my-saas-app</span>
      </div>
      <h1 className="fade-in" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 28 }}>
        Audit Comparison
      </h1>

      {/* Delta banner */}
      <div className="fade-in stagger-1" style={{
        padding: "20px 24px", borderRadius: 14, marginBottom: 28,
        background: delta > 0 ? t.successSubtle : t.destructiveSubtle,
        border: `1px solid ${delta > 0 ? t.success : t.destructive}30`,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: delta > 0 ? `${t.success}20` : `${t.destructive}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={delta > 0 ? "arrowUp" : "arrowDown"} size={22} color={delta > 0 ? t.success : t.destructive} />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: delta > 0 ? t.success : t.destructive }}>
            {delta > 0 ? "+" : ""}{delta} points
          </div>
          <div style={{ fontSize: 13, color: t.textSecondary }}>
            Score improved from {prev.score} to {curr.score}
          </div>
        </div>
      </div>

      {/* Side by side scores */}
      <div className="fade-in stagger-2" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28,
      }}>
        <Card t={t} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>Mar 10, 2026 (Previous)</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <HealthScore score={prev.score} size="lg" t={t} />
          </div>
          <SeverityBar data={prev.severities} t={t} />
        </Card>
        <Card t={t} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>Mar 20, 2026 (Latest)</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <HealthScore score={curr.score} size="lg" t={t} />
          </div>
          <SeverityBar data={curr.severities} t={t} />
        </Card>
      </div>

      {/* Resolved */}
      <div className="fade-in stagger-3" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: t.success, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="check" size={16} color={t.success} /> Resolved ({resolved.length})
        </h3>
        {resolved.map((f, i) => (
          <div key={i} style={{
            padding: "10px 16px", background: t.successSubtle, borderRadius: 10,
            marginBottom: 6, display: "flex", alignItems: "center", gap: 10,
            borderLeft: `3px solid ${t.success}`,
          }}>
            <Badge color={SEVERITY[f.severity].color} t={t}>{SEVERITY[f.severity].label}</Badge>
            <span style={{ fontSize: 13, textDecoration: "line-through", color: t.textSecondary }}>{f.title}</span>
          </div>
        ))}
      </div>

      {/* New */}
      <div className="fade-in stagger-4">
        <h3 style={{ fontSize: 14, fontWeight: 600, color: t.destructive, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="alert" size={16} color={t.destructive} /> New ({newFindings.length})
        </h3>
        {newFindings.map((f, i) => (
          <div key={i} style={{
            padding: "10px 16px", background: t.destructiveSubtle, borderRadius: 10,
            marginBottom: 6, display: "flex", alignItems: "center", gap: 10,
            borderLeft: `3px solid ${t.destructive}`,
          }}>
            <Badge color={SEVERITY[f.severity].color} t={t}>{SEVERITY[f.severity].label}</Badge>
            <span style={{ fontSize: 13 }}>{f.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Settings ────────────────────────────────────────────────────────
const SettingsPage = ({ t }) => {
  const [showAdd, setShowAdd] = useState(false);
  const keys = [
    { provider: "Anthropic", label: "Personal", last4: "3f7a", created: "Mar 1, 2026" },
    { provider: "OpenAI", label: "Work", last4: "nAoA", created: "Feb 15, 2026" },
    { provider: "Google Gemini", label: "Side project", last4: "9kXp", created: "Feb 20, 2026" },
  ];

  return (
    <div style={{ padding: "36px 40px", maxWidth: 640 }}>
      <div className="fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>API Keys</h1>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setShowAdd(!showAdd)} t={t}>
          Add New Key
        </Button>
      </div>

      {showAdd && (
        <Card t={t} style={{ marginBottom: 20, padding: 24 }}>
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["Anthropic", "OpenAI", "Google Gemini"].map(p => (
                <button key={p} style={{
                  padding: "8px 16px", borderRadius: 8, border: `1px solid ${t.border}`,
                  background: t.bgElevated, color: t.textSecondary, fontSize: 13,
                  cursor: "pointer", fontFamily: t.sans,
                }}>{p}</button>
              ))}
            </div>
            <Input t={t} type="password" placeholder="sk-ant-api03-..." mono />
            <Input t={t} placeholder="Label (optional)" />
            <Button variant="primary" t={t}>Add Key</Button>
          </div>
        </Card>
      )}

      <div style={{
        background: t.bgSurface, border: `1px solid ${t.border}`,
        borderRadius: 14, overflow: "hidden",
      }}>
        {keys.map((key, i) => (
          <div key={i} className={`fade-in stagger-${i+1}`} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: i < keys.length - 1 ? `1px solid ${t.borderSubtle}` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: t.bgElevated, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: t.accent,
              }}>
                {key.provider[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{key.provider}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>
                  {key.label} · <span style={{ fontFamily: t.mono }}>••••{key.last4}</span> · Added {key.created}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="ghost" size="sm" t={t}>Edit</Button>
              <Button variant="ghost" size="sm" t={t} style={{ color: t.destructive }}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── App Shell ───────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState("dark");
  const [setupDone, setSetupDone] = useState(false);
  const [page, setPage] = useState("dashboard");
  const t = themes[theme];

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  if (!setupDone) {
    return (
      <>
        <GlobalStyles t={t} />
        <SetupWizard onComplete={() => setSetupDone(true)} t={t} theme={theme} toggleTheme={toggleTheme} />
      </>
    );
  }

  const pages = {
    "dashboard": <Dashboard setPage={setPage} t={t} />,
    "new-audit": <NewAudit setPage={setPage} t={t} />,
    "progress": <ProgressPage setPage={setPage} t={t} />,
    "results": <ResultsPage setPage={setPage} t={t} />,
    "history": <HistoryPage setPage={setPage} t={t} />,
    "compare": <ComparePage t={t} />,
    "settings": <SettingsPage t={t} />,
  };

  return (
    <>
      <GlobalStyles t={t} />
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar page={page} setPage={setPage} theme={theme} toggleTheme={toggleTheme} t={t} />
        <main style={{ flex: 1, overflow: "auto" }}>
          {pages[page] || <Dashboard setPage={setPage} t={t} />}
        </main>
      </div>
    </>
  );
}
