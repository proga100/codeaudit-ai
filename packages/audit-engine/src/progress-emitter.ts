import { getDb, auditPhases, audits } from "@codeaudit/db";
import { eq, and } from "drizzle-orm";
import type { AuditFinding } from "@codeaudit/db";

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
  tokensUsed: number,
): Promise<void> {
  const db = getDb();
  const existing = db.select().from(auditPhases)
    .where(and(eq(auditPhases.auditId, auditId), eq(auditPhases.phaseNumber, phaseNumber)))
    .get();
  if (existing) {
    db.update(auditPhases).set({
      status: "completed", output, findings, tokensUsed, completedAt: new Date(),
    }).where(eq(auditPhases.id, existing.id)).run();
  }
  // Add tokens to audit running total
  const audit = db.select().from(audits).where(eq(audits.id, auditId)).get();
  if (audit) {
    db.update(audits).set({
      tokenCount: audit.tokenCount + tokensUsed,
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
