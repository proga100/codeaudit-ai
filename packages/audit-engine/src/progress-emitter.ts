import { getDb, auditPhases, audits } from "@codeaudit-ai/db";
import { eq, and } from "drizzle-orm";
import type { AuditFinding } from "@codeaudit-ai/db";
import pricing from "./pricing.json";

type PricingEntry = { input: number; output: number };
const PRICING = pricing as unknown as Record<string, PricingEntry | undefined>;
const DEFAULT_PRICING: PricingEntry = { input: 3000, output: 15000 };

/**
 * Calculate cost in microdollars from actual token counts.
 * Pricing values are microdollars per 1K tokens.
 * Example: anthropic input = 3000 means $3.00 per 1K input tokens = 3000 microdollars.
 */
export function calculateCost(
  provider: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[provider] ?? DEFAULT_PRICING;
  return Math.round(
    (inputTokens / 1000) * p.input +
    (outputTokens / 1000) * p.output
  );
}

export async function markPhaseRunning(auditId: string, phaseNumber: number): Promise<void> {
  const db = getDb();
  // Upsert: create if not exists, update to running
  const existing = db.select().from(auditPhases)
    .where(and(eq(auditPhases.auditId, auditId), eq(auditPhases.phaseNumber, phaseNumber)))
    .get();
  if (existing) {
    db.update(auditPhases).set({ status: "running", startedAt: new Date() })
      .where(eq(auditPhases.id, existing.id)).run();
  } else {
    db.insert(auditPhases).values({
      auditId, phaseNumber, status: "running", startedAt: new Date(),
    }).run();
  }
  // Update audits.currentPhase
  db.update(audits).set({ currentPhase: phaseNumber })
    .where(eq(audits.id, auditId)).run();
}

export async function markPhaseCompleted(
  auditId: string,
  phaseNumber: number,
  output: string,
  findings: AuditFinding[],
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const db = getDb();
  const totalTokens = inputTokens + outputTokens;

  const existing = db.select().from(auditPhases)
    .where(and(eq(auditPhases.auditId, auditId), eq(auditPhases.phaseNumber, phaseNumber)))
    .get();
  if (existing) {
    db.update(auditPhases).set({
      status: "completed", output, findings, tokensUsed: totalTokens, completedAt: new Date(),
    }).where(eq(auditPhases.id, existing.id)).run();
  }

  const audit = db.select().from(audits).where(eq(audits.id, auditId)).get();
  if (audit) {
    const costMicro = calculateCost(audit.llmProvider, inputTokens, outputTokens);
    db.update(audits).set({
      tokenCount: audit.tokenCount + totalTokens,
      actualCostMicrodollars: (audit.actualCostMicrodollars ?? 0) + costMicro,
      updatedAt: new Date(),
    }).where(eq(audits.id, auditId)).run();
  }
}

export async function markPhaseSkipped(auditId: string, phaseNumber: number): Promise<void> {
  const db = getDb();
  db.insert(auditPhases).values({
    auditId, phaseNumber, status: "skipped",
  }).run();
}

export async function markPhaseFailed(auditId: string, phaseNumber: number, error: string): Promise<void> {
  const db = getDb();
  const existing = db.select().from(auditPhases)
    .where(and(eq(auditPhases.auditId, auditId), eq(auditPhases.phaseNumber, phaseNumber)))
    .get();
  if (existing) {
    db.update(auditPhases).set({ status: "failed", output: error, completedAt: new Date() })
      .where(eq(auditPhases.id, existing.id)).run();
  }
}
