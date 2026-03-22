---
phase: 07-audit-flows
plan: 01
subsystem: ui
tags: [react, nextjs, server-components, server-actions, cost-estimation, form, modal]

# Dependency graph
requires:
  - phase: 06-shell-onboarding
    provides: Sidebar layout, shared UI components (SelectCard, Input, Button, Modal), design tokens
  - phase: 05-foundation
    provides: globals.css design token system, Badge, Button, Card, SelectCard, Input, Modal components
provides:
  - /audit/new page — complete single-page audit configuration form
  - NewAuditForm client component with all 6 NAUD requirements
  - startAudit server action redirect updated from /queued to /audit/[id]
affects: [08-progress, 09-results, audit-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component fetches + serializes data, passes to client form component (same as dashboard pattern)
    - NEXT_REDIRECT error detection in async server action calls from client
    - optgroup-based provider/key grouping in native select element

key-files:
  created:
    - apps/web/app/(app)/audit/new/page.tsx
    - apps/web/app/(app)/audit/new/new-audit-form.tsx
  modified:
    - apps/web/actions/audit-start.ts

key-decisions:
  - "NEXT_REDIRECT from startAudit is detected in catch block — only real errors shown to user"
  - "Native select with optgroup used for provider/key grouping (matches prototype, no extra dependencies)"
  - "SVG icons inlined directly in form component — avoids Icon component dependency, consistent with prototype"

patterns-established:
  - "Form section pattern: SectionLabel + content + className fade-in stagger-N mb-7"
  - "Folder validation: blur triggers server action, spinner/check/X icons indicate state, git warning appears if not a repo"
  - "Cost estimate derived client-side from cost-estimator-shared.ts — zero server round trips on selection change"

requirements-completed: [NAUD-01, NAUD-02, NAUD-03, NAUD-04, NAUD-05, NAUD-06]

# Metrics
duration: 7min
completed: 2026-03-22
---

# Phase 7 Plan 1: New Audit Form Summary

**Single-page audit configuration form at /audit/new with live cost estimation, folder validation, SelectCard grids for type/depth, provider/model dropdowns, and a confirmation modal that fires startAudit and redirects to /audit/[id]**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-22T20:16:43Z
- **Completed:** 2026-03-22T20:23:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Server page.tsx fetches API keys and recent folders, serializes dates for client
- Full NewAuditForm client component implementing all 6 NAUD requirements
- Live cost estimate using client-safe estimateCostRange() — zero extra server calls on selection change
- Confirmation modal with summary grid, folder lock warning, and proper NEXT_REDIRECT handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server page.tsx** - `18a4e96` (feat)
2. **Task 2: Build NewAuditForm client component** - `29795c9` (feat)

## Files Created/Modified
- `apps/web/app/(app)/audit/new/page.tsx` - Async server component; fetches keys + recent folders, renders NewAuditForm
- `apps/web/app/(app)/audit/new/new-audit-form.tsx` - Client form with folder validation, type/depth SelectCards, provider/model dropdowns, live cost estimate, confirm modal
- `apps/web/actions/audit-start.ts` - Changed redirect from /audit/[id]/queued to /audit/[id]

## Decisions Made
- Used native `<select>` with `<optgroup>` for provider/key grouping — matches prototype, no extra library needed
- NEXT_REDIRECT errors from startAudit server action detected in catch block by message check — prevents false error display on successful redirect
- All SVG icons inlined directly in the form component using thin SvgIcon wrapper — consistent with prototype approach

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /audit/new is complete and wired to startAudit server action
- startAudit creates an audit DB record and redirects to /audit/[id] — Phase 08 (audit progress) needs to build that page
- No blockers for Phase 08

---
*Phase: 07-audit-flows*
*Completed: 2026-03-22*
