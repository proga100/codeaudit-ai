import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const exec = promisify(execFile);

/**
 * CRITICAL ORDER: git push block MUST run before chmod -R a-w.
 * Once chmod runs, .git/config becomes unwritable and git remote set-url will fail.
 * See: manual-codebase-review-process/codebase_review_guide.md §Setup
 */
export async function lockFolder(folderPath: string): Promise<void> {
  const gitRepo = await isGitRepo(folderPath);

  // Step 1: Block git push FIRST (while .git/config is still writable)
  if (gitRepo) {
    await exec("git", ["-C", folderPath, "remote", "set-url", "--push", "origin", "no_push"]);
  }

  // Step 2: Lock filesystem read-only
  await exec("chmod", ["-R", "a-w", folderPath]);
}

export async function unlockFolder(folderPath: string): Promise<void> {
  // Restore owner write access only (not group/other)
  await exec("chmod", ["-R", "u+w", folderPath]);
}

export async function isGitRepo(folderPath: string): Promise<boolean> {
  return fs.access(path.join(folderPath, ".git")).then(() => true).catch(() => false);
}

/**
 * Creates ~/audit-{repo-name}-{YYYYMMDD-HHmm}/ directory.
 * Appends timestamp to avoid collision (Pitfall 7 from research).
 * Returns the created absolute path.
 */
export async function createAuditOutputDir(folderPath: string): Promise<string> {
  const repoName = path.basename(folderPath);
  const now = new Date();
  // Format: YYYYMMDD-HHmm
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const outputDir = path.join(os.homedir(), `audit-${repoName}-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}
