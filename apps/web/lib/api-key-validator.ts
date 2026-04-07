/**
 * API key validation service.
 *
 * Validates user-provided BYOK API keys by making lightweight test calls
 * to each provider's API. Returns a structured result indicating validity.
 *
 * Providers:
 * - Anthropic: POST /v1/messages with a minimal request (1 token max)
 * - OpenAI: GET /v1/models (lightweight list endpoint)
 * - Gemini: GET /v1beta/models (lightweight list endpoint)
 */

export type Provider = "anthropic" | "openai" | "gemini" | "openai-compatible";

export type ValidationResult =
  | { status: "valid"; message: string }
  | { status: "invalid_key"; message: string }
  | { status: "rate_limited"; message: string }
  | { status: "quota_exceeded"; message: string }
  | { status: "network_error"; message: string };

/**
 * Validate an Anthropic API key by sending a minimal messages request.
 * Uses max_tokens: 1 to minimize cost (still triggers auth check).
 */
async function validateAnthropicKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (response.ok) {
      return { status: "valid", message: "Anthropic API key is valid." };
    }

    const data = await response.json().catch(() => ({}));
    const errorType = (data as Record<string, { type?: string }>)?.error?.type;

    if (response.status === 401) {
      return {
        status: "invalid_key",
        message: "Invalid Anthropic API key. Please check and try again.",
      };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      if (errorType === "rate_limit_error") {
        return {
          status: "rate_limited",
          message:
            "Anthropic API key is valid, but you have hit a rate limit. Try again shortly.",
        };
      }
      // Could also be quota exceeded
      return {
        status: "quota_exceeded",
        message:
          "Anthropic API key is valid, but your credit balance may be insufficient.",
      };
    }

    if (response.status === 403) {
      return {
        status: "invalid_key",
        message:
          "Anthropic API key does not have the required permissions.",
      };
    }

    // Any 2xx response with a valid structure is success
    // Some non-200 responses still indicate a valid key (billing errors)
    if (response.status >= 400 && response.status < 500) {
      return {
        status: "invalid_key",
        message: `Anthropic API key validation failed (HTTP ${response.status}).`,
      };
    }

    return { status: "valid", message: "Anthropic API key is valid." };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        status: "network_error",
        message: "Anthropic API request timed out. Check your network connection.",
      };
    }
    return {
      status: "network_error",
      message: "Could not reach the Anthropic API. Check your network connection.",
    };
  }
}

/**
 * Validate an OpenAI API key by calling the models list endpoint.
 * GET /v1/models is a lightweight, read-only endpoint.
 */
async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      return { status: "valid", message: "OpenAI API key is valid." };
    }

    if (response.status === 401) {
      return {
        status: "invalid_key",
        message: "Invalid OpenAI API key. Please check and try again.",
      };
    }

    if (response.status === 429) {
      // Rate limited — key is valid
      return {
        status: "rate_limited",
        message:
          "OpenAI API key is valid, but you have hit a rate limit. Try again shortly.",
      };
    }

    if (response.status === 403) {
      return {
        status: "quota_exceeded",
        message:
          "OpenAI API key is valid, but your account may have insufficient quota.",
      };
    }

    return {
      status: "invalid_key",
      message: `OpenAI API key validation failed (HTTP ${response.status}).`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        status: "network_error",
        message: "OpenAI API request timed out. Check your network connection.",
      };
    }
    return {
      status: "network_error",
      message: "Could not reach the OpenAI API. Check your network connection.",
    };
  }
}

/**
 * Validate a Google Gemini API key by calling the models list endpoint.
 * GET /v1beta/models?key=<apiKey> is a read-only lightweight endpoint.
 */
async function validateGeminiKey(apiKey: string): Promise<ValidationResult> {
  try {
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      return { status: "valid", message: "Gemini API key is valid." };
    }

    if (response.status === 400) {
      const data = await response.json().catch(() => ({}));
      const message = (data as Record<string, { message?: string }>)?.error?.message ?? "";
      if (message.toLowerCase().includes("api key")) {
        return {
          status: "invalid_key",
          message: "Invalid Gemini API key. Please check and try again.",
        };
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: "invalid_key",
        message: "Invalid or unauthorized Gemini API key. Please check and try again.",
      };
    }

    if (response.status === 429) {
      return {
        status: "rate_limited",
        message:
          "Gemini API key is valid, but you have hit a rate limit. Try again shortly.",
      };
    }

    return {
      status: "invalid_key",
      message: `Gemini API key validation failed (HTTP ${response.status}).`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        status: "network_error",
        message: "Gemini API request timed out. Check your network connection.",
      };
    }
    return {
      status: "network_error",
      message: "Could not reach the Gemini API. Check your network connection.",
    };
  }
}

/**
 * Validate an API key for the given provider.
 *
 * @param provider - One of "anthropic", "openai", "gemini"
 * @param apiKey - The raw API key to validate (never logged)
 * @returns A validation result with status and user-friendly message
 */
export async function validateApiKey(
  provider: Provider,
  apiKey: string,
): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      status: "invalid_key",
      message: "API key cannot be empty.",
    };
  }

  switch (provider) {
    case "anthropic":
      return validateAnthropicKey(apiKey.trim());
    case "openai":
      return validateOpenAIKey(apiKey.trim());
    case "gemini":
      return validateGeminiKey(apiKey.trim());
    case "openai-compatible":
      // Skip validation for custom endpoints — we can't know the auth scheme
      return { status: "valid", message: "OpenAI-compatible API key saved (not validated)." };
    default:
      return {
        status: "invalid_key",
        message: `Unknown provider: ${provider}`,
      };
  }
}
