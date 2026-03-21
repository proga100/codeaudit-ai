---
phase: 01-foundation
verified: 2026-03-22T00:00:00Z
status: gaps_found
score: 6/7 requirements verified (AUTH-01 intentionally dropped per D-01)
gaps:
  - truth: "User can sign up with email/password and sign in on subsequent visits (ROADMAP Success Criterion #1)"
    status: failed
    reason: "AUTH-01 was listed in ROADMAP Phase 1 requirements and Success Criteria but was intentionally dropped per decision D-01 (GitHub SSO only). No email/password auth exists anywhere in the codebase. The REQUIREMENTS.md Traceability table still maps AUTH-01 to Phase 1 as Pending. This is a documented decision but creates a gap between the stated ROADMAP success criterion and what was built."
    artifacts:
      - path: ".planning/ROADMAP.md"
        issue: "ROADMAP Phase 1 Success Criteria #1 requires email/password sign-up; this criterion is unachievable given D-01"
      - path: ".planning/REQUIREMENTS.md"
        issue: "Traceability table maps AUTH-01 to Phase 1 as Pending but no plan claims it and no implementation exists"
    missing:
      - "Either: update ROADMAP.md Phase 1 Success Criteria to remove the email/password criterion (it was superseded by D-01)"
      - "Or: update REQUIREMENTS.md Traceability to note AUTH-01 was dropped per D-01 and move it to Out of Scope or v2"
human_verification:
  - test: "Sign in via GitHub OAuth and verify session persists across browser refresh"
    expected: "After OAuth callback, user is redirected to /dashboard (or /onboarding on first visit), and hard-refreshing the page keeps the user signed in"
    why_human: "Requires actual GitHub OAuth App credentials and live OAuth redirect flow — cannot verify programmatically"
  - test: "First-time user onboarding flow: sign in fresh, step through all 4 steps including installing GitHub App and adding an API key"
    expected: "Steps 1-4 all render with real functionality, Skip works at each step, Step 4 marks onboarding complete and redirects to /dashboard"
    why_human: "Requires live GitHub App installation redirect and real LLM provider API key for validation"
  - test: "API key validation rejection: enter an invalid key (e.g. 'fake-key') for each provider"
    expected: "Each provider returns a distinct user-friendly error message (not a 500 or generic error)"
    why_human: "Requires live network calls to each LLM provider API"
  - test: "IDOR test: authenticate as User A, note a key ID from User A, then authenticate as User B and attempt to delete User A's key ID"
    expected: "DELETE returns 'API key not found' — User B cannot delete User A's keys"
    why_human: "Requires two separate authenticated sessions; cannot be tested via code inspection alone"
  - test: "Webhook signature rejection: POST to /api/github/webhook with a tampered or missing X-Hub-Signature-256 header"
    expected: "Returns HTTP 401 with 'Invalid signature'"
    why_human: "Requires live HTTP call — signature verification logic present in code but needs end-to-end confirmation"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Users can securely authenticate via GitHub SSO, connect their GitHub account to authorize repo access, and store/manage encrypted LLM API keys for Anthropic, OpenAI, and Gemini.
**Verified:** 2026-03-22
**Status:** gaps_found — 1 documentation gap (AUTH-01 ROADMAP/REQUIREMENTS.md mismatch), all code goals achieved
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (derived from ROADMAP Phase 1 Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can sign up with email/password (ROADMAP SC #1) | ✗ FAILED | No email/password auth exists. Only GitHub SSO. Decision D-01 intentionally dropped this, but ROADMAP SC #1 and REQUIREMENTS.md AUTH-01 still reference it. |
| 2 | User can sign in via GitHub SSO and maintain session across browser refresh (ROADMAP SC #2 + AUTH-02, AUTH-03) | ✓ VERIFIED | `auth.ts`: NextAuth with GitHub provider + database session strategy. `middleware.ts`: guards /dashboard and /onboarding, redirects unauthenticated. `lib/auth.ts`: `getRequiredSession()` wraps `auth()` with redirect. |
| 3 | User can connect GitHub account via OAuth to authorize repo access — GitHub App with Contents:read per-repo scope (ROADMAP SC #3 + AUTH-04) | ✓ VERIFIED | `lib/github-app.ts`: `getGitHubAppInstallUrl()`. `app/api/github/callback/route.ts`: stores installationId in `github_installations` table. `app/api/github/webhook/route.ts`: HMAC-SHA256 signature verification on all events. |
| 4 | User can add, update, and delete stored API keys for Anthropic, OpenAI, and Gemini, stored AES-256-GCM encrypted (ROADMAP SC #4 + AUTH-06, AUTH-07) | ✓ VERIFIED | `packages/db/src/encryption.ts`: AES-256-GCM with unique IVs + auth tag. `actions/api-keys.ts`: CRUD actions all userId-scoped (IDOR safe). `settings/api-keys/page.tsx` + `api-keys-client.tsx`: full add/edit/delete UI with 3 providers. |
| 5 | User can sign out from any page and session is terminated (ROADMAP SC #5 + AUTH-08) | ✓ VERIFIED | `app/actions/auth.ts`: `signOutAction()` calls `signOut({ redirectTo: "/sign-in" })`. `components/sign-out-button.tsx`: present in sidebar on all authenticated pages. `components/nav/sidebar.tsx`: SignOutButton in user section. |
| 6 | LLM API keys are validated via test API call before storage | ✓ VERIFIED | `lib/api-key-validator.ts`: live calls to Anthropic (`/v1/messages`), OpenAI (`/v1/models`), Gemini (`/v1beta/models`). Returns typed discriminated union. `actions/api-keys.ts`: `createApiKey` calls `validateApiKey` and blocks on `invalid_key` / `network_error` status. |
| 7 | Onboarding flow routes users through 4 steps on first sign-in; steps 2 and 3 are wired to real functionality | ✓ VERIFIED | `onboarding/api-key/page.tsx`: calls `listApiKeys()`, renders `OnboardingApiKeyClient`. `onboarding/repo/page.tsx`: queries `githubInstallations` table, renders GitHub App install URL. `app/actions/onboarding.ts`: `completeOnboardingAction()` sets `hasCompletedOnboarding = true`. |

**Score: 6/7 truths verified** (Truth #1 fails due to documentation gap — code goal fully achieved via GitHub SSO)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/auth.ts` | Auth.js v5 config with GitHub provider, DrizzleAdapter, database sessions | ✓ VERIFIED | NextAuth configured, GitHub provider, DrizzleAdapter with all 4 Auth.js tables, session callback includes userId and githubInstalled flag |
| `apps/web/middleware.ts` | Route protection redirecting unauthenticated users | ✓ VERIFIED | Wraps `auth()`, protects /dashboard/* and /onboarding/*, redirects to /sign-in with callbackUrl |
| `apps/web/lib/auth.ts` | getRequiredSession(), getOptionalSession(), getRequiredUser() utilities | ✓ VERIFIED | All 3 functions implemented, getRequiredUser() fetches full DB record |
| `apps/web/app/api/auth/[...nextauth]/route.ts` | Auth.js GET/POST handler | ✓ VERIFIED | Exports handlers from auth.ts |
| `apps/web/app/(auth)/sign-in/page.tsx` | Sign-in page with GitHub SSO button and OAuth error handling | ✓ VERIFIED | GitHub button, error message mapping for 4 OAuth error codes, auto-redirect if already signed in |
| `apps/web/app/actions/auth.ts` | signOutAction() server action | ✓ VERIFIED | Calls signOut({ redirectTo: "/sign-in" }) |
| `apps/web/components/nav/sidebar.tsx` | Sidebar with user info and sign-out button | ✓ VERIFIED | Logo, nav links with active state, GitHub avatar/name, SignOutButton |
| `apps/web/app/(dashboard)/layout.tsx` | Session-backed dashboard layout | ✓ VERIFIED | Calls getRequiredSession(), passes session.user to Sidebar |
| `packages/db/src/encryption.ts` | AES-256-GCM encrypt/decrypt/mask with node:crypto | ✓ VERIFIED | encryptApiKey(), decryptApiKey(), maskApiKey() all implemented with unique IVs and auth tag |
| `packages/db/src/encryption.test.ts` | Unit tests for encryption | ✓ VERIFIED | 11 tests covering round-trip, unique IVs, tamper detection, wrong-key failure, ENCRYPTION_KEY validation |
| `apps/web/lib/api-key-validator.ts` | Per-provider validation service | ✓ VERIFIED | Anthropic (POST /v1/messages), OpenAI (GET /v1/models), Gemini (GET /v1beta/models), typed result union |
| `apps/web/actions/api-keys.ts` | createApiKey, listApiKeys, updateApiKeyLabel, deleteApiKey server actions | ✓ VERIFIED | All 4 actions, requireUserId() guard, IDOR prevention via AND(id, userId) on all mutations, never returns encryptedKey |
| `apps/web/app/(dashboard)/settings/api-keys/page.tsx` | API keys settings page | ✓ VERIFIED | Server component, calls listApiKeys(), passes to ApiKeysClient |
| `apps/web/app/(dashboard)/settings/api-keys/api-keys-client.tsx` | Client UI with add/edit/delete | ✓ VERIFIED | 3 provider sections, AddKeyForm, EditLabelForm, DeleteConfirmDialog, all wired to server actions |
| `apps/web/app/api/github/webhook/route.ts` | Webhook handler with HMAC-SHA256 signature verification | ✓ VERIFIED | timingSafeEqual comparison, handles installation.created/deleted and installation_repositories.added/removed |
| `apps/web/app/api/github/callback/route.ts` | Installation callback handler | ✓ VERIFIED | Requires auth, upserts githubInstallations record, redirects back to state URL |
| `apps/web/app/(dashboard)/settings/github/page.tsx` | GitHub connection status page | ✓ VERIFIED | Queries githubInstallations, passes to GitHubSettingsClient with install/manage URLs |
| `apps/web/app/(dashboard)/settings/github/github-settings-client.tsx` | Connect/disconnect UI | ✓ VERIFIED | Connected/disconnected states, "Manage repositories" external link, disconnect with confirmation dialog |
| `apps/web/lib/github-token-refresh.ts` | Proactive token refresh with in-memory lock | ✓ VERIFIED | 15-min threshold via isTokenExpiringSoon(), Set-based per-user lock, DB update on refresh |
| `packages/db/src/schema.ts` | All tables including api_keys (maskedKey), github_installations, users (hasCompletedOnboarding) | ✓ VERIFIED | 8 tables present, api_keys has encryptedKey+iv+maskedKey, users has hasCompletedOnboarding |
| `packages/db/src/index.ts` | Exports encryption utilities | ✓ VERIFIED | Exports encryptApiKey, decryptApiKey, maskApiKey, EncryptedKey |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sign-in/page.tsx` | Auth.js signIn() | `import { signIn } from "@/auth"` + form action | ✓ WIRED | Server action calls `signIn("github", { redirectTo })` |
| `signOutAction` | Auth.js signOut() | `import { signOut } from "@/auth"` | ✓ WIRED | `signOut({ redirectTo: "/sign-in" })` |
| `dashboard/layout.tsx` | getRequiredSession() | `import { getRequiredSession } from "@/lib/auth"` | ✓ WIRED | Session gates dashboard rendering, passes user to Sidebar |
| `actions/api-keys.ts` | encryptApiKey() | `import { encryptApiKey, maskApiKey } from "@codeaudit/db"` | ✓ WIRED | createApiKey: validates → encrypts → stores maskedKey — plaintext never returned |
| `actions/api-keys.ts` | validateApiKey() | `import { validateApiKey } from "@/lib/api-key-validator"` | ✓ WIRED | Called in createApiKey before encryption; blocks on invalid_key and network_error |
| `api-keys-client.tsx` | createApiKey / deleteApiKey / updateApiKeyLabel | `import { createApiKey, deleteApiKey, updateApiKeyLabel } from "@/actions/api-keys"` | ✓ WIRED | All 3 mutation actions wired to form handlers; return value checked for success/error |
| `webhook/route.ts` | signature verification | `createHmac + timingSafeEqual` | ✓ WIRED | Returns 401 on bad signature before any payload processing |
| `callback/route.ts` | githubInstallations DB upsert | `import { getDb, githubInstallations } from "@codeaudit/db"` | ✓ WIRED | Inserts record scoped to session.user.id |
| `onboarding/api-key/page.tsx` | real API key form | `import { OnboardingApiKeyClient }` + `listApiKeys()` | ✓ WIRED | No longer a placeholder — loads existing keys, renders add form |
| `onboarding/repo/page.tsx` | GitHub App install URL | `import { getGitHubAppInstallUrl }` + githubInstallations query | ✓ WIRED | No longer a placeholder — checks DB for installation, renders Install button or confirmation |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | ROADMAP lists for Phase 1 (no plan claims it) | User can sign up with email/password | ✗ INTENTIONALLY DROPPED | Decision D-01 explicitly drops AUTH-01 in favor of GitHub SSO only. Plan 01-02 notes this. No implementation exists. ROADMAP and REQUIREMENTS.md still reference it — documentation gap. |
| AUTH-02 | Plan 01-02 (`requirements-completed`) | User can sign in and maintain session across browser refresh | ✓ SATISFIED | Database session strategy; sessions table in DB; `auth()` call in middleware validates session on every protected request |
| AUTH-03 | Plan 01-02 (`requirements-completed`, partial) | User can sign in with GitHub SSO | ✓ SATISFIED | GitHub provider configured in auth.ts; sign-in page triggers `signIn("github")`; full OAuth flow implemented |
| AUTH-04 | Plan 01-03 (`requirements-completed`) | User can connect their GitHub account via OAuth to grant repo access | ✓ SATISFIED | GitHub App install flow (`/api/github/callback`), installationId stored in `github_installations`, webhook handler processes events |
| AUTH-06 | Plan 01-03 (`requirements-completed`) | User can store encrypted LLM API keys for Anthropic, OpenAI, and Gemini | ✓ SATISFIED | AES-256-GCM encryption in `packages/db/src/encryption.ts`; createApiKey validates then encrypts; maskedKey stored for display |
| AUTH-07 | Plan 01-03 (`requirements-completed`) | User can update or delete their stored API keys | ✓ SATISFIED | updateApiKeyLabel and deleteApiKey server actions; both userId-scoped (IDOR safe); delete has confirmation UI |
| AUTH-08 | Plan 01-02 (`requirements-completed`) | User can sign out from any page | ✓ SATISFIED | SignOutButton in sidebar present on all authenticated pages; signOutAction() clears session and redirects |

**Orphaned requirements from REQUIREMENTS.md mapped to Phase 1:**
- AUTH-01: Mapped to Phase 1 in Traceability, status "Pending" — but intentionally dropped per D-01. Not orphaned per se, but the traceability table is misleading. Should be updated.

---

## Anti-Patterns Found

Scanned all key files from SUMMARY.md frontmatter.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(dashboard)/onboarding/api-key/page.tsx` | — | Previous placeholder replaced with real form | ✓ CLEAN | Intentional placeholder from 01-02 was wired in 01-03 |
| `app/(dashboard)/onboarding/repo/page.tsx` | — | Previous placeholder replaced with real install flow | ✓ CLEAN | Intentional placeholder from 01-02 was wired in 01-03 |
| `lib/github-token-refresh.ts` | 27 | `const refreshLocks = new Set<string>()` — in-memory lock | ℹ️ INFO | Single-process only; documented in code and SUMMARY. Sufficient for Phase 1; distributed deployments need Redis SETNX. |
| `app/api/github/callback/route.ts` | 46 | `accountLogin = session.user.name ?? session.user.email ?? "unknown"` | ⚠️ WARNING | Uses OAuth display name as GitHub account login. The actual `account_login` from the GitHub App installation is not fetched. This is a stub — GitHub App private key auth needed to call `/app/installations/{id}` for the real accountLogin. Non-blocking for Phase 1 but will affect display in settings/github page. |
| `packages/db/src/encryption.ts` | — | No stub patterns found | ✓ CLEAN | — |
| `actions/api-keys.ts` | — | No stubs; all 4 CRUD actions fully implemented | ✓ CLEAN | — |

---

## Human Verification Required

### 1. GitHub OAuth Sign-in Flow

**Test:** With GitHub OAuth credentials in `.env.local`, navigate to `/sign-in` and click "Sign in with GitHub"
**Expected:** GitHub OAuth consent screen appears; after authorization user is redirected to `/onboarding` (first time) or `/dashboard` (returning user); session persists across hard refresh
**Why human:** Requires live GitHub OAuth App registration and real browser redirect flow

### 2. Session Persistence Across Refresh

**Test:** Sign in, then hard-refresh the page (Ctrl+Shift+R)
**Expected:** User remains on /dashboard without redirect to /sign-in
**Why human:** Database session strategy must be verified end-to-end with real Postgres

### 3. Full Onboarding Flow Including GitHub App Installation

**Test:** Sign in as a new user; go through onboarding steps 1-4; at Step 3, click "Install GitHub App" and install it on a test repo
**Expected:** After GitHub App callback, `/onboarding/repo` shows "GitHub App installed" confirmation; Step 4 "Go to dashboard" marks onboarding complete
**Why human:** Requires registered GitHub App and live installation callback from GitHub

### 4. API Key Validation — Valid and Invalid Keys

**Test:** On `/settings/api-keys`, add a real key for one provider and a fake key for another
**Expected:** Real key is accepted and shows masked value; fake key ("invalid-key-123") shows user-friendly error (not a generic 500)
**Why human:** Requires live LLM provider API calls; validation is server-side only

### 5. IDOR Prevention Test

**Test:** Authenticate as User A, retrieve a key ID from the API keys page. Switch to User B's session. Attempt `deleteApiKey("<User A's key ID>")` via browser DevTools or direct server action call
**Expected:** Returns `{ success: false, error: "API key not found" }` — User B cannot delete User A's keys
**Why human:** Requires two separate authenticated sessions

### 6. Webhook Signature Rejection

**Test:** POST to `/api/github/webhook` with a valid JSON body but no `X-Hub-Signature-256` header, or with a tampered signature
**Expected:** Returns `HTTP 401 {"error":"Invalid signature"}`
**Why human:** Requires external HTTP tool to craft raw webhook requests

---

## Gaps Summary

There is 1 gap blocking a complete "all truths verified" status, but it is **a documentation gap, not a code gap**:

**ROADMAP.md Phase 1 Success Criterion #1** states "User can sign up with email/password and sign in on subsequent visits with session persisting across browser refresh." This criterion cannot be satisfied — it was superseded by Decision D-01 (GitHub SSO only) before implementation started. The codebase correctly implements GitHub SSO as the only auth method.

Two items need updating to close this gap:
1. **ROADMAP.md Phase 1 Success Criteria** — remove or replace Criterion #1 with the actual implemented behavior (GitHub SSO sign-in, session persistence)
2. **REQUIREMENTS.md Traceability** — update AUTH-01 row to note "Dropped per D-01 decision — GitHub SSO is the only auth method"

The code goal of the phase — secure GitHub SSO, repo access via GitHub App, AES-256-GCM encrypted BYOK key storage — is **fully achieved**. All wiring is substantive (no stubs that matter), all CRUD is scoped, encryption round-trips are tested, and the onboarding flow is wired end-to-end.

The only non-critical code note is that the GitHub App callback stores `session.user.name` as `accountLogin` rather than the actual GitHub account login from the App installation API. This is acceptable for Phase 1 display but should be resolved when the GitHub App private key is used in Phase 2 for API calls.

---

*Verified: 2026-03-22*
*Verifier: Claude (gsd-verifier)*
