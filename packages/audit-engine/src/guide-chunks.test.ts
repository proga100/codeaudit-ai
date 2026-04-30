import { describe, it, expect } from "vitest";
import { getGuideChunk } from "./guide-chunks";

describe("getGuideChunk", () => {
  describe("Phase 6 (Security)", () => {
    const chunk = getGuideChunk(6);

    it("instructs the LLM to check git history before flagging committed secrets", () => {
      expect(chunk).toMatch(/git log.*--all.*--full-history|git ls-files/i);
    });

    it("distinguishes file-on-disk from file-in-git-history", () => {
      expect(chunk.toLowerCase()).toContain("gitignored");
      expect(chunk.toLowerCase()).toMatch(/working tree|on disk/);
      expect(chunk.toLowerCase()).toMatch(/git history|tracked/);
    });

    it("warns against flagging gitignored files as committed", () => {
      expect(chunk.toLowerCase()).toMatch(/do not flag.*gitignored|gitignored.*not.*critical/i);
    });
  });

  describe("fallback", () => {
    it("returns a generic fallback for unknown phase numbers", () => {
      expect(getGuideChunk(999)).toContain("Phase 999");
    });
  });

  describe("Phase 1 (Orientation)", () => {
    const chunk = getGuideChunk(1);
    it("gates TypeScript-specific findings on actual TypeScript usage", () => {
      expect(chunk.toLowerCase()).toMatch(/typescript.*only if|only.*typescript|skip.*typescript/i);
    });
  });

  describe("Phase 9 (Documentation)", () => {
    const chunk = getGuideChunk(9);
    it("respects project comment-style conventions", () => {
      expect(chunk.toLowerCase()).toMatch(/comment.*polic|style guide|convention/);
      expect(chunk.toLowerCase()).toMatch(/no[- ]comment|minimal.*comment/);
    });
  });
});
