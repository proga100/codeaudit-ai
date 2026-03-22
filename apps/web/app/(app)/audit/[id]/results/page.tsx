import { notFound, redirect } from "next/navigation";
import { getDb, audits, auditPhases } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import type { AuditFindings, AuditFinding } from "@codeaudit-ai/db";
import { ResultsDashboard } from "./results-dashboard";

// ─── Results Page (server component) ─────────────────────────────────────────

export default async function ResultsPage({
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

  // Redirect to progress page if audit isn't completed yet
  if (audit.status !== "completed" || audit.findings == null) {
    redirect(`/audit/${id}`);
  }

  // Query per-phase data
  const phases = db
    .select()
    .from(auditPhases)
    .where(eq(auditPhases.auditId, id))
    .orderBy(auditPhases.phaseNumber)
    .all();

  // Serialize audit for client — convert Date fields to ISO strings
  const serializedAudit = {
    id: audit.id,
    folderName: audit.folderName,
    folderPath: audit.folderPath,
    auditType: audit.auditType,
    depth: audit.depth,
    findings: audit.findings as AuditFindings,
    tokenCount: audit.tokenCount,
    actualCostMicrodollars: audit.actualCostMicrodollars,
    completedAt: audit.completedAt?.toISOString() ?? null,
    startedAt: audit.startedAt?.toISOString() ?? null,
  };

  // Serialize phases for client
  const serializedPhases = phases.map((phase) => ({
    phaseNumber: phase.phaseNumber,
    status: phase.status,
    findings: (phase.findings ?? []) as AuditFinding[],
    tokensUsed: phase.tokensUsed,
    startedAt: phase.startedAt?.toISOString() ?? null,
    completedAt: phase.completedAt?.toISOString() ?? null,
  }));

  return (
    <ResultsDashboard audit={serializedAudit} phases={serializedPhases} />
  );
}
