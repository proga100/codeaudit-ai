// Deterministic LLM generation parameters.
//
// Default sampling (temperature ~1.0, no seed) makes audit results vary run-to-run
// even on the same commit: different tool-call sequences in agentic phases, different
// findings selected, different scores. We pin temperature to 0 across providers and
// pass a stable seed where the provider supports it, so a rerun of the same audit
// against the same repo state is reproducible.

export type LlmProvider = "anthropic" | "openai" | "gemini" | "openai-compatible";

export type DeterministicParams = {
  temperature: number;
  seed?: number;
};

// FNV-1a 32-bit hash, clamped to a positive 31-bit int (safe across providers
// that accept seed as a signed int32). Same auditId + phaseNumber → same seed.
function seedFromAudit(auditId: string, phaseNumber: number): number {
  const s = `${auditId}:${phaseNumber}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) & 0x7fffffff;
}

export function deterministicLlmParams(
  provider: LlmProvider,
  auditId: string,
  phaseNumber: number,
): DeterministicParams {
  // Anthropic's API does not accept a `seed` parameter; passing it can cause the
  // AI SDK to surface a provider error. Temperature 0 alone gives most of the
  // determinism win on Claude.
  if (provider === "anthropic") {
    return { temperature: 0 };
  }
  return { temperature: 0, seed: seedFromAudit(auditId, phaseNumber) };
}
