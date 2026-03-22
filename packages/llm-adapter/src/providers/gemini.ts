import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export function createGeminiProvider(apiKey: string, model: string): LanguageModel {
  const provider = createGoogleGenerativeAI({ apiKey });
  return provider(model);
}
