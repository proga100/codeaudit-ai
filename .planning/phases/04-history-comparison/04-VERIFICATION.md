---
phase: 04-history-comparison
verified: 2026-03-22T10:30:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 4: History & Comparison Verification Report

**Phase Goal:** Users can browse all past audits for any folder and generate a delta comparison report when two or more audits exist for the same folder
**Verified:** 2026-03-22T10:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                 | Status     | Evidence                                                                                      |
|----|-------------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| 1  | User opens /history and sees all past audits grouped by folder path                                   | VERIFIED   | history/page.tsx:58-63 — Map grouping by folderPath, rows ordered desc(createdAt)            |
| 2  | Each folder group shows folder name + audit rows with date, type, depth, health score/grade           | VERIFIED   | history/page.tsx:102-149 — folder header, audit rows with typeLabel, depthLabel, score badge  |
| 3  | Clicking any audit row navigates to /audit/[id]/results                                               | VERIFIED   | history/page.tsx:124-127 — full row is `<Link href={/audit/${audit.id}/results}>`             |
| 4  | Folders with 2+ audits show a Compare button linking to /audit/compare?a={latestId}&b={previousId}   | VERIFIED   | history/page.tsx:154-163 — `hasCompare` guard + Link href with latest.id and previous!.id     |
| 5  | Folders with 0 completed audits still appear but without a score badge                                | VERIFIED   | history/page.tsx:138-148 — conditional: score badge only when score != null && grade != null; falls back to audit.status label |
| 6  | User navigates to /audit/compare?a={id1}&b={id2} and sees a comparison report                        | VERIFIED   | compare/page.tsx:81-251 — async server component, reads a/b from searchParams                 |
| 7  | Report shows score delta between two audits (+N/-N) with green/red color                             | VERIFIED   | compare/page.tsx:139-148, 190 — delta computation, deltaColor, `text-3xl font-bold` display   |
| 8  | Resolved findings (in older, absent in newer) shown in green-accented section                         | VERIFIED   | compare/page.tsx:218-227 — `<Section accentClass="text-green-400" borderClass="border-green-500/20 bg-green-500/5">` |
| 9  | New findings (absent in older, present in newer) shown in red-accented section                        | VERIFIED   | compare/page.tsx:205-215 — `<Section accentClass="text-red-400" borderClass="border-red-500/20 bg-red-500/5">`      |
| 10 | Persisted findings (present in both) shown in neutral gray section                                    | VERIFIED   | compare/page.tsx:229-239 — `<Section accentClass="text-muted-foreground" borderClass="border-border bg-muted/10">`  |
| 11 | If either audit ID is invalid or findings are missing, page shows a clear error/empty state           | VERIFIED   | compare/page.tsx:89-106 (missing params), 112 (notFound for invalid ID), 115-132 (missing findings) |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact                                                    | Expected                                                   | Lines | Status     | Details                                                                 |
|-------------------------------------------------------------|------------------------------------------------------------|-------|------------|-------------------------------------------------------------------------|
| `apps/web/app/(app)/history/page.tsx`                       | Async server component — audit history grouped by folder   | 171   | VERIFIED   | Exceeds min_lines 80; real DB query, grouping Map, score badges, Compare button all present |
| `apps/web/app/(app)/audit/compare/page.tsx`                 | Async server component — comparison report for two audit IDs | 251 | VERIFIED   | Exceeds min_lines 120; diffFindings, score delta, three sections, error states all present  |

---

### Key Link Verification

| From                                  | To                                          | Via                                                         | Status   | Details                                                                 |
|---------------------------------------|---------------------------------------------|-------------------------------------------------------------|----------|-------------------------------------------------------------------------|
| history/page.tsx                      | packages/db audits table                    | `getDb().select().from(audits).orderBy(desc(audits.createdAt)).all()` | WIRED | Lines 42-56: exact pattern present including `.from(audits)` |
| Compare button in history/page.tsx    | /audit/compare?a=&b=                        | Link href with latest and previous audit IDs                | WIRED    | Line 157: `href={/audit/compare?a=${latest.id}&b=${previous!.id}}`     |
| compare/page.tsx                      | packages/db audits table                    | Two `eq(audits.id, id)` queries                             | WIRED    | Lines 109-110: `db.select().from(audits).where(eq(audits.id, a)).get()` |
| compare/page.tsx diff logic           | AuditFinding.title + AuditFinding.filePaths | Set-based matching — key = title + "|" + filePaths?.[0]     | WIRED    | Line 38: `` `${f.title}|${f.filePaths?.[0] ?? ""}` ``                  |
| compare/page.tsx                      | FindingCard component                       | import + usage in all three Section renders                 | WIRED    | Line 6 import; lines 213, 225, 237 usage                                |
| compare/page.tsx                      | SeverityChart component                     | import + two usages in side-by-side grid                    | WIRED    | Line 7 import; lines 197, 201 usage                                     |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                    | Status    | Evidence                                                                         |
|-------------|-------------|--------------------------------------------------------------------------------|-----------|----------------------------------------------------------------------------------|
| HIST-01     | 04-01-PLAN  | User can view a list of all past audits per folder with date, type, depth, and overall score | SATISFIED | history/page.tsx renders grouped folder view with all four data points           |
| HIST-02     | 04-01-PLAN  | User can view the full results of any past audit                                | SATISFIED | Every audit row is a `<Link href=/audit/${id}/results>` — navigates to existing dashboard |
| HIST-03     | 04-02-PLAN  | When a folder has 2+ audits, user can generate a comparison report             | SATISFIED | Compare button pre-fills /audit/compare?a=&b=; compare/page.tsx renders full report |
| HIST-04     | 04-02-PLAN  | Comparison report highlights findings that were resolved or introduced         | SATISFIED | compare/page.tsx: three categorized sections (new/resolved/persisted) via diffFindings |

All four requirements declared in plan frontmatter are accounted for. No orphaned requirements for Phase 4 in REQUIREMENTS.md.

---

### Anti-Patterns Found

No anti-patterns detected. No TODO/FIXME/PLACEHOLDER comments, no empty implementations, no return null/[]/{}  patterns that affect user-visible output.

Note: Three pre-existing TypeScript errors exist in `packages/audit-engine/src/progress-emitter.ts` (Property 'provider' does not exist, 'pricing' possibly undefined). These errors predate Phase 4 and are unrelated to the history or comparison pages. Both history/page.tsx and compare/page.tsx introduced zero TypeScript errors.

---

### Human Verification Required

#### 1. Compare Button End-to-End Flow

**Test:** Run two audits against the same folder. Navigate to /history. Locate the folder group with 2 audits. Click "Compare latest two".
**Expected:** Browser navigates to /audit/compare?a={latestId}&b={previousId} and renders the score delta banner, side-by-side severity charts, and the three categorized finding sections.
**Why human:** Requires live audit data in SQLite; the diff output (new/resolved/persisted split) can only be validated against known test data at runtime.

#### 2. Empty-State Rendering

**Test:** Open /history with no audits in the database.
**Expected:** Centered message "No audits yet. Run your first audit to see results here." with a "Start an audit" link to /audit/new.
**Why human:** Requires a clean-slate database state to observe.

#### 3. Compare Page Error States

**Test:** Navigate to /audit/compare with no query params, then with an invalid ID, then with IDs of audits that have no findings.
**Expected:** Each case shows the appropriate error card rather than crashing.
**Why human:** Requires manual URL manipulation to exercise each error branch.

---

### Gaps Summary

No gaps. All must-haves verified, all key links wired, all four requirements satisfied by substantive implementations.

---

_Verified: 2026-03-22T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
