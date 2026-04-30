/** Retries `fn` up to `maxAttempts` times on HTTP 429 / rate-limit errors only. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  label: string,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        msg.includes("429") ||
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("too many requests") ||
        msg.toLowerCase().includes("resource_exhausted");
      if (!isRateLimit || attempt === maxAttempts) throw err;
      const delayMs = Math.pow(2, attempt - 1) * 2000; // 2s, 4s, 8s
      console.log(
        `[audit-engine] ${label}: rate limited (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  // TypeScript needs this — loop always returns or throws
  throw new Error("withRetry: unreachable");
}
