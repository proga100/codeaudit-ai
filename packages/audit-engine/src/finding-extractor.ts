import { generateObject } from "ai";
import { z } from "zod";

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
  const { object, usage } = await generateObject({
    model,
    schema: PhaseOutputSchema,
    prompt: prompt + "\n\nIMPORTANT: For each finding, always provide all fields including id (use a unique identifier), filePaths (array, empty if not applicable), lineNumbers (array, empty if not applicable), and recommendation.",
    maxOutputTokens: 4096,
  });

  const promptTokens = (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
  const completionTokens = (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;

  console.log(`[audit-engine] Phase ${phaseNumber}: LLM returned ${object.findings.length} findings, ${promptTokens + completionTokens} tokens`);

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
