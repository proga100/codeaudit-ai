import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDb, audits, auditPhases, apiKeys } from "@codeaudit-ai/db";
import { eq, and } from "drizzle-orm";
import { decryptApiKey } from "@codeaudit-ai/db";
import { getPhasesForAuditType } from "./phases/index";
import { getPhaseRunner } from "./phase-registry";
import { markPhaseRunning, markPhaseCompleted, markPhaseSkipped, markPhaseFailed } from "./progress-emitter";

// Side-effect import: registers all phase runners. Must come AFTER phase-registry is defined.
import "./phases/index";

const execFileAsync = promisify(execFile);

// Inlined from apps/web/lib/folder-safety.ts to avoid cross-package dependency (D-10)
async function unlockFolderLocal(folderPath: string): Promise<void> {
  await execFileAsync("chmod", ["-R", "u+w", folderPath]);
}

export type AuditEngineConfig = {
  auditId: string;
  repoPath: string;
  auditOutputDir: string;
  auditType: "full" | "security" | "team-collaboration" | "code-quality";
  depth: "quick" | "deep";
  llmProvider: "anthropic" | "openai" | "gemini" | "openai-compatible";
  apiKeyId: string;
  selectedModel: string | null;
};

export type AuditRunContext = AuditEngineConfig & {
  decryptedApiKey: string;
  apiKeyRow: {
    provider: "anthropic" | "openai" | "gemini" | "openai-compatible";
    encryptedKey: string;
    iv: string;
    baseUrl: string | null;
  };
};

export async function runAudit(config: AuditEngineConfig): Promise<void> {
  const db = getDb();

  // Decrypt API key upfront
  const keyRow = db.select().from(apiKeys).where(eq(apiKeys.id, config.apiKeyId)).get();
  if (!keyRow) throw new Error(`API key ${config.apiKeyId} not found`);
  const decryptedApiKey = decryptApiKey(keyRow.encryptedKey, keyRow.iv);

  const ctx: AuditRunContext = { ...config, decryptedApiKey, apiKeyRow: keyRow };

  // Mark audit as running
  db.update(audits).set({ status: "running", startedAt: new Date() })
    .where(eq(audits.id, config.auditId)).run();

  const phasesToRun = getPhasesForAuditType(config.auditType, config.depth);
  console.log(`[audit-engine] Starting audit ${config.auditId}`);
  console.log(`[audit-engine]   Folder: ${config.repoPath}`);
  console.log(`[audit-engine]   Type: ${config.auditType}, Depth: ${config.depth}`);
  console.log(`[audit-engine]   Provider: ${config.llmProvider}, Model: ${config.selectedModel ?? "AUTO"}`);
  console.log(`[audit-engine]   Phases to run: ${phasesToRun.join(", ")}`);

  try {
    for (const phaseNum of phasesToRun) {
      // Poll cancel flag between phases (D-09 + PROG-05)
      const currentAudit = db.select().from(audits).where(eq(audits.id, config.auditId)).get();
      if (currentAudit?.status === "cancelled") {
        console.log(`[audit-engine] Audit cancelled by user — stopping at phase ${phaseNum}`);
        break;
      }

      // Skip already-completed phases — supports resume from checkpoint (D-09, EXEC-08)
      const existing = db.select().from(auditPhases)
        .where(and(eq(auditPhases.auditId, config.auditId), eq(auditPhases.phaseNumber, phaseNum)))
        .get();
      if (existing?.status === "completed") {
        console.log(`[audit-engine] Phase ${phaseNum} already completed — skipping`);
        continue;
      }

      const runner = getPhaseRunner(phaseNum);
      if (!runner) {
        console.log(`[audit-engine] Phase ${phaseNum} has no runner — skipping`);
        await markPhaseSkipped(config.auditId, phaseNum);
        continue;
      }

      console.log(`[audit-engine] ▶ Starting phase ${phaseNum}...`);
      await markPhaseRunning(config.auditId, phaseNum);
      try {
        await runner(ctx, phaseNum);
        console.log(`[audit-engine] ✓ Phase ${phaseNum} completed`);
      } catch (err) {
        console.error(`[audit-engine] ✗ Phase ${phaseNum} failed:`, err);
        await markPhaseFailed(config.auditId, phaseNum, String(err));
        // Non-fatal: continue with next phase
      }
    }

    // Determine final status
    const finalAudit = db.select().from(audits).where(eq(audits.id, config.auditId)).get();
    const finalStatus = finalAudit?.status === "cancelled" ? "cancelled" : "completed";
    db.update(audits).set({ status: finalStatus, completedAt: new Date(), currentPhase: null })
      .where(eq(audits.id, config.auditId)).run();

  } finally {
    // D-10: ALWAYS unlock folder — even on crash/cancel/failure
    try {
      await unlockFolderLocal(config.repoPath);
    } catch (unlockErr) {
      // Log but don't rethrow — unlock failure shouldn't mask original error
      console.error(`[audit-engine] Failed to unlock folder ${config.repoPath}:`, unlockErr);
    }
  }
}
