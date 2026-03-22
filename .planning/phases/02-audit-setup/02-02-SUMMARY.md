---
phase: 02-audit-setup
plan: 02
subsystem: api
tags: [audit-engine, llm, ai-sdk, phases, orchestrator, shell-commands, html-reports, drizzle]

# Dependency graph
requires:
  - phase: 02-audit-setup
    plan: 01
    provides: "orchestrator with registerPhaseRunner(), execCommand(), buildPhasePrompt(), runPhaseLlm(), markPhaseCompleted(), guide-chunks, PHASE_REGISTRY"

provides:
  - phase00Runner — bootstrap: 14 detection commands, generateObject repo context, writes repo_context.md
  - phase01Runner — orientation: directory structure, package.json, TS/test file counts
  - phase02Runner — dependency health: package.json analysis, npm audit
  - phase03Runner — test coverage: test file discovery, config reading, coverage grep
  - phase04Runner — code complexity: wc -l, function count, largest files
  - phase05Runner — git archaeology: commit frequency, churn hotspots, committers, branches
  - phase06Runner — security audit: secrets, env vars, eval/innerHTML, SQL injection, URL grep
  - phase07Runner — deep reads: payment/auth file discovery + content, error handling
  - phase08Runner — CI/CD: GitHub Actions workflows, Dockerfiles, .env.example
  - phase09Runner — documentation: README, markdown files, openapi, JSDoc ratio
  - phase10Runner — final report: aggregates all findings, writes final-report.md, updates audits.findings in DB
  - phase11Runner — HTML reports: generateText for management + technical HTML dashboards
  - shared.ts — getRepoContext(), getModel(), headLimit() helpers
  - All 12 runners registered via registerPhaseRunner(0-11) in index.ts
  - Audit engine now fully executable end-to-end (phases 0-11)

affects: [02-03-progress-ui, 03-reports]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared helper module (shared.ts): getRepoContext/getModel/headLimit extracted to avoid duplication across 11 phase files"
    - "headLimit(ctx) implements EXEC-06: quick=15 lines, deep=30 lines for grep/find output caps"
    - "All file writes use path.join(auditOutputDir, ...) — never repoPath — enforcing EXEC-07"
    - "Phase 0 uses generateObject with custom RepoContextSchema (not PhaseOutputSchema) — repo context not findings"
    - "Phase 10 uses runPhaseLlm then DB update to write audits.findings with AuditFindings shape"
    - "Phase 11 uses generateText (not generateObject) for HTML string output — two separate LLM calls"
    - "Side-effect import: orchestrator.ts imports './phases/index.js' to trigger runner registration"

key-files:
  created:
    - "packages/audit-engine/src/phases/shared.ts — getRepoContext, getModel, headLimit helpers"
    - "packages/audit-engine/src/phases/phase-00.ts — bootstrap runner"
    - "packages/audit-engine/src/phases/phase-01.ts — orientation runner"
    - "packages/audit-engine/src/phases/phase-02.ts — dependency health runner"
    - "packages/audit-engine/src/phases/phase-03.ts — test coverage runner"
    - "packages/audit-engine/src/phases/phase-04.ts — code complexity runner"
    - "packages/audit-engine/src/phases/phase-05.ts — git archaeology runner"
    - "packages/audit-engine/src/phases/phase-06.ts — security audit runner"
    - "packages/audit-engine/src/phases/phase-07.ts — deep reads runner"
    - "packages/audit-engine/src/phases/phase-08.ts — CI/CD runner"
    - "packages/audit-engine/src/phases/phase-09.ts — documentation runner"
    - "packages/audit-engine/src/phases/phase-10.ts — final report synthesis runner"
    - "packages/audit-engine/src/phases/phase-11.ts — HTML report generation runner"
  modified:
    - "packages/audit-engine/src/phases/index.ts — added all 12 registerPhaseRunner() calls + re-exports"
    - "packages/audit-engine/src/orchestrator.ts — added side-effect import of ./phases/index.js"

key-decisions:
  - "shared.ts helper module created for getRepoContext/getModel/headLimit — avoids repeating 3-5 lines in each of 11 phase files"
  - "Phase 0 uses generateObject with RepoContextSchema (not PhaseOutputSchema) — it produces repo context, not AuditFindings"
  - "Phase 5 git churn computed in-process from raw git log output rather than spawning extra processes — avoids execFile parsing complexity"
  - "Phase 10 uses runPhaseLlm + separate DB update (not a custom LLM call) — keeps findings schema consistent with PhaseOutputSchema"
  - "Phase 11 uses generateText (not generateObject) — HTML is unstructured string, not typed JSON"
  - "scoreToGrade() function inlined in phase-10.ts — one-off logic not worth sharing to shared.ts"

patterns-established:
  - "All phase runners: execCommand → buildPhasePrompt → runPhaseLlm → fs.writeFile(auditOutputDir) → markPhaseCompleted"
  - "headLimit(ctx) gate: ctx.depth === 'quick' ? '15' : '30' — consistent EXEC-06 implementation"
  - "EXEC-07 enforcement: all fs.writeFile calls use path.join(auditOutputDir, ...) never repoPath"

requirements-completed: [EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, EXEC-06, EXEC-07]

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 02 Plan 02: Phase Runners Summary

**12 audit phase runners (phase-00 through phase-11) implemented and registered — audit engine executes full codebase analysis end-to-end via shell commands + LLM structured output**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-22T08:43:59Z
- **Completed:** 2026-03-22T08:48:54Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- phase-00: Bootstrap runner runs 14 detection commands and synthesizes structured repo context via generateObject (RepoContextSchema)
- Phases 1-9: Each runs phase-specific shell commands, builds prompt via buildPhasePrompt, calls runPhaseLlm for structured AuditFinding[], writes markdown to auditOutputDir
- phase-10: Aggregates all phase findings from DB, synthesizes final report via LLM, updates audits.findings with AuditFindings shape (score/grade/severity counts)
- phase-11: Two generateText calls produce self-contained HTML dashboards (management + technical) written to auditOutputDir
- shared.ts helpers: getRepoContext(), getModel(), headLimit() eliminate boilerplate across 11 phase files
- All 12 runners registered via registerPhaseRunner(0-11) in index.ts; orchestrator imports index.ts as side-effect

## Task Commits

1. **Task 1: Phase 0 bootstrap runner** - `b849c31` (feat)
2. **Task 2: Phases 1-11 + runner registry** - `186b1ec` (feat)

## Files Created/Modified

- `packages/audit-engine/src/phases/shared.ts` - getRepoContext, getModel, headLimit helpers
- `packages/audit-engine/src/phases/phase-00.ts` - bootstrap: 14 commands + generateObject repo context + repo_context.md
- `packages/audit-engine/src/phases/phase-01.ts` - orientation: find, package.json, file counts
- `packages/audit-engine/src/phases/phase-02.ts` - dependency health: package.json, npm audit
- `packages/audit-engine/src/phases/phase-03.ts` - test coverage: test discovery, config, coverage grep
- `packages/audit-engine/src/phases/phase-04.ts` - code complexity: largest files, function count, nesting depth
- `packages/audit-engine/src/phases/phase-05.ts` - git archaeology: commit frequency, churn, committers, branches
- `packages/audit-engine/src/phases/phase-06.ts` - security: secrets, eval/innerHTML, SQL, .env, external URLs
- `packages/audit-engine/src/phases/phase-07.ts` - deep reads: payment/auth file detection + content reading
- `packages/audit-engine/src/phases/phase-08.ts` - CI/CD: GitHub Actions, Docker, .env.example
- `packages/audit-engine/src/phases/phase-09.ts` - documentation: README, markdown, openapi, JSDoc ratio
- `packages/audit-engine/src/phases/phase-10.ts` - final report: allFindings aggregation, audits.findings DB update
- `packages/audit-engine/src/phases/phase-11.ts` - HTML reports: management + technical via generateText
- `packages/audit-engine/src/phases/index.ts` - added registerPhaseRunner(0-11) calls + phase runner exports
- `packages/audit-engine/src/orchestrator.ts` - added side-effect import "./phases/index.js"

## Decisions Made

- Shared helper module `shared.ts` created rather than repeating getRepoContext/getModel/headLimit in each phase file
- Phase 5 git churn computed in-process (splitting raw git log output) rather than spawning additional child processes
- Phase 10 reuses runPhaseLlm (consistent schema) + separate DB update rather than a custom LLM call
- Phase 11 uses generateText not generateObject — HTML output is an unstructured string

## Deviations from Plan

None - plan executed exactly as written. All phase implementations match the plan's specified command lists and LLM call patterns. The only structural addition beyond the plan was the `shared.ts` helper module, which was explicitly suggested in the plan's action spec.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 12 phase runners registered and callable by orchestrator — a full audit run (phases 0-11) is now executable end-to-end
- Phase 03 (progress UI) can poll auditPhases table — each runner calls markPhaseCompleted after finishing
- HTML reports (phase-11) and final report (phase-10) are generated and written to auditOutputDir
- Audit engine ready for end-to-end testing with a real API key and target repo

---
*Phase: 02-audit-setup*
*Completed: 2026-03-22*
