/**
 * @codeaudit/llm-adapter
 *
 * Multi-LLM abstraction layer built on Vercel AI SDK 6.x.
 * Provides a unified interface for Anthropic Claude, OpenAI GPT, and Google Gemini.
 *
 * BYOK (Bring Your Own Key) pattern:
 *   - Caller decrypts user's API key from DB using AES-256-GCM
 *   - Passes decrypted key to createLlmProvider()
 *   - Adapter constructs the AI SDK provider instance
 *   - Key is never logged or persisted after use
 *
 * Implemented in Phase 2.
 */

export type LlmProvider = "anthropic" | "openai" | "gemini";

export type LlmAdapterConfig = {
  provider: LlmProvider;
  apiKey: string; // decrypted — never log this
  model?: string; // defaults to best available for provider
};

// Placeholder — implemented in Phase 2
export function createLlmProvider(_config: LlmAdapterConfig): never {
  throw new Error("LlmAdapter not yet implemented — coming in Phase 2");
}
