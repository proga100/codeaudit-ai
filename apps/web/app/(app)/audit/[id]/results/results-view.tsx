"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Download } from "lucide-react";
import type { FindingsSeverity, AuditFindings } from "@codeaudit-ai/db";
import { SeverityChart } from "@/components/audit/severity-chart";
import { FindingCard } from "@/components/audit/finding-card";
import { CostSummary } from "@/components/audit/cost-summary";
import { HealthScore } from "@/components/ui/health-score";

type AuditRow = {
  id: string;
  folderName: string;
  auditType: "full" | "security" | "team-collaboration" | "code-quality";
  depth: "quick" | "deep";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  tokenCount: number;
  estimatedCostMicrodollars: number;
  actualCostMicrodollars: number;
  findings: AuditFindings | null | undefined;
  startedAt: Date | null;
  completedAt: Date | null;
};

type PhaseRow = {
  id: string;
  phaseNumber: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  findings: import("@codeaudit-ai/db").AuditFinding[] | null | undefined;
  tokensUsed: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

type ResultsViewProps = {
  auditId: string;
  audit: AuditRow;
  phases: PhaseRow[];
};

const SEVERITY: Record<
  FindingsSeverity,
  { color: string; bg: string; label: string }
> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Critical" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "High" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "Medium" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Low" },
  info: { color: "#71717a", bg: "rgba(113,113,122,0.12)", label: "Info" },
};

const SEVERITY_ORDER: Record<FindingsSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const SCORE_LABEL: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Needs improvement",
  D: "Poor",
  F: "Critical",
};

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "failed"]);

export function ResultsView({ auditId, audit, phases }: ResultsViewProps) {
  const [filter, setFilter] = useState<FindingsSeverity | "all">("all");
  const [sortBy, setSortBy] = useState<"severity" | "phase">("severity");

  const isTerminal = TERMINAL_STATUSES.has(audit.status);

  const allFindings = audit.findings
    ? audit.findings.findings
    : phases.flatMap((p) => p.findings ?? []);

  const filtered = allFindings
    .filter((f) => filter === "all" || f.severity === filter)
    .sort((a, b) => {
      if (sortBy === "severity") {
        return (
          (SEVERITY_ORDER[a.severity] ?? 99) -
          (SEVERITY_ORDER[b.severity] ?? 99)
        );
      }
      return a.phase - b.phase;
    });

  const auditTypeLabel =
    audit.auditType === "full"
      ? "Full Audit"
      : audit.auditType === "security"
        ? "Security Only"
        : audit.auditType === "team-collaboration"
          ? "Team & Collaboration"
          : "Code Quality";
  const depthLabel = audit.depth === "quick" ? "Quick" : "Deep";

  return (
    <div style={{ padding: "36px 40px", maxWidth: 920 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            {audit.folderName}
          </span>
          {/* Type badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              border: "1px solid rgba(250,204,21,0.19)",
            }}
          >
            {auditTypeLabel}
          </span>
          {/* Depth badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              background:
                audit.depth === "deep"
                  ? "var(--accent-subtle)"
                  : "rgba(113,113,122,0.12)",
              color:
                audit.depth === "deep" ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${
                audit.depth === "deep"
                  ? "rgba(250,204,21,0.19)"
                  : "rgba(113,113,122,0.19)"
              }`,
            }}
          >
            {depthLabel}
          </span>
        </div>
        {audit.completedAt && (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Completed {audit.completedAt.toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Score + Severity */}
      {audit.findings && (
        <div
          className="fade-in stagger-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {/* Health Score card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <HealthScore
              score={audit.findings.summary.score}
              grade={audit.findings.summary.grade}
              size="lg"
            />
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                }}
              >
                Health Score
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  letterSpacing: "-0.03em",
                  color: "var(--text)",
                }}
              >
                {audit.findings.summary.score}{" "}
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 400,
                    color: "var(--text-muted)",
                  }}
                >
                  / 100
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--warning)",
                  marginTop: 4,
                }}
              >
                {SCORE_LABEL[audit.findings.summary.grade] ?? ""}
              </div>
            </div>
          </div>

          {/* Severity Breakdown card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Severity Breakdown
            </div>
            <SeverityChart counts={audit.findings.summary.findings_count} />
          </div>
        </div>
      )}

      {/* Cost summary */}
      {isTerminal && (
        <div className="fade-in stagger-2" style={{ marginBottom: 16 }}>
          <CostSummary
            actualCostMicrodollars={audit.actualCostMicrodollars}
            estimatedCostMicrodollars={audit.estimatedCostMicrodollars}
            tokenCount={audit.tokenCount}
            phases={phases}
          />
        </div>
      )}

      {/* Report download buttons */}
      <div
        className="fade-in stagger-2"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 28,
        }}
      >
        {[
          { href: `/audit/${auditId}/executive`, label: "Executive Report" },
          { href: `/audit/${auditId}/technical`, label: "Technical Report" },
          { href: `/api/audit/${auditId}/download`, label: "Download All" },
        ].map((btn) => (
          <a
            key={btn.label}
            href={btn.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--elevated)",
              color: "var(--text)",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "none";
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            {btn.label}
          </a>
        ))}
      </div>

      {/* Partial results notice */}
      {!audit.findings && isTerminal && (
        <div
          className="fade-in"
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 20,
            background: "var(--warning-subtle)",
            border: "1px solid rgba(249,115,22,0.2)",
            fontSize: 13,
            color: "var(--warning)",
          }}
        >
          This audit was cancelled before completing -- showing partial findings
          from {phases.filter((p) => p.status === "completed").length} completed
          phases.
        </div>
      )}

      {/* Filter bar */}
      {allFindings.length > 0 && (
        <div
          className="fade-in stagger-3"
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          {(
            ["all", "critical", "high", "medium", "low", "info"] as const
          ).map((key) => {
            const isActive = filter === key;
            const count =
              key === "all"
                ? allFindings.length
                : audit.findings
                  ? audit.findings.summary.findings_count[key] ?? 0
                  : allFindings.filter((f) => f.severity === key).length;

            const sev = key !== "all" ? SEVERITY[key] : null;
            const activeColor = sev?.color ?? "var(--accent)";
            const activeBg = sev?.bg ?? "var(--accent-subtle)";

            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: `1px solid ${
                    isActive ? activeColor + "50" : "var(--border)"
                  }`,
                  background: isActive ? activeBg : "transparent",
                  color: isActive ? activeColor : "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s ease",
                }}
              >
                {key === "all"
                  ? `All (${count})`
                  : `${SEVERITY[key].label} (${count})`}
              </button>
            );
          })}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "severity" | "phase")
            }
            style={{
              marginLeft: "auto",
              fontSize: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "5px 10px",
              color: "var(--text)",
              outline: "none",
            }}
          >
            <option value="severity">Sort by severity</option>
            <option value="phase">Sort by phase</option>
          </select>
        </div>
      )}

      {/* Findings list */}
      {filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((f, i) => (
            <div
              key={f.id}
              className={`fade-in stagger-${Math.min(i + 1, 5)}`}
            >
              <FindingCard finding={f} />
            </div>
          ))}
        </div>
      ) : allFindings.length > 0 ? (
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            textAlign: "center",
            padding: "32px 0",
          }}
        >
          No findings match this filter.
        </p>
      ) : (
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            textAlign: "center",
            padding: "32px 0",
          }}
        >
          No findings available.
        </p>
      )}
    </div>
  );
}
