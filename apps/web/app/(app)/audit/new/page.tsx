import { getDb, audits } from "@codeaudit-ai/db";
import { listApiKeys } from "@/actions/api-keys";
import { desc } from "drizzle-orm";
import { NewAuditForm } from "./new-audit-form";

export default async function NewAuditPage() {
  // Fetch API keys
  const apiKeysResult = await listApiKeys();
  const apiKeysRaw = apiKeysResult.success ? apiKeysResult.data : [];

  // Serialize dates to ISO strings for client component
  const apiKeys = apiKeysRaw.map((k) => ({
    id: k.id,
    provider: k.provider,
    label: k.label,
    maskedKey: k.maskedKey,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }));

  // Fetch recent distinct folders from audit history
  const db = getDb();
  const recentFolders = db
    .selectDistinct({ folderPath: audits.folderPath, folderName: audits.folderName })
    .from(audits)
    .orderBy(desc(audits.createdAt))
    .limit(5)
    .all();

  return (
    <div className="p-9 max-w-[720px]">
      <h1 className="text-2xl font-bold tracking-tight mb-8 animate-fade-in">New Audit</h1>
      <NewAuditForm apiKeys={apiKeys} recentFolders={recentFolders} />
    </div>
  );
}
