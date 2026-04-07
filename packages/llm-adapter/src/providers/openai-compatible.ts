import { createOpenAI } from "@ai-sdk/openai";

export function createOpenAICompatibleProvider(
  apiKey: string,
  model: string,
  baseUrl: string,
): any {
  const provider = createOpenAI({
    apiKey: apiKey || "no-key",
    baseURL: baseUrl,
  });
  return provider(model);
}