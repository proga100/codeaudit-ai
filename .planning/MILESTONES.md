# Milestones

## v1.2 Polyglot Audit Engine (Shipped: 2026-03-23)

**Phases completed:** 4 phases, 6 plans, 12 tasks

**Key accomplishments:**

- Zod RepoContextSchema with 12 polyglot fields, audits.repo_context SQLite column, and dual getRepoContext/getRepoContextObject API with pre-v1.2 backward compatibility
- Rewrote phase-00.ts to detect 9+ language ecosystems, per-language LOC for 11 groups, 7 CI systems, and polyglot monorepo tools — all persisted to audits.repoContext via Drizzle after generateObject
- Sandboxed execCommand tool + runPhaseWithTools helper enabling LLM-driven polyglot auditing via Vercel AI SDK generateText with tools and PhaseOutputSchema structured output
- Phases 1-5 (Orientation, Dependency Health, Test Coverage, Code Complexity, Git History) migrated from hardcoded JS/TS shell commands to LLM tool-use delegation via runPhaseWithTools()
- Phases 6-9 (Security, Deep Reads, CI/CD, Documentation) migrated from hardcoded JS/TS shell commands to LLM-driven tool-use, completing full polyglot audit coverage across all 9 phases.
- Structural sign-off of v1.2 Polyglot Audit Engine: TypeScript zero errors, all 9 phase runners delegate to runPhaseWithTools, Phase 0 covers Python and Go ecosystems, sandbox allows polyglot tools

---

## v1.1 UI Redesign (Shipped: 2026-03-22)

**Phases completed:** 4 phases, 9 plans, 16 tasks

**Key accomplishments:**

- Deleted all old frontend code (5,967 lines) and established Tailwind CSS 4 design token system with dark/light themes, Geist + JetBrains Mono fonts, 6 keyframe animations, and complete @theme block
- Segmented dark/light ThemeToggle with localStorage persistence and a two-step setup wizard at /setup wired to addApiKey + completeSetup server actions
- One-liner:
- Single-page audit configuration form at /audit/new with live cost estimation, folder validation, SelectCard grids for type/depth, provider/model dropdowns, and a confirmation modal that fires startAudit and redirects to /audit/[id]
- Real-time audit progress page at /audit/[id] with SSE-driven animated progress bar, live token/cost/elapsed stats, expandable 13-phase list with status icons, cancel button, and completion state with View Results button
- One-liner:
- Folder-grouped audit history with yellow-accent checkbox selection, bulk delete modal, and Compare navigation built from Drizzle server component + interactive client component
- Set-based audit comparison page with delta banner and three-section finding diff, plus full CRUD API Keys settings page with SelectCard provider picker and inline edit/delete

---

## v1.0 CodeAudit MVP (Shipped: 2026-03-22)

**Phases completed:** 4 phases, 10 plans, 22 tasks

**Key accomplishments:**

- SQLite/better-sqlite3 replacing Neon Postgres, GitHub OAuth stripped, no-auth app shell with dark sidebar, and npx CLI launcher with ENCRYPTION_KEY bootstrap and health-check browser open
- chmod/git push block safety service with promisify(execFile), multi-folder FolderPicker with per-path server action validation, and first-time setup wizard reusing addApiKey
- 5-component audit configuration UI with live cost estimate, folder-safety-enforcing startAudit Server Action, and /api/models route for dynamic model listing
- LLM adapter (3 providers), audit orchestrator with cancel/checkpoint/cleanup, and detached POST /api/audit/[id] endpoint that returns 202 immediately
- 12 audit phase runners (phase-00 through phase-11) implemented and registered — audit engine executes full codebase analysis end-to-end via shell commands + LLM structured output
- SSE stream endpoint polling SQLite every 500ms with state replay on reconnect, cancel endpoint, ProgressView client component with phase-by-phase expandable detail and cancel button at /audit/[id]
- Recharts severity chart + Radix Collapsible finding cards + cost summary banner on /audit/[id]/results server route, with View Results button wired in progress-view
- Zip download, Puppeteer PDF, and iframe-embedded Phase 11 HTML report viewer pages with app chrome (back button, PDF download) using archiver streaming and missing-file guards
- Async server component at /history querying SQLite, grouping audits by folderPath with score/grade badges and a Compare button pre-filled with latest two audit IDs per folder
- Set-based findings diff page at /audit/compare with score delta banner, side-by-side severity charts, and three color-coded finding sections (new/resolved/persisted) reusing FindingCard and SeverityChart

---
