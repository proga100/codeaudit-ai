import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export function createAnthropicProvider(apiKey: string, model: string): LanguageModel {
  const provider = createAnthropic({ apiKey });
  return provider(model);
}
