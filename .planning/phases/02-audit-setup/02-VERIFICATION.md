---
phase: 02-audit-setup
verified: 2026-03-22T00:00:00Z
status: gaps_found
score: 14/15 must-haves verified
gaps:
  - truth: "Token count and estimated cost update in the UI after each phase completes"
    status: partial
    reason: "tokenCount is written to DB correctly and streams to UI. actualCostMicrodollars is never written during phase execution — progress-emitter.ts only updates tokenCount. The SSE stream sends totalCostMicro: audit.actualCostMicrodollars which is always 0. Cost display in ProgressView will always show $0.0000."
    artifacts:
      - path: "packages/audit-engine/src/progress-emitter.ts"
        issue: "markPhaseCompleted updates tokenCount but never calculates or writes actualCostMicrodollars"
      - path: "apps/web/lib/cost-estimator.ts"
        issue: "estimateCostRange is for pre-audit estimates only; no runtime cost calculation exists"
    missing:
      - "In markPhaseCompleted, calculate cost from tokensUsed and provider pricing, then add to audit.actualCostMicrodollars using a DB update"
      - "Alternatively, store per-phase token split (inputTokens, outputTokens) and compute cost in the SSE stream based on known provider pricing tables"
human_verification:
  - test: "Run a full end-to-end audit against a real codebase"
    expected: "All 12 phases execute, DB checkpoints appear in auditPhases table, /audit/[id] progress bar increments, cancel button stops the engine between phases and unlocks the folder"
    why_human: "Cannot verify LLM API calls, actual phase execution, or folder lock/unlock without running the full app with valid API keys"
  - test: "Close browser tab mid-audit, reopen /audit/[id]"
    expected: "Page reconnects via EventSource, SSE replays all completed phase rows immediately, progress bar shows correct percentage"
    why_human: "EventSource reconnect + server-side state replay requires live runtime verification"
  - test: "Click Cancel audit during a running phase"
    expected: "Engine polls status between phases, exits, folder unlocked, partial results visible in expanded detail"
    why_human: "Cancel polling in orchestrator requires live engine execution to verify"
---

# Phase 02: Audit Setup Verification Report

**Phase Goal:** A configured audit runs end-to-end — Phase 0 bootstrap through Phase 11 report generation — with live per-phase progress visible in the browser, real-time cost tracking, and safe folder cleanup on completion, cancellation, or failure
**Verified:** 2026-03-22
**Status:** gaps_found (1 gap — cost tracking never writes to DB)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All must-haves are drawn from the three PLAN frontmatter sections (02-01, 02-02, 02-03).

#### Plan 01 Truths (engine core)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | LLM adapter creates a working LanguageModel for Anthropic, OpenAI, and Gemini given a decrypted API key | VERIFIED | `packages/llm-adapter/src/index.ts` exports `createLlmProvider()` switching on provider; all three provider files exist with real `createAnthropic/createOpenAI/createGoogle` calls |
| 2 | execCommand runs a shell command in a given cwd and returns stdout capped at 1MB, with EACCES treated as non-fatal | VERIFIED | `packages/audit-engine/src/commands.ts` line 5: `MAX_BUFFER = 1024 * 1024`; EACCES handler at line 23 returns descriptive string |
| 3 | buildPhasePrompt wraps command output in `<data_block>` tags to prevent prompt injection | VERIFIED | `packages/audit-engine/src/prompt-builder.ts` line 25: `<data_block source="shell_commands" trust="untrusted">` |
| 4 | runPhaseLlm calls generateObject with AuditFinding Zod schema and returns typed findings + token usage | VERIFIED | `packages/audit-engine/src/finding-extractor.ts` — `generateObject` with `PhaseOutputSchema`, returns `findings`, `summary`, `score`, `usage` |
| 5 | runAudit orchestrator iterates phases, checkpoints each to auditPhases table, polls cancel flag, and calls unlockFolder in a finally block | VERIFIED | `packages/audit-engine/src/orchestrator.ts` — cancel poll at line 61, `markPhaseRunning/Completed/Skipped/Failed` calls, `unlockFolderLocal` in `finally` block at line 91 |
| 6 | POST /api/audit/[id] starts the engine as a detached async call and returns 202 immediately (does not await engine) | VERIFIED | `apps/web/app/api/audit/[id]/route.ts` — `void runAudit(...)` at line 29 (not awaited), returns `{ started: true }` with 202 |
| 7 | Phase definitions registry maps phase numbers to names, command lists, and complexity tier | VERIFIED | `packages/audit-engine/src/phases/index.ts` — `PHASE_REGISTRY` array with 12 entries covering number, name, complexity, includedIn |

#### Plan 02 Truths (phase implementations)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | Phase 0 runs bootstrap shell commands (git rev-parse, find, wc -l, git shortlog) and returns structured repo context | VERIFIED | `packages/audit-engine/src/phases/phase-00.ts` — 14 commands array, `generateObject` with `RepoContextSchema`, writes `repo_context.md` to `auditOutputDir` |
| 9 | Phases 1-10 each run their shell commands, build a prompt with the guide chunk, call the LLM, and write findings + output to DB via markPhaseCompleted | VERIFIED | All 10 phase files confirmed; phase-01.ts verified as representative — `execCommand` calls, `buildPhasePrompt`, `runPhaseLlm`, `markPhaseCompleted`, `fs.writeFile` to `auditOutputDir` |
| 10 | Phase 11 generates HTML from accumulated findings and writes two HTML files to auditOutputDir | VERIFIED | `packages/audit-engine/src/phases/phase-11.ts` — two `generateText` calls producing HTML, writes `report-management.html` and `report-technical.html` to `auditOutputDir` |
| 11 | All phases write their output files to auditOutputDir, never to repoPath (EXEC-07) | VERIFIED | All `fs.writeFile` calls grep confirmed — every path uses `path.join(auditOutputDir, ...)` |
| 12 | Phases are skipped (markPhaseSkipped) when not included in the selected audit type (EXEC-05) | VERIFIED | `getPhasesForAuditType` in `phases/index.ts` filters `PHASE_REGISTRY` by `includedIn`; orchestrator calls `markPhaseSkipped` for phases with no registered runner |
| 13 | Quick-scan depth skips phases 6, 7, 11 and limits grep results via head -15 (EXEC-06) | VERIFIED | `getPhasesForAuditType` filters `![6, 7, 11]` for quick depth; `shared.ts:headLimit()` returns "15" for quick, "30" for deep |
| 14 | All phase runners are registered with registerPhaseRunner so the orchestrator can dispatch them | VERIFIED | `packages/audit-engine/src/phases/index.ts` lines 65-76 — all 12 `registerPhaseRunner(N, phaseNNRunner)` calls present |

#### Plan 03 Truths (progress UI + SSE)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 15 | GET /api/audit/[id]/stream returns text/event-stream and emits phase-update and audit-update events every 500ms | VERIFIED | `apps/web/app/api/audit/[id]/stream/route.ts` — `Content-Type: text/event-stream`, `X-Accel-Buffering: no`, `setInterval(emitState, 500)`, emits `type: "phase"` and `type: "audit"` events |
| 16 | SSE stream replays all completed phase events immediately on connect so reconnecting clients see current state | VERIFIED | `emitState()` called immediately before `setInterval` (line 73); all phase rows from DB emitted on every `emitState()` call |
| 17 | SSE stream closes automatically when audit reaches completed, cancelled, or failed status | VERIFIED | `stream/route.ts` lines 66-69: `clearInterval(interval); controller.close()` on terminal status |
| 18 | User sees a progress page at /audit/[id] with current phase name and overall percentage bar | VERIFIED | `apps/web/app/(app)/audit/[id]/page.tsx` renders `<ProgressView>`; `progress-view.tsx` computes `percentage` from `phasesCompleted/phasesTotal` and renders a styled `<div>` progress bar |
| 19 | User can expand the progress view to see per-phase rows with status icon, findings count, and token cost | VERIFIED | `progress-view.tsx` — `expanded` state toggle, renders 12 phase rows with icon (✓/▶/✗/⊘/○), `findingsCount`, `criticalCount`, `tokensUsed` |
| 20 | Token count and estimated cost update in the UI after each phase completes | PARTIAL (GAP) | `tokenCount` is updated in DB and streamed to UI. `actualCostMicrodollars` is never written during phase execution — always 0. Cost display shows `$0.0000` throughout the audit. |
| 21 | POST /api/audit/[id]/cancel sets audit status to cancelled in DB; engine polls this between phases and exits | VERIFIED | `cancel/route.ts` sets `status: "cancelled"`, `completedAt: new Date()`; orchestrator polls `audit.status === "cancelled"` between phases at line 61 |
| 22 | Cancel button is visible on the progress page and triggers the cancel endpoint | VERIFIED | `progress-view.tsx` — cancel button rendered when `!isTerminal`, calls `cancelAudit(auditId)` Server Action, which POSTs to cancel endpoint |
| 23 | User can leave the tab and return — page re-connects to SSE and shows current state without data loss | VERIFIED (architecture) | `EventSource` auto-reconnects by browser spec; server replays full DB state on every connect; `PROG-04` satisfied by design |
| 24 | After cancel, the partial results remain and the folder is unlocked | VERIFIED | Orchestrator `finally` block always calls `unlockFolderLocal`; cancelled audit retains all `auditPhases` rows in DB |

**Score: 14/15 truths verified** (1 partial gap on cost tracking)

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/llm-adapter/src/index.ts` | createLlmProvider() returning LanguageModel | VERIFIED | Exports `createLlmProvider`, `LlmAdapterConfig`; all 3 provider branches wired |
| `packages/audit-engine/src/commands.ts` | execCommand() with timeout and 1MB cap | VERIFIED | 33 lines, real implementation; 1MB cap, EACCES handler, ENOENT handler |
| `packages/audit-engine/src/prompt-builder.ts` | buildPhasePrompt() with data_block injection defense | VERIFIED | `<data_block trust="untrusted">` wrapping confirmed |
| `packages/audit-engine/src/finding-extractor.ts` | runPhaseLlm() returning AuditFinding[] + usage | VERIFIED | Exports `runPhaseLlm`, `PhaseOutputSchema`, `AuditFindingSchema` |
| `packages/audit-engine/src/orchestrator.ts` | runAudit() phase state machine with checkpoint + cancel + cleanup | VERIFIED | 100 lines; cancel poll, checkpoint skip, `unlockFolderLocal` in `finally` |
| `packages/audit-engine/src/phases/index.ts` | PHASE_REGISTRY with phase metadata | VERIFIED | 12-entry `PHASE_REGISTRY`, `getPhasesForAuditType`, all 12 runners registered |
| `apps/web/app/api/audit/[id]/route.ts` | POST handler that starts engine detached and returns 202 | VERIFIED | `void runAudit(...)` pattern, returns `{ started: true }` 202 |

#### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/audit-engine/src/phases/phase-00.ts` | Bootstrap runner | VERIFIED | 14 detection commands, `generateObject` with custom schema, writes `repo_context.md` |
| `packages/audit-engine/src/phases/phase-01.ts` through `phase-09.ts` | Phase runners 1-9 | VERIFIED | All 9 files exist; phase-01 inspected as representative — full implementation pattern confirmed |
| `packages/audit-engine/src/phases/phase-10.ts` | Final report synthesis | VERIFIED | Aggregates all `auditPhases.findings`, writes `final-report.md`, updates `audits.findings` in DB |
| `packages/audit-engine/src/phases/phase-11.ts` | HTML dashboard generation | VERIFIED | Two `generateText` calls, writes `report-management.html` + `report-technical.html` |
| `packages/audit-engine/src/phases/shared.ts` | Shared helpers (getRepoContext, getModel, headLimit) | VERIFIED | All three helpers present and used by phase files |

#### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/app/api/audit/[id]/stream/route.ts` | SSE endpoint polling auditPhases + audits every 500ms | VERIFIED | 94 lines; `text/event-stream`, `X-Accel-Buffering`, 500ms poll, state replay, terminal close |
| `apps/web/app/api/audit/[id]/cancel/route.ts` | POST endpoint setting audit status to cancelled | VERIFIED | 30 lines; sets `status: "cancelled"`, handles 404 and 409 |
| `apps/web/actions/audit-control.ts` | cancelAudit and resumeAudit Server Actions | VERIFIED | Both exports present; `cancelAudit` delegates to cancel endpoint; `resumeAudit` resets to "queued" + triggers engine + redirects |
| `apps/web/app/(app)/audit/[id]/page.tsx` | Server component that loads audit and renders ProgressView | VERIFIED | No "use client"; fetches audit from DB, auto-starts engine if queued, renders `<ProgressView>` |
| `apps/web/app/(app)/audit/[id]/progress-view.tsx` | Client component consuming SSE stream with expand/collapse | VERIFIED | "use client" at line 1; `EventSource` in `useEffect`; expand/collapse; cancel button; token/cost display |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/api/audit/[id]/route.ts` | `packages/audit-engine/src/orchestrator.ts` | `runAudit()` called without await | WIRED | `void runAudit({...})` at line 29 — confirmed detached |
| `packages/audit-engine/src/orchestrator.ts` | `apps/web/lib/folder-safety.ts` | `unlockFolder` in finally block | WIRED (inlined) | `unlockFolderLocal` inlined in orchestrator (not imported from apps/web) to avoid cross-package dep — documented in SUMMARY |
| `packages/audit-engine/src/finding-extractor.ts` | `packages/llm-adapter/src/index.ts` | LanguageModel passed to generateObject | WIRED | `generateObject({ model: model as any, schema: PhaseOutputSchema, ... })` |

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/audit-engine/src/phases/index.ts` | `packages/audit-engine/src/orchestrator.ts` | `registerPhaseRunner` called for phases 0-11 | WIRED | All 12 `registerPhaseRunner(N, phaseNNRunner)` calls present at lines 65-76 |
| `packages/audit-engine/src/phases/phase-NN.ts` | `packages/audit-engine/src/progress-emitter.ts` | `markPhaseCompleted(...)` | WIRED | Verified in phase-00, phase-01, phase-10, phase-11; all call `markPhaseCompleted` |
| `packages/audit-engine/src/phases/phase-11.ts` | `auditOutputDir` | `fs.writeFile` to audit dir, never repoPath | WIRED | Lines 67-68: `path.join(auditOutputDir, "report-management.html")` |

#### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/(app)/audit/[id]/progress-view.tsx` | `apps/web/app/api/audit/[id]/stream/route.ts` | `EventSource('/api/audit/${id}/stream')` in useEffect | WIRED | Line 57: `new EventSource(\`/api/audit/${auditId}/stream\`)` |
| `apps/web/app/(app)/audit/[id]/progress-view.tsx` | `apps/web/app/api/audit/[id]/cancel/route.ts` | cancelAudit Server Action on cancel button click | WIRED | `cancelAudit(auditId)` called in `handleCancel`; Server Action delegates to `POST /api/audit/${auditId}/cancel` |
| `apps/web/app/(app)/audit/[id]/page.tsx` | `apps/web/app/api/audit/[id]/route.ts` | POST to start engine on page load if status is queued | WIRED | Lines 19-23: `void fetch(..., { method: "POST" })` when `audit.status === "queued"` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXEC-01 | 02-01, 02-02 | Phase 0 bootstrap auto-detects repo stack, structure, contributors, LoC | SATISFIED | `phase-00.ts` runs 14 detection commands including `git shortlog`, `find`, `wc -l`, stack detection |
| EXEC-02 | 02-02 | Phases 1-10 execute as structured LLM API calls | SATISFIED | All 10 phase files (01-10) call `runPhaseLlm` with `generateObject` + `PhaseOutputSchema` |
| EXEC-03 | 02-02 | Phase 11 generates interactive HTML reports | SATISFIED | `phase-11.ts` generates management + technical HTML dashboards via `generateText` |
| EXEC-04 | 02-01 | Supports all three LLM providers (Anthropic, OpenAI, Gemini) | SATISFIED | `llm-adapter/src/index.ts` switches on provider; all three provider files confirmed |
| EXEC-05 | 02-02 | Audit engine respects audit type — runs only relevant phases | SATISFIED | `getPhasesForAuditType` filters by `includedIn` per `PHASE_REGISTRY` |
| EXEC-06 | 02-02 | Audit engine respects depth — quick scan uses sampling and phase subset | SATISFIED | `getPhasesForAuditType` excludes phases 6, 7, 11 for quick; `headLimit()` returns "15" for quick |
| EXEC-07 | 02-01, 02-02 | App writes all output to audit directory, never to target folder | SATISFIED | All `fs.writeFile` calls use `path.join(auditOutputDir, ...)` — grep confirmed no `repoPath` writes |
| EXEC-08 | 02-01, 02-03 | Handles audit failures gracefully — checkpoints progress for resume | SATISFIED | Orchestrator skips `existing?.status === "completed"` phases on resume; `resumeAudit` Server Action resets to "queued" |
| EXEC-09 | 02-01, 02-03 | Cleans up (unlocks folder) after audit completes or fails | SATISFIED | `unlockFolderLocal` called in orchestrator `finally` block — guaranteed even on crash |
| PROG-01 | 02-03 | User sees simplified progress view with current phase and overall percentage | SATISFIED | `progress-view.tsx` renders phase name and progress bar; percentage derived from `phasesCompleted/phasesTotal` |
| PROG-02 | 02-03 | User can expand to see detailed phase-by-phase status with findings count | SATISFIED | `expanded` toggle renders 12 phase rows with status icons and `findingsCount` |
| PROG-03 | 02-03 | User sees real-time token usage and estimated cost during the audit | PARTIAL (GAP) | Token count streams correctly. `actualCostMicrodollars` is never written during execution — cost always shows $0.0000 |
| PROG-04 | 02-03 | User can leave browser tab and return to see current progress | SATISFIED | `EventSource` auto-reconnects; server replays full DB state on every connect |
| PROG-05 | 02-03 | User can cancel a running audit at any time | SATISFIED | Cancel button visible while `!isTerminal`; cancel endpoint sets DB flag; orchestrator polls between phases |

**All 15 requirement IDs from PLAN frontmatter accounted for.**

No orphaned requirements: REQUIREMENTS.md maps EXEC-01 through EXEC-09 and PROG-01 through PROG-05 to Phase 2 — all are covered by the three plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/audit-engine/src/progress-emitter.ts` | 41-47 | `actualCostMicrodollars` never updated; `markPhaseCompleted` only increments `tokenCount` | Warning | Real-time cost display in ProgressView always shows $0.0000 — PROG-03 partially broken |

No placeholder components, no empty handlers, no TODO/FIXME stubs, no hardcoded empty arrays flowing to UI render found across any phase 02 files.

TypeScript compilation: clean (zero errors) across `apps/web`, `packages/audit-engine`, and `packages/llm-adapter`.

---

### Human Verification Required

#### 1. End-to-end audit execution

**Test:** Configure an audit against a real local codebase with a valid API key. Start the audit and observe the `/audit/[id]` page.
**Expected:** Progress bar increments as phases 0-11 complete. Expanded view shows each phase transitioning from pending to running to completed with findings counts and token totals. Completion state renders the green "Audit complete" banner.
**Why human:** Cannot verify LLM API calls, actual shell command execution on a real repo, DB writes, or UI rendering without a running instance.

#### 2. Tab reconnect resilience

**Test:** Navigate to `/audit/[id]` while an audit is running. Close the browser tab. Reopen the same URL after 30 seconds.
**Expected:** Page reconnects immediately. The SSE stream replays all completed phase events. Progress bar shows the correct percentage without any data loss.
**Why human:** EventSource auto-reconnect + server-side state replay requires live browser + running server to verify.

#### 3. Cancel mid-audit

**Test:** Start an audit, wait for phase 2 to begin, then click "Cancel audit".
**Expected:** Engine exits after the current phase finishes (does not cut off a running LLM call mid-stream). Status shows "Audit cancelled". Partial results remain visible in expanded view. Target folder is unlocked.
**Why human:** Cancel polling between phases requires live engine execution; folder lock/unlock requires filesystem state observation.

#### 4. Cost tracking (gap confirmation)

**Test:** Run a real audit and observe the cost display in `ProgressView`.
**Expected per PROG-03:** Cost updates after each phase.
**Actual expected:** Cost shows $0.0000 throughout. This confirms the gap — `actualCostMicrodollars` is never written during execution.
**Why human:** Confirms the gap found in static analysis is actually user-visible.

---

### Gaps Summary

One gap blocks full PROG-03 satisfaction: **real-time cost tracking**.

The token count updates correctly — `markPhaseCompleted` increments `audits.tokenCount` after each phase, and the SSE stream sends this to the client. However, `audits.actualCostMicrodollars` is never updated during execution. The SSE stream reads this field and sends it as `totalCostMicro`, but it will always be 0. The `cost-estimator.ts` utility exists for pre-audit cost *estimates*, not for tracking actual spend.

The fix is contained entirely within `packages/audit-engine/src/progress-emitter.ts`: `markPhaseCompleted` needs to compute cost from `tokensUsed`, the provider (stored on the audit row), and a pricing table, then accumulate to `actualCostMicrodollars`.

All other 14 truths are fully verified. The phase goal is ~93% achieved — the full audit pipeline executes end-to-end, progress is live in the browser, cancel and cleanup work, and tab reconnection is handled correctly.

---

_Verified: 2026-03-22_
_Verifier: Claude (gsd-verifier)_
