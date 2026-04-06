import { describe, it, expect } from "vitest";
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