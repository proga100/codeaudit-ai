import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PhaseOutput } from "../finding-extractor";

// Source-code extensions worth measuring for size. Skip data, lockfiles,
// generated assets, and binary content — those skew "large file" signals.
const SOURCE_EXTS = new Set([
  ".py",
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".go",
  ".rs",
  ".rb",
  ".java", ".kt", ".kts", ".scala",
  ".swift",
  ".c", ".h", ".cc", ".cpp", ".hpp",
  ".cs",
  ".php",
  ".lua",
  ".ex", ".exs",
  ".vue", ".svelte",
  ".sh", ".bash", ".zsh",
]);

// Directories to skip during the walk. Vendored deps, build output, and VCS
// internals would dominate the result without adding signal.
const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".vercel",
  "out",
  "target",
  "vendor",
  "__pycache__",
  "venv",
  ".venv",
  ".mypy_cache",
  ".pytest_cache",
  "coverage",
]);

const LARGE_FILE_THRESHOLD = 300;
const HIGH_SEVERITY_THRESHOLD = 1500;
const MEDIUM_SEVERITY_THRESHOLD = 500;
const SCAN_TIMEOUT_MS = 60_000;

export type LargeFile = { path: string; lines: number };

async function* walkSourceFiles(dir: string, root: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkSourceFiles(full, root);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SOURCE_EXTS.has(ext)) {
        yield path.relative(root, full);
      }
    }
  }
}

async function countLines(absPath: string): Promise<number> {
  const buf = await fs.readFile(absPath);
  if (buf.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 0x0a) n++;
  if (buf[buf.length - 1] !== 0x0a) n++;
  return n;
}

/**
 * Walk the repo and return every source file whose line count exceeds the
 * threshold. Pure Node — no shell dependency, behaves the same on every host.
 *
 * Wrapped in a soft timeout so a pathologically large repo can't stall an audit.
 */
export async function scanLargeFiles(
  repoPath: string,
  threshold: number = LARGE_FILE_THRESHOLD,
): Promise<LargeFile[]> {
  const results: LargeFile[] = [];
  const deadline = Date.now() + SCAN_TIMEOUT_MS;

  for await (const rel of walkSourceFiles(repoPath, repoPath)) {
    if (Date.now() > deadline) {
      console.warn(`[audit-engine] Phase 4 size scan: hit ${SCAN_TIMEOUT_MS}ms cap, returning partial results`);
      break;
    }
    try {
      const lines = await countLines(path.join(repoPath, rel));
      if (lines > threshold) results.push({ path: rel, lines });
    } catch {
      // unreadable file — skip silently
    }
  }

  // Deterministic ordering: largest first, then by path for ties
  results.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));
  return results;
}

function severityForMaxLines(maxLines: number): "low" | "medium" | "high" {
  if (maxLines >= HIGH_SEVERITY_THRESHOLD) return "high";
  if (maxLines >= MEDIUM_SEVERITY_THRESHOLD) return "medium";
  return "low";
}

/**
 * Convert a size-scan result into a single grouped finding.
 *
 * Returns null when no files exceed the threshold. One finding (not 19) so a
 * size outlier can never single-handedly tank the audit score.
 */
export function buildLargeFilesFinding(
  scan: LargeFile[],
  phaseNumber: number,
): PhaseOutput["findings"][number] | null {
  const largest = scan[0];
  if (!largest) return null;
  const severity = severityForMaxLines(largest.lines);
  const top = scan.slice(0, 20);
  const overflow = scan.length - top.length;
  const lineDetails = top.map((f) => `  - ${f.path} (${f.lines} lines)`).join("\n");
  const description =
    `${scan.length} source file${scan.length === 1 ? "" : "s"} exceed the ${LARGE_FILE_THRESHOLD}-line threshold. ` +
    `Largest is ${largest.path} at ${largest.lines} lines. ` +
    `Large files concentrate complexity and make code hard to understand, test, and refactor.\n\n` +
    `Top ${top.length}${overflow > 0 ? ` (of ${scan.length})` : ""}:\n${lineDetails}` +
    (overflow > 0 ? `\n  ... and ${overflow} more` : "");

  return {
    id: randomUUID(),
    phase: phaseNumber,
    category: "complexity",
    severity,
    title: `${scan.length} source file${scan.length === 1 ? "" : "s"} exceed ${LARGE_FILE_THRESHOLD}-line threshold`,
    description,
    filePaths: scan.map((f) => f.path),
    lineNumbers: [],
    recommendation:
      `Refactor the largest files into smaller, focused modules. ` +
      `Target: keep individual source files under ${LARGE_FILE_THRESHOLD} lines where practical.`,
  };
}

/**
 * Format the size-scan result as a hint that gets injected into the LLM prompt
 * so the agent doesn't waste tool-call budget rediscovering it (and doesn't
 * emit a duplicate "large file" finding).
 */
export function formatSizeScanForPrompt(scan: LargeFile[]): string {
  if (scan.length === 0) {
    return `## Pre-computed: File-size scan\n\nNo source files exceed ${LARGE_FILE_THRESHOLD} lines. The size-outlier check has already been performed deterministically — do NOT emit any "large file" findings yourself.`;
  }
  const top = scan.slice(0, 10);
  const list = top.map((f) => `- ${f.path}: ${f.lines} lines`).join("\n");
  return `## Pre-computed: File-size scan\n\nA deterministic file-size scan has already been run. ${scan.length} source file(s) exceed ${LARGE_FILE_THRESHOLD} lines. A single grouped finding for these has already been recorded — do NOT emit additional "large file" findings.\n\nFor reference, the largest files are:\n${list}\n\nFocus your tool-use on the OTHER Phase 4 checks: function length outliers, cyclomatic complexity indicators, duplicated code blocks (jscpd if available, else grep for repeated patterns).`;
}

// Exported for tests
export const _internals = {
  LARGE_FILE_THRESHOLD,
  HIGH_SEVERITY_THRESHOLD,
  MEDIUM_SEVERITY_THRESHOLD,
  SOURCE_EXTS,
  EXCLUDE_DIRS,
  severityForMaxLines,
};
