import { generateObject } from "ai";
import { z } from "zod";
import { withRetry } from "./retry";

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

export async function runPhaseLlm(
  model: any,
  prompt: string,
  phaseNumber: number,
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

  return {
    findings: object.findings.map((f) => ({ ...f, phase: phaseNumber })),
    summary: object.summary,
    score: object.phaseScore,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}
