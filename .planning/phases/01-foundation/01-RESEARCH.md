# Phase 1: App Shell & Configuration - Research

**Researched:** 2026-03-22
**Domain:** Local-first Next.js app — auth removal, SQLite migration, folder-safety enforcement, BYOK API key management, audit configuration UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** No authentication needed — local tool, only the user has access (like VS Code).
- **D-02:** App starts via `npx codeaudit` — downloads and runs, opens browser at localhost automatically.
- **D-03:** First-time users see a quick setup wizard: 1) Add API key 2) Done. Then main screen. One-time only.
- **D-04:** Path input with Browse button for folder selection. Supports selecting multiple folders.
- **D-05:** If multiple folders selected, app runs individual audits on each first, then proceeds with multi-repo audit.
- **D-06:** If selected folder is not a git repo, ask user if they want to proceed. During audit, skip git-specific phases.
- **D-07:** Main screen shows recently audited folders for quick re-run.
- **D-08:** All configuration on one page — folder picker at top, then type/depth/model/estimate below. Single scrollable page.
- **D-09:** Always start with defaults (Full audit, Deep, first key) — no "remember last settings."
- **D-10:** Audit type selection uses card UI — 4 cards (full, security-only, team, code quality).
- **D-11:** Depth selection uses Quick Scan / Deep Audit toggle with time and cost details.
- **D-12:** API key selection via dropdown grouped by provider (e.g., "Anthropic — Personal").
- **D-13:** After selecting a provider/key, fetch available models from that provider's API.
- **D-14:** For Anthropic: show Sonnet and Opus. For OpenAI: show GPT-4o etc. For Gemini: show Flash, Pro etc. Fetched dynamically.
- **D-15:** Include an "Auto" mode where app selects best model per phase automatically.
- **D-16:** Cost estimate updates live as user changes configuration — even before folder is picked.
- **D-17:** Cost estimate is a rough range (e.g., "$3–$8") based on folder size heuristic.
- **D-18:** "Start Audit" button opens a confirmation dialog summarizing folder(s), type, depth, model, estimated cost.
- **D-19:** App locks target folder read-only (`chmod -R a-w`) and blocks git push (`git remote set-url --push origin no_push`) before audit starts.
- **D-20:** App creates a separate audit output directory (`~/audit-{repo-name}/`) for all findings.
- **D-21:** App unlocks folder after audit completes, is cancelled, or fails.
- **D-22:** Linear-style aesthetic — clean, minimal, dark mode default, sharp typography.
- **D-23:** Left sidebar navigation — Dashboard (recent audits), New Audit, Settings (API keys).

### Claude's Discretion

- Exact card icons/descriptions for audit types
- Search/filter behavior for recent folders
- Setup wizard transitions
- Cost heuristic formula details
- Model capability mapping for Auto mode
- Error states for folder permission issues

### Deferred Ideas (OUT OF SCOPE)

- Multi-repo audit execution logic (individual + cross-repo) — noted in D-05 but actual execution is a future phase
- npm global install / Homebrew distribution — v2 after npx is working
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | User can open the app in their browser at localhost after running one start command | npx CLI entry point — `open` package auto-opens browser; Next.js `next start` serves on localhost:3000 |
| SETUP-02 | User can add, update, and delete encrypted LLM API keys for Anthropic, OpenAI, and Gemini | `encryptApiKey`/`decryptApiKey` from `packages/db/src/encryption.ts` is directly reusable; Server Actions pattern established |
| SETUP-03 | User can store multiple keys per provider with labels | `apiKeys` table schema already supports label + provider columns — reuse as-is after removing `userId` FK |
| SETUP-04 | API keys are validated on entry via test API call | `apps/web/lib/api-key-validator.ts` is fully reusable — extend with model-listing capability |
| FOLD-01 | User can select a local folder via folder picker or path input | Native `<input type="file" webkitdirectory>` via a Server Action wrapper for the path; no extra library needed |
| FOLD-02 | App locks the target folder read-only (chmod -R a-w) | Node.js `child_process.execFile` calling `chmod` — wrap in a safety service |
| FOLD-03 | App blocks git push on the target folder | `git remote set-url --push origin no_push` via `child_process` — already defined in manual process |
| FOLD-04 | App creates separate audit output directory (~/audit-{repo-name}/) | `fs.mkdirSync` with `{ recursive: true }` — trivial |
| FOLD-05 | App unlocks the folder after audit completes or is cancelled | `chmod -R u+w` via `child_process` — must be in finally block and on process exit |
| CONF-01 | User can select audit type: full, security-only, team, code quality | Card UI with 4 cards — reuse Shadcn/ui Card component; state managed locally in New Audit page |
| CONF-02 | User can select audit depth: quick scan or deep audit | Toggle UI — reuse Shadcn/ui Toggle/RadioGroup |
| CONF-03 | User can select which LLM provider and key to use | Dropdown grouped by provider — Shadcn/ui Select with grouped options; keys fetched via Server Action |
| CONF-04 | User sees a pre-audit cost estimate | Live-updating cost range computed from folder stats + audit type + depth + provider pricing constants |
| CONF-05 | User can start an audit after reviewing the cost estimate | Confirmation dialog (Shadcn/ui AlertDialog) summarising all config before proceeding |
</phase_requirements>

---

## Summary

Phase 1 is a **pivot-and-adapt** task, not a greenfield build. The codebase has a solid Next.js 16 / Drizzle ORM / Shadcn/ui scaffold from a prior cloud iteration. The three primary technical changes are: (1) replace PostgreSQL + Neon with SQLite via `better-sqlite3`, eliminating the cloud database dependency; (2) strip all Auth.js / GitHub OAuth code and replace with a no-auth localhost model; (3) add a `npx codeaudit` CLI launcher that starts Next.js and auto-opens the browser. The encryption utility, API key validator, Shadcn/ui component library, Tailwind dark mode tokens, and the `apiKeys`/`audits`/`auditPhases` schema shapes are all directly reusable with minor adaptations.

The main new UI work is the "New Audit" page — a single scrollable configuration page with folder picker, audit type cards, depth toggle, provider/key/model dropdowns, live cost estimate, and confirmation dialog. The sidebar needs to be simplified (remove user profile / sign-out; replace Repos/Audits nav with Dashboard/New Audit/History/Settings). The schema needs `userId` foreign keys removed from all tables and GitHub-specific tables dropped.

The `npx` entry point is a small Node.js script in a new `packages/cli` workspace that installs dependencies (or uses bundled), calls `next start` (or `next dev` in dev), and opens `http://localhost:3000` using the `open` package.

**Primary recommendation:** Adapt the scaffold top-down — schema migration first (SQLite + remove auth tables), then auth removal (middleware, routes, actions), then sidebar/layout adapt, then new "New Audit" page, then CLI entry point last (it just wraps `next start`).

---

## Standard Stack

### Core (existing — keep)

| Library | Version (verified) | Purpose | Notes |
|---------|-------------------|---------|-------|
| Next.js | 16.2.1 | Full-stack React framework | Already installed; App Router; keep as-is |
| TypeScript | 5.7.x | Language | Already configured |
| Tailwind CSS | 4.2.2 | Styling | Already configured with dark-mode tokens in `globals.css` |
| Shadcn/ui | latest (CLI 4.1.0) | UI components | Already set up; `components/ui/` populated |
| Drizzle ORM | 0.45.1 | Database ORM | Already installed; keep version |
| Drizzle Kit | 0.31.10 | Schema migrations | Already installed |
| Zod | 4.3.6 | Validation | Already installed |
| TanStack Query | 5.94.5 | Client-side state | Already installed |
| lucide-react | 0.577.0 | Icons | Already installed |

### New additions for local-first pivot

| Library | Version (verified) | Purpose | Why |
|---------|-------------------|---------|-----|
| better-sqlite3 | 12.8.0 | SQLite driver | Replaces Neon/Postgres; synchronous API, zero server, file-based — perfect for local tool |
| @types/better-sqlite3 | latest | Types for better-sqlite3 | TypeScript support |
| open | 11.0.0 | Open browser from CLI | Used in `npx codeaudit` launcher to auto-open browser |
| drizzle-orm (sqlite adapter) | 0.45.1 | Drizzle SQLite support | Already installed; activate `drizzle-orm/better-sqlite3` adapter instead of Neon |

### Remove (auth-specific)

| Library | Action |
|---------|--------|
| next-auth | Remove |
| @auth/drizzle-adapter | Remove |
| @neondatabase/serverless | Remove |

### Installation

```bash
# In packages/db
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3

# In packages/cli (new workspace package)
pnpm add open

# Remove cloud/auth deps from apps/web
pnpm remove next-auth @auth/drizzle-adapter @neondatabase/serverless
```

**Version verification:** Versions above confirmed against npm registry on 2026-03-22.

---

## Architecture Patterns

### Recommended Project Structure (after adaptation)

```
apps/web/
├── app/
│   ├── layout.tsx              # Keep — dark mode, Geist font
│   ├── page.tsx                # Root redirect → /dashboard
│   ├── (app)/
│   │   ├── layout.tsx          # App shell with sidebar (no user prop needed)
│   │   ├── dashboard/          # Recent audits list (D-07)
│   │   ├── audit/new/          # New Audit page (D-08 through D-18)
│   │   ├── history/            # All past audits
│   │   └── settings/
│   │       └── api-keys/       # API key management (SETUP-02, SETUP-03, SETUP-04)
│   └── api/
│       └── models/route.ts     # Fetch available models from provider (D-13, D-14)
├── actions/
│   ├── api-keys.ts             # Adapt existing — remove userId param
│   ├── folders.ts              # NEW: folder validation, stat collection
│   └── audits.ts               # NEW: create audit record, safety locking
├── components/
│   ├── nav/sidebar.tsx         # Adapt: remove user prop, update nav items
│   ├── audit/
│   │   ├── audit-type-cards.tsx     # NEW: 4 audit type cards (D-10)
│   │   ├── depth-toggle.tsx         # NEW: Quick Scan / Deep Audit (D-11)
│   │   ├── folder-picker.tsx        # NEW: path input + browse (D-04)
│   │   ├── model-selector.tsx       # NEW: provider/key/model dropdowns (D-12, D-13)
│   │   ├── cost-estimate.tsx        # NEW: live cost range display (D-16, D-17)
│   │   └── confirm-dialog.tsx       # NEW: start confirmation (D-18)
│   └── setup/
│       └── setup-wizard.tsx         # NEW: first-time wizard (D-03)
└── lib/
    ├── api-key-validator.ts    # Keep unchanged
    ├── folder-safety.ts        # NEW: chmod/git-push-block/unlock
    └── cost-estimator.ts       # NEW: token/cost range calculation

packages/db/
├── src/
│   ├── schema.ts               # Adapt: remove auth/github tables, remove userId FKs
│   ├── client.ts               # Replace: Neon → better-sqlite3
│   ├── encryption.ts           # Keep unchanged
│   └── index.ts                # Keep structure

packages/cli/                   # NEW workspace package
├── package.json                # bin: { codeaudit: "./index.js" }
├── index.ts                    # Start Next.js, open browser
└── tsconfig.json
```

### Pattern 1: No-Auth Localhost Model

**What:** Remove all Auth.js code. No session. No user concept. Single-user local app.
**When to use:** Always — this is the entire auth model for local-first.
**How to adapt:**

The existing `middleware.ts` wraps everything in `auth()`. Replace it with a simple pass-through or delete it entirely:

```typescript
// apps/web/middleware.ts — replace entirely
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// No auth for local-first tool — everyone with localhost access is the user
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

All existing `session?.user?.id` guards in Server Actions must be removed. The `userId` column in DB tables must be dropped from the schema (or set to a fixed `"local"` sentinel if full schema drop is too invasive — but dropping is cleaner).

### Pattern 2: SQLite via Drizzle (replace Neon)

**What:** Switch from `@neondatabase/serverless` to `better-sqlite3`.
**When to use:** Required — no Postgres server in local-first mode.

```typescript
// packages/db/src/client.ts — replace entirely
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import path from "node:path";
import os from "node:os";

const DB_PATH = process.env["DATABASE_PATH"]
  ?? path.join(os.homedir(), ".codeaudit", "codeaudit.db");

let _db: ReturnType<typeof createDbClient> | null = null;

export function createDbClient(dbPath: string = DB_PATH) {
  const sqlite = new Database(dbPath);
  // Enable WAL mode for better concurrent read performance
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!_db) _db = createDbClient();
  return _db;
}

export type DbClient = ReturnType<typeof createDbClient>;
export { schema };
```

**SQLite schema note:** Drizzle has a SQLite-specific table import: use `sqliteTable` from `drizzle-orm/sqlite-core` instead of `pgTable` from `drizzle-orm/pg-core`. The schema must be rewritten with SQLite column types:
- `text()` stays text
- `integer()` stays integer
- `boolean()` → `integer({ mode: "boolean" })`
- `timestamp()` → `integer({ mode: "timestamp" })` or `text()`
- `jsonb()` → `text({ mode: "json" })`

### Pattern 3: npx CLI Launcher

**What:** A small Node.js script in `packages/cli` that starts the Next.js server and opens the browser.
**When to use:** This is the primary distribution entry point.

```typescript
// packages/cli/index.ts
import { spawn } from "node:child_process";
import open from "open";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env["PORT"] ?? "3000";
const APP_DIR = path.resolve(fileURLToPath(import.meta.url), "../../apps/web");

const server = spawn("node", [path.join(APP_DIR, ".next", "standalone", "server.js")], {
  env: { ...process.env, PORT },
  stdio: "inherit",
});

// Wait for server to be ready, then open browser
// Simple approach: wait 2s, then open (more robust: poll /api/health)
setTimeout(() => {
  open(`http://localhost:${PORT}`);
}, 2000);

process.on("SIGINT", () => { server.kill(); process.exit(0); });
process.on("SIGTERM", () => { server.kill(); process.exit(0); });
```

**Note:** For `npx codeaudit` to work from npm, the package needs `"bin": { "codeaudit": "./dist/index.js" }` in its `package.json`. The Next.js app must be pre-built and bundled (Next.js `output: "standalone"` in `next.config.ts` simplifies this).

### Pattern 4: Folder Safety Enforcement

**What:** Lock folder read-only + block git push before any audit; unlock after.
**When to use:** FOLD-02, FOLD-03, FOLD-05 — mandatory before Phase 2 hands off to the audit engine.

```typescript
// apps/web/lib/folder-safety.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";

const exec = promisify(execFile);

export async function lockFolder(folderPath: string): Promise<void> {
  // CRITICAL: Block push FIRST (while .git/config is still writable)
  const gitConfigPath = `${folderPath}/.git`;
  const isGitRepo = await fs.access(gitConfigPath).then(() => true).catch(() => false);

  if (isGitRepo) {
    await exec("git", ["-C", folderPath, "remote", "set-url", "--push", "origin", "no_push"]);
  }

  // THEN lock filesystem read-only
  await exec("chmod", ["-R", "a-w", folderPath]);
}

export async function unlockFolder(folderPath: string): Promise<void> {
  // Restore write access — only owner bits (u+w), not group/other
  await exec("chmod", ["-R", "u+w", folderPath]);
}

export async function isGitRepo(folderPath: string): Promise<boolean> {
  return fs.access(`${folderPath}/.git`).then(() => true).catch(() => false);
}
```

**CRITICAL ordering:** `git remote set-url --push origin no_push` MUST run before `chmod -R a-w` — once the folder is locked, `.git/config` becomes unwritable. This is documented in `manual-codebase-review-process/codebase_review_guide.md`.

### Pattern 5: Server Actions for API Key Management (adapted)

The existing `apps/web/app/actions/api-keys.ts` pattern is sound. The adaptation is removing `userId` and the `auth()` session check. Keys are stored per-device in SQLite.

```typescript
// apps/web/actions/api-keys.ts — adapted pattern
"use server";
import { getDb } from "@codeaudit/db";
import { apiKeys } from "@codeaudit/db";
import { encryptApiKey, maskApiKey } from "@codeaudit/db";
import { validateApiKey } from "@/lib/api-key-validator";

export async function addApiKey(provider: Provider, rawKey: string, label: string) {
  const validation = await validateApiKey(provider, rawKey);
  if (validation.status !== "valid" && validation.status !== "rate_limited") {
    return { success: false, error: validation.message };
  }
  const { encrypted, iv } = encryptApiKey(rawKey);
  const masked = maskApiKey(rawKey);
  const db = getDb();
  await db.insert(apiKeys).values({ provider, label, encryptedKey: encrypted, iv, maskedKey: masked });
  return { success: true };
}
```

### Pattern 6: Model Listing via API Route

**What:** After key selection, fetch available models from the provider's API.
**When to use:** D-13, D-14 — triggered when user selects a provider/key combo.

```typescript
// apps/web/app/api/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, decryptApiKey, apiKeys } from "@codeaudit/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const keyId = request.nextUrl.searchParams.get("keyId");
  if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });

  const db = getDb();
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  const rawKey = decryptApiKey(key.encryptedKey, key.iv);
  const models = await fetchModelsForProvider(key.provider, rawKey);
  return NextResponse.json({ models });
}
```

**Provider-specific model endpoints:**
- Anthropic: `GET https://api.anthropic.com/v1/models` (returns model list)
- OpenAI: `GET https://api.openai.com/v1/models` (already used in validator — filter to `gpt-4*`)
- Gemini: `GET https://generativelanguage.googleapis.com/v1beta/models?key={key}` (already used in validator)

### Pattern 7: Setup Wizard (first-time only)

**What:** On first launch, show a setup wizard. After adding at least one API key, mark setup complete and redirect to dashboard.
**How to detect first-time:** Check SQLite `settings` table for `{ key: "setup_complete", value: "true" }`.

```typescript
// Detect in layout.tsx (server component)
const settings = await getDb().select().from(appSettings).where(eq(appSettings.key, "setup_complete"));
const isSetupComplete = settings[0]?.value === "true";
if (!isSetupComplete) redirect("/setup");
```

### Anti-Patterns to Avoid

- **Keeping `userId` as a column after removing auth:** Causes confusion and dead code. Drop it — replace with a fixed `"local"` string only if absolutely needed for schema compatibility (prefer full removal).
- **Running `chmod` before blocking git push:** Destroys write access to `.git/config`. Always block push first.
- **Using `execSync` for chmod/git:** Blocks the event loop. Use `execFile` + `promisify`.
- **Using Neon's HTTP adapter with SQLite:** They're incompatible. The `client.ts` must be rewritten entirely.
- **Opening the browser before the Next.js server is ready:** Use a health-check poll (`GET /api/health`) rather than a hardcoded `setTimeout`.
- **Storing `ENCRYPTION_KEY` only in `.env.local`:** The app needs to auto-generate one on first launch and store it in `~/.codeaudit/.env` if none is found — otherwise new installs break silently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES-256-GCM encryption | Custom crypto | `packages/db/src/encryption.ts` (already built) | Auth-tag verification, IV uniqueness, hex storage — all done |
| API key validation | HTTP calls in component | `apps/web/lib/api-key-validator.ts` (already built) | All three providers, error discrimination, 10s timeout — done |
| UI components | Custom card, dialog, select | Shadcn/ui (already installed) | Cards, AlertDialog, Select, RadioGroup — all available |
| Open browser from Node | `child_process.exec("open ...")` | `open@11` package | Cross-platform (mac/win/linux), handles WSL |
| SQLite client | Raw SQL | `drizzle-orm/better-sqlite3` | Type-safe, migration-compatible with existing schema structure |
| Dark mode tokens | Custom CSS variables | Existing `globals.css` | Linear aesthetic already implemented |
| Sidebar navigation | Custom component | Adapt existing `sidebar.tsx` | Structure is correct, just need to remove user prop + update nav items |

**Key insight:** ~60% of Phase 1 is removing code (auth, GitHub) and adapting existing code (schema, sidebar, actions) rather than building new. The "New Audit" configuration page is the primary net-new work.

---

## Common Pitfalls

### Pitfall 1: chmod Order Inversion

**What goes wrong:** `chmod -R a-w` runs before `git remote set-url --push origin no_push`, making `.git/config` unwritable. Push is never blocked.
**Why it happens:** Natural order of "lock first, configure second." Wrong here because git config modification requires write access.
**How to avoid:** Always call `git remote set-url` first, `chmod` second. Document this constraint prominently in `folder-safety.ts`.
**Warning signs:** `chmod` succeeds but subsequent push block fails with "Permission denied on .git/config."

### Pitfall 2: ENCRYPTION_KEY Bootstrap on Fresh Install

**What goes wrong:** `ENCRYPTION_KEY` env var is not set on first `npx codeaudit` run. `encryptApiKey()` throws. App crashes before the user can do anything.
**Why it happens:** In the cloud version, the key was set in Vercel environment variables by the developer. In local-first mode, no one sets it.
**How to avoid:** The CLI launcher checks for `~/.codeaudit/.env`. If `ENCRYPTION_KEY` is missing, generate one with `randomBytes(32).toString("hex")` and write it to `~/.codeaudit/.env`. Load this file before starting Next.js.
**Warning signs:** First-run crash with "ENCRYPTION_KEY environment variable is not set."

### Pitfall 3: Neon Adapter Still Active After Schema Migration

**What goes wrong:** `packages/db/src/client.ts` still imports `@neondatabase/serverless`. The SQLite schema uses `sqliteTable` but the client tries to connect to Neon. Drizzle throws "unexpected adapter."
**Why it happens:** Two separate files to change — schema type system AND client adapter. Easy to update one and forget the other.
**How to avoid:** Change both `schema.ts` (`pgTable` → `sqliteTable`) AND `client.ts` (Neon → better-sqlite3) in the same task. Run `drizzle-kit generate` immediately after to verify consistency.
**Warning signs:** Drizzle type errors on insert/select, or runtime "cannot use pg adapter with sqlite schema."

### Pitfall 4: Sidebar Still Expects User Prop

**What goes wrong:** After removing Auth.js, the sidebar's `{ user }` prop has no source. TypeScript errors cascade through `(app)/layout.tsx`.
**Why it happens:** The sidebar component was built expecting a user object from `auth()`. The whole tree passes it down.
**How to avoid:** Remove the `SidebarProps` interface and `user` prop entirely. Remove the user profile section from the bottom of the sidebar (no sign-out button needed). Remove `SignOutButton` import.
**Warning signs:** TypeScript errors: "Property 'user' is missing in type '{}' but required in type 'SidebarProps'."

### Pitfall 5: `webkitdirectory` Folder Picker Only Works in Chromium

**What goes wrong:** The native `<input webkitdirectory>` attribute works in Chrome and Edge but is not standardised. It provides file objects, not a folder path — the browser exposes `File.webkitRelativePath` but not the absolute OS path.
**Why it happens:** Browser security model prevents exposing absolute paths from file inputs. `webkitRelativePath` is relative within the selected folder.
**How to avoid:** For the folder path, use a **text input** where users type or paste the path. The "Browse" button opens a dialog via the Electron file-system API (not applicable here) OR via a native OS dialog exposed through a backend endpoint. For a pure Next.js app on localhost, the most pragmatic approach: text input + a route that validates the path exists on the filesystem. Do NOT rely on `<input webkitdirectory>` for obtaining the absolute path.
**Warning signs:** Users see relative paths like `my-project/src` instead of `/Users/anvar/Projects/my-project`.

### Pitfall 6: SQLite Blocking Event Loop on Large Stat Operations

**What goes wrong:** `better-sqlite3` is synchronous. Large `fs.statSync` or recursive directory walks inside a Server Action block Node's event loop, degrading UI responsiveness.
**Why it happens:** `better-sqlite3` uses synchronous I/O by design. Fine for DB queries; not fine for filesystem walks.
**How to avoid:** Use async `fs.promises` for all filesystem operations (folder stat collection, git check). Only use synchronous better-sqlite3 APIs for database reads/writes, never for FS work.
**Warning signs:** The browser appears frozen for 2–5 seconds while folder stats are being collected.

### Pitfall 7: Audit Output Dir Collision

**What goes wrong:** Two audits of a repo named "api" both write to `~/audit-api/`. The second audit corrupts the first.
**Why it happens:** The output directory is named only from `basename` of the folder path.
**How to avoid:** Append a timestamp: `~/audit-{repo-name}-{YYYYMMDD-HHmm}/`. Record the actual path in the audit DB record. Phase 1 needs to define this convention even though full audit execution is Phase 2.
**Warning signs:** Users see mixed findings from two separate audits in the same output directory.

---

## Code Examples

### SQLite Schema (rewriting pgTable as sqliteTable)

```typescript
// packages/db/src/schema.ts — adapted for SQLite
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // No userId — local single-user tool
    provider: text("provider", { enum: ["anthropic", "openai", "gemini"] }).notNull(),
    label: text("label").notNull().default("Default"),
    encryptedKey: text("encrypted_key").notNull(),
    iv: text("iv").notNull(),
    maskedKey: text("masked_key").notNull().default("••••"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (key) => [
    index("api_keys_provider_idx").on(key.provider),
  ],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const audits = sqliteTable(
  "audits",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    folderPath: text("folder_path").notNull(),        // replaces repoId/repoFullName
    folderName: text("folder_name").notNull(),         // basename for display
    auditOutputDir: text("audit_output_dir").notNull(), // ~/audit-{name}-{ts}/
    auditType: text("audit_type", {
      enum: ["full", "security", "team-collaboration", "code-quality"],
    }).notNull().default("full"),
    depth: text("depth", { enum: ["quick", "deep"] }).notNull().default("deep"),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed", "cancelled"],
    }).notNull().default("queued"),
    currentPhase: integer("current_phase"),
    llmProvider: text("llm_provider", { enum: ["anthropic", "openai", "gemini"] }).notNull(),
    selectedModel: text("selected_model"),             // null = Auto mode
    apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    tokenCount: integer("token_count").notNull().default(0),
    estimatedCostMicrodollars: integer("estimated_cost").notNull().default(0),
    actualCostMicrodollars: integer("actual_cost").notNull().default(0),
    isGitRepo: integer("is_git_repo", { mode: "boolean" }).notNull().default(true),
    findings: text("findings", { mode: "json" }).$type<AuditFindings | null>(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (audit) => [
    index("audits_folder_path_idx").on(audit.folderPath),
    index("audits_status_idx").on(audit.status),
    index("audits_created_at_idx").on(audit.createdAt),
  ],
);
```

### Folder Stats for Cost Estimate

```typescript
// apps/web/lib/cost-estimator.ts
import fs from "node:fs/promises";
import path from "node:path";

export type FolderStats = {
  fileCount: number;
  totalBytes: number;
  estimatedTokens: number;
};

// Rough heuristic: average 250 chars/token for code
const CHARS_PER_TOKEN = 250;

export async function collectFolderStats(folderPath: string): Promise<FolderStats> {
  let fileCount = 0;
  let totalBytes = 0;

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        fileCount++;
        totalBytes += stat.size;
      }
    }
  }

  await walk(folderPath);
  return {
    fileCount,
    totalBytes,
    estimatedTokens: Math.round(totalBytes / CHARS_PER_TOKEN),
  };
}

// Cost range in cents — returns [min, max]
export function estimateCostRange(
  stats: FolderStats | null,
  auditType: "full" | "security" | "team-collaboration" | "code-quality",
  depth: "quick" | "deep",
  provider: "anthropic" | "openai" | "gemini",
): [number, number] {
  // Pricing in microdollars per 1k tokens (input, cached)
  const PRICING: Record<string, { input: number; output: number }> = {
    anthropic: { input: 3000, output: 15000 },  // Claude Sonnet 3.7
    openai: { input: 2500, output: 10000 },      // GPT-4o
    gemini: { input: 1250, output: 5000 },       // Gemini 2.0 Flash
  };

  const baseTokens = stats?.estimatedTokens ?? 500_000; // default medium repo assumption
  const typeMultiplier = { full: 1.0, security: 0.5, "team-collaboration": 0.4, "code-quality": 0.4 };
  const depthMultiplier = { quick: 0.3, deep: 1.0 };
  const p = PRICING[provider];
  const tokens = baseTokens * typeMultiplier[auditType] * depthMultiplier[depth];
  const outputTokens = tokens * 0.15;
  const minCost = Math.round((tokens * p.input + outputTokens * p.output) / 1_000_000 * 0.8);
  const maxCost = Math.round((tokens * p.input + outputTokens * p.output) / 1_000_000 * 1.4);
  return [minCost, maxCost]; // in cents
}
```

### CLI Launcher Entry Point

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import open from "open";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const PORT = parseInt(process.env["PORT"] ?? "3000");
const HOME_CONFIG = path.join(os.homedir(), ".codeaudit");
const ENV_FILE = path.join(HOME_CONFIG, ".env");

// Bootstrap encryption key on first run
if (!process.env["ENCRYPTION_KEY"]) {
  if (!fs.existsSync(ENV_FILE)) {
    fs.mkdirSync(HOME_CONFIG, { recursive: true });
    const key = randomBytes(32).toString("hex");
    fs.writeFileSync(ENV_FILE, `ENCRYPTION_KEY=${key}\n`);
    console.log("[codeaudit] Generated encryption key at", ENV_FILE);
  }
  // Load .env
  const envContent = fs.readFileSync(ENV_FILE, "utf8");
  for (const line of envContent.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

// Path to the built Next.js app (co-located in the npm package)
const WEB_APP = path.resolve(fileURLToPath(import.meta.url), "../../apps/web");

const server = spawn(
  "node",
  [path.join(WEB_APP, ".next", "standalone", "server.js")],
  { env: { ...process.env, PORT: String(PORT) }, stdio: "inherit" },
);

// Poll until server is ready, then open browser
function waitForServer(cb: () => void, attempts = 0) {
  if (attempts > 30) { console.error("[codeaudit] Server did not start"); return; }
  const req = createServer().listen(0, () => (req as unknown as { close: (cb: () => void) => void }).close(() => {}));
  const check = createServer();
  check.on("error", () => setTimeout(() => waitForServer(cb, attempts + 1), 500));
  check.listen(PORT, () => { check.close(cb); });
  // Simpler: just try connecting
  import("node:net").then(({ createConnection }) => {
    const conn = createConnection(PORT, "127.0.0.1");
    conn.on("connect", () => { conn.destroy(); cb(); });
    conn.on("error", () => setTimeout(() => waitForServer(cb, attempts + 1), 500));
  });
}

waitForServer(() => {
  console.log(`[codeaudit] Running at http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});

process.on("SIGINT", () => { server.kill(); process.exit(0); });
process.on("SIGTERM", () => { server.kill(); process.exit(0); });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Neon/Postgres (cloud) | SQLite via better-sqlite3 | Local-first pivot | Zero server infra; file-based DB lives at `~/.codeaudit/codeaudit.db` |
| Auth.js GitHub OAuth | No auth | Local-first pivot | Entire auth layer removed; middleware becomes pass-through |
| `pgTable` from `drizzle-orm/pg-core` | `sqliteTable` from `drizzle-orm/sqlite-core` | With this phase | Different column types; schema must be rewritten |
| Cloud-hosted ENV vars | `~/.codeaudit/.env` (auto-generated) | With this phase | ENCRYPTION_KEY auto-generated on first run; no user setup needed |
| `npx create-next-app` dev server | `next start` in standalone mode | With this phase | Production build packed into npm package via `output: "standalone"` |

**Deprecated/outdated after this phase:**
- `@neondatabase/serverless`: Unused after switching to SQLite
- `next-auth` / `@auth/drizzle-adapter`: Removed entirely
- Auth tables (`users`, `accounts`, `sessions`, `verificationTokens`): Dropped from schema
- `githubInstallations` table: Dropped from schema
- `apps/web/auth.ts`: Deleted
- `apps/web/app/(auth)/`: Entire route group deleted
- `apps/web/lib/auth.ts`: Deleted (if exists)
- `apps/web/lib/github-app.ts`: Deleted
- `apps/web/lib/github-token-refresh.ts`: Deleted
- `apps/web/app/api/github/`: Deleted

---

## Open Questions

1. **npx Distribution Approach for Phase 1**
   - What we know: `output: "standalone"` in Next.js creates a self-contained server bundle
   - What's unclear: Whether the full standalone bundle + static files can be reasonably packed into an npm tarball, or if the CLI should instead run `next dev` pointing at a co-located source directory
   - Recommendation: For Phase 1 (internal use), run `next dev` from the CLI rather than a production build. Simplifies the dev loop. Standalone packaging is a Phase 2+ concern.

2. **`webkitdirectory` vs text input for folder path**
   - What we know: Browser file inputs cannot expose absolute OS paths for security reasons
   - What's unclear: Whether users will find a text input + "Browse" (which opens nothing on web) confusing
   - Recommendation: Text input with a filesystem validator API route. Show a tooltip: "Paste the full path to your project folder." On macOS, users can drag a folder into the input — that works as a path. On Windows, add a note about backslashes.

3. **Drizzle migrations for SQLite in a local-first tool**
   - What we know: `drizzle-kit generate` + `drizzle-kit migrate` works with SQLite. SQLite doesn't support `ALTER COLUMN` — Drizzle handles this by recreating tables.
   - What's unclear: How to run migrations automatically on first launch without a separate migration step for end users
   - Recommendation: Run `migrate()` programmatically in `getDb()` on startup using Drizzle's `migrate` function. This auto-applies pending migrations when the app starts.

---

## Sources

### Primary (HIGH confidence)

- Existing codebase — `packages/db/src/encryption.ts`, `apps/web/lib/api-key-validator.ts`, `packages/db/src/schema.ts`, `apps/web/components/nav/sidebar.tsx`, `apps/web/package.json` — read directly
- Existing codebase — `manual-codebase-review-process/codebase_review_guide.md` — chmod/push-block ordering confirmed from official audit process
- npm registry — `better-sqlite3@12.8.0`, `open@11.0.0`, `drizzle-orm@0.45.1`, `next@16.2.1`, `zod@4.3.6` — versions confirmed 2026-03-22

### Secondary (MEDIUM confidence)

- Drizzle ORM SQLite adapter docs — `drizzle-orm/better-sqlite3` is the correct import path; `sqliteTable` from `drizzle-orm/sqlite-core` confirmed via peer dependency list
- Next.js `output: "standalone"` docs — standalone server packaging confirmed as the distribution approach for standalone deployments

### Tertiary (LOW confidence — flag for validation)

- Cost estimator pricing constants — based on training knowledge of provider pricing as of early 2026; actual prices may have changed. Verify against official provider pricing pages before shipping.
- Model listing API responses — Anthropic `GET /v1/models`, OpenAI `GET /v1/models`, Gemini `GET /v1beta/models` — endpoint paths based on training data and the existing `api-key-validator.ts` patterns. Verify that all three return a usable model list at these endpoints.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all key packages verified against npm registry
- Architecture: HIGH — 60% is existing code; patterns confirmed from reading actual files
- Pitfalls: HIGH — chmod ordering confirmed from manual audit process docs; other pitfalls verified from existing code patterns
- Cost estimator pricing: LOW — provider pricing is volatile; treat as approximate only

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (30 days — stack is stable; pricing constants should be reverified before Phase 2)
