import { getDb, audits } from "@codeaudit-ai/db";
import { desc } from "drizzle-orm";
import { HistoryPage } from "./history-page";

// ─── Serialized audit type (Date fields converted to strings for client) ──

export type SerializedAudit = {
  id: string;
  folderPath: string;
  folderName: string;
  auditType: string;
  depth: string;
  status: string;
  score: number | null;
  completedAt: string | null;
  createdAt: string;
};

export type FolderGroup = {
  folder: string;
  folderName: string;
  audits: SerializedAudit[];
};

// ─── History page server component ───────────────────────────────────────

export default async function HistoryPageRoute() {
  const db = getDb();

  const rawAudits = db
    .select({
      id: audits.id,
      folderPath: audits.folderPath,
      folderName: audits.folderName,
      auditType: audits.auditType,
      depth: audits.depth,
      status: audits.status,
      findings: audits.findings,
      completedAt: audits.completedAt,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .orderBy(desc(audits.createdAt))
    .all();

  // Serialize each audit — convert Date fields to ISO strings, extract score
  const serialized: SerializedAudit[] = rawAudits.map((a) => ({
    id: a.id,
    folderPath: a.folderPath,
    folderName: a.folderName,
    auditType: a.auditType,
    depth: a.depth,
    status: a.status,
    score: a.findings?.summary?.score ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    createdAt: a.createdAt ? a.createdAt.toISOString() : "",
  }));

  // Group audits by folderPath — preserve insertion order (already sorted desc)
  const folderMap = new Map<string, SerializedAudit[]>();
  for (const audit of serialized) {
    const existing = folderMap.get(audit.folderPath);
    if (existing) {
      existing.push(audit);
    } else {
      folderMap.set(audit.folderPath, [audit]);
    }
  }

  // Convert map to array of folder groups
  const groups: FolderGroup[] = Array.from(folderMap.entries()).map(
    ([folder, groupAudits]) => ({
      folder,
      folderName: groupAudits[0]?.folderName ?? folder,
      audits: groupAudits,
    })
  );

  return <HistoryPage groups={groups} />;
}
