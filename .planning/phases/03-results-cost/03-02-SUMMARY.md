---
phase: 03-results-cost
plan: 02
subsystem: api
tags: [next.js, archiver, puppeteer, iframe, zip-download, pdf-generation, html-report]

# Dependency graph
requires:
  - phase: 03-01
    provides: results dashboard with "Executive Report" and "Technical Report" navigation links
  - phase: 02-results-cost
    provides: audit.auditOutputDir populated by orchestrator with Phase 11 HTML files

provides:
  - Streaming zip download API: /api/audit/[id]/download (auditOutputDir + findings-structured.json)
  - PDF generation API: /api/audit/[id]/pdf/[management|technical] via Puppeteer
  - Raw HTML serve API: /api/audit/[id]/report/[management|technical] for iframe embedding
  - Executive report viewer page: /audit/[id]/executive (iframe + app chrome)
  - Technical report viewer page: /audit/[id]/technical (iframe + app chrome)

affects: [04-comparison, any phase that adds download/export functionality]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Archiver streaming: error handler attached BEFORE finalize, append BEFORE finalize, convert to Web stream via Readable.toWeb"
    - "Puppeteer PDF: absolute file:// path, browser.close() in finally block, fs.access() guard for missing Phase 11 files"
    - "iframe embed with sandbox='allow-same-origin allow-scripts' for Phase 11 inline JS (charts, tooltips)"
    - "Server Component route handler pattern: async params, notFound() on missing audit"

key-files:
  created:
    - apps/web/app/api/audit/[id]/download/route.ts
    - apps/web/app/api/audit/[id]/pdf/[type]/route.ts
    - apps/web/app/api/audit/[id]/report/[type]/route.ts
    - apps/web/app/(app)/audit/[id]/executive/page.tsx
    - apps/web/app/(app)/audit/[id]/technical/page.tsx
  modified: []

key-decisions:
  - "Puppeteer pdf() returns Uint8Array in v24+ — wrapped with Buffer.from() for BodyInit compatibility"
  - "Readable.toWeb cast uses import('node:stream').Readable type (not NodeJS.ReadableStream) to satisfy TypeScript"
  - "iframe sandbox uses allow-same-origin allow-scripts — safe because report HTML is served from same localhost origin, needed for Phase 11 charts"
  - "Pre-existing build failure in audit-engine package (Turbopack module resolution for .js files) is unrelated to this plan — confirmed by verifying failure existed before Task 1 commit"

patterns-established:
  - "Missing Phase 11 files: all routes return 404 with descriptive message, never crash"
  - "PDF generation: always use finally block for browser.close() to prevent resource leaks"
  - "Zip streaming: append all items BEFORE finalize(), attach error handler BEFORE finalize()"

requirements-completed: [DASH-03, DASH-04, COST-03]

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 3 Plan 2: Download + Report Viewer Summary

**Zip download, Puppeteer PDF, and iframe-embedded Phase 11 HTML report viewer pages with app chrome (back button, PDF download) using archiver streaming and missing-file guards**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-22T09:37:32Z
- **Completed:** 2026-03-22T09:40:11Z
- **Tasks:** 2
- **Files modified:** 5 created

## Accomplishments

- Three API routes created: streaming zip download, Puppeteer PDF generation, raw HTML serving — all return 404 (not crash) when Phase 11 files are missing
- Two in-app report viewer pages: executive and technical, each with iframe embedding the Phase 11 HTML report, back-to-results link, and PDF download button
- All error-handling requirements met: archiver error events handled, browser.close() in finally block, missing-file guards via fs.access()

## Task Commits

Each task was committed atomically:

1. **Task 1: Download zip + PDF + raw HTML report API routes** - `594d1b9` (feat)
2. **Task 2: Executive and technical report in-app viewer pages** - `67770fb` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/api/audit/[id]/download/route.ts` - Streams zip of auditOutputDir + findings-structured.json via archiver with error handling
- `apps/web/app/api/audit/[id]/pdf/[type]/route.ts` - Generates PDF via Puppeteer with file guard, finally browser.close(), absolute file:// path
- `apps/web/app/api/audit/[id]/report/[type]/route.ts` - Serves raw Phase 11 HTML for iframe embedding with 404 guard
- `apps/web/app/(app)/audit/[id]/executive/page.tsx` - Executive report viewer: iframe + back link + PDF download button
- `apps/web/app/(app)/audit/[id]/technical/page.tsx` - Technical report viewer: iframe + back link + PDF download button

## Decisions Made

- Puppeteer `pdf()` returns `Uint8Array` in v24+ — wrapped with `Buffer.from()` to satisfy `BodyInit` TypeScript constraint
- `Readable.toWeb()` cast uses the imported `node:stream` Readable type to avoid TS2345 error with `NodeJS.ReadableStream`
- iframe `sandbox="allow-same-origin allow-scripts"` — safe at localhost, required for Phase 11 inline chart JS
- Pre-existing Turbopack build failure in `audit-engine` package confirmed unrelated to this plan (reproduced without my changes)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in download route — Readable.toWeb() type cast**
- **Found during:** Task 1 (verification — tsc --noEmit)
- **Issue:** `Readable.toWeb(archive as unknown as NodeJS.ReadableStream)` raised TS2345 — ReadableStream not assignable to Readable
- **Fix:** Changed cast to `import("node:stream").Readable` to satisfy compiler
- **Files modified:** apps/web/app/api/audit/[id]/download/route.ts
- **Verification:** tsc --noEmit shows no errors for the file
- **Committed in:** 594d1b9 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript error in PDF route — Uint8Array not assignable to BodyInit**
- **Found during:** Task 1 (verification — tsc --noEmit)
- **Issue:** Puppeteer v24+ `page.pdf()` returns `Uint8Array<ArrayBufferLike>` which is not directly assignable to `BodyInit` (Response constructor)
- **Fix:** Wrapped with `Buffer.from(pdf)` which satisfies BodyInit
- **Files modified:** apps/web/app/api/audit/[id]/pdf/[type]/route.ts
- **Verification:** tsc --noEmit shows no errors for the file
- **Committed in:** 594d1b9 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - Bug, both TypeScript type compatibility)
**Impact on plan:** Both auto-fixes required for TypeScript compilation. No scope creep or behavior change.

## Issues Encountered

- Pre-existing Turbopack build failure in audit-engine package (unresolved `.js` module files). Confirmed pre-existing by verifying build failed identically before any Task 1 changes. Not fixed — out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Download and report viewing layer is complete — users can export zip, generate PDFs, and view Phase 11 HTML reports in-app
- Phase 03 is now fully complete — results dashboard (Plan 01) + download/report layer (Plan 02) both shipped
- Ready for Phase 04 (comparison) which will depend on audit history stored in SQLite
