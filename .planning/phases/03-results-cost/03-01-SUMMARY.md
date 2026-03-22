---
phase: 03-results-cost
plan: 01
subsystem: ui
tags: [recharts, radix-ui, collapsible, next.js, server-component, results-dashboard, cost-display]

# Dependency graph
requires:
  - phase: 02-audit-setup
    provides: audit engine writing findings + auditPhases to SQLite, SSE progress stream
  - phase: 01-foundation
    provides: Drizzle schema (audits, auditPhases, AuditFindings type), Next.js app scaffold

provides:
  - /audit/[id]/results page (server component + client view) showing health score, severity chart, findings list, cost summary
  - SeverityBadge, SeverityChart, FindingCard, CostSummary reusable audit UI components
  - apps/web/lib/format.ts shared formatCost/formatTokens/getBudgetOverrun helpers
  - View Results button in progress-view navigating to results after completion
  - Null-findings handling for cancelled/failed audits (partial results from phase data)

affects: [03-02, download-zip, executive-report, technical-report]

# Tech tracking
tech-stack:
  added:
    - recharts (BarChart for severity counts)
    - "@radix-ui/react-collapsible" (collapsible finding remediation)
    - archiver + @types/archiver (report bundling, used in Plan 03-02)
    - puppeteer (HTML report generation, used in Plan 03-02)
  patterns:
    - Server Component loads data from SQLite, passes serializable props to "use client" ResultsView
    - Recharts BarChart with Cell-per-bar custom fill for severity color mapping
    - Radix Collapsible for progressive disclosure of finding remediation
    - Shared format helpers in lib/format.ts — imported by both progress-view and results-view

key-files:
  created:
    - apps/web/lib/format.ts
    - apps/web/components/audit/severity-badge.tsx
    - apps/web/components/audit/severity-chart.tsx
    - apps/web/components/audit/finding-card.tsx
    - apps/web/components/audit/cost-summary.tsx
    - apps/web/app/(app)/audit/[id]/results/page.tsx
    - apps/web/app/(app)/audit/[id]/results/results-view.tsx
  modified:
    - apps/web/app/(app)/audit/[id]/progress-view.tsx (import from format.ts, add View Results button)
    - apps/web/package.json (new dependencies)
    - pnpm-lock.yaml

key-decisions:
  - "Recharts installed directly (not via Shadcn chart CLI) since recharts is the underlying library — avoids adding chart.tsx wrapper overhead"
  - "ResultsView accepts typed AuditRow/PhaseRow inline types instead of importing Drizzle select type — avoids server-module leak into client bundle"
  - "Null findings gracefully handled: phases.flatMap(p => p.findings ?? []) collects partial findings from completed phases when audit.findings is null (cancelled/failed)"
  - "View Results uses <a href> not router.push — intentional full navigation to trigger fresh server component load"

patterns-established:
  - "Format helpers pattern: shared lib/format.ts exports formatCost, formatTokens, getBudgetOverrun — import in both server and client components"
  - "Severity color constants defined once per component (SeverityBadge has CSS classes, SeverityChart has hex values)"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-05, COST-01, COST-02, COST-03]

# Metrics
duration: 15min
completed: 2026-03-22
---

# Phase 3 Plan 01: Results Dashboard Summary

**Recharts severity chart + Radix Collapsible finding cards + cost summary banner on /audit/[id]/results server route, with View Results button wired in progress-view**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-22T09:29:22Z
- **Completed:** 2026-03-22T09:44:00Z
- **Tasks:** 3
- **Files modified:** 10 (7 created, 3 modified)

## Accomplishments

- Built complete /audit/[id]/results page: health score + grade, Recharts severity bar chart, filterable + sortable findings list with SeverityBadge and collapsible remediation via Radix Collapsible
- Created CostSummary component showing total cost/tokens banner, yellow budget overrun warning (>20% threshold), and per-phase breakdown table with duration
- Updated progress-view to import shared formatCost/formatTokens from lib/format.ts and show View Results link after audit completes
- Null-findings handling: cancelled/failed audits with no audit.findings show partial findings collected from individual phase rows with a yellow alert notice
- Download Zip, Executive Report, Technical Report placeholder links in results view (wired to routes in Plan 03-02)

## Task Commits

1. **Task 1: Shared utilities + audit UI components** - `50f22cf` (feat)
2. **Task 2: Results page — server component + client view** - `4067f94` (feat)
3. **Task 3: Progress-view "View Results" transition** - `b3bf096` (feat)

## Files Created/Modified

- `apps/web/lib/format.ts` - formatCost, formatTokens, getBudgetOverrun shared helpers
- `apps/web/components/audit/severity-badge.tsx` - Colored badge component per severity level
- `apps/web/components/audit/severity-chart.tsx` - Recharts BarChart with severity color mapping
- `apps/web/components/audit/finding-card.tsx` - Collapsible card with SeverityBadge + Radix Collapsible remediation
- `apps/web/components/audit/cost-summary.tsx` - Cost banner + budget overrun warning + per-phase table
- `apps/web/app/(app)/audit/[id]/results/page.tsx` - Server component loading audit + phases from SQLite
- `apps/web/app/(app)/audit/[id]/results/results-view.tsx` - Client component with filter/sort state
- `apps/web/app/(app)/audit/[id]/progress-view.tsx` - Imported shared format helpers, added View Results button

## Decisions Made

- Recharts installed directly instead of via Shadcn `shadcn add chart` CLI — the CLI would generate a chart.tsx wrapper file, but recharts is the underlying library and can be used directly, keeping the code simpler.
- ResultsView uses inline type definitions for AuditRow/PhaseRow props to avoid importing Drizzle server-side types into the client bundle.
- `<a href>` used for View Results navigation (not useRouter) so the results page always gets a fresh server component load with current DB data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts Tooltip formatter type mismatch**
- **Found during:** Task 1 (severity-chart.tsx TypeScript compilation)
- **Issue:** Explicit `(value: number)` annotation in Tooltip formatter was incompatible with Recharts `ValueType | undefined` parameter type
- **Fix:** Removed explicit type annotation — TypeScript infers the correct union type
- **Files modified:** apps/web/components/audit/severity-chart.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** 50f22cf (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 type error bug)
**Impact on plan:** Minimal fix required for TypeScript correctness. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `packages/audit-engine/src/progress-emitter.ts` (referencing `audit.provider` which doesn't exist in schema). Documented in deferred-items.md. These errors prevent `pnpm --filter web build` from completing, but TypeScript compilation for the web app passes cleanly for all new files (`tsc --noEmit` with grep exclusion).
- Pre-existing `pnpm --filter web build` failure: `packages/audit-engine` has no `dist/` directory (not built). This blocks Next.js Turbopack from resolving audit-engine imports. Not caused by our changes — audit-engine needs `pnpm --filter @codeaudit/audit-engine build` to be run first.

## Known Stubs

- Download Zip link (`/api/audit/${auditId}/download`) — route does not exist yet, created in Plan 03-02
- Executive Report link (`/audit/${auditId}/executive`) — route does not exist yet, created in Plan 03-02
- Technical Report link (`/audit/${auditId}/technical`) — route does not exist yet, created in Plan 03-02

These stubs are intentional per the plan spec: "These hrefs reference routes created in Plan 03-02 — the buttons will work once that plan runs."

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-02 can now implement download/report routes — the placeholder links in results-view.tsx are already wired to the correct paths
- Pre-existing audit-engine build issue should be resolved before end-to-end testing of the results page
- The `audit.provider` field missing from schema (used in progress-emitter.ts) should be addressed in a maintenance pass

---
*Phase: 03-results-cost*
*Completed: 2026-03-22*
