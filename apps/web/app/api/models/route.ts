import { NextRequest, NextResponse } from "next/server";
import { getDb, decryptApiKey, apiKeys } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";

// Anthropic models we surface (from research D-14)
const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
  { id: "claude-haiku-3-5", name: "Claude Haiku 3.5" },
];

// OpenAI models that support structured output (json_schema response format).
// Legacy models (gpt-4-0613, gpt-4-0314, gpt-4-turbo-2024-04-09) do NOT support it.
const OPENAI_SUPPORTED_MODELS = new Set([
  "gpt-4o", "gpt-4o-2024-08-06", "gpt-4o-2024-11-20",
  "gpt-4o-mini", "gpt-4o-mini-2024-07-18",
  "o1", "o1-2024-12-17", "o1-mini", "o1-mini-2024-09-12",
  "o3", "o3-mini", "o4-mini",
]);

export async function GET(request: NextRequest) {
  const keyId = request.nextUrl.searchParams.get("keyId");
  if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });

  const db = getDb();
  const key = db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).get();
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  const rawKey = decryptApiKey(key.encryptedKey, key.iv);
  const models = await fetchModelsForProvider(key.provider, rawKey, key.baseUrl ?? undefined);

  return NextResponse.json({ models, provider: key.provider });
}

async function fetchModelsForProvider(
  provider: "anthropic" | "openai" | "gemini" | "openai-compatible",
  rawKey: string,
  baseUrl?: string,
): Promise<Array<{ id: string; name: string }>> {
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": rawKey, "anthropic-version": "2023-06-01" },
      });
      if (res.ok) {
        const data = await res.json() as { data: Array<{ id: string; display_name: string }> };
        return data.data
          .filter(m => m.id.includes("claude-sonnet") || m.id.includes("claude-opus") || m.id.includes("claude-haiku"))
          .map(m => ({ id: m.id, name: m.display_name ?? m.id }));
      }
      return ANTHROPIC_MODELS;
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${rawKey}` },
      });
      if (res.ok) {
        const data = await res.json() as { data: Array<{ id: string }> };
        return data.data
          .filter(m => OPENAI_SUPPORTED_MODELS.has(m.id))
          .map(m => ({ id: m.id, name: m.id }));
      }
    }

    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${rawKey}`
      );
      if (res.ok) {
        const data = await res.json() as { models: Array<{ name: string; displayName: string }> };
        return data.models
          .filter(m => m.name.includes("gemini"))
          .map(m => ({ id: m.name.replace("models/", ""), name: m.displayName }));
      }
    }

    if (provider === "openai-compatible") {
      if (!baseUrl) return [];
      const res = await fetch(`${baseUrl}/models`, {
        headers: rawKey !== "none"
          ? { Authorization: `Bearer ${rawKey}` }
          : {},
      });
      if (res.ok) {
        const data = await res.json();
        return data.data.map((m: any) => ({ id: m.id, name: m.id }));
      }
      // Fallback: return empty list — UI shows manual model name input
      return [];
    }
  } catch {
    // Fall through to empty list
  }
  return [];
}
