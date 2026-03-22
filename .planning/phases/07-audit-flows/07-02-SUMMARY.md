---
phase: 07-audit-flows
plan: 02
subsystem: ui
tags: [react, sse, next.js, progress-bar, real-time, audit]

# Dependency graph
requires:
  - phase: 07-audit-flows-01
    provides: New Audit form and startAudit server action
  - phase: 06-shell-onboarding
    provides: Sidebar layout, shared UI components (Badge, Button), design tokens
provides:
  - Audit Progress page at /audit/[id] with live SSE updates
  - AuditProgress client component with animated progress bar, real-time stats, cancel, phase list
  - Server component fetching audit record from SQLite
affects: [08-results-view, any future audit-related pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component fetches + serializes data, client component handles interactivity
    - EventSource SSE subscription in useEffect with status-based cleanup
    - Derived progress state from phasesCompleted/phasesTotal
    - Inline SVG icons for self-contained component

key-files:
  created:
    - apps/web/app/(app)/audit/[id]/page.tsx
    - apps/web/app/(app)/audit/[id]/audit-progress.tsx
  modified: []

key-decisions:
  - "PHASE_NAMES constant defined in client component — audit-engine package is server-only, cannot be imported in client bundles"
  - "Progress bar uses inline style for gradient (not Tailwind class) — dynamic CSS vars in linear-gradient require inline style"
  - "SSE effect depends on [audit.id, status] — terminal status prevents reconnect loop after completion/cancel"

patterns-established:
  - "AuditData serialization pattern: server converts Date to ISO string, client receives plain object"
  - "SSE subscription: open on running/queued, auto-close on terminal state via effect dependency on status"
  - "Phase cost estimate: $3/Mtok rough calculation from tokensUsed"

requirements-completed: [PROG-01, PROG-02, PROG-03, PROG-04, PROG-05, PROG-06]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 7 Plan 02: Audit Progress Page Summary

**Real-time audit progress page at /audit/[id] with SSE-driven animated progress bar, live token/cost/elapsed stats, expandable 13-phase list with status icons, cancel button, and completion state with View Results button**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-23T18:56:42Z
- **Completed:** 2026-03-23T18:59:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Built server component at /audit/[id] that fetches audit record from SQLite, returns 404 if missing, serializes Date fields for client
- Built AuditProgress client component with full SSE subscription receiving both "phase" and "audit" event types
- Implemented animated progress bar with accent gradient + progressPulse glow during run, green gradient on completion, destructive on cancel/fail
- Live stats row showing token count, cost (microdollars to dollars), and elapsed seconds (1s interval)
- Cancel button with POST to /api/audit/[id]/cancel and loading state
- Expandable phase list with 13 rows, status icons (completed/running/failed/pending), findings count, duration, cost estimate
- View Results button (green, lg) links to /audit/[id]/results on completion

## Task Commits

1. **Task 1: Create server page.tsx** - `e5685bf` (feat)
2. **Task 2: Build AuditProgress client component** - `378a6b6` (feat)

## Files Created/Modified

- `apps/web/app/(app)/audit/[id]/page.tsx` - Async server component: DB fetch, 404, serialize, render AuditProgress
- `apps/web/app/(app)/audit/[id]/audit-progress.tsx` - Client component: SSE, progress bar, stats, cancel, phase list, completion

## Decisions Made

- PHASE_NAMES constant defined in client component — audit-engine is server-only
- Progress bar uses inline style for `linear-gradient` — dynamic CSS variable references in gradients require inline style, not Tailwind classes
- SSE useEffect depends on `[audit.id, status]` — terminal status values in dependency array prevents re-opening connections after audit ends

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- First build attempt failed with "Module not found: Can't resolve './new-audit-form'" — this was a transient Turbopack cache issue with a pre-existing file. Second build succeeded cleanly with `/audit/[id]` listed as a dynamic route.

## Known Stubs

None — all data flows wired from SSE events to UI.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Audit Progress page complete with all 6 PROG requirements
- Ready for Phase 08: Results view at /audit/[id]/results
- SSE endpoint and cancel endpoint already exist and are wired

---
*Phase: 07-audit-flows*
*Completed: 2026-03-23*
