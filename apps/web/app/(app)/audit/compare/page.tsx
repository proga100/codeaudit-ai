import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, audits } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import type { AuditFinding, AuditFindings } from "@codeaudit-ai/db";
import { SeverityChart } from "@/components/audit/severity-chart";
import { HealthScore } from "@/components/ui/health-score";
import { Check, AlertTriangle, ArrowUp, ArrowDown, Activity } from "lucide-react";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const SEVERITY: Record<string, { color: string; label: string }> = {
  critical: { color: "#ef4444", label: "Critical" },
  high: { color: "#f97316", label: "High" },
  medium: { color: "#eab308", label: "Medium" },
  low: { color: "#3b82f6", label: "Low" },
  info: { color: "#71717a", label: "Info" },
};

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// ---------------------------------------------------------------
// Diff logic
// ---------------------------------------------------------------

function diffFindings(
  newerFindings: AuditFinding[],
  olderFindings: AuditFinding[]
): {
  newFindings: AuditFinding[];
  resolvedFindings: AuditFinding[];
  persistedFindings: AuditFinding[];
} {
  const key = (f: AuditFinding) => `${f.title}|${f.filePaths?.[0] ?? ""}`;
  const newerKeys = new Set(newerFindings.map(key));
  const olderKeys = new Set(olderFindings.map(key));
  return {
    newFindings: newerFindings.filter((f) => !olderKeys.has(key(f))),
    resolvedFindings: olderFindings.filter((f) => !newerKeys.has(key(f))),
    persistedFindings: newerFindings.filter((f) => olderKeys.has(key(f))),
  };
}

// ---------------------------------------------------------------
// Compare Row
// ---------------------------------------------------------------

function CompareRow({
  finding,
  borderColor,
  bgColor,
  strikethrough,
}: {
  finding: AuditFinding;
  borderColor: string;
  bgColor: string;
  strikethrough?: boolean;
}) {
  const sev = SEVERITY[finding.severity] ?? SEVERITY.info;

  return (
    <div
      style={{
        padding: "10px 16px",
        background: bgColor,
        borderRadius: 10,
        marginBottom: 6,
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
          background: `${sev!.color}18`,
          color: sev!.color,
          border: `1px solid ${sev!.color}30`,
        }}
      >
        {sev!.label}
      </span>
      <span
        style={{
          fontSize: 13,
          textDecoration: strikethrough ? "line-through" : "none",
          color: strikethrough ? "var(--text-secondary)" : "var(--text)",
        }}
      >
        {finding.title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  if (!a || !b) {
    return (
      <div style={{ padding: "36px 40px", maxWidth: 920 }}>
        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Two audit IDs are required. Use the Compare button from the History page.
          </p>
          <Link
            href="/history"
            style={{
              marginTop: 16,
              display: "inline-block",
              fontSize: 12,
              color: "var(--text-muted)",
              textDecoration: "none",
            }}
          >
            &larr; Back to History
          </Link>
        </div>
      </div>
    );
  }

  const db = getDb();
  const newerAudit = db.select().from(audits).where(eq(audits.id, a)).get();
  const olderAudit = db.select().from(audits).where(eq(audits.id, b)).get();

  if (!newerAudit || !olderAudit) notFound();

  if (!newerAudit.findings || !olderAudit.findings) {
    return (
      <div style={{ padding: "36px 40px", maxWidth: 920 }}>
        <Link
          href="/history"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          &larr; Back to History
        </Link>
        <div
          style={{
            marginTop: 24,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            One or both audits have no findings data. Comparison requires completed audits.
          </p>
        </div>
      </div>
    );
  }

  const newerFindings = newerAudit.findings as AuditFindings;
  const olderFindings = olderAudit.findings as AuditFindings;

  const newerScore = newerFindings.summary.score;
  const olderScore = olderFindings.summary.score;
  const delta = newerScore - olderScore;
  const improved = delta > 0;

  const { newFindings, resolvedFindings, persistedFindings } = diffFindings(
    newerFindings.findings,
    olderFindings.findings
  );

  const olderDate = olderAudit.createdAt ?? new Date();
  const newerDate = newerAudit.createdAt ?? new Date();
  const newerGrade = newerFindings.summary.grade;
  const olderGrade = olderFindings.summary.grade;

  return (
    <div style={{ padding: "36px 40px", maxWidth: 920 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text)",
          }}
        >
          {newerAudit.folderName}
        </span>
      </div>
      <h1
        className="fade-in"
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginBottom: 28,
          color: "var(--text)",
        }}
      >
        Audit Comparison
      </h1>

      {/* Delta banner */}
      <div
        className="fade-in stagger-1"
        style={{
          padding: "20px 24px",
          borderRadius: 14,
          marginBottom: 28,
          background: improved
            ? "var(--success-subtle)"
            : "var(--destructive-subtle)",
          border: `1px solid ${
            improved ? "rgba(34,197,94,0.19)" : "rgba(239,68,68,0.19)"
          }`,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: improved
              ? "rgba(34,197,94,0.13)"
              : "rgba(239,68,68,0.13)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {improved ? (
            <ArrowUp
              style={{ width: 22, height: 22, color: "var(--success)" }}
            />
          ) : (
            <ArrowDown
              style={{ width: 22, height: 22, color: "var(--destructive)" }}
            />
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: improved ? "var(--success)" : "var(--destructive)",
            }}
          >
            {delta > 0 ? "+" : ""}
            {delta} points
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Score {improved ? "improved" : "degraded"} from {olderScore} to{" "}
            {newerScore}
          </div>
        </div>
      </div>

      {/* Side by side scores */}
      <div
        className="fade-in stagger-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Previous */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            {formatRelativeDate(olderDate)} (Previous)
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <HealthScore score={olderScore} grade={olderGrade} size="lg" />
          </div>
          <SeverityChart counts={olderFindings.summary.findings_count} />
        </div>

        {/* Latest */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            {formatRelativeDate(newerDate)} (Latest)
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <HealthScore score={newerScore} grade={newerGrade} size="lg" />
          </div>
          <SeverityChart counts={newerFindings.summary.findings_count} />
        </div>
      </div>

      {/* Resolved */}
      {resolvedFindings.length > 0 && (
        <div className="fade-in stagger-3" style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--success)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check style={{ width: 16, height: 16, color: "var(--success)" }} />
            Resolved ({resolvedFindings.length})
          </h3>
          {resolvedFindings.map((f) => (
            <CompareRow
              key={f.id}
              finding={f}
              borderColor="var(--success)"
              bgColor="var(--success-subtle)"
              strikethrough
            />
          ))}
        </div>
      )}

      {/* New findings */}
      {newFindings.length > 0 && (
        <div className="fade-in stagger-4" style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--destructive)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle
              style={{ width: 16, height: 16, color: "var(--destructive)" }}
            />
            New ({newFindings.length})
          </h3>
          {newFindings.map((f) => (
            <CompareRow
              key={f.id}
              finding={f}
              borderColor="var(--destructive)"
              bgColor="var(--destructive-subtle)"
            />
          ))}
        </div>
      )}

      {/* Persisted */}
      {persistedFindings.length > 0 && (
        <div className="fade-in stagger-5" style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Activity
              style={{ width: 16, height: 16, color: "var(--text-muted)" }}
            />
            Persisted ({persistedFindings.length})
          </h3>
          {persistedFindings.map((f) => (
            <CompareRow
              key={f.id}
              finding={f}
              borderColor="var(--border)"
              bgColor="var(--elevated)"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {newFindings.length === 0 &&
        resolvedFindings.length === 0 &&
        persistedFindings.length === 0 && (
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "32px 0",
            }}
          >
            No findings in either audit &mdash; nothing to compare.
          </p>
        )}
    </div>
  );
}
