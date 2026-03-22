# Phase 3: Results & Cost - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view a rich in-app findings dashboard after an audit completes, download all audit artifacts as a zip (including PDF), and see a complete cost summary with per-phase breakdown. This phase renders the data that Phase 2's engine produces.

</domain>

<decisions>
## Implementation Decisions

### Findings Dashboard
- **D-01:** Results page layout: health score + severity chart at top, scrollable findings list below. Single page, not tabbed.
- **D-02:** Executive and technical views are separate pages — management dashboard (scores, trends, risks) and technical dashboard (findings, code, remediation).
- **D-03:** Each finding card shows: title + colored severity badge, file path + line number, evidence snippet, and remediation suggestion (collapsed by default).
- **D-04:** Findings are filterable and sortable by severity (Critical, High, Medium, Low, Info).

### Export & Download
- **D-05:** Download zip includes everything: HTML dashboards, markdown reports (findings.md + codebase_health.md), JSON structured data, and all other audit directory files (budget log, repo context, etc.).
- **D-06:** PDF export included in v1 — generate PDF from HTML dashboards.
- **D-07:** From Phase 2 context D-04: export supports md, JSON, text, PDF formats.

### Cost Summary
- **D-08:** Quick cost summary at top of results page: "Audit complete — $X.XX (N tokens)" banner next to health score.
- **D-09:** Detailed cost breakdown available in a dedicated section: per-phase tokens, cost, duration, and comparison to pre-audit estimate.
- **D-10:** Budget warning shown as inline yellow banner next to cost summary when actual cost exceeded estimate (e.g., "Exceeded estimate by 40%").

### Claude's Discretion
- Chart library choice for severity breakdown visualization
- PDF generation library/approach
- Exact severity badge colors and styling
- Finding card expand/collapse animation
- Cost breakdown table design
- How to render code evidence snippets (syntax highlighting or plain)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit Output Format (source of truth)
- `manual-codebase-review-process/CLAUDE.md` §"FINDING FORMAT" — Finding structure (area, severity, evidence, implication)
- `manual-codebase-review-process/CLAUDE.md` §"SECURITY FINDING FORMAT" — Security findings with attack vector + remediation
- `manual-codebase-review-process/how_to_run_codebase_audit.md` §"What you get when it's done" — Output files list, scorecard description

### Phase 2 Code (data source)
- `packages/audit-engine/src/finding-extractor.ts` — `AuditFindingSchema` Zod schema defining finding structure
- `packages/audit-engine/src/progress-emitter.ts` — `markPhaseCompleted` stores findings + computes cost
- `packages/audit-engine/src/phases/phase-10.ts` — Final report aggregation, `AuditFindings` shape (score/grade)
- `packages/audit-engine/src/phases/phase-11.ts` — HTML dashboard generation
- `packages/db/src/schema.ts` — `audits` table (findings JSONB, tokenCount, actualCostMicrodollars), `auditPhases` table

### Phase 1 Code (UI patterns)
- `apps/web/app/(app)/audit/[id]/progress-view.tsx` — Existing progress view (transition to results after completion)
- `apps/web/components/ui/` — Shadcn/ui components
- `apps/web/lib/cost-estimator.ts` — Pre-audit cost estimation (for comparison with actual)

### Prior Decisions
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-22 (Linear aesthetic), D-23 (sidebar nav)
- `.planning/phases/02-audit-setup/02-CONTEXT.md` — D-03 (structured JSON), D-04 (export formats), D-13 (normalize output)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `progress-view.tsx`: Already renders per-phase detail with status icons, findings count, duration, token cost — can transition to results view on completion
- `AuditFindingSchema`: Zod schema defines the finding data shape — use for TypeScript types in dashboard
- `audits.findings` JSONB: Contains aggregated `AuditFindings` with score, grade, severity counts — the data source for the overview
- `auditPhases` table: Per-phase findings array — data source for the detailed findings list
- Phase 11 HTML files: Already in audit output directory — include in zip download
- `cost-estimator.ts`: Has pre-audit estimate — compare with `actualCostMicrodollars` for budget warning
- Shadcn/ui: Button, Card, Badge, Select components available

### Established Patterns
- Server Components for data loading, Client Components for interactivity
- Server Actions in `apps/web/actions/`
- SQLite queries via Drizzle ORM
- Linear aesthetic with dark mode

### Integration Points
- Results page at `apps/web/app/(app)/audit/[id]/results/` (new)
- Progress view should transition/link to results when audit completes
- Download API route at `apps/web/app/api/audit/[id]/download/route.ts` (new)
- Sidebar already has "Audits" nav item — audit list shows completed audits linking to results

</code_context>

<specifics>
## Specific Ideas

- The progress view should seamlessly transition to results when audit completes — no manual navigation needed
- Finding cards should feel like Linear's issue cards — clean severity badges, collapsible detail
- PDF generation from the existing HTML dashboards is the simplest path — don't redesign for PDF
- The cost comparison (estimate vs actual) gives users confidence in future estimates

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-results-cost*
*Context gathered: 2026-03-22*
