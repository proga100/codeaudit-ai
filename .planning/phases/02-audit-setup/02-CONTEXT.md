# Phase 2: Audit Setup - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse their GitHub repos, configure an audit (type, depth, provider/key), review a cost estimate, and submit for execution. Backend clones the selected repo into a sandboxed read-only container. This phase bridges the auth/key foundation (Phase 1) and the audit engine (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Repo Browser
- **D-01:** Flat searchable list — all repos in one list with search bar, no org grouping.
- **D-02:** Each repo shows: name, GitHub description, and audit status (whether audited before, last audit date).
- **D-03:** Clicking a repo expands an inline config panel right in the list — no page navigation.

### Audit Configuration
- **D-04:** Audit type selection uses card UI — 4 cards with icons, name, description, and estimated time. Click to select. Types: full audit, security-only, team & collaboration, code quality.
- **D-05:** Depth selection uses a toggle (Quick Scan / Deep Audit) that shows estimated time and cost for each option when selected.
- **D-06:** API key selection uses a single dropdown grouped by provider (e.g., "Anthropic — Personal", "OpenAI — Work"). Multiple keys per provider from Phase 1 (D-07) are listed here.

### Cost Estimate Gate
- **D-07:** Cost estimate is a rough range (e.g., "$3–$8 estimated") based on repo size heuristic and audit type/depth. Not a per-phase breakdown.
- **D-08:** When estimate exceeds $20, show a yellow warning banner with the cost. User must explicitly click "Start audit" to proceed. No automatic blocking.

### Sandbox & Cloning
- **D-09:** Cloning shows a brief status message ("Cloning repository...") before transitioning to audit progress view. Not invisible, not detailed.
- **D-10:** Clone failures show a clear error message explaining what went wrong (access revoked, repo too large, timeout) with a "Retry" button.

### Claude's Discretion
- Exact card icons and descriptions for audit types
- Search debounce timing and empty state design
- Inline config panel animation/transition
- Cost heuristic formula (repo size × phases × provider pricing)
- Sandbox container configuration details (Docker flags, network policy)
- Clone timeout thresholds and retry limits

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit Process (source of truth)
- `manual-codebase-review-process/CLAUDE.md` — Safety rules, bootstrap script, sandbox requirements
- `manual-codebase-review-process/codebase_review_guide.md` §"Run modes" — Defines security-only, team, and phase-by-phase audit modes
- `manual-codebase-review-process/how_to_run_codebase_audit.md` §"Token budget reality check" — Repo size tiers and cost estimates

### Research
- `.planning/research/STACK.md` — Recommended stack including BullMQ for job queue
- `.planning/research/PITFALLS.md` — Git hook RCE (CVE-2025-48384), sandbox isolation requirements
- `.planning/research/ARCHITECTURE.md` — Sandbox container design, clone safety

### Phase 1 Code (integration points)
- `apps/web/components/nav/sidebar.tsx` — Existing sidebar with "Repos" and "Audits" nav items
- `apps/web/lib/github-app.ts` — GitHub App URL helpers for repo access
- `apps/web/lib/github-token-refresh.ts` — Token refresh for GitHub API calls
- `apps/web/lib/api-key-validator.ts` — Key validation service (reuse for key picker)
- `packages/db/src/schema.ts` — Database schema including `audits` and `audit_phases` tables

### Phase 1 Context (prior decisions)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-03 (per-repo selection), D-07 (multiple keys per provider), D-11 (sidebar nav), D-12 (Linear aesthetic)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sidebar.tsx`: Sidebar nav already has "Repos" and "Audits" menu items — repo browser goes in the Repos route
- `github-app.ts`: GitHub App helpers can fetch repo list via GitHub API
- `github-token-refresh.ts`: Token refresh needed for GitHub API calls to list repos
- `api-key-validator.ts`: Validation logic can be reused for the key picker UI (show validation status)
- `schema.ts`: `audits` table with `repoId`, `auditType`, `auditDepth`, `status`, `apiKeyId` columns already exist
- `encryption.ts`: AES-256-GCM utilities for decrypting keys server-side when starting an audit

### Established Patterns
- Auth.js v5 database sessions — all server actions use `getRequiredSession()`
- Server actions pattern in `apps/web/actions/` — follow for audit creation
- Shadcn/ui components — reuse for cards, dropdowns, search input
- Dark mode / Linear aesthetic — established in Phase 1

### Integration Points
- New "Repos" page at `apps/web/app/(dashboard)/repos/page.tsx`
- New audit creation server action at `apps/web/actions/audits.ts`
- Sandbox cloning logic goes in `packages/repo-sandbox/` (stub exists from Phase 1)
- Audit job enqueue connects to BullMQ worker (stub exists at `worker/`)

</code_context>

<specifics>
## Specific Ideas

- Inline config panel in repo list keeps the flow tight — user doesn't lose context navigating away
- Card-based audit type selection should feel like Linear's project views — clean cards with clear icons
- Cost estimate as a rough range manages expectations better than false precision
- "Cloning repository..." status is a brief transitional state, not a full progress view (that's Phase 3)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-audit-setup*
*Context gathered: 2026-03-22*
