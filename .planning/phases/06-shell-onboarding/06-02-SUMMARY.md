---
phase: 06-shell-onboarding
plan: 02
subsystem: frontend/shell
tags: [sidebar, layout, dashboard, navigation, server-component, client-component]
dependency_graph:
  requires: [06-01]
  provides: [SIDE-01, SIDE-02, SIDE-03, DASH-01, DASH-02, DASH-03]
  affects: [all (app) route pages]
tech_stack:
  added: []
  patterns:
    - Server component fetches data, passes serialized props to client component
    - RecentAuditsTable as thin client wrapper for interactive row navigation
    - Sidebar as "use client" component using usePathname for active state detection
key_files:
  created:
    - apps/web/components/sidebar.tsx
    - apps/web/app/(app)/dashboard/recent-audits-table.tsx
  modified:
    - apps/web/app/(app)/layout.tsx
    - apps/web/app/(app)/dashboard/page.tsx
decisions:
  - Nested Link avoidance: Used div onClick + stopPropagation in client RecentAuditsTable instead of nested Links
  - Active state logic: exact match for /dashboard, prefix match for other routes (avoids false highlights)
  - Dashboard split: server page.tsx fetches + serializes data, client recent-audits-table.tsx handles interactivity
metrics:
  duration_seconds: 135
  completed_date: "2026-03-22T20:01:34Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 06 Plan 02: Sidebar Layout and Dashboard Summary

**One-liner:** 252px sticky sidebar with logo/nav/theme-toggle wrapping all (app) pages via flex layout; dashboard with 3 quick-action cards and recent audits table showing folder/date/badges/health-score.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build Sidebar component and update (app) layout | 7b4c93e | apps/web/components/sidebar.tsx, apps/web/app/(app)/layout.tsx |
| 2 | Build Dashboard page | f5d0d87 | apps/web/app/(app)/dashboard/page.tsx, apps/web/app/(app)/dashboard/recent-audits-table.tsx |

## What Was Built

### Task 1: Sidebar + Layout

`apps/web/components/sidebar.tsx` — "use client" component that:
- Renders at 252px width, full viewport height, sticky positioned
- Logo section: gradient div (accent to amber) with shield SVG + "CodeAudit AI" text
- 4 nav items: Dashboard (/dashboard), New Audit (/audit/new), History (/history), API Keys (/settings/api-keys)
- Active state detection via `usePathname()` — exact match for /dashboard, prefix match for others
- Active styles: `bg-accent-subtle text-accent font-semibold`
- Inactive styles: `text-text-secondary hover:bg-hover`
- NavIcon helper renders inline SVGs for grid/plus/clock/key icons
- Bottom section: "Theme" label + ThemeToggle with `border-t border-border`

`apps/web/app/(app)/layout.tsx` — updated to:
- Import and render Sidebar component
- Use `<div className="flex min-h-screen">` wrapping Sidebar + `<main className="flex-1 min-w-0">`
- Preserve setup_complete guard (redirect to /setup if not configured)

### Task 2: Dashboard

`apps/web/app/(app)/dashboard/page.tsx` — async server component that:
- Queries audits table via `getDb()`, ordering by `desc(audits.createdAt)`, limit 5
- Serializes dates to ISO strings and extracts score from findings before passing to client component
- Renders 3 quick-action cards (New Audit, View History, Manage Keys) using Card with hover prop
- "New Audit" card uses accent background for icon; others use elevated background
- "Recent Audits" section with "View all →" link to /history

`apps/web/app/(app)/dashboard/recent-audits-table.tsx` — "use client" component that:
- Receives serialized AuditRow[] from server
- Row click navigates via `useRouter().push('/audit/[id]/results')`
- Edit button uses Link with `e.stopPropagation()` to avoid nested navigation
- Shows empty state when no audits present
- Grid columns: folderName (mono font), date, type Badge, depth Badge (accent color for deep), HealthScore size="sm", edit button

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data is wired to real DB queries via getDb().

## Self-Check: PASSED

Files verified:
- FOUND: apps/web/components/sidebar.tsx
- FOUND: apps/web/app/(app)/layout.tsx
- FOUND: apps/web/app/(app)/dashboard/page.tsx
- FOUND: apps/web/app/(app)/dashboard/recent-audits-table.tsx

Commits verified:
- FOUND: 7b4c93e (feat(06-02): build sidebar component and update (app) layout)
- FOUND: f5d0d87 (feat(06-02): build dashboard page with quick actions and recent audits table)

Build verified: `npx next build` passes — /dashboard route shows as static (○) prerendered successfully.
