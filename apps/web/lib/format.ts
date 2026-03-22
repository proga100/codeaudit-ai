/**
 * Shared formatting helpers for cost, tokens, and budget overrun.
 * Extracted from progress-view.tsx for reuse across the audit results UI.
 */

/**
 * Format microdollars as a dollar string with 4 decimal places.
 * e.g. 1_234_567 → "$1.2346"
 */
export function formatCost(microdollars: number): string {
  return `$${(microdollars / 1_000_000).toFixed(4)}`;
}

/**
 * Format a token count with "k" suffix for thousands.
 * e.g. 1500 → "1.5k", 999 → "999"
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

/**
 * Returns the percentage by which actual cost exceeded the estimate,
 * rounded to the nearest integer — but only if the overrun is > 20%.
 * Returns null if:
 *  - estimated is 0 or negative (no estimate available)
 *  - overrun is <= 20%
 *
 * Both params are in microdollars.
 *
 * Example: getBudgetOverrun(100, 145) → 45 (45% over)
 *          getBudgetOverrun(100, 115) → null (only 15% over, below 20% threshold)
 */
export function getBudgetOverrun(
  estimatedMicrodollars: number,
  actualMicrodollars: number,
): number | null {
  if (estimatedMicrodollars <= 0) return null;
  const pct = ((actualMicrodollars - estimatedMicrodollars) / estimatedMicrodollars) * 100;
  if (pct > 20) return Math.round(pct);
  return null;
}
