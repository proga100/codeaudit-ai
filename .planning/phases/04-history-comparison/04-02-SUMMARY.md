---
phase: 04-history-comparison
plan: 02
subsystem: ui
tags: [nextjs, drizzle, sqlite, comparison, server-component, diff-logic]

# Dependency graph
requires:
  - phase: 04-history-comparison
    plan: 01
    provides: History page with Compare button pre-filling /audit/compare?a={latest}&b={previous}
  - phase: 01-foundation
    provides: audits table schema, getDb helper, AuditFinding/AuditFindings types
  - phase: 03-results-cost
    provides: FindingCard, SeverityChart client components for reuse
provides:
  - Async server component at /audit/compare?a={id1}&b={id2} — full comparison report
  - Set-based diff function matching findings by title+filePath key
  - Score delta banner with signed color-coded delta
  - Side-by-side SeverityChart for older vs newer audit
  - Three categorized finding sections: new (red), resolved (green), persisted (gray)
  - Error/empty states for missing IDs, incomplete audits, and missing params
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Diff pattern: Set-based matching with composite key = title + '|' + filePaths[0] — O(n) lookup"
    - "Section helper pattern: local function returning null when count===0 — no empty section headers rendered"
    - "Inline helpers pattern: formatRelativeDate defined per-file, consistent with history page"

key-files:
  created:
    - apps/web/app/(app)/audit/compare/page.tsx
  modified: []

key-decisions:
  - "Match key uses title + '|' + filePaths?.[0] ?? '' — composite key avoids false matches on shared titles across different files"
  - "Section helper returns null when count===0 — empty categories fully hidden without conditional wrapper boilerplate at call site"
  - "findings cast as AuditFindings (not typed column) — SQLite JSON column arrives as unknown at runtime, cast mirrors existing results-view pattern"

patterns-established:
  - "Pattern: Local Section helper for accented finding groups — reusable pattern for other comparison-style pages"

requirements-completed:
  - HIST-03
  - HIST-04

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 4 Plan 2: Comparison Page Summary

**Set-based findings diff page at /audit/compare with score delta banner, side-by-side severity charts, and three color-coded finding sections (new/resolved/persisted) reusing FindingCard and SeverityChart**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-22T10:00:00Z
- **Completed:** 2026-03-22T10:04:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created 251-line async server component at /audit/compare?a={id1}&b={id2}
- Inline `diffFindings` function using Set-based matching (title + filePath[0] composite key)
- Score delta computation with signed label (+N/-N) and green/red/neutral color coding
- Side-by-side `SeverityChart` showing previous vs latest finding distribution
- Three `Section` components for new (red-accented), resolved (green-accented), and persisted (gray) findings
- `Section` helper returns `null` when count is 0 — no empty section headers rendered
- Error states for missing params and incomplete audits; `notFound()` for invalid audit IDs

## Task Commits

1. **Task 1: Build comparison page with diff logic and categorized finding sections** - `0b3e7a8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/(app)/audit/compare/page.tsx` - Async server component: score delta, side-by-side charts, diffed finding sections

## Decisions Made

- Match key uses `title + '|' + filePaths?.[0] ?? ''` — composite key to avoid false matches when two findings have the same title but different file paths
- `Section` helper returns `null` when `count === 0` — eliminates the need for conditional wrappers at every call site and keeps render structure flat
- `findings` column cast as `AuditFindings` — consistent with the `results-view.tsx` pattern where the SQLite JSON column arrives as an unknown type at runtime

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `packages/audit-engine/src/progress-emitter.ts` were present before this plan and are unrelated to compare/page.tsx. Compare page compiles with zero errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- /audit/compare route is live and wired end-to-end to the History page Compare button
- Phase 4 (history-comparison) is fully complete: HIST-01, HIST-02, HIST-03, HIST-04 all satisfied
- No blockers for any subsequent phases

---
*Phase: 04-history-comparison*
*Completed: 2026-03-22*
