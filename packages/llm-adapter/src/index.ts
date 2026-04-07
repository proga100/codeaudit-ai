
import { createAnthropicProvider } from "./providers/anthropic";
import { createOpenAIProvider } from "./providers/openai";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAICompatibleProvider } from "./providers/openai-compatible";
export { resolveModel, PHASE_COMPLEXITY } from "./models";
export type { LlmProvider, PhaseComplexity } from "./models";

export type LlmAdapterConfig = {
  provider: "anthropic" | "openai" | "gemini" | "openai-compatible";
  apiKey: string; // decrypted — never log this
  model: string;  // already resolved via resolveModel()
  baseUrl?: string; // only used by openai-compatible provider
};

// Returns the provider's LanguageModel instance.
// Vercel AI SDK's generateObject / generateText accept LanguageModel at runtime.
export function createLlmProvider(config: LlmAdapterConfig): any {
  switch (config.provider) {
    case "anthropic": return createAnthropicProvider(config.apiKey, config.model);
    case "openai":    return createOpenAIProvider(config.apiKey, config.model);
    case "gemini":    return createGeminiProvider(config.apiKey, config.model);
    case "openai-compatible": return createOpenAICompatibleProvider(config.apiKey, config.model, config.baseUrl!);
    default:
      throw new Error(`Unknown LLM provider: ${String(config.provider)}`);
  }
}
