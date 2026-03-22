---
phase: 06-shell-onboarding
plan: 01
subsystem: ui
tags: [react, nextjs, tailwind, theme, setup-wizard, localStorage, dark-mode]

requires:
  - phase: 05-foundation
    provides: "Design tokens in globals.css, Button/Input/SelectCard/Card shared components, cn() util"

provides:
  - "ThemeToggle component at apps/web/components/ui/theme-toggle.tsx — segmented sun/moon, localStorage persistence, classList toggle"
  - "Setup wizard at apps/web/app/setup/page.tsx — two-step flow: welcome with feature grid, API key with provider selector"
  - "First-run gating: (app)/layout.tsx redirect to /setup enforces setup_complete check"

affects:
  - 06-02-shell-onboarding (sidebar reuses ThemeToggle)
  - any page that needs dark/light theme toggling

tech-stack:
  added: []
  patterns:
    - "use client directive on interactive wizard pages outside (app) route group"
    - "ThemeToggle persists to localStorage and syncs document.documentElement.classList"
    - "Server actions (addApiKey + completeSetup) called directly from client component with try/catch error handling"

key-files:
  created:
    - apps/web/components/ui/theme-toggle.tsx
    - apps/web/app/setup/page.tsx
  modified: []

key-decisions:
  - "ThemeToggle uses neutral bg-text/text-background colors (NOT accent) per DSYS-03 spec — consistent across dark and light modes"
  - "Setup page lives OUTSIDE (app) route group so it renders without sidebar — correct per SIDE-03"
  - "completeSetup() server action handles both the DB insert and redirect in one call"

patterns-established:
  - "Theme persistence: localStorage.setItem('theme', t) + document.documentElement.classList toggle"
  - "Floating toggle: absolute top-5 right-6 on full-viewport pages"
  - "Two-step wizard: step state with conditional rendering, not routing"

requirements-completed: [SETUP-01, SETUP-02, SETUP-03, SETUP-04, DSYS-03]

duration: 15min
completed: 2026-03-23
---

# Phase 06 Plan 01: Shell Onboarding — ThemeToggle + Setup Wizard Summary

**Segmented dark/light ThemeToggle with localStorage persistence and a two-step setup wizard at /setup wired to addApiKey + completeSetup server actions**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-23T00:00:00Z
- **Completed:** 2026-03-23T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ThemeToggle component: 34x28px segmented sun/moon buttons, neutral colors (bg-text/text-background), reads localStorage on mount, persists and applies theme on toggle
- Setup wizard step 1: full-viewport centered layout, 72px gradient logo, welcome heading, 2x2 feature grid, Get Started CTA
- Setup wizard step 2: back button, provider SelectCard row (Anthropic/OpenAI/Gemini), password+mono API key input, optional label input, error display, Add Key & Continue
- Floating ThemeToggle (absolute top-5 right-6) on both steps per SETUP-03
- Build passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ThemeToggle component** - `3a650c6` (feat)
2. **Task 2: Build complete setup wizard** - `1cf7a64` (feat)

## Files Created/Modified
- `apps/web/components/ui/theme-toggle.tsx` - Reusable segmented sun/moon toggle; reads/writes localStorage; toggles document.documentElement.classList
- `apps/web/app/setup/page.tsx` - Two-step client-side wizard; step 1 welcome, step 2 API key; calls addApiKey + completeSetup server actions

## Decisions Made
- ThemeToggle uses neutral bg-text/text-background colors (not accent) — matches prototype spec line 155 of UI guide
- FeatureIcon extracted as a helper component to keep JSX clean without duplicating SVG inline per feature
- Setup page uses conditional rendering (step state) rather than routing to keep wizard self-contained

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build command needed to run from `apps/web/` directory, not the monorepo root — handled via cd

## Next Phase Readiness
- ThemeToggle is ready to be reused in plan 06-02 sidebar
- Setup wizard fully functional: first-run users hit /setup, add key, get redirected to /dashboard
- (app)/layout.tsx guard (redirect to /setup) already in place from Phase 5

---
*Phase: 06-shell-onboarding*
*Completed: 2026-03-23*
