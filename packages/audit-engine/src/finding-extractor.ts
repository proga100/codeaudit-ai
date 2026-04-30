import { generateObject } from "ai";
import { z } from "zod";
import { withRetry } from "./retry";
import type { DeterministicParams } from "./llm-params";

// OpenAI structured output requires ALL properties in 'required' array.
// No .optional(), no .default() — every field must be plain required.
export const AuditFindingSchema = z.object({
  id: z.string(),
  phase: z.number(),
  category: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  title: z.string(),
  description: z.string(),
  filePaths: z.array(z.string()).default([]),
  lineNumbers: z.array(z.number()).default([]),
  recommendation: z.string().default(""),
});

export const PhaseOutputSchema = z.object({
  findings: z.array(AuditFindingSchema),
  summary: z.string(),
  phaseScore: z.number(),
});

export type PhaseOutput = z.infer<typeof PhaseOutputSchema>;

const SEVERITY_ORDER = { info: 0, low: 1, medium: 2, high: 3, critical: 4 } as const;
type Severity = keyof typeof SEVERITY_ORDER;

// Strip per-instance noise (file paths, line numbers, separators) from a title
// so "Large Python file: src/foo.py" and "Large Python file - src/bar.py"
// collapse to the same key. First 6 alphanumeric tokens is enough signal
// without being so aggressive that distinct findings get merged.
function normalizeTitle(title: string): string {
  const head = title.toLowerCase().split(/[:\-—–|(]/)[0] ?? "";
  return head
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(" ");
}

function highestSeverity(severities: Severity[]): Severity {
  let best: Severity = "info";
  for (const s of severities) {
    if (SEVERITY_ORDER[s] > SEVERITY_ORDER[best]) best = s;
  }
  return best;
}

/**
 * Merge near-duplicate findings within a single phase.
 *
 * Two findings collapse into one when they share `category` and a normalized
 * `title`. The merged finding takes the highest severity in the group, the
 * union of `filePaths` and `lineNumbers`, and an annotated description.
 *
 * Why: with severity-weighted scoring (medium = -5), a phase that emits 19
 * separate "Large file" mediums deducts 95 points and floors the audit score.
 * Grouping caps the impact at one finding per category-pattern per phase.
 */
export function groupSimilarFindings(findings: PhaseOutput["findings"]): PhaseOutput["findings"] {
  if (findings.length <= 1) return findings;

  const groups = new Map<string, PhaseOutput["findings"]>();
  for (const f of findings) {
    const key = `${f.category}::${normalizeTitle(f.title)}`;
    const list = groups.get(key);
    if (list) list.push(f);
    else groups.set(key, [f]);
  }

  const merged: PhaseOutput["findings"] = [];
  for (const list of groups.values()) {
    const first = list[0];
    if (!first) continue;
    if (list.length === 1) {
      merged.push(first);
      continue;
    }
    const filePaths = [...new Set(list.flatMap((f) => f.filePaths ?? []))];
    const lineNumbers = [...new Set(list.flatMap((f) => f.lineNumbers ?? []))];
    const severity = highestSeverity(list.map((f) => f.severity as Severity));
    merged.push({
      ...first,
      severity,
      filePaths,
      lineNumbers,
      title: `${first.title} (${list.length} occurrences)`,
      description: `${first.description}\n\n[Grouped from ${list.length} similar findings — affects ${filePaths.length} file(s).]`,
    });
  }
  return merged;
}

export async function runPhaseLlm(
  model: any,
  prompt: string,
  phaseNumber: number,
  sampling?: DeterministicParams,
): Promise<{
  findings: PhaseOutput["findings"];
  summary: string;
  score: number;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  console.log(`[audit-engine] Phase ${phaseNumber}: calling LLM...`);

  let object: PhaseOutput;
  let usage: { inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number };

  try {
    const result = await withRetry(
      () =>
        generateObject({
          model,
          schema: PhaseOutputSchema,
          prompt:
            prompt +
            "\n\nIMPORTANT: For each finding, always provide all fields including id (use a unique identifier), filePaths (array, empty if not applicable), lineNumbers (array, empty if not applicable), and recommendation.",
          maxOutputTokens: 4096,
          ...(sampling ?? {}),
        }),
      3,
      `Phase ${phaseNumber} generateObject`,
    );
    object = result.object;
    usage = result.usage as typeof usage;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Phase ${phaseNumber} LLM call failed: ${msg.slice(0, 300)}`, { cause: err });
  }

  const promptTokens = usage.inputTokens ?? usage.promptTokens ?? 0;
  const completionTokens = usage.outputTokens ?? usage.completionTokens ?? 0;

  console.log(
    `[audit-engine] Phase ${phaseNumber}: LLM returned ${object.findings.length} findings, ${promptTokens + completionTokens} tokens`,
  );

  const stamped = object.findings.map((f) => ({ ...f, phase: phaseNumber }));
  return {
    findings: groupSimilarFindings(stamped),
    summary: object.summary,
    score: object.phaseScore,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}
