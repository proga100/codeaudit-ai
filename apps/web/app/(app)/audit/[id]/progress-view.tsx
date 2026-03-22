"use client";
import { useEffect, useRef, useState } from "react";
import { Check, X, ChevronRight } from "lucide-react";
import { cancelAudit } from "@/actions/audit-control";
import { formatCost, formatTokens } from "@/lib/format";

// Types matching SSE event shapes from stream/route.ts
type PhaseEvent = {
  type: "phase";
  phaseNumber: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  tokensUsed: number;
  findingsCount: number;
  criticalCount: number;
  durationMs: number | null;
};

type AuditEvent = {
  type: "audit";
  status: string;
  currentPhase: number | null;
  totalTokens: number;
  totalCostMicro: number;
  phasesTotal: number;
  phasesCompleted: number;
};

const PHASE_NAMES: Record<number, string> = {
  0: "Bootstrap", 1: "Orientation", 2: "Dependency Health", 3: "Test Coverage",
  4: "Code Complexity", 5: "Git Archaeology", 6: "Security Audit", 7: "Deep Reads",
  8: "CI/CD", 9: "Documentation", 10: "Final Report", 11: "HTML Reports",
};

function formatDuration(ms: number | null): string {
  if (ms == null || ms <= 0) return "\u2014";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function ProgressView({
  auditId,
  initialStatus,
}: {
  auditId: string;
  initialStatus: string;
}) {
  const [phases, setPhases] = useState<Map<number, PhaseEvent>>(new Map());
  const [auditState, setAuditState] = useState<AuditEvent | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/audit/${auditId}/stream`);
    esRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as PhaseEvent | AuditEvent;
      if (data.type === "phase") {
        setPhases((prev) => {
          const next = new Map(prev);
          next.set(data.phaseNumber, data);
          return next;
        });
      } else if (data.type === "audit") {
        setAuditState(data);
        if (["completed", "cancelled", "failed"].includes(data.status)) {
          es.close();
        }
      }
    };

    es.onerror = () => {};

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [auditId]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelAudit(auditId);
    } catch {
      setCancelling(false);
    }
  };

  const percentage = auditState
    ? auditState.phasesTotal > 0
      ? Math.round(
          (auditState.phasesCompleted / auditState.phasesTotal) * 100
        )
      : 0
    : 0;

  const currentPhaseName =
    auditState?.currentPhase != null
      ? PHASE_NAMES[auditState.currentPhase] ??
        `Phase ${auditState.currentPhase}`
      : initialStatus === "queued"
        ? "Starting..."
        : "\u2014";

  const isTerminal = auditState
    ? ["completed", "cancelled", "failed"].includes(auditState.status)
    : ["completed", "cancelled", "failed"].includes(initialStatus);

  const isCompleted = (auditState?.status ?? initialStatus) === "completed";
  const statusLabel = auditState?.status ?? initialStatus;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Main progress section */}
      <div className="fade-in">
        {/* Badge row */}
        <div style={{ marginBottom: 8 }}>
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
            In Progress
          </span>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            marginBottom: 32,
            color: isCompleted ? "var(--success)" : "var(--text)",
          }}
        >
          {isCompleted
            ? "Audit Complete"
            : statusLabel === "cancelled"
              ? "Audit Cancelled"
              : statusLabel === "failed"
                ? "Audit Failed"
                : "Audit in Progress..."}
        </h1>

        {/* Progress bar */}
        <div className="fade-in stagger-1" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
              {isTerminal
                ? statusLabel === "completed"
                  ? "All phases complete"
                  : statusLabel === "cancelled"
                    ? "Audit cancelled"
                    : "Audit failed"
                : `Phase ${(auditState?.currentPhase ?? 0) + 1}: ${currentPhaseName}`}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-jetbrains-mono), monospace",
                color: "var(--text)",
              }}
            >
              {percentage}%
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "var(--elevated)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 4,
                transition: "width 0.3s ease",
                width: `${percentage}%`,
                background: isCompleted
                  ? "linear-gradient(90deg, var(--success), #4ade80)"
                  : "linear-gradient(90deg, var(--accent), #f59e0b)",
                animation: isTerminal ? "none" : "progressPulse 2s infinite",
              }}
            />
          </div>
        </div>

        {/* Stats */}
        {auditState && (
          <div
            className="fade-in stagger-2"
            style={{
              display: "flex",
              gap: 24,
              marginBottom: 28,
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
              {formatTokens(auditState.totalTokens)} tokens
            </span>
            <span>&middot;</span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
              {formatCost(auditState.totalCostMicro)}
            </span>
            <span>&middot;</span>
            <span>
              {auditState.phasesCompleted} / {auditState.phasesTotal} phases
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {isCompleted ? (
            <a
              href={`/audit/${auditId}/results`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: "var(--success)",
                color: "#fff",
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
              <ChevronRight style={{ width: 16, height: 16 }} />
              View Results
            </a>
          ) : !isTerminal ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 10,
                border: "1px solid rgba(239,68,68,0.19)",
                cursor: cancelling ? "not-allowed" : "pointer",
                background: "var(--destructive-subtle)",
                color: "var(--destructive)",
                opacity: cancelling ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
              {cancelling ? "Cancelling..." : "Cancel Audit"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            {expanded ? "Hide" : "Show"} details
          </button>
        </div>
      </div>

      {/* Phase list */}
      {expanded && (
        <div
          className="fade-in"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 12 }, (_, i) => i).map((phaseNum) => {
            const phase = phases.get(phaseNum);
            const status = phase?.status ?? "pending";

            return (
              <div
                key={phaseNum}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr 80px 70px 60px",
                  alignItems: "center",
                  padding: "12px 18px",
                  borderBottom:
                    phaseNum < 11
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  opacity: status === "pending" ? 0.4 : 1,
                }}
              >
                {/* Status icon */}
                <div>
                  {status === "completed" ? (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "var(--success-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check
                        style={{ width: 12, height: 12, color: "var(--success)" }}
                      />
                    </div>
                  ) : status === "running" ? (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "var(--accent-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          border: "2px solid var(--accent)",
                          borderTopColor: "transparent",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    </div>
                  ) : status === "failed" ? (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "var(--destructive-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X
                        style={{
                          width: 12,
                          height: 12,
                          color: "var(--destructive)",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "var(--elevated)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--text-muted)",
                          opacity: 0.3,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Phase name */}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: status === "running" ? 600 : 400,
                    color: "var(--text)",
                  }}
                >
                  {PHASE_NAMES[phaseNum] ?? `Phase ${phaseNum}`}
                </span>

                {/* Findings count */}
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  {phase && status !== "pending" && status !== "skipped"
                    ? phase.findingsCount > 0
                      ? `${phase.findingsCount} findings`
                      : "no findings"
                    : status === "skipped"
                      ? "skipped"
                      : "\u2014"}
                </span>

                {/* Duration */}
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: "var(--text-muted)",
                  }}
                >
                  {phase && status === "completed"
                    ? formatDuration(phase.durationMs)
                    : "\u2014"}
                </span>

                {/* Cost (proportional) */}
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: "var(--text-muted)",
                  }}
                >
                  {phase && phase.tokensUsed > 0 && auditState
                    ? formatCost(
                        auditState.totalTokens > 0
                          ? Math.round(
                              (phase.tokensUsed / auditState.totalTokens) *
                                auditState.totalCostMicro
                            )
                          : 0
                      )
                    : "\u2014"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion banner */}
      {isTerminal && statusLabel === "completed" && (
        <div
          className="fade-in"
          style={{
            borderRadius: 14,
            border: "1px solid rgba(34,197,94,0.2)",
            background: "var(--success-subtle)",
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: "rgba(34,197,94,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check style={{ width: 12, height: 12, color: "var(--success)" }} />
            </div>
            <span
              style={{ fontSize: 14, fontWeight: 500, color: "var(--success)" }}
            >
              Audit complete
            </span>
          </div>
          <a
            href={`/audit/${auditId}/results`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 10,
              background: "var(--success)",
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            View Results
            <ChevronRight style={{ width: 14, height: 14 }} />
          </a>
        </div>
      )}
    </div>
  );
}
