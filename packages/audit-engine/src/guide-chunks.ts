// Per-phase guide text chunks extracted from codebase_review_guide.md.
// Each phase gets only its relevant section (D-01: token efficiency).
// Content is truncated summaries — the full guide is in manual-codebase-review-process/codebase_review_guide.md.

export const GUIDE_CHUNKS: Record<number, string> = {
  0: `Phase 0 — Bootstrap: Run auto-detection commands to gather repo context.
Detect: repo name, remote URL, HEAD commit, default branch, stack (package.json, tsconfig.json, Dockerfile, etc.),
monorepo structure (pnpm-workspace.yaml, turbo.json), total lines of code, contributors (last 12 months).
Output: structured repo context object. Do not read any source files in this phase — only run detection commands.`,

  1: `Phase 1 — Orientation: Understand the project structure.
Check: top-level directory layout, entry points (main, index, app), package.json scripts,
dependency count (prod vs dev), TypeScript configuration, build output paths.
Goal: Establish a mental model of what this codebase is and how it's organized.`,

  2: `Phase 2 — Dependency Health: Audit all dependencies.
Check: outdated packages (npm outdated / pnpm outdated), known vulnerabilities (npm audit),
license compliance, unused dependencies, pinned vs range versions.
Flag: any package with known CVEs (Critical or High), packages pinned to very old major versions.`,

  3: `Phase 3 — Test Coverage: Assess testing health.
Check: test framework presence (jest, vitest, pytest, etc.), test file count vs source file count ratio,
coverage reports if available, test types (unit, integration, e2e), CI test execution.
Flag: zero test coverage, tests that only test mocks, missing critical path tests.`,

  4: `Phase 4 — Code Complexity: Find structural problems.
Check: file size outliers (files > 300 lines), function length outliers, cyclomatic complexity indicators,
duplicated code blocks (jscpd if available, else manual grep for repeated patterns).
Flag: god files, spaghetti dependencies, copy-paste code blocks > 20 lines.`,

  5: `Phase 5 — Git Archaeology: Analyze commit history and team patterns.
Check: commit frequency, churn hotspots (files changed most), bus factor (files touched by only 1 author),
PR merge patterns, branch hygiene, release tagging.
Flag: files with very high churn, single-owner critical modules, no PR review evidence.`,

  6: `Phase 6 — Security Audit: Thorough security investigation.
Sub-phases: 6a secrets/credentials, 6b auth/authorization, 6c input validation/injection,
6d API security, 6e data protection/crypto, 6f infrastructure.
Look for: hardcoded secrets, unvalidated user input in SQL/shell, missing rate limits, weak crypto.

CRITICAL — verify before flagging secrets:
- A file containing a secret on disk is NOT the same as a secret committed to git.
- Before flagging any .env, .env.*, credentials.json, or similar file as a CRITICAL leak, run:
    git ls-files --error-unmatch <path>           # is the file tracked?
    git log --all --full-history -- <path>        # is the file in any history?
- If both commands show the file is gitignored and never tracked, the secret is local-only.
  Do NOT flag gitignored secrets as CRITICAL — at most note them as INFO with a recommendation
  to rotate if the disk is shared/backed-up.
- A secret that was once committed and later deleted IS still CRITICAL — it remains in history.
- Public-repo + committed-secret = CRITICAL. Private-repo + committed-secret = HIGH unless the
  team's security posture treats internal exposure as critical.

Output expectations:
- Every CRITICAL finding in this phase must include the exact git command and its output as
  evidence in the description field. No evidence = downgrade.`,

  7: `Phase 7 — Deep Reads: Read high-risk modules in full.
Sub-phases: 7a payment/billing code, 7b user data/privacy, 7c error handling, 7d third-party integrations.
Read the actual source code of each module. Look for business logic errors, data leaks,
improper error handling that could reveal stack traces in production.`,

  8: `Phase 8 — CI/CD and Deployment: Assess operational readiness.
Check: CI configuration (GitHub Actions, GitLab CI), build pipeline, deployment scripts,
environment variable management, secrets in CI config, Docker/container setup.
Flag: secrets in CI config, missing staging environment, no rollback procedure.`,

  9: `Phase 9 — Documentation: Assess documentation health.
Sub-phases: 9a project-level README, 9b API docs, 9c code comments, 9d env setup docs, 9e data model docs.
Flag: missing onboarding docs, undocumented APIs, no env variable reference.`,

  10: `Phase 10 — Final Report Synthesis: Produce the comprehensive findings summary.
Aggregate all findings from phases 1-9. Compute overall health score (0-100).
Group by severity. Identify top 5 most critical issues. Write executive summary and technical summary.
This is the final markdown report — be thorough and evidence-based.`,

  11: `Phase 11 — HTML Report Generation: Generate interactive HTML dashboards.
Produce two dashboards: (1) management/executive view with health score, severity chart, top issues;
(2) technical view with full findings table, file paths, line numbers, recommendations.
Output as self-contained HTML with inline CSS — no external dependencies.`,
};

export function getGuideChunk(phaseNumber: number): string {
  return GUIDE_CHUNKS[phaseNumber] ?? `Phase ${phaseNumber}: Analyze the command output and produce structured findings.`;
}
