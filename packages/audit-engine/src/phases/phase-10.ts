import fs from "node:fs/promises";
import path from "node:path";
import { getDb, auditPhases, audits } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import type { AuditFindings, FindingsSeverity } from "@codeaudit-ai/db";
import { runPhaseLlm } from "../finding-extractor";
import { markPhaseCompleted } from "../progress-emitter";
import { getModel } from "./shared";
import type { AuditRunContext } from "../orchestrator";
import type { PhaseRunner } from "../phase-registry";

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export const phase10Runner: PhaseRunner = async (ctx, phaseNumber) => {
  const { auditId, auditOutputDir } = ctx;

  // Retrieve all completed phase findings from DB
  const db = getDb();
  const allPhases = db.select().from(auditPhases)
    .where(eq(auditPhases.auditId, auditId))
    .all();

  const allFindings = allPhases.flatMap((p) => p.findings ?? []);

  // Build synthesis prompt (no shell commands — commandOutput is the findings JSON)
  const prompt = `You are producing the final report for a codebase audit.
Below is the complete set of findings from all audit phases.

## All Findings (JSON)
<data_block source="audit_findings" trust="internal">
${JSON.stringify(allFindings, null, 2)}
</data_block>

Produce:
1. findings: top 10 most critical findings (already in the list above — select and return the most important ones)
2. summary: 2-3 paragraph executive summary of overall codebase health
3. phaseScore: overall health score 0-10 (10 = excellent, 0 = critical failures)`;

  // Try LLM synthesis, but don't let it block report generation
  let summary = `Audit completed with ${allFindings.length} findings across ${allPhases.filter(p => p.status === "completed").length} phases.`;
  let score = 50; // default
  let llmTokens = 0;
  let topFindings = allFindings.slice(0, 10);

  try {
    const model = getModel(ctx, phaseNumber);
    const result = await runPhaseLlm(model as Parameters<typeof runPhaseLlm>[0], prompt, phaseNumber);
    if (result.findings.length > 0) topFindings = result.findings;
    if (result.summary) summary = result.summary;
    score = result.score || score;
    llmTokens = result.usage.totalTokens;
  } catch (err) {
    console.warn(`[audit-engine] Phase 10: LLM synthesis failed — using aggregated findings directly. Error: ${String(err).slice(0, 150)}`);
    // Calculate score from severity distribution
    const critical = allFindings.filter(f => f.severity === "critical").length;
    const high = allFindings.filter(f => f.severity === "high").length;
    score = Math.max(0, Math.min(100, 100 - (critical * 15) - (high * 8)));
  }

  // Build final report markdown
  const outputMd = `# Final Report — Codebase Health Audit

Generated: ${new Date().toISOString()}

## Executive Summary

${summary}

## Overall Health Score: ${Math.round(score)}/100 (${scoreToGrade(Math.round(score))})

## Top Findings

${JSON.stringify(topFindings, null, 2)}

## All Findings (${allFindings.length} total across all phases)

${JSON.stringify(allFindings, null, 2)}
`;

  await fs.writeFile(path.join(auditOutputDir, "final-report.md"), outputMd, "utf8");

  // Build AuditFindings summary for DB
  const severityCounts: Record<FindingsSeverity, number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };
  for (const f of allFindings) {
    const sev = f.severity as FindingsSeverity;
    if (sev in severityCounts) {
      severityCounts[sev]++;
    }
  }

  const auditFindings: AuditFindings = {
    summary: {
      score: Math.round(score),
      grade: scoreToGrade(Math.round(score)),
      findings_count: severityCounts,
      categories: [...new Set(allFindings.map((f) => f.category))],
    },
    findings: allFindings,
    phases_completed: allPhases.filter((p) => p.status === "completed").map((p) => p.phaseNumber),
    generated_at: new Date().toISOString(),
  };

  // Update audits.findings with aggregated AuditFindings object
  db.update(audits).set({ findings: auditFindings }).where(eq(audits.id, auditId)).run();

  await markPhaseCompleted(auditId, phaseNumber, outputMd, topFindings, llmTokens);
};
