# Milestones

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
