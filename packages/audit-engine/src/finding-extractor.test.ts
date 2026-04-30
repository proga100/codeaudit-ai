import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditFindingSchema, PhaseOutputSchema } from "./finding-extractor";

describe("AuditFindingSchema", () => {
  it("validates a complete finding", () => {
    const finding = {
      id: "f-001",
      phase: 6,
      category: "security",
      severity: "critical",
      title: "Leaked API key",
      description: "Found hardcoded API key in source",
      filePaths: ["src/config.ts"],
      lineNumbers: [42],
      recommendation: "Use environment variables",
    };
    const result = AuditFindingSchema.safeParse(finding);
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const minimal = {
      id: "f-001",
      phase: 6,
      category: "security",
      severity: "high",
      title: "Issue",
      description: "Description",
    };
    const result = AuditFindingSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filePaths).toEqual([]);
      expect(result.data.lineNumbers).toEqual([]);
      expect(result.data.recommendation).toBe("");
    }
  });

  it("rejects invalid severity", () => {
    const bad = {
      id: "f-001",
      phase: 6,
      category: "security",
      severity: "extreme",
      title: "Issue",
      description: "Description",
    };
    const result = AuditFindingSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const incomplete = { id: "f-001", phase: 6 };
    const result = AuditFindingSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

describe("PhaseOutputSchema", () => {
  it("validates a complete phase output", () => {
    const output = {
      findings: [{
        id: "f-001", phase: 6, category: "security", severity: "high",
        title: "Issue", description: "Desc",
      }],
      summary: "Found 1 issue",
      phaseScore: 75,
    };
    const result = PhaseOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates empty findings array", () => {
    const output = { findings: [], summary: "Clean", phaseScore: 100 };
    const result = PhaseOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("rejects missing summary", () => {
    const output = { findings: [], phaseScore: 100 };
    const result = PhaseOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric phaseScore", () => {
    const output = { findings: [], summary: "test", phaseScore: "A" };
    const result = PhaseOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });
});

// --- runPhaseLlm error handling tests ---

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

// Mock withRetry to invoke fn directly (no retry, no delay) — tests focus on error wrapping behavior
vi.mock("./retry", () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

describe("runPhaseLlm error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps LLM API errors with phase context", async () => {
    const { generateObject } = await import("ai");
    const { runPhaseLlm } = await import("./finding-extractor");
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("Network timeout"));

    await expect(runPhaseLlm({} as any, "prompt", 6)).rejects.toThrow(
      "Phase 6 LLM call failed: Network timeout",
    );
  });

  it("truncates very long error messages to 300 chars", async () => {
    const { generateObject } = await import("ai");
    const { runPhaseLlm } = await import("./finding-extractor");
    const longError = "x".repeat(500);
    vi.mocked(generateObject).mockRejectedValueOnce(new Error(longError));

    try {
      await runPhaseLlm({} as any, "prompt", 6);
      expect.fail("Should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/^Phase 6 LLM call failed: x{300}$/);
      expect(msg.length).toBe("Phase 6 LLM call failed: ".length + 300);
    }
  });

  it("preserves the original error as `cause`", async () => {
    const { generateObject } = await import("ai");
    const { runPhaseLlm } = await import("./finding-extractor");
    const original = new Error("boom");
    vi.mocked(generateObject).mockRejectedValueOnce(original);

    try {
      await runPhaseLlm({} as any, "prompt", 6);
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as Error).cause).toBe(original);
    }
  });
});