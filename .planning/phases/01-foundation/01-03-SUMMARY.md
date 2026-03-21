---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [github-app, byok, encryption, aes-256-gcm, api-keys, webhooks, onboarding]

# Dependency graph
requires:
  - phase: 01-foundation-01-01
    provides: DB schema (api_keys, github_installations, accounts tables)
  - phase: 01-foundation-01-02
    provides: Auth.js v5 session, getRequiredSession, onboarding flow shell, dashboard layout

provides:
  - AES-256-GCM encryption utility (encryptApiKey, decryptApiKey, maskApiKey)
  - API key CRUD server actions scoped to userId (IDOR safe)
  - API key validation service (Anthropic, OpenAI, Gemini)
  - GitHub App installation flow and callback handler
  - GitHub App webhook handler with HMAC-SHA256 signature verification
  - Proactive GitHub access token refresh (15-min threshold)
  - GitHub disconnect server action
  - Settings pages: /settings/api-keys, /settings/github
  - Onboarding steps 2 and 3 wired to real functionality

affects: [02-repo-browser, 03-audit-engine, 04-results, 05-comparison]

# Tech tracking
tech-stack:
  added:
    - node:crypto (built-in) — AES-256-GCM encryption
  patterns:
    - BYOK API key storage pattern — encrypt plaintext, store maskedKey at creation, never decrypt for list views
    - Server action scoping pattern — all mutations require userId match (IDOR prevention)
    - Typed validation result pattern — validateApiKey returns discriminated union
    - In-memory per-user lock for token refresh race prevention

key-files:
  created:
    - packages/db/src/encryption.ts — AES-256-GCM encrypt/decrypt/mask
    - packages/db/src/encryption.test.ts — round-trip, tamper, wrong-key tests
    - apps/web/lib/api-key-validator.ts — per-provider validation service
    - apps/web/lib/github-app.ts — GitHub App URL helpers and token expiry checks
    - apps/web/lib/github-token-refresh.ts — proactive access token refresh
    - apps/web/actions/api-keys.ts — createApiKey, listApiKeys, updateApiKeyLabel, deleteApiKey
    - apps/web/actions/github.ts — disconnectGitHubAction
    - apps/web/app/api/github/webhook/route.ts — webhook handler with signature verification
    - apps/web/app/api/github/callback/route.ts — installation callback handler
    - apps/web/app/(dashboard)/settings/api-keys/page.tsx — API keys settings page
    - apps/web/app/(dashboard)/settings/api-keys/api-keys-client.tsx — client UI with add/edit/delete
    - apps/web/app/(dashboard)/settings/github/page.tsx — GitHub connection status page
    - apps/web/app/(dashboard)/settings/github/github-settings-client.tsx — connect/disconnect UI
    - apps/web/app/(dashboard)/onboarding/api-key/onboarding-api-key-client.tsx — wired API key form
  modified:
    - packages/db/src/schema.ts — added maskedKey column to api_keys table
    - packages/db/src/index.ts — exported encryption utilities
    - apps/web/auth.ts — check GitHub App installation status in session callback
    - apps/web/app/(dashboard)/onboarding/api-key/page.tsx — wired to real API key form
    - apps/web/app/(dashboard)/onboarding/repo/page.tsx — wired to GitHub App install
    - apps/web/app/(dashboard)/settings/page.tsx — added navigation cards

key-decisions:
  - "maskedKey column added to api_keys schema — store at creation from plaintext, no decryption needed for list view"
  - "In-memory refresh lock (Set<string>) for single-process; note: distributed deployments need Redis SETNX"
  - "Webhook installation.created doesn't force-insert DB record — callback handler owns creation; webhook logs for observability"
  - "API key validation allows rate_limited/quota_exceeded through to encryption — key is valid even if quota hit"

patterns-established:
  - "BYOK key storage: encrypt → store maskedKey at creation → never return encryptedKey to client"
  - "Server action auth pattern: requireUserId() at top of every mutating action"
  - "IDOR prevention: all DB mutations use AND(id=X, userId=Y) — ownership check implicit in delete/update"
  - "Webhook pattern: verify signature first, return 500 on processing errors (triggers GitHub retry)"

requirements-completed: [AUTH-04, AUTH-06, AUTH-07]

# Metrics
duration: 10min
completed: 2026-03-22
---

# Phase 1 Plan 03: GitHub App + API Key Management Summary

**AES-256-GCM BYOK API key storage with per-provider validation, GitHub App installation flow with proactive token refresh, and wired onboarding steps**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-21T19:05:03Z
- **Completed:** 2026-03-21T19:15:39Z
- **Tasks:** 8
- **Files modified:** 26

## Accomplishments

- Full BYOK API key lifecycle: validate via test API call → encrypt with AES-256-GCM → store with maskedKey → display without decryption
- GitHub App installation flow: install URL, callback handler, webhook processing with HMAC-SHA256 signature verification
- Proactive GitHub token refresh (15-min threshold before expiry) with in-process lock preventing concurrent refreshes
- Onboarding steps 2 and 3 wired from placeholders to real functionality

## Task Commits

Each task was committed atomically:

1. **Task 1: GitHub App installation flow** - `8927b3a` (feat)
2. **Task 2: GitHub App webhook handler** - `1f63ac7` (feat)
3. **Task 3: GitHub token refresh mechanism** - `f4cd3fa` (feat)
4. **Task 4: Encryption utility with unit tests** - `c858c37` (feat)
5. **Task 5: API key validation service** - `483cfa7` (feat)
6. **Task 6: API key management UI** - `287a54a` (feat)
7. **Task 7: Wire onboarding flow** - `b7f7754` (feat)
8. **Task 8: GitHub connection settings page** - `e64a6aa` (feat)

## Files Created/Modified

- `packages/db/src/encryption.ts` — AES-256-GCM encrypt/decrypt/mask with node:crypto
- `packages/db/src/encryption.test.ts` — unit tests: round-trip, unique IVs, tamper detection, wrong-key
- `packages/db/src/schema.ts` — added `maskedKey` column to api_keys table
- `packages/db/src/index.ts` — exported encryption utilities
- `apps/web/lib/api-key-validator.ts` — validateApiKey() with typed result for 3 providers
- `apps/web/lib/github-app.ts` — install URL, token expiry check, refreshGitHubAppToken()
- `apps/web/lib/github-token-refresh.ts` — getGitHubAccessToken() with proactive refresh + in-memory lock
- `apps/web/actions/api-keys.ts` — CRUD server actions, all userId-scoped
- `apps/web/actions/github.ts` — disconnectGitHubAction
- `apps/web/app/api/github/webhook/route.ts` — webhook handler, HMAC-SHA256 verification
- `apps/web/app/api/github/callback/route.ts` — installation callback, DB upsert, redirect
- `apps/web/app/(dashboard)/settings/api-keys/page.tsx` — server component, list keys
- `apps/web/app/(dashboard)/settings/api-keys/api-keys-client.tsx` — add/edit/delete UI
- `apps/web/app/(dashboard)/settings/github/page.tsx` — installation status server component
- `apps/web/app/(dashboard)/settings/github/github-settings-client.tsx` — connect/disconnect UI
- `apps/web/app/(dashboard)/onboarding/api-key/onboarding-api-key-client.tsx` — wired form
- `apps/web/app/(dashboard)/onboarding/api-key/page.tsx` — wired, shows existing keys
- `apps/web/app/(dashboard)/onboarding/repo/page.tsx` — wired GitHub App install button
- `apps/web/auth.ts` — session callback checks GitHub App installation
- `apps/web/app/(dashboard)/settings/page.tsx` — navigation cards to sub-settings

## Decisions Made

- **maskedKey column in schema:** The list view needs last-4 chars of the plaintext key. Rather than decrypt on every list load, we store the masked version at creation time. Added `maskedKey text default '••••'` to api_keys schema.
- **In-memory refresh lock:** `Set<string>` prevents concurrent refreshes within the same process. This is sufficient for single-server deployments; a production multi-server deployment needs Redis SETNX. Documented in code.
- **Webhook installation.created handler:** Does NOT force-create a DB record when no existing record found. The callback route owns record creation (it has the userId from session). The webhook logs and moves on. This avoids a race condition where the webhook fires before the callback completes.
- **Validation allows rate_limited/quota_exceeded:** These statuses mean the key IS valid — the user just hit usage limits. We encrypt and store it. Only `invalid_key` and `network_error` block storage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added maskedKey column to api_keys schema**
- **Found during:** Task 6 (API key management UI / server actions)
- **Issue:** The `listApiKeys` action needs to display "last 4 chars of the API key" without decrypting. No maskedKey column existed in schema, so there was no way to display this correctly.
- **Fix:** Added `maskedKey text not null default '••••'` to schema.ts api_keys table. Updated `createApiKey` to derive and store maskedKey from plaintext before encrypting. `listApiKeys` now reads maskedKey directly.
- **Files modified:** packages/db/src/schema.ts, apps/web/actions/api-keys.ts
- **Verification:** listApiKeys returns maskedKey from DB; createApiKey stores maskApiKey(rawKey) result
- **Committed in:** 287a54a (Task 6 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical data)
**Impact on plan:** Essential for correct display of stored keys. No scope creep.

## Issues Encountered

- Plan 01-02 was partially executed (only the Auth.js config commit was present in git, but the actual 01-02 SUMMARY showed all onboarding steps built). When this executor started, full 01-02 artifacts were present on disk (sign-in page, onboarding flow shell, etc.). Task 7 wired those existing placeholders rather than rebuilding them.

## User Setup Required

**GitHub App must be registered manually.** Required environment variables:

```
GITHUB_APP_NAME=               # GitHub App slug name (for install URL)
GITHUB_APP_ID=                 # GitHub App numeric ID
GITHUB_APP_PRIVATE_KEY=        # PEM private key for App-authenticated requests
GITHUB_APP_WEBHOOK_SECRET=     # HMAC-SHA256 webhook signing secret
GITHUB_APP_CLIENT_ID=          # OAuth client ID (for user auth + token refresh)
GITHUB_APP_CLIENT_SECRET=      # OAuth client secret
ENCRYPTION_KEY=                # 64-char hex string: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

GitHub App setup steps:
1. Go to GitHub Settings > Developer Settings > GitHub Apps > New GitHub App
2. Set webhook URL to: `https://your-domain/api/github/webhook`
3. Set callback URL to: `https://your-domain/api/github/callback`
4. Set permissions: `Contents: read` (repository permission)
5. Generate and download private key
6. Copy App ID, Client ID, Client Secret, Webhook Secret to env vars

## Next Phase Readiness

- BYOK API key storage fully functional: validate → encrypt → store → display masked
- GitHub App installation flow complete: install → webhook → callback → DB record
- Token refresh mechanism in place for audit worker to use
- Settings pages built and navigable from the sidebar
- Phase 2 (Repo Browser) can use `getGitHubAccessToken(userId)` from `lib/github-token-refresh.ts` for authenticated GitHub API calls
- Audit worker can decrypt API keys using `decryptApiKey(row.encryptedKey, row.iv)` from `@codeaudit/db`

## Self-Check: PASSED

All key files confirmed present on disk. All 8 task commits verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-22*
