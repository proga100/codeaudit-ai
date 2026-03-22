// Server-only: folder stats collection (uses node:fs)
import fs from "node:fs/promises";
import path from "node:path";

export type { FolderStats, AuditType, AuditDepth, Provider } from "./cost-estimator-shared";
export { estimateCostRange, formatCostRange } from "./cost-estimator-shared";

// Rough heuristic: average 250 chars/token for code
const CHARS_PER_TOKEN = 250;

export async function collectFolderStats(folderPath: string): Promise<import("./cost-estimator-shared").FolderStats> {
  let fileCount = 0;
  let totalBytes = 0;

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        fileCount++;
        totalBytes += stat.size;
      }
    }
  }

  await walk(folderPath);
  return { fileCount, totalBytes, estimatedTokens: Math.round(totalBytes / CHARS_PER_TOKEN) };
}
