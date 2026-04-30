# Audit Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three classes of false-positive findings that drive misleading audit grades — git-history blindness for secrets, stack-blind generic best-practice findings, and over-classification of CRITICAL severity.

**Architecture:** All three fixes are prompt-level changes to the audit engine. No new tools, no new DB columns, no new dependencies. Edit `prompt-builder.ts` (severity definitions) and `guide-chunks.ts` (per-phase guidance) plus a small Phase 0 addition to surface project-style conventions in `RepoContext`. Vitest covers each change.

**Tech Stack:** TypeScript (NodeNext), Vitest, existing `@codeaudit-ai/audit-engine` package. No runtime/dependency changes.

**Background — what we're fixing:**

A real-world audit graded a project D primarily because of:
1. **Finding #1 (CRITICAL):** "`.env` with Gemini key committed" — the file is gitignored and has never been in git history. The LLM saw it on disk and assumed committed.
2. **Finding #6 (LOW):** "TypeScript config missing" on a JSX-only project. Generic best-practice misapplied.
3. **Finding #9 (LOW):** "Code lacks inline comments" against a project whose explicit policy is "no comments".

The deterministic scoring (`packages/audit-engine/src/phases/phase-10.ts`) weights critical=20, high=10, medium=5, low=1. One bogus CRITICAL plus a few bogus LOWs is enough to drag a B audit into D territory.

**Source files touched:**
- `packages/audit-engine/src/prompt-builder.ts` — `FINDING_FORMAT_TEMPLATE` (severity calibration + stack-gating preamble)
- `packages/audit-engine/src/guide-chunks.ts` — Phase 1, Phase 6, Phase 9 chunks
- `packages/audit-engine/src/repo-context.ts` — add `conventionDocs` field
- `packages/audit-engine/src/phases/phase-00.ts` — populate `conventionDocs` from CLAUDE.md / AGENTS.md / .cursorrules if present
- `packages/audit-engine/src/phases/shared.ts` — surface `conventionDocs` in `formatRepoContextForPrompt`
- `packages/audit-engine/src/prompt-builder.test.ts` — new severity + stack-gating assertions
- New: `packages/audit-engine/src/guide-chunks.test.ts`
- `CHANGELOG.md`, `VERSION`

---

### Task 1: Add explicit severity calibration to FINDING_FORMAT_TEMPLATE

**Why:** `FINDING_FORMAT_TEMPLATE` currently lists severity as an enum with no definition. The LLM has no objective criteria for distinguishing CRITICAL from HIGH, so it defaults to whatever feels right — often inflating local-only or theoretical issues to CRITICAL.

**Files:**
- Modify: `packages/audit-engine/src/prompt-builder.ts:77-86`
- Test: `packages/audit-engine/src/prompt-builder.test.ts:59-67`

- [ ] **Step 1: Write the failing test**

Add to `packages/audit-engine/src/prompt-builder.test.ts` inside the `describe("FINDING_FORMAT_TEMPLATE", ...)` block:

```typescript
  it("defines what CRITICAL means with concrete criteria", () => {
    expect(FINDING_FORMAT_TEMPLATE.toLowerCase()).toContain("critical");
    // CRITICAL must require remote exploitability or production blast radius
    expect(FINDING_FORMAT_TEMPLATE).toMatch(/critical[\s\S]{0,400}(exploit|remote|production|live|blast radius)/i);
  });

  it("rules out CRITICAL for local-only or theoretical issues", () => {
    expect(FINDING_FORMAT_TEMPLATE.toLowerCase()).toMatch(/local[- ]only|theoretical|not[- ]exploitable/);
  });

  it("requires evidence-based descriptions (no speculation)", () => {
    expect(FINDING_FORMAT_TEMPLATE.toLowerCase()).toMatch(/evidence|verify|confirm/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @codeaudit-ai/audit-engine test prompt-builder`
Expected: 3 failing tests in the `FINDING_FORMAT_TEMPLATE` describe block.

- [ ] **Step 3: Update the template**

Replace the `FINDING_FORMAT_TEMPLATE` export in `packages/audit-engine/src/prompt-builder.ts` (lines 77-86) with:

```typescript
export const FINDING_FORMAT_TEMPLATE = `Each finding must have:
- id: unique UUID string
- phase: the phase number (integer)
- category: e.g. "security", "complexity", "test-coverage", "dependencies", "documentation"
- severity: "critical" | "high" | "medium" | "low" | "info" — see severity definitions below
- title: short title (under 80 chars)
- description: factual, evidence-based observation — what you saw, with the command output or file path that confirms it. Do not speculate.
- filePaths: array of relevant file paths (optional)
- lineNumbers: array of relevant line numbers (optional)
- recommendation: specific fix recommendation (optional)

## Severity Definitions

Use these strict criteria. When in doubt, downgrade.

- **critical** — Actively exploitable in production with real blast radius. Examples: secret committed to git history of a public repo, SQL injection on a user-controllable input path, RCE, auth bypass on a live endpoint. Must have an attack vector you can describe in one sentence.
- **high** — Serious issue likely to cause harm but requires conditions or is not directly exploitable. Examples: weak default password in a service that may run in production, missing rate limit on a public endpoint, deserialization of untrusted input without sandbox. Local-only defaults are HIGH at most, not critical.
- **medium** — Real problem worth fixing this quarter. Examples: outdated dependency with known non-critical CVE, missing input validation on internal endpoint, low test coverage on a critical module.
- **low** — Hygiene/best-practice gap with no immediate impact. Easy to fix. Examples: inconsistent naming, missing JSDoc, redundant code.
- **info** — Informational observation only. Not a defect. Examples: "uses framework X", "has Y dependencies".

**Do NOT use critical for:**
- Files that exist on local disk only and are gitignored (verify with \`git log --all --full-history -- <path>\` before flagging as committed)
- Theoretical issues with no user-controllable input path (e.g., SQL built from hardcoded keys)
- Missing best-practices that are not actually exploitable

**Verify before flagging:** Every CRITICAL finding must include the exact command and output that proves the issue is real, not just suspected.`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @codeaudit-ai/audit-engine test prompt-builder`
Expected: All 10 tests in `prompt-builder.test.ts` pass (existing 7 + new 3).

- [ ] **Step 5: Commit**

```bash
git add packages/audit-engine/src/prompt-builder.ts packages/audit-engine/src/prompt-builder.test.ts
git commit -m "feat(audit): add severity calibration to FINDING_FORMAT_TEMPLATE

Define what CRITICAL/HIGH/MEDIUM/LOW/INFO mean with concrete criteria.
Rules out CRITICAL for local-only files, theoretical SQLi, and gitignored
secrets without git-history evidence."
```

---

### Task 2: Add git-history verification to Phase 6 (Security) guide chunk

**Why:** The guide chunk for Phase 6 doesn't tell the LLM to verify whether a secret-bearing file is actually in git history. The `git` command is already in the `execCommand` whitelist (`packages/audit-engine/src/tools/exec-command-tool.ts:13`), so we just need the prompt to direct its use.

**Files:**
- Modify: `packages/audit-engine/src/guide-chunks.ts:36-40` (Phase 6 chunk)
- Create: `packages/audit-engine/src/guide-chunks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/audit-engine/src/guide-chunks.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getGuideChunk } from "./guide-chunks";

describe("getGuideChunk", () => {
  describe("Phase 6 (Security)", () => {
    const chunk = getGuideChunk(6);

    it("instructs the LLM to check git history before flagging committed secrets", () => {
      expect(chunk).toMatch(/git log.*--all.*--full-history|git ls-files/i);
    });

    it("distinguishes file-on-disk from file-in-git-history", () => {
      expect(chunk.toLowerCase()).toContain("gitignored");
      expect(chunk.toLowerCase()).toMatch(/working tree|on disk/);
      expect(chunk.toLowerCase()).toMatch(/git history|tracked/);
    });

    it("warns against flagging gitignored files as committed", () => {
      expect(chunk.toLowerCase()).toMatch(/do not flag.*gitignored|gitignored.*not.*critical/i);
    });
  });

  describe("fallback", () => {
    it("returns a generic fallback for unknown phase numbers", () => {
      expect(getGuideChunk(999)).toContain("Phase 999");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @codeaudit-ai/audit-engine test guide-chunks`
Expected: 3 failing tests in `Phase 6 (Security)`.

- [ ] **Step 3: Update the Phase 6 guide chunk**

Replace the Phase 6 entry in `packages/audit-engine/src/guide-chunks.ts` (lines 36-40) with:

```typescript
  6: `Phase 6 — Security Audit: Thorough security investigation.
Sub-phases: 6a secrets/credentials, 6b auth/authorization, 6c input validation/injection,
6d API security, 6e data protection/crypto, 6f infrastructure.
Look for: hardcoded secrets, unvalidated user input in SQL/shell, missing rate limits, weak crypto.

CRITICAL — verify before flagging secrets:
- A file containing a secret on disk is NOT the same as a secret committed to git.
- Before flagging any .env, .env.*, credentials.json, or similar file as a CRITICAL leak, run:
    git ls-files --error-unmatch <path>           # is the file tracked?
    git log --all --full-history -- <path>        # is the file in any history?
- If both commands show the file is gitignored and never tracked, the secret is local-only.
  Do NOT flag gitignored secrets as CRITICAL — at most note them as INFO with a recommendation
  to rotate if the disk is shared/backed-up.
- A secret that was once committed and later deleted IS still CRITICAL — it remains in history.
- Public-repo + committed-secret = CRITICAL. Private-repo + committed-secret = HIGH unless the
  team's security posture treats internal exposure as critical.

Output expectations:
- Every CRITICAL finding in this phase must include the exact git command and its output as
  evidence in the description field. No evidence = downgrade.`,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @codeaudit-ai/audit-engine test guide-chunks`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/audit-engine/src/guide-chunks.ts packages/audit-engine/src/guide-chunks.test.ts
git commit -m "feat(audit): require git-history verification for Phase 6 secret findings

Phase 6 guide now instructs the LLM to run git log --all --full-history
and git ls-files before classifying secret-bearing files as CRITICAL.
Gitignored files containing secrets are no longer flagged as critical
leaks (no actual exposure). Closes the false-positive that drove a
real audit from B-grade to D-grade on a single bogus CRITICAL."
```

---

### Task 3: Add stack-aware gating to Phase 1, Phase 9, and the prompt preamble

**Why:** Phase 1 flags "TypeScript config missing" without checking whether the repo uses TypeScript. Phase 9 (Documentation) flags "code lacks inline comments" without checking whether the project has a documented no-comment policy. RepoContext is already in every prompt, but no instruction tells the LLM to use it as a gate.

**Files:**
- Modify: `packages/audit-engine/src/guide-chunks.ts` (Phase 1, Phase 9)
- Modify: `packages/audit-engine/src/prompt-builder.ts` (add stack-gating instruction to both prompt builders)
- Test: `packages/audit-engine/src/guide-chunks.test.ts` (extend)
- Test: `packages/audit-engine/src/prompt-builder.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

Add to `packages/audit-engine/src/guide-chunks.test.ts`:

```typescript
  describe("Phase 1 (Orientation)", () => {
    const chunk = getGuideChunk(1);
    it("gates TypeScript-specific findings on actual TypeScript usage", () => {
      expect(chunk.toLowerCase()).toMatch(/typescript.*only if|only.*typescript|skip.*typescript/i);
    });
  });

  describe("Phase 9 (Documentation)", () => {
    const chunk = getGuideChunk(9);
    it("respects project comment-style conventions", () => {
      expect(chunk.toLowerCase()).toMatch(/comment.*polic|style guide|convention/);
      expect(chunk.toLowerCase()).toMatch(/no[- ]comment|minimal.*comment/);
    });
  });
```

Add to `packages/audit-engine/src/prompt-builder.test.ts` inside `describe("FINDING_FORMAT_TEMPLATE", ...)`:

```typescript
  it("instructs the LLM to gate findings on detected stack", () => {
    expect(FINDING_FORMAT_TEMPLATE.toLowerCase()).toMatch(/repo context|detected stack|primarily/);
    expect(FINDING_FORMAT_TEMPLATE.toLowerCase()).toMatch(/do not flag.*not detected|skip.*not.*detected/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @codeaudit-ai/audit-engine test`
Expected: 3 new failing tests.

- [ ] **Step 3: Add stack-gating preamble to FINDING_FORMAT_TEMPLATE**

In `packages/audit-engine/src/prompt-builder.ts`, append to the `FINDING_FORMAT_TEMPLATE` string (after the "Verify before flagging:" block from Task 1):

```typescript
// ... after the existing severity definitions ...

**Stack-aware gating — read Repo Context before flagging stack-specific issues:**

The Repo Context block above lists the detected primary languages, frameworks, and conventions.
Use it as a gate:
- Do not flag "TypeScript config missing" if TypeScript is not in the detected primary languages.
- Do not flag "Python type hints missing" if Python is not detected.
- Do not flag "no Dockerfile" if the project has no infrastructure-as-code in scope.
- Do not flag "missing JSDoc comments" if the project's convention docs (CLAUDE.md, AGENTS.md,
  .cursorrules, CONTRIBUTING.md) state a no-comment or minimal-comment policy.

When unsure whether a generic best-practice applies, downgrade to LOW or INFO and note the
uncertainty in the description.
```

(Replace the closing backtick of the previous template addition with the new content, then close the template string.)

- [ ] **Step 4: Update Phase 1 and Phase 9 guide chunks**

In `packages/audit-engine/src/guide-chunks.ts`, replace the Phase 1 entry (lines 11-14) with:

```typescript
  1: `Phase 1 — Orientation: Understand the project structure.
Check: top-level directory layout, entry points (main, index, app), package.json scripts,
dependency count (prod vs dev), build output paths.
Goal: Establish a mental model of what this codebase is and how it's organized.

Stack-gated checks:
- TypeScript configuration: only inspect if TypeScript is in the detected primary languages.
  A JSX-only or plain JavaScript project does not need a tsconfig.json — do not flag this.
- Type-system findings: only flag if the language has an opt-in type system actually in use.
- Build configuration: only check the toolchain matching the detected package manager.`,
```

Replace the Phase 9 entry (lines 52-54) with:

```typescript
  9: `Phase 9 — Documentation: Assess documentation health.
Sub-phases: 9a project-level README, 9b API docs, 9c code comments, 9d env setup docs, 9e data model docs.
Flag: missing onboarding docs, undocumented APIs, no env variable reference.

Respect project conventions:
- Before flagging "code lacks inline comments", check the Repo Context for convention docs
  (CLAUDE.md, AGENTS.md, .cursorrules, CONTRIBUTING.md). If any of these state a no-comment
  or minimal-comment policy, do NOT flag missing inline comments — that is the project's
  deliberate style, not a defect.
- README and env-var documentation gaps are still valid findings regardless of comment style.
- API documentation gaps are still valid findings regardless of comment style.`,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @codeaudit-ai/audit-engine test`
Expected: All tests pass — 4 in guide-chunks.test.ts (3 from Task 2 + 1 new), 11 in prompt-builder.test.ts (10 prior + 1 new).

- [ ] **Step 6: Commit**

```bash
git add packages/audit-engine/src/prompt-builder.ts \
        packages/audit-engine/src/guide-chunks.ts \
        packages/audit-engine/src/prompt-builder.test.ts \
        packages/audit-engine/src/guide-chunks.test.ts
git commit -m "feat(audit): add stack-aware gating to phase prompts

FINDING_FORMAT_TEMPLATE now requires the LLM to gate stack-specific
findings on detected primary languages and convention docs. Phase 1
no longer flags TypeScript config on JSX-only projects. Phase 9
respects no-comment policies declared in CLAUDE.md/AGENTS.md."
```

---

### Task 4: Detect project conventions in Phase 0 and surface in RepoContext

**Why:** The stack-gating in Task 3 references "convention docs (CLAUDE.md, AGENTS.md, .cursorrules)" but `RepoContext` doesn't currently expose them. Without this, the LLM has no way to honor a project's "no comments" policy. Phase 0 already reads files for stack detection — adding three more reads is cheap and high-leverage.

**Files:**
- Modify: `packages/audit-engine/src/repo-context.ts` (add `conventionDocs` field)
- Modify: `packages/audit-engine/src/phases/phase-00.ts` (populate field)
- Modify: `packages/audit-engine/src/phases/shared.ts:41-69` (`formatRepoContextForPrompt`)
- Test: extend repo-context test or create `phases/phase-00.test.ts`

- [ ] **Step 1: Inspect Phase 0 to see where to plug in**

Run: `cat packages/audit-engine/src/phases/phase-00.ts`

Note where the LLM call returns the structured RepoContext object — the new field should be populated there (or in a post-LLM step that reads convention docs from disk and merges them into the result).

- [ ] **Step 2: Write the failing test for the schema and formatter**

Create `packages/audit-engine/src/phases/shared.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import type { RepoContext } from "../repo-context";

// We test formatRepoContextForPrompt indirectly by importing getRepoContext
// and stubbing the DB. Or we expose formatRepoContextForPrompt for testing.
// For simplicity, export the formatter directly and test it.

import { formatRepoContextForPrompt } from "./shared";

const baseCtx: RepoContext = {
  repoName: "test",
  remoteUrl: "",
  headCommit: "",
  defaultBranch: "main",
  primaryLanguages: ["TypeScript"],
  packageManager: "pnpm",
  frameworks: [],
  testFramework: "vitest",
  testFilePatterns: [],
  ciSystem: "",
  ciConfigPaths: [],
  isMonorepo: false,
  monorepoTool: "none",
  locByLanguage: [],
  totalLinesOfCode: 0,
  contributorsLast12Months: [],
  conventionDocs: [],
  summary: "",
};

describe("formatRepoContextForPrompt", () => {
  it("renders convention docs when present", () => {
    const ctx: RepoContext = {
      ...baseCtx,
      conventionDocs: [
        { path: "CLAUDE.md", excerpt: "Default to writing no comments." },
      ],
    };
    const formatted = formatRepoContextForPrompt(ctx);
    expect(formatted).toContain("CLAUDE.md");
    expect(formatted).toContain("Default to writing no comments");
    expect(formatted.toLowerCase()).toMatch(/convention|style/);
  });

  it("omits convention docs section when empty", () => {
    const formatted = formatRepoContextForPrompt(baseCtx);
    expect(formatted.toLowerCase()).not.toMatch(/convention docs|style overrides/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @codeaudit-ai/audit-engine test shared`
Expected: Both tests fail (`formatRepoContextForPrompt` is not exported, `conventionDocs` field doesn't exist).

- [ ] **Step 4: Add `conventionDocs` to the schema**

In `packages/audit-engine/src/repo-context.ts`, add the field before `summary`:

```typescript
  // Project-style conventions (CLAUDE.md, AGENTS.md, .cursorrules) — used to gate
  // generic best-practice findings (e.g., comment policy) against project style.
  conventionDocs: z.array(z.object({
    path: z.string(),       // e.g. "CLAUDE.md"
    excerpt: z.string(),    // first ~2KB of file content
  })),
  summary: z.string(),
});
```

- [ ] **Step 5: Export and update `formatRepoContextForPrompt`**

In `packages/audit-engine/src/phases/shared.ts`:

a) Change the function from `function formatRepoContextForPrompt` to `export function formatRepoContextForPrompt`.

b) Insert before the `lines.push(\`\\nSummary: ...\`)` line (currently line 68):

```typescript
  if (ctx.conventionDocs && ctx.conventionDocs.length > 0) {
    lines.push("\nProject Style Conventions (override generic best-practices):");
    for (const doc of ctx.conventionDocs) {
      lines.push(`  --- ${doc.path} ---`);
      lines.push(doc.excerpt.split("\n").map((l) => `    ${l}`).join("\n"));
    }
  }
```

- [ ] **Step 6: Populate `conventionDocs` in Phase 0**

Open `packages/audit-engine/src/phases/phase-00.ts` and locate where the `RepoContext` object is finalized before persisting. Add a helper at the top of the file:

```typescript
import fs from "node:fs/promises";
import path from "node:path";

const CONVENTION_FILES = ["CLAUDE.md", "AGENTS.md", ".cursorrules", "CONTRIBUTING.md"];
const MAX_EXCERPT_BYTES = 2048;

async function readConventionDocs(repoPath: string): Promise<{ path: string; excerpt: string }[]> {
  const docs: { path: string; excerpt: string }[] = [];
  for (const filename of CONVENTION_FILES) {
    const fullPath = path.join(repoPath, filename);
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      docs.push({ path: filename, excerpt: content.slice(0, MAX_EXCERPT_BYTES) });
    } catch {
      // File doesn't exist — skip silently
    }
  }
  return docs;
}
```

Then, where the `RepoContext` object is finalized (after the LLM returns it, before it's persisted to DB), merge in:

```typescript
const conventionDocs = await readConventionDocs(ctx.repoPath);
const finalContext: RepoContext = {
  ...llmResult,            // existing structured output from LLM
  conventionDocs,
};
```

(Adapt the variable names to match the existing Phase 0 code — the spec is: read 4 candidate files, take first 2KB of each, attach as `conventionDocs` array on the final RepoContext.)

- [ ] **Step 7: Run all audit-engine tests**

Run: `pnpm --filter @codeaudit-ai/audit-engine test`
Expected: All tests pass — 2 new in shared.test.ts, plus existing tests still pass.

- [ ] **Step 8: Run typecheck across the workspace**

Run: `pnpm -w run typecheck`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add packages/audit-engine/src/repo-context.ts \
        packages/audit-engine/src/phases/phase-00.ts \
        packages/audit-engine/src/phases/shared.ts \
        packages/audit-engine/src/phases/shared.test.ts
git commit -m "feat(audit): surface project-style conventions in RepoContext

Phase 0 now reads CLAUDE.md, AGENTS.md, .cursorrules, and CONTRIBUTING.md
(first 2KB each) and attaches them as conventionDocs on RepoContext.
formatRepoContextForPrompt renders them as 'Project Style Conventions'
so the LLM can honor no-comment policies and similar overrides."
```

---

### Task 5: Update CHANGELOG and bump VERSION

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `VERSION`

- [ ] **Step 1: Bump version**

Read current `VERSION`:
```bash
cat VERSION
```

If `0.6.1`, bump to `0.6.2` (these are quality/correctness fixes — patch level):
```bash
echo "0.6.2" > VERSION
```

- [ ] **Step 2: Add changelog entry**

In `CHANGELOG.md`, add a new section above the `## [0.6.1]` heading:

```markdown
## [0.6.2] — 2026-04-30 — Audit Quality Fixes

### Fixed
- Phase 6 (Security): false-positive CRITICAL on gitignored `.env` files. The
  audit engine now requires `git log --all --full-history` and `git ls-files`
  evidence before classifying a secret-bearing file as committed.
- Phase 1 (Orientation): generic "TypeScript config missing" finding on
  JSX-only projects. Stack-aware gating now skips type-system checks when
  the language is not detected.
- Phase 9 (Documentation): false-positive "code lacks inline comments" on
  projects with explicit no-comment style policies.
- CRITICAL severity over-classification. Severity definitions in
  `FINDING_FORMAT_TEMPLATE` now require remote exploitability or production
  blast radius — local-only and theoretical issues downgrade to HIGH/MEDIUM.

### Added
- `RepoContext.conventionDocs`: Phase 0 reads CLAUDE.md, AGENTS.md,
  .cursorrules, and CONTRIBUTING.md (first 2KB each) and surfaces them in
  every phase prompt. Lets findings honor project-specific style overrides.
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md VERSION
git commit -m "chore: release 0.6.2 — audit quality fixes

Patches three classes of false positives that drove misleading audit
grades: gitignored secrets flagged as committed, stack-blind generic
best-practice findings, and CRITICAL severity over-classification."
```

- [ ] **Step 4: Run full verification before declaring done**

Run all of these and confirm clean:
```bash
pnpm -w run lint
pnpm -w run typecheck
pnpm -w run test
pnpm -w run build
```

All four must pass. If any fails, fix in place and amend the relevant prior commit (or add a fixup commit), then re-run all four.

---

## Self-Review Checklist (controller — before dispatching first subagent)

- [ ] Every task references concrete file paths (no "wherever it makes sense")
- [ ] Every code step shows the actual code, not a description
- [ ] Tests are written before implementation in every task (TDD discipline)
- [ ] Severity criteria match the existing scoring weights (`phase-10.ts:12-44`)
- [ ] Phase 6 git-history instruction works with the existing tool whitelist
  (verified: `git` is in `exec-command-tool.ts:13` whitelist)
- [ ] Stack-gating instruction references field names that actually exist on `RepoContext`
- [ ] Convention-docs read list is bounded (4 files, 2KB each = ~8KB max)
- [ ] No new dependencies, no DB migrations, no API surface changes — pure prompt + RepoContext additions
- [ ] CHANGELOG follows Keep a Changelog format consistent with existing entries
- [ ] VERSION bump matches semantic intent (patch — bug fixes)
