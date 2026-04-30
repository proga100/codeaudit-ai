import { describe, it, expect } from "vitest";
import type { RepoContext } from "../repo-context";
import { formatRepoContextForPrompt } from "./shared";

const baseCtx: RepoContext = {
  repoName: "test",
  remoteUrl: "",
  headCommit: "",
  defaultBranch: "main",
  primaryLanguages: ["TypeScript"],
  packageManager: "pnpm",
  frameworks: [],
  testFramework: "vitest",
  testFilePatterns: [],
  ciSystem: "",
  ciConfigPaths: [],
  isMonorepo: false,
  monorepoTool: "none",
  locByLanguage: [],
  totalLinesOfCode: 0,
  contributorsLast12Months: [],
  conventionDocs: [],
  summary: "",
};

describe("formatRepoContextForPrompt", () => {
  it("renders convention docs when present", () => {
    const ctx: RepoContext = {
      ...baseCtx,
      conventionDocs: [
        { path: "CLAUDE.md", excerpt: "Default to writing no comments." },
      ],
    };
    const formatted = formatRepoContextForPrompt(ctx);
    expect(formatted).toContain("CLAUDE.md");
    expect(formatted).toContain("Default to writing no comments");
    expect(formatted.toLowerCase()).toMatch(/convention|style/);
  });

  it("omits convention docs section when empty", () => {
    const formatted = formatRepoContextForPrompt(baseCtx);
    expect(formatted.toLowerCase()).not.toMatch(/convention docs|style overrides/);
  });
});
