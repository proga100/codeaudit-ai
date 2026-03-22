"use server";

import { getDb, audits, auditPhases } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import { unlockFolder } from "@/lib/folder-safety";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";

export async function deleteAudit(
  auditId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const audit = db.select().from(audits).where(eq(audits.id, auditId)).get();

  if (!audit) return { success: false, error: "Audit not found" };
  if (audit.status === "running")
    return { success: false, error: "Cannot delete a running audit" };

  // Delete audit phases (cascade should handle this, but be explicit)
  db.delete(auditPhases).where(eq(auditPhases.auditId, auditId)).run();

  // Delete audit record
  db.delete(audits).where(eq(audits.id, auditId)).run();

  // Clean up output directory
  if (audit.auditOutputDir) {
    try {
      await fs.rm(audit.auditOutputDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist — that's fine
    }
  }

  // Unlock folder in case it was left locked from a cancelled/failed audit
  if (audit.folderPath) {
    await unlockFolder(audit.folderPath);
  }

  revalidatePath("/history");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAudits(
  auditIds: string[],
): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of auditIds) {
    const result = await deleteAudit(id);
    if (result.success) {
      deleted++;
    } else {
      errors.push(`${id}: ${result.error}`);
    }
  }

  return { success: errors.length === 0, deleted, errors };
}
