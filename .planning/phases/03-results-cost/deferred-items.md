# Deferred Items - Phase 03 Results Cost

## Pre-existing Issues (Out of Scope)

### 1. progress-emitter.ts missing `audit.provider` field
- **File:** `packages/audit-engine/src/progress-emitter.ts` lines 50, 54
- **Error:** `Property 'provider' does not exist on type` (audits schema)
- **Root cause:** The audits schema doesn't have a `provider` column, but progress-emitter references `audit.provider` for cost calculations.
- **Discovered during:** Task 1 - TypeScript compilation check
- **Impact:** Pre-existing issue, does not affect the results UI tasks.
- **Suggested fix:** Add `provider` column to audits schema OR derive provider from the apiKey used.
