// AUTO mode: cheapest model that meets phase complexity (per D-11, RESEARCH.md Pattern 7)
// Override: if user selected a specific model, use it for ALL phases.

export type PhaseComplexity = "simple" | "medium" | "complex";
export type LlmProvider = "anthropic" | "openai" | "gemini" | "openai-compatible";

// Phase complexity tiers (from RESEARCH.md Pattern 7)
export const PHASE_COMPLEXITY: Record<number, PhaseComplexity> = {
  0: "simple",  // Bootstrap — command output analysis
  1: "medium",  // Orientation
  2: "simple",  // Dependencies
  3: "medium",  // Tests
  4: "medium",  // Complexity
  5: "medium",  // Git archaeology
  6: "complex", // Security — highest stakes
  7: "complex", // Deep reads
  8: "simple",  // CI/CD
  9: "medium",  // Documentation
  10: "complex", // Final report synthesis
  11: "complex", // HTML report generation
};

const AUTO_MODELS: Record<Exclude<LlmProvider, "openai-compatible">, Record<PhaseComplexity, string>> = {
  anthropic: {
    simple: "claude-haiku-3-5",
    medium: "claude-sonnet-4-5",
    complex: "claude-sonnet-4-5",
  },
  openai: {
    simple: "gpt-4o-mini",
    medium: "gpt-4o-mini",
    complex: "gpt-4o",
  },
  gemini: {
    simple: "gemini-2.5-flash",
    medium: "gemini-2.5-flash",
    complex: "gemini-2.5-pro",
  },
};

export function resolveModel(
  provider: LlmProvider,
  phaseNumber: number,
  userSelectedModel: string | null | undefined,
): string {
  // User override: use their selected model for every phase
  if (userSelectedModel) return userSelectedModel;

  // OpenAI-compatible provider requires explicit model selection
  if (provider === "openai-compatible") {
    throw new Error("OpenAI-compatible provider requires a specific model selection");
  }

  const complexity = PHASE_COMPLEXITY[phaseNumber] ?? "medium";
  return AUTO_MODELS[provider as Exclude<LlmProvider, "openai-compatible">][complexity];
}
