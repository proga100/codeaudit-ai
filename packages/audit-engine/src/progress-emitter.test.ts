import { describe, it, expect } from "vitest";
import { calculateCost } from "./progress-emitter";

describe("calculateCost", () => {
  it("calculates cost using actual token split for anthropic", () => {
    const result = calculateCost("anthropic", 1000, 500);
    // anthropic: input=$3/1M, output=$15/1M
    // 1000 input * 3000/1M + 500 output * 15000/1M = 3000 + 7500 = 10500 microdollars
    expect(result).toBe(10500);
  });

  it("calculates cost for openai", () => {
    const result = calculateCost("openai", 1000, 500);
    // openai: input=$2.5/1M, output=$10/1M
    // 1000 * 2500/1M + 500 * 10000/1M = 2500 + 5000 = 7500
    expect(result).toBe(7500);
  });

  it("calculates cost for gemini", () => {
    const result = calculateCost("gemini", 1000, 500);
    // gemini: input=$1.25/1M, output=$5/1M
    // 1000 * 1250/1M + 500 * 5000/1M = 1250 + 2500 = 3750
    expect(result).toBe(3750);
  });

  it("returns 0 for zero tokens", () => {
    expect(calculateCost("anthropic", 0, 0)).toBe(0);
  });

  it("falls back to anthropic pricing for unknown provider", () => {
    expect(calculateCost("unknown", 1000, 500)).toBe(10500);
  });
});