import { runPhaseWithTools } from "../tool-phase-runner";
import type { PhaseRunner } from "../phase-registry";
import {
  scanLargeFiles,
  buildLargeFilesFinding,
  formatSizeScanForPrompt,
} from "./phase-04-size-scan";

// Phase 4 — Code Complexity.
//
// File-size outliers are detected deterministically (pure-Node walk, fixed
// threshold) before the LLM runs. The result is collapsed into one grouped
// finding so a repo with 50 over-threshold files can't deduct 50 × 5 = 250
// points and floor the score. The LLM still handles the parts that need
// judgment: function-length outliers, cyclomatic complexity indicators,
// duplicated code blocks. The pre-computed scan is also injected into the
// prompt so the LLM doesn't waste tool-call budget rediscovering it or emit
// a duplicate "large file" finding.
export const phase04Runner: PhaseRunner = async (ctx, phaseNumber) => {
  const sizeScan = await scanLargeFiles(ctx.repoPath);
  console.log(
    `[audit-engine] Phase ${phaseNumber}: deterministic size scan found ${sizeScan.length} file(s) over threshold`,
  );

  const sizeFinding = buildLargeFilesFinding(sizeScan, phaseNumber);
  const extraInstructions = formatSizeScanForPrompt(sizeScan);

  await runPhaseWithTools(ctx, phaseNumber, {
    extraInstructions,
    prependFindings: sizeFinding ? [sizeFinding] : [],
  });
};
