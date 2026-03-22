import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function createOpenAIProvider(apiKey: string, model: string): LanguageModel {
  const provider = createOpenAI({ apiKey });
  return provider(model);
}
