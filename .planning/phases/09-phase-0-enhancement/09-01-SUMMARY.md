---
phase: 09-phase-0-enhancement
plan: 01
subsystem: database
tags: [zod, drizzle, sqlite, typescript, repo-context, polyglot]

# Dependency graph
requires: []
provides:
  - "RepoContextSchema Zod schema with all polyglot fields (primaryLanguages, packageManager, frameworks, testFramework, testFilePatterns, ciSystem, ciConfigPaths, isMonorepo, monorepoTool, locByLanguage, totalLinesOfCode)"
  - "audits.repo_context TEXT column for persisting structured Phase 0 output"
  - "getRepoContextObject() returning typed RepoContext | null from DB"
  - "getRepoContext() returning formatted string for LLM prompts (backward-compatible)"
  - "RepoContextSchema and RepoContext type exported from audit-engine package index"
affects: [09-02, 10-01, 10-02, 11-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod schema all-required pattern (no .optional()/.default()) for OpenAI structured output compatibility"
    - "DB layer untyped JSON column; audit-engine layer casts to TypeScript type after read"
    - "ALTER TABLE try/catch migration pattern for SQLite schema evolution without migration files"
    - "Dual API pattern: typed object getter + string formatter for LLM prompt backward compat"

key-files:
  created:
    - packages/audit-engine/src/repo-context.ts
  modified:
    - packages/db/src/schema.ts
    - packages/db/src/client.ts
    - packages/audit-engine/src/phases/shared.ts
    - packages/audit-engine/src/index.ts

key-decisions:
  - "RepoContext type lives in audit-engine, not db — DB column is untyped JSON to avoid circular dependency"
  - "Dual getRepoContext/getRepoContextObject API preserves backward compat for all existing phase runners"
  - "ALTER TABLE with try/catch is the established migration pattern (no migration files, SQLite CREATE TABLE IF NOT EXISTS approach)"
  - "All Zod fields required (no .optional()) — matches OpenAI structured output constraint from finding-extractor.ts"

patterns-established:
  - "Typed schema pattern: define Zod schema in audit-engine, cast DB JSON column at read time"
  - "Backward-compat fallback: new structured column + fallback to auditPhases.output for pre-v1.2 audits"

requirements-completed: [P0-01, P0-02, P0-03, P0-05, P0-06]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 9 Plan 01: RepoContext Schema and DB Foundation Summary

**Zod RepoContextSchema with 12 polyglot fields, audits.repo_context SQLite column, and dual getRepoContext/getRepoContextObject API with pre-v1.2 backward compatibility**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-23T02:18:36Z
- **Completed:** 2026-03-23T02:20:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `packages/audit-engine/src/repo-context.ts` with `RepoContextSchema` (Zod) and inferred `RepoContext` TypeScript type covering all polyglot fields: primaryLanguages, packageManager, frameworks, testFramework, testFilePatterns, ciSystem, ciConfigPaths, isMonorepo, monorepoTool, locByLanguage, totalLinesOfCode, contributorsLast12Months, summary
- Added `repo_context TEXT` column to the `audits` table (Drizzle schema + SQLite bootstrap SQL with ALTER TABLE try/catch migration for existing databases)
- Replaced single-function `getRepoContext()` in shared.ts with dual API: `getRepoContextObject()` returns typed `RepoContext | null`, `getRepoContext()` returns formatted string for LLM prompts with fallback to legacy `auditPhases.output` for pre-v1.2 audits
- Exported `RepoContextSchema` and `RepoContext` type from the audit-engine package index for use by downstream phases (10-11)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RepoContext schema and add DB column** - `65f8ab0` (feat)
2. **Task 2: Update shared.ts and package exports for typed RepoContext access** - `a6ad110` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/audit-engine/src/repo-context.ts` - RepoContextSchema Zod schema + RepoContext TypeScript type (all polyglot fields)
- `packages/db/src/schema.ts` - Added `repoContext: text("repo_context", { mode: "json" })` column to audits table
- `packages/db/src/client.ts` - Added `ALTER TABLE audits ADD COLUMN repo_context TEXT` migration with try/catch for existing DBs
- `packages/audit-engine/src/phases/shared.ts` - Dual API: getRepoContextObject() + getRepoContext() + formatRepoContextForPrompt() + db_fallback_getPhase0Output()
- `packages/audit-engine/src/index.ts` - Added exports for RepoContextSchema and RepoContext type

## Decisions Made

- **RepoContext type stays in audit-engine, not db**: Avoids circular dependency. DB column is untyped JSON; audit-engine casts after reading. The plan explicitly confirmed this: "Do NOT add a `.$type<>()` here because the RepoContext type lives in audit-engine, not db."
- **All Zod fields required (no .optional())**: Matches the OpenAI structured output constraint already established in `finding-extractor.ts`. Empty values use `""`, `[]`, or `0`.
- **ALTER TABLE try/catch migration**: Consistent with existing pattern (CREATE TABLE IF NOT EXISTS for new installs; ALTER TABLE for upgrades). No migration file system needed.
- **Dual API for backward compatibility**: `getRepoContext()` still returns a string — all existing phase runners (1-9) continue to work unchanged. `getRepoContextObject()` gives Phase 10+ typed access.

## Deviations from Plan

None - plan executed exactly as written. The `db` package needed to be built (`npx tsc -p packages/db/tsconfig.json`) before the `audit-engine` TypeScript check could resolve the new `repoContext` column type via project references — this is expected behavior for TypeScript composite projects, not a deviation.

## Issues Encountered

- Pre-existing TypeScript error in `phase-00.ts:75` (LanguageModelV1 vs LanguageModel type mismatch in Vercel AI SDK) — pre-dates this plan, unrelated to changes made. A comment in the file acknowledges this: `// Cast needed: providers return V1, ai@6 types expect V2/V3`.

## Known Stubs

None — this plan establishes the data contract schema only. No UI rendering or data wiring occurs here.

## Next Phase Readiness

- **09-02** (Phase 0 detection rewrite): Stable schema ready. Phase 0 can now call `generateObject` with `RepoContextSchema` and persist the result to `audits.repoContext` via Drizzle update.
- **10-01+** (Phase runner refactoring): `getRepoContextObject()` provides typed access to repo context for LLM tool-use command generation.
- No blockers — the schema is stable and all downstream phases depend on this exact shape.

---
*Phase: 09-phase-0-enhancement*
*Completed: 2026-03-23*
