# OpenAI-Compatible Provider — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Milestone:** v0.6.0

## Problem

CodeAudit AI only supports three commercial LLM providers (Anthropic, OpenAI, Gemini). Users want to run audits with:
- Local models via Ollama, LM Studio, or vLLM (fully offline, free)
- Company GPU servers running inference endpoints
- Budget cloud APIs (Together AI, Groq, Fireworks) at 5-20x lower cost

All of these expose OpenAI-compatible REST APIs, so a single provider implementation covers every scenario.

## Design

### 1. Provider Layer

Add `"openai-compatible"` as a 4th provider using the existing `@ai-sdk/openai` package with a custom `baseURL`. No new dependencies.

**New file:** `packages/llm-adapter/src/providers/openai-compatible.ts`

```typescript
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
```

**Modified:** `packages/llm-adapter/src/index.ts`

- `LlmAdapterConfig` gains optional `baseUrl?: string` field
- `LlmProvider` union adds `"openai-compatible"`
- Factory switch gets one new case that passes `baseUrl` through

### 2. Database Schema

**Modified:** `packages/db/src/schema.ts`

- `apiKeys.provider` enum: add `"openai-compatible"`
- `audits.llmProvider` enum: add `"openai-compatible"`
- `apiKeys` table: add `baseUrl` column — `text("base_url").default(null)` (nullable, only used by openai-compatible)

No migration script needed — SQLite text columns with enums are plain strings. The new column is nullable with a default.

### 3. API Keys UI

**Modified:** `apps/web/app/(app)/settings/api-keys/api-keys-page.tsx`

Provider selector gets a 4th card: **"OpenAI Compatible"**.

When `openai-compatible` is selected:
- **Base URL** input appears (required). Placeholder: `http://localhost:11434/v1`
- **API Key** input label changes to "API Key (optional)". Placeholder: `Leave blank for local servers`
- **Info box** appears below the form with minimum specs guidance (see section 7)

For local servers with no API key, store the string `"none"` encrypted — keeps the encryption pipeline uniform with no special-casing in the DB or decryption layer. At decryption time, `"none"` is passed as-is to the OpenAI SDK's `apiKey` param (the SDK accepts any string; local servers ignore it).

**Modified:** `apps/web/actions/api-keys.ts`

- `Provider` type adds `"openai-compatible"`
- `addApiKey()` accepts optional `baseUrl` parameter
- Stores `baseUrl` in the `apiKeys` row

### 4. Model Discovery

**Modified:** `apps/web/app/api/models/route.ts`

New branch for `openai-compatible` provider:

```typescript
if (provider === "openai-compatible") {
  const baseUrl = key.baseUrl; // from DB
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
```

The model list endpoint is standard across Ollama (`/api/tags` mapped to `/v1/models`), vLLM, LM Studio, Together, and Groq.

If the endpoint fails or returns empty, the UI falls back to a text input where the user types the model name manually.

### 5. Audit Engine Integration

**Modified:** `packages/audit-engine/src/pricing.json`

Rename existing `"ollama"` key to `"openai-compatible"`:

```json
"openai-compatible": { "input": 0, "output": 0 }
```

Default to free (local). Users on paid APIs (Together, Groq) get slightly inaccurate cost tracking — acceptable for v0.6.

**Modified:** `packages/llm-adapter/src/models.ts`

- `LlmProvider` type adds `"openai-compatible"`
- No AUTO tier for `openai-compatible` — `resolveModel()` requires `userSelectedModel` to be set. If null, throw an error: "OpenAI-compatible provider requires a specific model selection"
- No entry in `AUTO_MODELS` map

**Modified:** `packages/audit-engine/src/phases/shared.ts`

- `getModel()` passes `baseUrl` from audit config through to `createLlmProvider()`

### 6. Audit Creation Flow

**Modified:** `apps/web/app/(app)/audit/new/` (audit creation page)

When user selects an `openai-compatible` API key:
- Model dropdown populates from `/api/models?keyId=...` (auto-fetched from server)
- If fetch fails, show text input for manual model name entry
- AUTO mode is disabled — model selection is required

### 7. Minimum Specs Guidance

Static content shown in the API keys page when "OpenAI Compatible" is selected:

```
Recommended models for code audits:
  - 32B+ parameters (e.g., Qwen3 32B, Llama 3.3 70B, Qwen3-235B-A22B)
  - 128K+ context window
  - Strong structured output / JSON mode support

Local hardware requirements:
  - GPU: 20GB+ VRAM for 32B models, 40GB+ for 70B
  - CPU-only: works but expect 5-10 min per audit phase
  - RAM: 32GB+ recommended for 32B models

Smaller models (7B-14B) may produce low-quality or malformed audit output.
```

This is a static `<div>` in the UI, not fetched from any API.

## Out of Scope

- **Named provider presets** (Ollama, Groq, LM Studio as separate entries) — generic URL covers all
- **AUTO model routing** for open-source — user must pick a model
- **Model capability detection** — if structured output fails, show error suggesting a larger model
- **Per-model pricing for cloud APIs** — default to free; can add per-provider overrides later
- **Streaming differences** — Vercel AI SDK handles uniformly

## Files Changed (Summary)

| File | Change |
|------|--------|
| `packages/llm-adapter/src/providers/openai-compatible.ts` | New file (~10 lines) |
| `packages/llm-adapter/src/index.ts` | Add provider case + baseUrl to config |
| `packages/llm-adapter/src/models.ts` | Add type, guard against AUTO with no model |
| `packages/db/src/schema.ts` | Add baseUrl column, extend enums |
| `packages/audit-engine/src/pricing.json` | Rename ollama to openai-compatible |
| `apps/web/app/api/models/route.ts` | Add openai-compatible model fetching |
| `apps/web/app/(app)/settings/api-keys/api-keys-page.tsx` | 4th provider card, base URL input, specs info |
| `apps/web/actions/api-keys.ts` | Accept/store baseUrl |
| `apps/web/app/(app)/audit/new/` | Disable AUTO for openai-compatible |
| `packages/audit-engine/src/phases/shared.ts` | Pass baseUrl through to adapter |
