# Phase 2: Audit Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-22
**Phase:** 02-audit-engine (rewritten after local-first pivot)
**Areas discussed:** Prompt strategy, Progress experience, Cancellation & recovery, Multi-provider behavior

---

## Prompt Strategy

### Command Execution
| Option | Selected |
|--------|----------|
| App runs commands (Node.js child_process) | |
| LLM runs them (tool use) | |
| You decide | ✓ |
**User's choice:** Claude's discretion

### Guide Chunking
| Option | Selected |
|--------|----------|
| Per-phase chunks | ✓ |
| Full guide + phase instruction | |
**User's choice:** Per-phase chunks

### Output Format
| Option | Selected |
|--------|----------|
| Same as manual (markdown) | |
| Adapted for web (JSON) | |
| Both | |
**User's choice:** Adapt for web (structured JSON), with export in multiple formats (md, json, text, pdf)

---

## Progress Experience

### Simplified View
| Option | Selected |
|--------|----------|
| Phase name + bar | ✓ |
| Terminal-style log | |
**User's choice:** Phase name + progress bar + token count

### Detailed View (multi-select)
Selected: Status icon, Findings count, Duration, Token cost — all four.

---

## Cancellation & Recovery

### Partial Results
| Option | Selected |
|--------|----------|
| Keep partial results | ✓ |
| Discard everything | |
**User's choice:** Keep partial results, show as "partial audit"

### Resume
| Option | Selected |
|--------|----------|
| Resume from checkpoint | ✓ |
| Start over | |
**User's choice:** Resume from last completed phase

---

## Multi-Provider Behavior

### Auto Mode
**User's choice:** Cost-optimized by default. Show estimated token usage and cost per model so user can override. If feasible, show model accuracy indicator.

### Output Normalization
| Option | Selected |
|--------|----------|
| Normalize output | ✓ |
| Show provider info | |
**User's choice:** Normalize — same format regardless of provider

---

## Claude's Discretion
- App-side vs LLM tool-use for bash commands
- Phase chunking boundaries
- SSE vs polling for progress
- Checkpoint format and resume logic
- Rate limit handling

## Deferred Ideas
- PDF export — follow-up after core formats
- Model accuracy metrics — research needed
