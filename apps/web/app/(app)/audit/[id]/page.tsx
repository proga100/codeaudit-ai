import { notFound } from "next/navigation";
import { getDb, audits } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
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

  // Serialize for client — convert Date fields to ISO strings
  const serialized = {
    id: audit.id,
    folderName: audit.folderName,
    folderPath: audit.folderPath,
    auditType: audit.auditType,
    depth: audit.depth,
    status: audit.status,
    startedAt: audit.startedAt?.toISOString() ?? null,
  };

  return <AuditProgress audit={serialized} />;
}
