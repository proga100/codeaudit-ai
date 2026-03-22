# Phase 1: App Shell & Configuration - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning (REWRITTEN after local-first pivot)

<domain>
## Phase Boundary

Users can open the app at localhost (via `npx codeaudit`), manage encrypted LLM API keys, select one or more local folders to audit, configure audit type/depth/model, see a live cost estimate, and confirm to start. The app enforces read-only safety on target folders before any audit begins. No authentication — it's a local tool.

</domain>

<decisions>
## Implementation Decisions

### App Startup & Auth
- **D-01:** No authentication needed — local tool, only the user has access (like VS Code).
- **D-02:** App starts via `npx codeaudit` — downloads and runs, opens browser at localhost automatically.
- **D-03:** First-time users see a quick setup wizard: 1) Add API key 2) Done. Then main screen. One-time only.

### Folder Selection
- **D-04:** Path input with Browse button for folder selection. Supports selecting multiple folders.
- **D-05:** If multiple folders selected, app runs individual audits on each first, then proceeds with multi-repo audit (per `multi_repo_review_guide.md`).
- **D-06:** If selected folder is not a git repo, ask user if they want to proceed. During audit, skip git-specific phases (archaeology, push block, etc.).
- **D-07:** Main screen shows recently audited folders for quick re-run.

### Audit Configuration
- **D-08:** All configuration on one page — folder picker at top, then type/depth/model/estimate below. Single scrollable page.
- **D-09:** Always start with defaults (Full audit, Deep, first key) — no "remember last settings."
- **D-10:** Audit type selection uses card UI — 4 cards (full, security-only, team, code quality) as established in Phase 2 discussion from prior version.
- **D-11:** Depth selection uses Quick Scan / Deep Audit toggle with time and cost details.
- **D-12:** API key selection via dropdown grouped by provider (e.g., "Anthropic — Personal").

### Model Selection
- **D-13:** After selecting a provider/key, the app fetches available models from that provider's API and shows them in a model selector dropdown.
- **D-14:** For Anthropic: show Sonnet and Opus models. For OpenAI: show GPT-4o, etc. For Gemini: show Flash, Pro, etc. Models fetched dynamically, not hardcoded.
- **D-15:** Include an "Auto" mode where the app selects the best model suitable for each audit phase automatically (e.g., cheaper model for simple phases, stronger model for security analysis).

### Cost Estimate
- **D-16:** Cost estimate updates live as user changes configuration (type, depth, model) — even before folder is picked, shows a range.
- **D-17:** Cost estimate is a rough range (e.g., "$3–$8") based on folder size heuristic and audit configuration.
- **D-18:** "Start Audit" button opens a confirmation dialog summarizing: folder(s), type, depth, model, estimated cost — user confirms to proceed.

### Safety Enforcement
- **D-19:** App locks target folder read-only (`chmod -R a-w`) and blocks git push (`git remote set-url --push origin no_push`) before audit starts — exactly replicating the manual process.
- **D-20:** App creates a separate audit output directory (`~/audit-{repo-name}/`) for all findings.
- **D-21:** App unlocks folder after audit completes, is cancelled, or fails.

### UI & Visual Style
- **D-22:** Linear-style aesthetic carried forward — clean, minimal, dark mode default, sharp typography (from old Phase 1 context D-12).
- **D-23:** Left sidebar navigation (from old D-11) — adapted for local tool: Dashboard (recent audits), New Audit, Settings (API keys).

### Claude's Discretion
- Exact card icons/descriptions for audit types
- Search/filter behavior for recent folders
- Setup wizard transitions
- Cost heuristic formula details
- Model capability mapping for Auto mode
- Error states for folder permission issues

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit Process (source of truth)
- `manual-codebase-review-process/CLAUDE.md` — Safety rules, bootstrap script, chmod/push-block procedure
- `manual-codebase-review-process/codebase_review_guide.md` §"Setup" — Folder locking, audit directory creation
- `manual-codebase-review-process/codebase_review_guide.md` §"Run modes" — Security-only, team, phase-by-phase modes
- `manual-codebase-review-process/how_to_run_codebase_audit.md` §"Token budget reality check" — Repo size tiers and cost estimates
- `manual-codebase-review-process/multi_repo_review_guide.md` — Multi-folder audit flow (individual first, then cross-repo)

### Research (partially applicable after pivot)
- `.planning/research/STACK.md` — Vercel AI SDK for multi-LLM support (still relevant)
- `.planning/research/PITFALLS.md` — API key encryption, multi-provider prompt differences (still relevant)
- `.planning/research/FEATURES.md` — Table stakes and differentiators (adapted for local tool)

### Existing Code (from old Phase 1 — reusable)
- `packages/db/src/encryption.ts` — AES-256-GCM encryption utility (reuse for API keys)
- `packages/db/src/encryption.test.ts` — Encryption unit tests
- `apps/web/lib/api-key-validator.ts` — Per-provider key validation (reuse)
- `apps/web/components/nav/sidebar.tsx` — Sidebar nav (adapt for local tool)
- `apps/web/components/ui/` — Shadcn/ui components (reuse)
- `packages/db/src/schema.ts` — Drizzle schema (adapt: remove GitHub tables, keep audit/key tables)

### Existing Code (from old Phase 1 — to remove)
- `apps/web/lib/auth.ts` — Auth.js utilities (remove)
- `apps/web/lib/github-app.ts` — GitHub App helpers (remove)
- `apps/web/lib/github-token-refresh.ts` — Token refresh (remove)
- `apps/web/app/api/github/` — Webhook handler (remove)
- `apps/web/app/(auth)/` — Sign-in page (remove)
- `apps/web/middleware.ts` — Auth middleware (remove or simplify)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `encryption.ts` + `encryption.test.ts`: AES-256-GCM for API key storage — directly reusable
- `api-key-validator.ts`: Tests keys against Anthropic/OpenAI/Gemini — reuse and extend with model listing
- `sidebar.tsx`: Left sidebar component — adapt sections for local tool (Dashboard, New Audit, Settings)
- `schema.ts`: Drizzle schema with `apiKeys`, `audits`, `auditPhases` tables — adapt (remove GitHub-specific tables)
- Shadcn/ui components in `components/ui/` — buttons, inputs, cards, dropdowns
- Docker Compose dev environment (Postgres, Redis)
- Tailwind CSS 4 + dark mode configuration

### Established Patterns
- Server actions in `apps/web/actions/` — follow for new audit actions
- Shadcn/ui component library — reuse for all new UI
- Dark mode / Linear aesthetic — established CSS variables and design tokens

### Integration Points
- New "New Audit" page replacing the old "Repos" page
- New folder selection component (browser native dialog via backend)
- New model fetcher service (calls provider API to list available models)
- Adapt sidebar for Dashboard / New Audit / History / Settings

</code_context>

<specifics>
## Specific Ideas

- `npx codeaudit` as the entry point keeps distribution dead simple — no install, no config
- Multi-folder selection enables the multi-repo audit flow from `multi_repo_review_guide.md` — individual audits first, then cross-repo
- Auto mode for model selection is a differentiator — cheaper models for simple phases (orientation, docs), stronger models for security/architecture analysis
- The confirmation dialog before starting is the "last chance" gate — shows everything the user is about to spend

</specifics>

<deferred>
## Deferred Ideas

- Multi-repo audit execution logic (individual + cross-repo) — noted in D-05 but actual execution is a future phase
- npm global install / Homebrew distribution — v2 after npx is working

</deferred>

---

*Phase: 01-app-shell-configuration*
*Context gathered: 2026-03-22*
