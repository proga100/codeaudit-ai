import { getDb, auditPhases, audits } from "@codeaudit-ai/db";
import { eq, and } from "drizzle-orm";
import { createLlmProvider, resolveModel } from "@codeaudit-ai/llm-adapter";
import type { RepoContext } from "../repo-context";

import type { AuditRunContext } from "../orchestrator";

/**
 * Retrieve typed RepoContext object from the audits table.
 * Returns null if Phase 0 hasn't persisted context yet.
 */
export function getRepoContextObject(auditId: string): RepoContext | null {
  const db = getDb();
  const audit = db.select({ repoContext: audits.repoContext })
    .from(audits)
    .where(eq(audits.id, auditId))
    .get();
  if (!audit?.repoContext) return null;
  // Column is untyped JSON at DB layer — cast after reading
  return audit.repoContext as unknown as RepoContext;
}

/**
 * Retrieve the Phase 0 repo context as a formatted string for use in LLM prompts.
 * Falls back to auditPhases.output (Phase 0 markdown) for backward compat with
 * audits that ran before v1.2 (before structured repoContext was persisted).
 */
export function getRepoContext(auditId: string): string {
  const obj = getRepoContextObject(auditId);
  if (obj) {
    return formatRepoContextForPrompt(obj);
  }
  // Fallback: legacy string from auditPhases.output (pre-v1.2 audits)
  const phase0Output = db_fallback_getPhase0Output(auditId);
  return phase0Output ?? "Repo context not available (Phase 0 not completed)";
}

/**
 * Format a typed RepoContext into a readable string for LLM prompts.
 */
function formatRepoContextForPrompt(ctx: RepoContext): string {
  const lines = [
    `Repo: ${ctx.repoName}`,
    `Remote: ${ctx.remoteUrl || "no remote"}`,
    `HEAD: ${ctx.headCommit || "unknown"}`,
    `Branch: ${ctx.defaultBranch || "unknown"}`,
    `Primary Languages: ${ctx.primaryLanguages.join(", ") || "unknown"}`,
    `Package Manager: ${ctx.packageManager || "unknown"}`,
    `Frameworks: ${ctx.frameworks.join(", ") || "none detected"}`,
    `Test Framework: ${ctx.testFramework || "unknown"}`,
    `Test File Patterns: ${ctx.testFilePatterns.join(", ") || "unknown"}`,
    `CI System: ${ctx.ciSystem || "none detected"}`,
    `Monorepo: ${ctx.isMonorepo ? `yes (${ctx.monorepoTool})` : "no"}`,
    `Lines of Code: ${ctx.totalLinesOfCode.toLocaleString()}`,
  ];
  if (Object.keys(ctx.locByLanguage).length > 0) {
    lines.push("LOC by Language:");
    for (const [lang, count] of Object.entries(ctx.locByLanguage)) {
      lines.push(`  ${lang}: ${count.toLocaleString()}`);
    }
  }
  if (ctx.contributorsLast12Months.length > 0) {
    lines.push("Contributors (12 months):");
    for (const c of ctx.contributorsLast12Months) {
      lines.push(`  ${c.name}: ${c.commits} commits`);
    }
  }
  lines.push(`\nSummary: ${ctx.summary}`);
  return lines.join("\n");
}

/**
 * Private fallback: read Phase 0 markdown output from auditPhases table.
 * Used to preserve backward compatibility with pre-v1.2 audits.
 */
function db_fallback_getPhase0Output(auditId: string): string | null {
  const db = getDb();
  const phase0 = db.select().from(auditPhases)
    .where(and(eq(auditPhases.auditId, auditId), eq(auditPhases.phaseNumber, 0)))
    .get();
  return phase0?.output ?? null;
}

/**
 * Create the LLM model instance for a given phase and audit context.
 */
export function getModel(ctx: AuditRunContext, phaseNumber: number): any {
  return createLlmProvider({
    provider: ctx.llmProvider,
    apiKey: ctx.decryptedApiKey,
    model: resolveModel(ctx.llmProvider, phaseNumber, ctx.selectedModel),
  });
}

/**
 * Returns the head limit for grep/find command output.
 * Quick scan caps at 15 lines; deep audit uses 30 (EXEC-06).
 */
export function headLimit(ctx: AuditRunContext): string {
  return ctx.depth === "quick" ? "15" : "30";
}
