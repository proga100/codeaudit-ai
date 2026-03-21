/**
 * @codeaudit/audit-engine
 *
 * Core audit orchestrator. Translates the 13-phase CLI-based codebase audit
 * process (defined in codebase_review_guide.md) into structured LLM API calls.
 *
 * Phases:
 *   0  — Bootstrap: repo structure detection
 *   1  — Orientation
 *   2  — Dependencies
 *   3  — Tests
 *   4  — Complexity
 *   5  — Git archaeology
 *   6  — Security
 *   7  — Deep reads
 *   8  — CI/CD
 *   9  — Documentation
 *   10 — Final report
 *   11 — HTML dashboards
 *
 * Implemented in Phase 3.
 */

export type AuditEngineConfig = {
  auditId: string;
  repoPath: string;
  auditType: "full" | "security" | "team-collaboration" | "code-quality" | "custom";
  depth: "quick" | "deep";
  llmProvider: "anthropic" | "openai" | "gemini";
};

// Placeholder — implemented in Phase 3
export function createAuditEngine(_config: AuditEngineConfig): never {
  throw new Error("AuditEngine not yet implemented — coming in Phase 3");
}
