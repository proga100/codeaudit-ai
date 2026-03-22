# Phase 3: Results & Cost - Research

**Researched:** 2026-03-22
**Domain:** Next.js 16 App Router — results dashboard, severity chart, finding cards, zip download, PDF export, cost summary
**Confidence:** HIGH

## Summary

Phase 3 renders data that already exists in SQLite. `audits.findings` (JSONB) holds the complete `AuditFindings` object written by Phase 10 — score, grade, per-severity counts, and all findings. `auditPhases` holds per-phase token usage and cost. The work is pure UI and API-route plumbing: no new engine logic, no schema changes.

The two biggest decisions are chart library (Recharts via Shadcn charts is already in scope; no new install needed for the severity bar chart) and PDF generation (Puppeteer is the most reliable HTML-to-PDF path but is ~130 MB; `@react-pdf/renderer` is lighter but requires redesigning the report layout). Given that Phase 11 already writes `report-management.html` and `report-technical.html` to the audit output directory, using Puppeteer to render those files to PDF eliminates any re-design work and is the simplest correct path.

The progress view at `audit/[id]/page.tsx` already detects `status === "completed"` and renders a "view results" message. Phase 3 needs to add a `results/` sub-route and wire the redirect from the progress view once the audit finishes.

**Primary recommendation:** Use Recharts (already present via Radix/Shadcn) for the severity bar chart, Puppeteer for HTML-to-PDF conversion of the existing Phase 11 files, and Node's built-in `archiver` (or `jszip`) for the zip download route. All findings data is already typed and available — the work is routing, layout, and download plumbing.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Results page layout: health score + severity chart at top, scrollable findings list below. Single page, not tabbed.
- **D-02:** Executive and technical views are separate pages — management dashboard (scores, trends, risks) and technical dashboard (findings, code, remediation).
- **D-03:** Each finding card shows: title + colored severity badge, file path + line number, evidence snippet, and remediation suggestion (collapsed by default).
- **D-04:** Findings are filterable and sortable by severity (Critical, High, Medium, Low, Info).
- **D-05:** Download zip includes everything: HTML dashboards, markdown reports (findings.md + codebase_health.md), JSON structured data, and all other audit directory files (budget log, repo context, etc.).
- **D-06:** PDF export included in v1 — generate PDF from HTML dashboards.
- **D-07:** From Phase 2 context D-04: export supports md, JSON, text, PDF formats.
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | User can view audit findings in an in-app dashboard with scores, severity breakdown, and findings list | `audits.findings` JSONB is the data source; Recharts bar chart for severity; score and grade already computed by Phase 10 |
| DASH-02 | User can filter and sort findings by severity (Critical, High, Medium, Low, Info) | Client-side filter state (useState) over the `findings` array; no server round-trip needed given findings are loaded once |
| DASH-03 | User can view the executive/management report and the technical report as separate views | Phase 11 writes `report-management.html` + `report-technical.html`; serve them via `/api/audit/[id]/report/[type]/route.ts` returning the HTML file content, or iframe-embed; separate Next.js pages for in-app executive vs technical views |
| DASH-04 | User can download full audit reports (HTML dashboards + markdown reports) as a zip file | New API route `/api/audit/[id]/download/route.ts`; use `archiver` npm package to stream-zip all files in `auditOutputDir` |
| DASH-05 | Findings include file paths, line numbers, evidence, and remediation suggestions | `AuditFinding` type already has `filePaths`, `lineNumbers`, `recommendation`, `description` — all present in DB |
| COST-01 | User sees total tokens used and total cost after an audit completes | `audits.tokenCount` + `audits.actualCostMicrodollars` are the data sources; `formatCost` + `formatTokens` helpers already in `progress-view.tsx` |
| COST-02 | User sees a budget warning if the audit is consuming significantly more tokens than estimated | Compare `actualCostMicrodollars` vs `estimatedCostMicrodollars` on the `audits` row; threshold: >20% over estimate triggers yellow banner |
| COST-03 | User can cancel a running audit at any time and sees the cost incurred | Cancel action already exists (`cancelAudit` server action); results page must show partial cost even for cancelled audits |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 | Severity breakdown bar chart | Already used via Shadcn charts in this project; no new install — just add Shadcn chart component |
| archiver | 7.0.1 | Stream-zip audit output directory into HTTP response | Standard Node.js zip-streaming library; handles large directories without buffering entire zip in memory |
| lucide-react | 0.577.0 (already installed) | Severity icons, expand/collapse chevron in finding cards | Already in the project |
| puppeteer | 24.40.0 | HTML-to-PDF conversion of Phase 11 HTML files | Renders the actual HTML files written by Phase 11 — no redesign needed; produces pixel-accurate PDF |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-collapsible | 1.1.12 | Finding card expand/collapse for remediation section | Accessible collapse primitive; no animation library needed |
| @radix-ui/react-tabs | 1.1.13 | Executive vs technical view tab switcher (if used on single page) | Only if D-02 is implemented as tabs on one page rather than separate routes |
| shiki | 4.0.2 | Syntax-highlighted code snippets in finding evidence | Optional — use only if evidence snippets contain code; plain `<pre>` is acceptable for v1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| puppeteer | @react-pdf/renderer 4.3.2 | react-pdf requires redesigning the entire report layout in JSX; puppeteer reuses the existing Phase 11 HTML files directly — strongly prefer puppeteer |
| puppeteer | playwright | Same Chromium engine; puppeteer is lighter and purpose-built for PDF; playwright adds test tooling weight |
| archiver | jszip 3.10.1 | jszip buffers the entire zip in memory before sending — bad for large audit dirs; archiver streams the response directly |
| recharts | Chart.js | recharts is React-native and already present via Shadcn; Chart.js requires a canvas adapter in RSC context |

**Installation (new packages only):**
```bash
pnpm --filter web add archiver @types/archiver
pnpm --filter web add puppeteer
pnpm --filter web add @radix-ui/react-collapsible
```

Note: recharts is already bundled via Shadcn chart components. If the Shadcn chart component is not yet added to `apps/web/components/ui/`, add it via `npx shadcn@latest add chart`.

**Version verification:** Confirmed against npm registry 2026-03-22.

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/app/(app)/audit/[id]/
├── page.tsx                    # Existing — progress view (add redirect to results on completion)
├── progress-view.tsx           # Existing — add "View Results" button when status=completed
├── results/
│   └── page.tsx                # NEW — Server Component; loads audit + findings from DB
├── results/
│   └── results-view.tsx        # NEW — Client Component; filtering/sorting state
├── executive/
│   └── page.tsx                # NEW — serves report-management.html via iframe or route
└── technical/
    └── page.tsx                # NEW — serves report-technical.html via iframe or route

apps/web/app/api/audit/[id]/
├── download/
│   └── route.ts                # NEW — streams zip of auditOutputDir
├── pdf/
│   └── [type]/route.ts         # NEW — generates PDF from HTML file via Puppeteer
└── report/
    └── [type]/route.ts         # NEW — serves raw HTML file (management|technical)

apps/web/components/audit/
├── finding-card.tsx            # NEW — individual finding card with collapsible remediation
├── severity-badge.tsx          # NEW — colored badge for critical/high/medium/low/info
├── severity-chart.tsx          # NEW — Recharts bar chart for severity counts
└── cost-summary.tsx            # NEW — cost banner + per-phase breakdown table
```

### Pattern 1: Server Component Data Loading
**What:** The results page is a Next.js Server Component that loads audit data from SQLite synchronously via Drizzle. All filtering/sorting is client-side state — the full findings array is serialized into the page.
**When to use:** When the full dataset fits in a single page load (findings lists are typically 10-200 items).
**Example:**
```typescript
// apps/web/app/(app)/audit/[id]/results/page.tsx
import { notFound } from "next/navigation";
import { getDb, audits, auditPhases } from "@codeaudit/db";
import { eq } from "drizzle-orm";
import { ResultsView } from "./results-view";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const audit = db.select().from(audits).where(eq(audits.id, id)).get();
  if (!audit || !audit.findings) notFound();

  const phases = db.select().from(auditPhases)
    .where(eq(auditPhases.auditId, id))
    .all();

  return (
    <ResultsView
      audit={audit}
      phases={phases}
    />
  );
}
```

### Pattern 2: Streaming Zip Download API Route
**What:** Next.js Route Handler that pipes `archiver` output directly to the response, avoiding buffering the entire zip in memory.
**When to use:** Always for file downloads from a directory.
**Example:**
```typescript
// apps/web/app/api/audit/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import { getDb, audits } from "@codeaudit/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const audit = db.select().from(audits).where(eq(audits.id, id)).get();
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.directory(audit.auditOutputDir, false);
  archive.finalize();

  // Also include structured JSON from DB findings
  const findingsJson = JSON.stringify(audit.findings, null, 2);
  archive.append(findingsJson, { name: "findings-structured.json" });

  const nodeStream = archive as unknown as NodeJS.ReadableStream;
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="audit-${audit.folderName}-${id.slice(0, 8)}.zip"`,
    },
  });
}
```

### Pattern 3: Client-Side Severity Filter
**What:** `useState` for active severity filter; derived filtered+sorted array computed inline (no `useMemo` needed for lists < 500 items).
**When to use:** Always for findings filtering — avoids server round-trips.
**Example:**
```typescript
// apps/web/app/(app)/audit/[id]/results/results-view.tsx
"use client";
import { useState } from "react";
import type { AuditFinding, FindingsSeverity } from "@codeaudit/db";

const SEVERITIES: FindingsSeverity[] = ["critical", "high", "medium", "low", "info"];

export function ResultsView({ findings }: { findings: AuditFinding[] }) {
  const [filter, setFilter] = useState<FindingsSeverity | "all">("all");
  const [sortBy, setSortBy] = useState<"severity" | "phase">("severity");

  const SEVERITY_ORDER: Record<FindingsSeverity, number> = {
    critical: 0, high: 1, medium: 2, low: 3, info: 4,
  };

  const filtered = findings
    .filter((f) => filter === "all" || f.severity === filter)
    .sort((a, b) =>
      sortBy === "severity"
        ? SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        : a.phase - b.phase
    );
  // ...
}
```

### Pattern 4: Puppeteer PDF Generation
**What:** API route that loads the existing Phase 11 HTML file from `auditOutputDir` and converts it to PDF using Puppeteer's `page.pdf()`.
**When to use:** PDF export endpoint only — do not run Puppeteer in server components.
**Example:**
```typescript
// apps/web/app/api/audit/[id]/pdf/[type]/route.ts
import puppeteer from "puppeteer";
import path from "node:path";
import { getDb, audits } from "@codeaudit/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await params;
  const db = getDb();
  const audit = db.select().from(audits).where(eq(audits.id, id)).get();
  if (!audit) return new Response("Not found", { status: 404 });

  const htmlFile = type === "technical"
    ? "report-technical.html"
    : "report-management.html";
  const filePath = path.join(audit.auditOutputDir, htmlFile);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${filePath}`, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="audit-${type}-${id.slice(0, 8)}.pdf"`,
    },
  });
}
```

### Pattern 5: Progress View Transition to Results
**What:** `progress-view.tsx` already closes the EventSource on `status === "completed"`. Add a `useRouter().push()` or a visible "View Results" button once the audit is terminal + completed.
**When to use:** After audit completes — do not auto-redirect on cancelled/failed.
**Example:**
```typescript
// In progress-view.tsx, inside the terminal state block:
import { useRouter } from "next/navigation";

const router = useRouter();
// When audit reaches completed:
{isTerminal && statusLabel === "completed" && (
  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
    <button onClick={() => router.push(`/audit/${auditId}/results`)}>
      View Results
    </button>
  </div>
)}
```

### Anti-Patterns to Avoid
- **Fetching findings via client-side API call:** The findings JSONB is small enough to serialize in the server component page load. Avoid an extra `/api/audit/[id]/findings` endpoint unless findings exceed ~1000 items.
- **Running Puppeteer at audit completion time:** Only launch Puppeteer on-demand in the PDF API route. Do not pre-generate PDFs eagerly — they are large and the user may never download them.
- **Buffering the zip in memory:** Never use `jszip`'s `generateAsync()` pattern for directory zips — always stream with `archiver` piped to the response.
- **Importing `archiver` or `puppeteer` in Client Components:** These are Node.js-only packages. Keep them exclusively in API route handlers (`route.ts` files).
- **Calling `archiver.append()` after `archiver.finalize()`:** Always append any additional content (like the structured JSON blob from DB) before calling `finalize()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zip creation from directory | Custom fs.readdir + zip byte assembly | `archiver` | Handles symlinks, large files, streaming, compression levels, and error propagation correctly |
| HTML to PDF | Headless fetch + CSS print hacks | `puppeteer` | CSS `@media print` is unreliable across content types; Puppeteer renders the full DOM including inline styles that Phase 11 already uses |
| Severity filter state | Custom reducer or context | `useState` with derived array | Findings list is synchronous and small; no need for complex state management |
| Collapse animation | CSS transitions + ref tracking | `@radix-ui/react-collapsible` | Handles keyboard accessibility, ARIA attributes, and animation correctly out-of-the-box |

**Key insight:** All the hard data work is done by Phases 10 and 11. Phase 3 is entirely a rendering and download layer.

---

## Common Pitfalls

### Pitfall 1: `audits.findings` May Be Null for Cancelled/Failed Audits
**What goes wrong:** Results page crashes because `audit.findings` is `null` when the audit was cancelled before Phase 10 completed.
**Why it happens:** Phase 10 is responsible for writing the aggregated `AuditFindings` to the DB. If the audit was cancelled before Phase 10 ran, `findings` remains `null`.
**How to avoid:** Guard with `if (!audit.findings) { redirect to partial-results or show "incomplete audit" state }`. For cancelled audits, render a partial results page using `auditPhases` data instead.
**Warning signs:** TypeScript type for `findings` is `AuditFindings | null` — any non-null assertion without a guard will surface this.

### Pitfall 2: Phase 11 HTML Files May Not Exist
**What goes wrong:** PDF generation or the "view HTML report" route 404s because `report-management.html` and `report-technical.html` were not written (Phase 11 skipped, cancelled, or failed).
**Why it happens:** Phase 11 runs last; if cancelled before it completes, files are not in `auditOutputDir`.
**How to avoid:** In the PDF/report API routes, `fs.access()` the file before attempting to read/render it. Return a 404 or fallback message if missing.
**Warning signs:** `ENOENT` errors in the PDF route.

### Pitfall 3: `archiver` Error Handling in Route Handlers
**What goes wrong:** The zip download silently produces a corrupted archive if `archiver` emits an `error` event that is not handled.
**Why it happens:** `archiver` is a Node.js event emitter; unhandled `error` events crash the process in Node 20+.
**How to avoid:** Always attach `archive.on("error", (err) => { throw err; })` before calling `archive.finalize()`.
**Warning signs:** Client receives a partial zip that cannot be opened.

### Pitfall 4: Puppeteer `file://` Protocol Requires Absolute Path
**What goes wrong:** `page.goto("file://relative/path")` silently fails or loads a blank page.
**Why it happens:** Puppeteer's `file://` protocol requires an absolute path starting with `/`.
**How to avoid:** Always use `path.resolve()` or `path.join()` to ensure the path is absolute before passing to `page.goto()`.
**Warning signs:** PDF renders correctly but is blank.

### Pitfall 5: Cost Comparison Requires Consistent Microdollar Units
**What goes wrong:** Budget warning logic shows incorrect percentage because `estimatedCostMicrodollars` was stored in cents (from `estimateCostRange` which returns cents) while `actualCostMicrodollars` is stored in microdollars.
**Why it happens:** `cost-estimator.ts` `estimateCostRange()` returns `[min, max]` in **cents** (comment says "USD cents"), but the DB column is named `actualCostMicrodollars`. The stored `estimatedCostMicrodollars` may be in different units depending on how Phase 1 populated it.
**How to avoid:** Verify units in the `audits` schema: `estimatedCostMicrodollars` (column name `estimated_cost`) vs `actualCostMicrodollars` (column name `actual_cost`). Both are stored as integers — confirm they share the same unit at write time. If different, normalize in the comparison function.
**Warning signs:** Budget warning shows "40000x over estimate" instead of "40% over".

### Pitfall 6: Puppeteer Install Size in CI / Docker
**What goes wrong:** Adding `puppeteer` to `apps/web` pulls in a full Chromium binary (~170 MB), bloating Docker images and CI caches.
**Why it happens:** `puppeteer` auto-downloads Chromium on `npm install`.
**How to avoid:** Set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` in CI and Docker, use `puppeteer-core` + system Chromium. For a local-only tool where the developer's machine has a browser, this is acceptable — just document it.
**Warning signs:** Docker build takes 5+ minutes due to Chromium download.

---

## Code Examples

### Severity Badge Colors (matching Linear aesthetic)
```typescript
// apps/web/components/audit/severity-badge.tsx
import type { FindingsSeverity } from "@codeaudit/db";

const SEVERITY_STYLES: Record<FindingsSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  info:     "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export function SeverityBadge({ severity }: { severity: FindingsSeverity }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  );
}
```

### Cost Formatter (reuse from progress-view)
```typescript
// These already exist in progress-view.tsx — extract to apps/web/lib/format.ts
export function formatCost(microdollars: number): string {
  return `$${(microdollars / 1_000_000).toFixed(4)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}
```

### Budget Warning Calculation
```typescript
// Compare estimated vs actual cost — both in microdollars
function getBudgetOverrun(estimated: number, actual: number): number | null {
  if (estimated <= 0) return null;
  const pct = ((actual - estimated) / estimated) * 100;
  return pct > 20 ? Math.round(pct) : null; // only warn if >20% over
}
```

### Health Score Display
```typescript
// Score comes from audits.findings.summary.score (0-100) and .grade ("A"-"F")
const GRADE_COLOR: Record<string, string> = {
  A: "text-green-400",
  B: "text-blue-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-400",
};
```

### Per-Phase Cost Breakdown
```typescript
// auditPhases.tokensUsed is per-phase token count
// Per-phase cost: derive from ratio of phase tokens to total tokens
function phaseTokenCost(phaseTokens: number, totalTokens: number, totalCostMicro: number): number {
  if (totalTokens === 0) return 0;
  return Math.round((phaseTokens / totalTokens) * totalCostMicro);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/router` useRouter | `next/navigation` useRouter | Next.js 13 App Router | Must import from `next/navigation` not `next/router` |
| `res.pipe(archive)` in Express | `Readable.toWeb()` in Next.js Route Handler | Next.js 13+ | Route Handlers use Web Streams API; convert Node stream to Web stream |
| React.useState + useEffect for data | Server Components for initial load | Next.js 13.4 | Load audit data in Server Component, pass as props to Client Component |

**Deprecated/outdated:**
- `next/router` in App Router: Always import `useRouter` from `next/navigation` — the Pages Router import will break.
- `archiver` v5 and below: v7 (current) has improved streaming API and security fixes — use v7.

---

## Open Questions

1. **Puppeteer vs system Chromium for local app distribution**
   - What we know: Puppeteer bundles its own Chromium; on user machines running the local app, this is an extra ~170 MB
   - What's unclear: Whether to use `puppeteer` (bundled Chromium) or `puppeteer-core` + user's system Chrome
   - Recommendation: Use `puppeteer` for v1 simplicity. Document the size. Migrate to `puppeteer-core` if packaging as a distributable binary in Phase 4/5.

2. **Executive vs Technical pages: separate routes vs iframe embed**
   - What we know: Phase 11 writes standalone HTML files with inline CSS. D-02 says "separate pages."
   - What's unclear: Whether "separate pages" means separate Next.js routes with in-app layout, or opening the raw HTML in a new browser tab
   - Recommendation: Serve raw HTML files via `/api/audit/[id]/report/[type]` route. Show them via `<iframe>` inside a results sub-page that keeps the app chrome (sidebar, back button). This avoids re-implementing the report design.

3. **Partial results for cancelled audits**
   - What we know: If audit is cancelled before Phase 10, `audits.findings` is null
   - What's unclear: Should cancelled audits have a results page at all?
   - Recommendation: Yes — show partial results using `auditPhases` data (per-phase findings arrays are stored individually). Show cost incurred (satisfies COST-03).

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `packages/audit-engine/src/finding-extractor.ts` — `AuditFindingSchema` confirmed
- Direct code inspection: `packages/db/src/schema.ts` — `AuditFindings`, `AuditFinding`, column names and types confirmed
- Direct code inspection: `packages/audit-engine/src/phases/phase-10.ts` — confirmed writes `audits.findings` JSONB
- Direct code inspection: `packages/audit-engine/src/phases/phase-11.ts` — confirmed writes `report-management.html` + `report-technical.html`
- Direct code inspection: `apps/web/lib/cost-estimator.ts` — confirmed `estimateCostRange` returns cents (not microdollars)
- Direct code inspection: `apps/web/app/(app)/audit/[id]/progress-view.tsx` — confirmed `formatCost`/`formatTokens` helpers, SSE completion detection
- npm registry 2026-03-22: archiver@7.0.1, puppeteer@24.40.0, recharts@3.8.0, @radix-ui/react-collapsible@1.1.12 — versions verified

### Secondary (MEDIUM confidence)
- `apps/web/package.json` — confirmed recharts is NOT yet installed (Shadcn chart component not yet added); archiver and puppeteer not yet installed
- `apps/web/components/ui/` — confirmed only 6 Shadcn components installed: alert-dialog, alert, button, input, label, select — chart/badge/collapsible/tabs not yet added

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against npm registry and project package.json
- Architecture: HIGH — based on direct reading of existing code patterns
- Pitfalls: HIGH for data shape issues (code read), MEDIUM for Puppeteer pitfalls (known ecosystem patterns)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable libraries; Puppeteer ships frequently but API is stable)
