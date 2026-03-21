# Changelog

All notable changes to CodeAudit will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## 2026-03-22 — GitHub App + API Key Management (Phase 1, Plan 01-03)

### Added

- **AES-256-GCM encryption utility** (`packages/db/src/encryption.ts`) with `encryptApiKey()`, `decryptApiKey()`, `maskApiKey()` — unique IV per key, auth-tag tamper detection
- **API key validation service** (`lib/api-key-validator.ts`) — lightweight test calls to Anthropic, OpenAI, and Gemini APIs; returns typed result (`valid | invalid_key | rate_limited | quota_exceeded | network_error`)
- **API key CRUD server actions** (`actions/api-keys.ts`) — create, list, update label, delete; all scoped to authenticated userId (IDOR safe); encrypted keys never returned to client
- **`maskedKey` column** added to `api_keys` schema — stores last-4 chars display string at creation, avoiding decryption for list views
- **API Keys settings page** at `/settings/api-keys` with three equal sections (Anthropic, OpenAI, Gemini); add/edit label/delete with confirmation
- **GitHub App installation flow** — `lib/github-app.ts` with install URL, token expiry checks, and refresh function
- **GitHub App webhook handler** at `/api/github/webhook` — processes `installation.created`, `installation.deleted`, `installation_repositories.added/removed`; HMAC-SHA256 signature verification with timing-safe comparison
- **GitHub App installation callback** at `/api/github/callback` — stores installation record after GitHub App install, redirects to onboarding or settings
- **Proactive GitHub token refresh** (`lib/github-token-refresh.ts`) — refreshes access_token 15 minutes before expiry; in-memory lock prevents concurrent refreshes; null return signals expired refresh token (re-auth needed)
- **GitHub connection settings page** at `/settings/github` — shows connection status, account login, installation ID, manage repos link (opens GitHub), disconnect with confirmation
- **Settings index page** updated with navigation cards to API Keys and GitHub sections
- **Onboarding Step 2 (API key)** wired to real API key form — shows existing keys, allows adding inline, Continue button unlocks after first key
- **Onboarding Step 3 (Repo)** wired to GitHub App install — Install GitHub App button, confirmation state after callback, skip remains available
- **Encryption unit tests** — round-trip, unique IVs, tamper detection, wrong-key failure, key validation edge cases

## 2026-03-22 — Auth Flows (Phase 1, Plan 01-02)

### Added

- **Auth.js v5** with GitHub OAuth provider and Drizzle adapter (database session strategy)
- **Sign-in page** at `/sign-in` with "Sign in with GitHub" button, dark mode styling, OAuth error messages
- **Auth middleware** protecting `/dashboard/*` and `/onboarding/*` — unauthenticated users redirected to sign-in
- **Session utilities**: `getRequiredSession()`, `getOptionalSession()`, `getRequiredUser()` in `lib/auth.ts`
- **Sign-out action** and `SignOutButton` component (integrated into sidebar)
- **Guided onboarding flow** (4 steps): Welcome, Add API Key (placeholder), Connect Repo (placeholder), Ready
- **`has_completed_onboarding` flag** on users table — first-time users redirected to onboarding after sign-in
- **Dashboard shell** with persistent sidebar navigation, GitHub avatar, user name/email, sign-out button
- **Dashboard home page** with quick-action cards and empty state for recent audits
- GitHub avatar image domain configured in `next.config.ts`

## 2026-03-21 — Project Scaffolding (Phase 1, Plan 01-01)

### Added

- **Monorepo structure** with pnpm workspaces (`apps/*`, `packages/*`, `worker`)
- **Next.js 16 app** at `apps/web` with App Router, React 19, TypeScript 5.x
- **Dark mode default** (Linear-style aesthetic) with Geist font, CSS variables, custom scrollbar
- **Landing page** — product name, one-liner, "Sign in with GitHub" button (non-functional at this stage)
- **Dashboard layout** with left sidebar navigation (Dashboard, Audits, Repos, Settings)
- **Drizzle ORM schema** at `packages/db` with Auth.js-compatible tables (users, accounts, sessions, verification_tokens)
- **api_keys table** with AES-256-GCM encrypted storage design (encrypted_key + iv columns)
- **github_installations table** for GitHub App installation tracking
- **audits table** with structured JSONB findings column and typed `AuditFindings` schema
- **audit_phases table** for per-phase output and token tracking
- **`AuditFinding` / `AuditFindings` TypeScript types** defined in Phase 1 for Phase 5 comparison feature
- **Stub packages**: `@codeaudit/audit-engine`, `@codeaudit/llm-adapter`, `@codeaudit/repo-sandbox`
- **Worker stub** at `worker/` with BullMQ + ioredis dependencies
- **Docker Compose** with PostgreSQL 16 + Redis 7, persistent volumes, health checks
- **Root dev scripts**: `dev`, `dev:db`, `dev:web`, `db:generate`, `db:migrate`
- **Vitest config** for cross-package unit testing
- **Prettier + ESLint** with consistent formatting rules
- **`.env.example`** documenting all required environment variables
