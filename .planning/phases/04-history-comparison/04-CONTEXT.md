# Phase 4: History & Comparison - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse all past audits grouped by folder, view any past audit's full results, and generate a delta comparison report when two or more audits exist for the same folder. The comparison highlights score changes, resolved findings, and newly introduced findings.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion (user deferred all decisions)

The user explicitly delegated all UX decisions for this phase. Claude should follow established patterns from prior phases and make sensible choices:

#### History List
- Paginated list of all audits, grouped by folder path
- Each row shows: folder name, audit date, type, depth, health score badge, status
- Click any audit → navigates to its full results dashboard (already built in Phase 3)
- Accessible from sidebar "History" or "Audits" nav item
- Follow Linear aesthetic and existing component patterns (SeverityBadge, etc.)

#### Comparison Report
- When a folder has 2+ audits, show a "Compare" button on the history page
- Default comparison: latest vs previous audit for that folder
- User can also select any two audits to compare
- Comparison shows: score delta (+/- with color), resolved findings (green), new findings (red), unchanged findings (gray)
- Finding-level diff: match findings by title + file path, categorize as resolved/new/persisted
- Follow the Phase 12 comparison approach from `manual-codebase-review-process/codebase_review_guide.md`

#### Navigation
- History page at `/audits` (already has sidebar nav item from Phase 1)
- Comparison page at `/audit/compare?a={id1}&b={id2}`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit Comparison (source of truth)
- `manual-codebase-review-process/codebase_review_guide.md` §"Phase 12" — Comparison report methodology, what to compare, how to detect improvements/degradations
- `manual-codebase-review-process/how_to_run_codebase_audit.md` §"What you get when it's done" — Comparison output format

### Phase 3 Code (data source + patterns)
- `apps/web/app/(app)/audit/[id]/results/results-view.tsx` — Results rendering pattern to reuse
- `apps/web/components/audit/finding-card.tsx` — FindingCard component to reuse in comparison
- `apps/web/components/audit/severity-badge.tsx` — SeverityBadge reuse
- `apps/web/components/audit/severity-chart.tsx` — SeverityChart reuse (side-by-side in comparison)
- `apps/web/lib/format.ts` — Shared formatters (formatCost, formatTokens, formatDuration)

### Database Schema
- `packages/db/src/schema.ts` — `audits` table (findings JSONB with score/grade/findings array), `auditPhases` table

### Prior Decisions
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-22 (Linear aesthetic), D-23 (sidebar nav)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `results-view.tsx`: Full findings rendering — reuse for viewing past audits (already works for any audit ID)
- `finding-card.tsx`, `severity-badge.tsx`, `severity-chart.tsx`, `cost-summary.tsx`: All reusable in comparison view
- `format.ts`: formatCost, formatTokens, formatDuration
- Dashboard page already queries `audits` table — extend for history list
- `audits.findings` JSONB has score, grade, severity counts, findings array — all needed for comparison

### Established Patterns
- Server Components for data loading, Client Components for interactivity
- Drizzle ORM queries on SQLite
- Shadcn/ui components + dark mode

### Integration Points
- `/audits` route (history page) — sidebar already links here
- Results page at `/audit/[id]/results` already handles any audit ID — past audits just navigate there
- New comparison page at `/audit/compare`
- Finding diff logic: match by `title + filePath`, categorize as resolved/new/persisted

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred all decisions to Claude.

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase of v1.

</deferred>

---

*Phase: 04-history-comparison*
*Context gathered: 2026-03-22*
