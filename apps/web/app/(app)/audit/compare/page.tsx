import { redirect } from "next/navigation";
import { getDb, audits } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import type { AuditFinding, AuditFindings } from "@codeaudit-ai/db";
import { CompareView } from "./compare-view";

// ─── Serialized types passed to client ────────────────────────────────────────

export type SerializedCompareAudit = {
  id: string;
  folderName: string;
  auditType: string;
  depth: string;
  score: number;
  grade: string;
  severities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  createdAt: string;
};

export type SerializedFinding = {
  severity: string;
  title: string;
  filePath?: string;
};

// ─── Comparison Page (server component) ───────────────────────────────────────

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const params = await searchParams;
  const aId = params.a;
  const bId = params.b;

  if (!aId || !bId) {
    redirect("/history");
  }

  const db = getDb();

  const auditA = db.select().from(audits).where(eq(audits.id, aId)).get();
  const auditB = db.select().from(audits).where(eq(audits.id, bId)).get();

  if (!auditA || !auditB) {
    redirect("/history");
  }

  const findingsA = auditA.findings as AuditFindings | null;
  const findingsB = auditB.findings as AuditFindings | null;

  if (!findingsA || !findingsB) {
    redirect("/history");
  }

  // Determine which is previous (older) and which is latest (newer)
  const aTime = auditA.createdAt?.getTime() ?? 0;
  const bTime = auditB.createdAt?.getTime() ?? 0;

  const prevAudit = aTime <= bTime ? auditA : auditB;
  const currAudit = aTime <= bTime ? auditB : auditA;
  const prevFindings = aTime <= bTime ? findingsA : findingsB;
  const currFindings = aTime <= bTime ? findingsB : findingsA;

  // Set-based findings diff
  const compositeKey = (f: AuditFinding) =>
    f.title + "|||" + (f.filePaths?.[0] ?? "");

  const prevKeys = new Set(prevFindings.findings.map(compositeKey));
  const currKeys = new Set(currFindings.findings.map(compositeKey));

  const resolved: SerializedFinding[] = prevFindings.findings
    .filter((f) => !currKeys.has(compositeKey(f)))
    .map((f) => ({ severity: f.severity, title: f.title, filePath: f.filePaths?.[0] }));

  const newFindings: SerializedFinding[] = currFindings.findings
    .filter((f) => !prevKeys.has(compositeKey(f)))
    .map((f) => ({ severity: f.severity, title: f.title, filePath: f.filePaths?.[0] }));

  const persisted: SerializedFinding[] = currFindings.findings
    .filter((f) => prevKeys.has(compositeKey(f)))
    .map((f) => ({ severity: f.severity, title: f.title, filePath: f.filePaths?.[0] }));

  // Serialize both audits for client
  const serializeAudit = (
    audit: typeof prevAudit,
    findings: AuditFindings,
  ): SerializedCompareAudit => ({
    id: audit.id,
    folderName: audit.folderName,
    auditType: audit.auditType,
    depth: audit.depth,
    score: findings.summary.score,
    grade: findings.summary.grade,
    severities: {
      critical: findings.summary.findings_count.critical ?? 0,
      high: findings.summary.findings_count.high ?? 0,
      medium: findings.summary.findings_count.medium ?? 0,
      low: findings.summary.findings_count.low ?? 0,
      info: findings.summary.findings_count.info ?? 0,
    },
    createdAt: audit.createdAt?.toISOString() ?? new Date().toISOString(),
  });

  const prev = serializeAudit(prevAudit, prevFindings);
  const curr = serializeAudit(currAudit, currFindings);

  return (
    <CompareView
      prev={prev}
      curr={curr}
      resolved={resolved}
      newFindings={newFindings}
      persisted={persisted}
    />
  );
}
