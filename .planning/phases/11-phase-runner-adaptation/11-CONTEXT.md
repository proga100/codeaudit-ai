# Phase 11: Phase Runner Adaptation - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

All nine phase runners (phases 1-9) are language-agnostic — each sends its guide section and RepoContext to the LLM and lets the LLM generate and execute appropriate commands for the detected stack.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Each phase runner should be rewritten to use runPhaseWithTools() from Phase 10 instead of hardcoded shell commands + generateObject.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- packages/audit-engine/src/tools/exec-command-tool.ts — createExecCommandTool() sandbox
- packages/audit-engine/src/tool-phase-runner.ts — runPhaseWithTools() helper
- packages/audit-engine/src/prompt-builder.ts — buildToolUsePhasePrompt()
- packages/audit-engine/src/repo-context.ts — RepoContext schema
- packages/audit-engine/src/phases/shared.ts — getRepoContext(), markPhaseCompleted()

### Established Patterns
- Each phase runner: registerPhaseRunner(N, async (ctx) => { ... })
- Current pattern: run shell commands → build prompt with output → generateObject → markPhaseCompleted
- New pattern: runPhaseWithTools(ctx, phaseNumber) handles everything

### Integration Points
- Phase runners registered in orchestrator via registerPhaseRunner()
- Guide sections loaded per phase from codebase_review_guide.md
- PhaseOutputSchema for structured findings output

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
