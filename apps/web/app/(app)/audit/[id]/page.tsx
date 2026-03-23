import { notFound } from "next/navigation";
import { getDb, audits, auditPhases } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import { getPhasesForAuditType } from "@codeaudit-ai/audit-engine";
import { AuditProgress } from "./audit-progress";

// ─── Audit Progress Page (server component) ───────────────────────────────

export default async function AuditProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const audit = db.select().from(audits).where(eq(audits.id, id)).get();

  if (!audit) {
    notFound();
  }

  // Load phase data for initial state (critical for completed audits where SSE won't connect)
  const phases = db.select().from(auditPhases).where(eq(auditPhases.auditId, id)).all();
  const phasesToRun = getPhasesForAuditType(audit.auditType, audit.depth);
  const phasesCompleted = phases.filter((p) => ["completed", "skipped"].includes(p.status)).length;

  // Serialize for client — convert Date fields to ISO strings
  const serialized = {
    id: audit.id,
    folderName: audit.folderName,
    folderPath: audit.folderPath,
    auditType: audit.auditType,
    depth: audit.depth,
    status: audit.status,
    startedAt: audit.startedAt?.toISOString() ?? null,
    tokenCount: audit.tokenCount,
    actualCostMicrodollars: audit.actualCostMicrodollars,
    phasesTotal: phasesToRun.length,
    phasesCompleted,
    phases: phases.map((p) => ({
      phaseNumber: p.phaseNumber,
      status: p.status,
      tokensUsed: p.tokensUsed,
      findingsCount: (p.findings ?? []).length,
      criticalCount: (p.findings ?? []).filter((f) => f.severity === "critical").length,
      durationMs: p.startedAt && p.completedAt
        ? p.completedAt.getTime() - p.startedAt.getTime()
        : null,
    })),
  };

  return <AuditProgress audit={serialized} />;
}
