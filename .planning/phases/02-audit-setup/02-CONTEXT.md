# Phase 2: Audit Engine - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning (REWRITTEN after local-first pivot — this phase is now Audit Engine, not Audit Setup)

<domain>
## Phase Boundary

A configured audit runs end-to-end — Phase 0 bootstrap through Phase 11 report generation — with live per-phase progress visible in the browser, real-time cost tracking, and safe folder cleanup on completion, cancellation, or failure. This is the core product — everything else is UI wrapper.

</domain>

<decisions>
## Implementation Decisions

### Prompt Strategy
- **D-01:** The 93K audit guide is split into per-phase chunks. Each phase gets only its relevant section as context, not the full guide. This is critical for token efficiency.
- **D-02:** Claude's discretion on whether the app runs bash commands itself (Node.js child_process) or uses LLM tool-use/function-calling. Pick the approach that's most reliable and safe.
- **D-03:** Store structured JSON for the web UI — markdown/text files are export options, not the primary format.
- **D-04:** Export supports multiple formats: markdown, JSON, text, PDF. User chooses format when downloading.

### Progress Experience
- **D-05:** Simplified progress view shows: current phase name + progress bar (e.g., "Phase 4: Code Complexity — 35%") with token count below.
- **D-06:** Expandable detailed view shows per-phase rows with: status icon (✓ complete, ▶ running, ○ pending, ✗ failed), findings count ("12 findings (3 critical)"), duration, and token cost per phase.
- **D-07:** Progress state persists server-side — user can leave the tab and return to see accurate state.

### Cancellation & Recovery
- **D-08:** When user cancels mid-audit, keep partial results. Completed phases' findings are saved and shown in dashboard as "partial audit."
- **D-09:** Resume from checkpoint — user can click "Resume" to continue from the last completed phase. No need to restart the full audit.
- **D-10:** Folder is always unlocked on completion, cancellation, or failure — guaranteed cleanup.

### Multi-Provider & Auto Mode
- **D-11:** Auto mode defaults to cost-optimized model selection (cheapest model that meets phase complexity). Show estimated token usage and cost per model so user can override.
- **D-12:** If possible, show model accuracy/quality indicator alongside cost to help users choose.
- **D-13:** Normalize output across providers — same finding format regardless of which LLM produced it. User shouldn't notice which model ran.

### Claude's Discretion
- Whether to use LLM tool-use or app-side command execution for bash commands
- Phase chunking strategy (exact section boundaries from the audit guide)
- SSE vs polling for progress updates
- Checkpoint storage format and resume logic
- Model accuracy/quality metrics (if feasible to measure)
- Rate limit handling and retry strategy
- Context window management for large repos (sampling strategy)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit Process (THE source of truth for what each phase does)
- `manual-codebase-review-process/CLAUDE.md` — Safety rules, bootstrap script (Phase 0), progress tracking, budget monitoring, finding format, security finding format
- `manual-codebase-review-process/codebase_review_guide.md` — The complete 13-phase audit engine. Every command, every check. This is what gets translated into LLM API calls.
- `manual-codebase-review-process/how_to_run_codebase_audit.md` — Run modes (full, security-only, team, phase-by-phase), work volume estimation, budget gates

### Research (from project init — still relevant)
- `.planning/research/STACK.md` — Vercel AI SDK 6 for multi-LLM abstraction
- `.planning/research/ARCHITECTURE.md` — Web-Queue-Worker pattern, SSE for progress
- `.planning/research/PITFALLS.md` — Prompt injection via repo contents, multi-provider prompt differences

### Phase 1 Code (integration points)
- `apps/web/actions/audit-start.ts` — Server Action that locks folder + creates DB record + redirects to queued page
- `apps/web/lib/folder-safety.ts` — lockFolder/unlockFolder (guaranteed cleanup)
- `apps/web/lib/cost-estimator.ts` — Pre-audit cost range estimation
- `apps/web/lib/api-key-validator.ts` — Key validation per provider
- `packages/db/src/schema.ts` — `audits` and `auditPhases` tables with JSONB findings
- `packages/db/src/encryption.ts` — Key decryption for making API calls
- `packages/audit-engine/` — Stub package (to be implemented)
- `packages/llm-adapter/` — Stub package (to be implemented)
- `apps/web/app/api/models/route.ts` — Dynamic model listing from provider APIs

### Phase 1 Context (prior decisions)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-15 (Auto mode), D-13 (fetch models from API), D-22 (Linear aesthetic)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `audit-start.ts`: Already creates audit record with status "queued", locks folder, creates output dir — the engine picks up from here
- `folder-safety.ts`: lockFolder/unlockFolder with CRITICAL ORDER enforcement + guaranteed cleanup
- `cost-estimator.ts`: Provider-aware cost estimation — reuse for per-phase cost tracking
- `encryption.ts`: Decrypt API keys to make LLM calls
- `api/models/route.ts`: Lists available models per provider — reuse for Auto mode model selection
- `schema.ts`: `audits` table has `status`, `auditType`, `auditDepth`, `totalTokens`, `totalCost` columns; `auditPhases` has per-phase JSONB findings
- Stub packages: `packages/audit-engine/`, `packages/llm-adapter/` ready to implement

### Established Patterns
- Server Actions in `apps/web/actions/` — use for audit control (start, cancel, resume)
- SQLite with Drizzle ORM — use for audit state, phase checkpoints
- Shadcn/ui + dark mode — use for progress UI components

### Integration Points
- `audit-start.ts` sets status to "queued" → engine picks up queued audits
- `auditPhases` table stores per-phase results as JSONB → progress UI reads from here
- `audits.status` field tracks: queued → running → completed / cancelled / failed / partial
- SSE endpoint needed for real-time progress push to browser
- Unlock must be called from engine on any exit path (complete, cancel, fail, crash)

</code_context>

<specifics>
## Specific Ideas

- The audit guide's bash commands (grep, find, git log) should be run by the app and results fed to the LLM — this is more reliable than LLM tool-use and keeps the safety model intact
- Per-phase chunks from the audit guide should include the "finding format" template so the LLM outputs structured data
- The "partial audit" state is valuable — even 5 completed phases give useful security insights
- Resume should be seamless: click "Resume" on a partial audit, app picks up from the next unfinished phase

</specifics>

<deferred>
## Deferred Ideas

- PDF export (D-04) — requires a PDF generation library. Core JSON/markdown/text export in this phase; PDF can be added as a quick follow-up.
- Model accuracy/quality metrics (D-12) — may not be feasible to measure reliably. Implement cost display first, add quality indicators if research finds a reliable method.

</deferred>

---

*Phase: 02-audit-engine*
*Context gathered: 2026-03-22*
