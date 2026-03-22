---
phase: 01-foundation
verified: 2026-03-22T04:30:00Z
status: gaps_found
score: 12/14 must-haves verified
re_verification: false
gaps:
  - truth: "User can add, label, update, and delete encrypted API keys for Anthropic, OpenAI, and Gemini — each key is validated against the provider via a test API call before being saved"
    status: failed
    reason: "Argument order bug in api-keys-client.tsx: createApiKey is called as createApiKey(provider, label, rawKey) but addApiKey signature is (provider, rawKey, label). The user's label string is passed as the raw key argument, and the actual API key is passed as the label. Validation will reject valid keys (label string fails provider pattern check) or succeed with garbage stored."
    artifacts:
      - path: "apps/web/app/(app)/settings/api-keys/api-keys-client.tsx"
        issue: "Line 102: createApiKey(provider, label, rawKey) — label and rawKey arguments are swapped relative to addApiKey(provider, rawKey, label) signature"
    missing:
      - "Fix argument order to: createApiKey(provider, rawKey, label)"
  - truth: "User can store multiple keys per provider with labels"
    status: failed
    reason: "Depends on the same argument-order bug: when the label is passed as rawKey, the stored maskedKey and encryptedKey will contain the label string, not the actual API key. Persisted data is corrupted for keys added via the Settings page."
    artifacts:
      - path: "apps/web/app/(app)/settings/api-keys/api-keys-client.tsx"
        issue: "Line 102: same swapped-args bug corrupts stored encrypted key and masked display"
    missing:
      - "Fix argument order to: createApiKey(provider, rawKey, label)"
human_verification:
  - test: "Open app at localhost:3000 and add an Anthropic API key via the Settings > API Keys page"
    expected: "Key is validated, saved with masked display, and persists after page reload"
    why_human: "The argument-order bug is programmatically identified but the full user flow through the validation API call needs to be observed to confirm severity"
  - test: "Select a local folder, choose audit type and depth, observe cost estimate updating"
    expected: "Cost estimate range changes immediately when type, depth, or provider selection changes without requiring a page submit"
    why_human: "Live reactive update behavior cannot be verified from static file analysis"
  - test: "Click Start Audit, confirm the dialog, verify folder is locked and audit is queued"
    expected: "Folder is chmod'd read-only, git push is blocked, audit record appears in DB with status queued, redirect to /audit/{id}/queued"
    why_human: "Actual filesystem operations (chmod, git remote set-url) require running the app on a real folder"
---

# Phase 1: App Shell & Configuration Verification Report

**Phase Goal:** Users can open the app at localhost, manage encrypted API keys for all three LLM providers, select a local folder to audit with safety enforcement, and configure an audit through to the cost-estimate confirmation gate
**Verified:** 2026-03-22T04:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Phase 1 Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User runs one start command and opens the app in their browser at localhost with no errors | VERIFIED | `packages/cli/index.ts` exists with ENCRYPTION_KEY bootstrap, health-poll loop, and browser open via `open` package. `/api/health` route returns `{ status: "ok" }`. |
| 2 | User can add, label, update, and delete encrypted API keys — each key validated via test API call before saved | FAILED | `addApiKey` signature is `(provider, rawKey, label)` but `api-keys-client.tsx:102` calls `createApiKey(provider, label, rawKey)` — label and rawKey are swapped, corrupting validation and storage for keys added from Settings page. |
| 3 | User can select a local folder; app locks it read-only and blocks git push before audit begins | VERIFIED | `folder-safety.ts` implements CRITICAL ORDER (git push block before chmod). `startAudit` action calls `createAuditOutputDir` then `lockFolder`. |
| 4 | User can choose audit type, depth, and which stored API key to use | VERIFIED | `AuditTypeCards`, `DepthToggle`, `ModelSelector` all exist, are substantive, and are wired into `new-audit-form.tsx`. |
| 5 | User sees a pre-audit cost estimate and can confirm to proceed or go back | VERIFIED | `CostEstimate` calls `estimateCostRange` from `cost-estimator.ts` via `useMemo` on every config change. `ConfirmAuditDialog` shows cost range with Go Back / Start Audit buttons. |

**Score:** 4/5 truths verified (12/14 plan-level must-haves)

---

### Required Artifacts

| Artifact | Provided | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema.ts` | SQLite schema — apiKeys, audits, appSettings tables | VERIFIED | Uses `sqliteTable` exclusively, no pgTable, no userId FKs. All 4 tables present. |
| `packages/db/src/client.ts` | SQLite Drizzle client via better-sqlite3 | VERIFIED | Uses better-sqlite3, WAL mode enabled, getDb() singleton, ~/.codeaudit/codeaudit.db path. |
| `apps/web/middleware.ts` | No-auth pass-through middleware | VERIFIED | Contains only `NextResponse.next()`, no auth imports. |
| `apps/web/actions/api-keys.ts` | Server Actions for key CRUD — addApiKey, listApiKeys, deleteApiKey, updateApiKey | VERIFIED | All four actions present, no session/auth guards, AES-256-GCM encryption via encryptApiKey. |
| `packages/cli/index.ts` | npx codeaudit launcher | VERIFIED | ENCRYPTION_KEY auto-generation, spawn + health-check poll, browser open via `open` package. |
| `apps/web/lib/folder-safety.ts` | lockFolder, unlockFolder, isGitRepo, createAuditOutputDir | VERIFIED | Correct critical order enforced, promisify(execFile) used, no execSync. |
| `apps/web/actions/folders.ts` | validateFolder Server Action | VERIFIED | Checks path exists, is directory, detects git repo. |
| `apps/web/components/audit/folder-picker.tsx` | FolderPicker UI — multi-folder, per-path validation | VERIFIED | Accepts `value: string[]`, Add Folder button, non-git warning, calls validateFolder. |
| `apps/web/components/audit/audit-type-cards.tsx` | 4 audit type selection cards | VERIFIED | 4 cards: full, security, team-collaboration, code-quality with visual selection state. |
| `apps/web/components/audit/depth-toggle.tsx` | Quick Scan / Deep Audit toggle | VERIFIED | Two-option toggle with time and description context for each. |
| `apps/web/components/audit/model-selector.tsx` | Provider/key dropdown + model selector | VERIFIED | Calls `/api/models?keyId=` on key change, shows grouped provider/key selector + model dropdown. |
| `apps/web/components/audit/cost-estimate.tsx` | Live cost range display | VERIFIED | Calls `estimateCostRange` via `useMemo` on every prop change. |
| `apps/web/components/audit/confirm-dialog.tsx` | Start audit confirmation dialog | VERIFIED | Shows folder paths, type, depth, model, cost range. Async `onConfirm` with loading state. |
| `apps/web/lib/cost-estimator.ts` | estimateCostRange() and collectFolderStats() | VERIFIED | Provider-aware pricing table, phase count multipliers, depth multipliers, ±40% range. |
| `apps/web/app/api/models/route.ts` | GET /api/models?keyId= | VERIFIED | Fetches from Anthropic/OpenAI/Gemini APIs using decrypted key, returns model list. |
| `apps/web/actions/audit-start.ts` | startAudit Server Action | VERIFIED | Calls createAuditOutputDir → lockFolder → DB insert → redirect. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/cli/index.ts` | Next.js server | spawn + health-check poll then `open()` | WIRED | Health poll loop (30 iterations, 1s delay), `GET /api/health`, browser open on first 200. |
| `apps/web/actions/api-keys.ts` | `packages/db/src/encryption.ts` | `encryptApiKey` + `validateApiKey` | WIRED | Both called in `addApiKey`. `encryptApiKey` used before DB insert. Validation checked before encrypt. |
| `apps/web/app/(app)/layout.tsx` | `apps/web/components/nav/sidebar.tsx` | `<Sidebar />` with no user prop | WIRED | `<Sidebar />` rendered with no props — correct no-auth pattern. |
| `apps/web/lib/folder-safety.ts` | execFile(chmod) + git remote set-url | promisify(execFile) | WIRED | Critical order: git `set-url --push origin no_push` runs before `chmod -R a-w`. |
| `apps/web/actions/folders.ts` | `apps/web/lib/folder-safety.ts` | `isGitRepo()` check | WIRED | `isGitRepo` imported and called in `validateFolder`. |
| `apps/web/components/audit/folder-picker.tsx` | `apps/web/actions/folders.ts` | `validateFolder` server action call | WIRED | Called via `useTransition` on input change when path length > 3. |
| `apps/web/components/audit/model-selector.tsx` | `apps/web/app/api/models/route.ts` | `fetch /api/models?keyId=` | WIRED | `useEffect` on `selectedKeyId` change fetches `/api/models?keyId=${selectedKeyId}`. |
| `apps/web/components/audit/cost-estimate.tsx` | `apps/web/lib/cost-estimator.ts` | `estimateCostRange()` | WIRED | Called via `useMemo` on every config prop change, result displayed in rendered output. |
| `apps/web/app/(app)/audit/new/page.tsx` | `apps/web/components/audit/confirm-dialog.tsx` | `ConfirmAuditDialog` | WIRED | Rendered in `new-audit-form.tsx` which `new/page.tsx` delegates to. |
| `apps/web/components/audit/confirm-dialog.tsx` | `apps/web/actions/audit-start.ts` | `onConfirm` calls `startAudit` | WIRED | `handleConfirm` in `new-audit-form.tsx` calls `startAudit`, passed as `onConfirm` prop. |
| `apps/web/actions/audit-start.ts` | `apps/web/lib/folder-safety.ts` | `lockFolder()` + `createAuditOutputDir()` | WIRED | Both called explicitly in sequence before DB insert. |

---

### Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| SETUP-01 | 01-01 | User can open app at localhost after one start command | SATISFIED | CLI launcher wired, health endpoint exists, browser auto-opens |
| SETUP-02 | 01-01 | User can add, update, delete encrypted API keys for Anthropic, OpenAI, Gemini | BLOCKED | Argument-order bug in `api-keys-client.tsx:102` — `createApiKey(provider, label, rawKey)` should be `createApiKey(provider, rawKey, label)` |
| SETUP-03 | 01-01 | User can store multiple keys per provider with labels | BLOCKED | Same bug — label passed as raw key corrupts storage |
| SETUP-04 | 01-01 | API keys validated on entry via test API call | BLOCKED | Same bug — label string is what gets validated against the provider, not the actual key |
| FOLD-01 | 01-02 | User can select a local folder via folder picker or path input | SATISFIED | `FolderPicker` with text input and Browse button |
| FOLD-02 | 01-02 | App locks folder read-only (chmod -R a-w) before audit starts | SATISFIED | `lockFolder` enforces chmod after git push block |
| FOLD-03 | 01-02 | App blocks git push (git remote set-url --push origin no_push) | SATISFIED | Critical order enforced: git block runs before chmod |
| FOLD-04 | 01-02 | App creates separate audit output directory (~/audit-{repo-name}/) | SATISFIED | `createAuditOutputDir` creates timestamped dir in $HOME |
| FOLD-05 | 01-02 | App unlocks folder after audit completes or is cancelled | SATISFIED | `unlockFolder` exported and callable — NEEDS HUMAN verification that Phase 2 calls it |
| CONF-01 | 01-03 | User can select audit type: full, security-only, team & collaboration, code quality | SATISFIED | `AuditTypeCards` with all 4 options |
| CONF-02 | 01-03 | User can select audit depth: quick scan or deep audit | SATISFIED | `DepthToggle` with Quick Scan / Deep Audit options |
| CONF-03 | 01-03 | User can select which LLM provider and key to use | SATISFIED | `ModelSelector` with grouped provider/key dropdown |
| CONF-04 | 01-03 | User sees pre-audit cost estimate based on folder size, type, depth, provider | SATISFIED | `CostEstimate` updates reactively via `useMemo` |
| CONF-05 | 01-03 | User can start an audit after reviewing cost estimate | SATISFIED | `ConfirmAuditDialog` with Start Audit confirm gate |

**Note on FOLD-05:** `unlockFolder` is implemented and exported but is intentionally not called in the Phase 1 `startAudit` action (Phase 2 is responsible for calling it after audit completion/cancellation/failure). This is by design per the plan — FOLD-05 is satisfied at the service level; Phase 2 execution is required to observe the runtime behavior.

**Note on SETUP-02/03/04:** The bug only affects the Settings page (`api-keys-client.tsx`). The first-run setup wizard (`setup-wizard.tsx:28`) correctly calls `createApiKey(provider, apiKey, label)` with the right argument order. Users who add their first key through the setup wizard will have a valid key stored. The bug surfaces only when adding additional keys through Settings.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/app/(app)/settings/api-keys/api-keys-client.tsx` | 102 | `createApiKey(provider, label, rawKey)` — swapped label/rawKey args | BLOCKER | SETUP-02, SETUP-03, SETUP-04 fail for all keys added via Settings page |
| `apps/web/app/(app)/audit/[id]/queued/page.tsx` | body text | "The audit engine is coming in Phase 2" visible to users | INFO | Intentional Phase 2 stub — documented in 01-03-SUMMARY.md Known Stubs |

---

### Human Verification Required

#### 1. Settings Page API Key Add

**Test:** Open Settings > API Keys, add an Anthropic key with a custom label via the Add key form
**Expected:** Key validates successfully, is stored with the correct masked display, and persists on page reload
**Why human:** The swapped-argument bug is confirmed in code; human test will confirm whether TypeScript's type-checker silently accepted the wrong order (both label and rawKey are `string` type, so no compile error) and what the actual runtime failure looks like

#### 2. Folder Lock Enforcement

**Test:** Select a real local git repository, configure an audit, click Start Audit and confirm the dialog
**Expected:** The folder's files become read-only (try `touch {folder}/test.txt` — should fail), git push is blocked (`git push` from the folder should error), and the queued page shows the audit details
**Why human:** Filesystem permission changes and git remote mutations require running the app against a real local folder

#### 3. Cost Estimate Reactivity

**Test:** Select a folder, then change audit type, depth, and provider in sequence
**Expected:** The cost estimate range updates immediately after each selection change without clicking Submit
**Why human:** Reactive `useMemo` behavior and client-side state updates cannot be verified from static analysis

---

### Gaps Summary

**One blocker gap** affecting three requirements (SETUP-02, SETUP-03, SETUP-04):

In `apps/web/app/(app)/settings/api-keys/api-keys-client.tsx` at line 102, the `AddKeyForm` component calls `createApiKey(provider, label, rawKey)` but the `addApiKey` function signature is `(provider, rawKey, label)`. Since both `label` and `rawKey` are `string` types, TypeScript does not catch this. At runtime, the user's label string (e.g. "Personal") is passed to the provider validator and will either fail validation (short label won't match key patterns) or succeed with garbage data stored as the encrypted key.

**Scope of impact:** The setup wizard (`setup-wizard.tsx`) calls `createApiKey(provider, apiKey, label)` correctly, so the first-run API key add flow works. Only the Settings page is affected.

**Fix is one line:** Change line 102 from `createApiKey(provider, label, rawKey)` to `createApiKey(provider, rawKey, label)`.

All other 12 must-haves across Plans 01, 02, and 03 are verified with full artifact, substantive, and wiring checks passing.

---

*Verified: 2026-03-22T04:30:00Z*
*Verifier: Claude (gsd-verifier)*
