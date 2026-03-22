import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const MAX_BUFFER = 1024 * 1024; // 1MB cap — large grep output gets truncated

export async function execCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs = 30_000,
): Promise<string> {
  try {
    const { stdout, stderr } = await exec(cmd, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER,
    });
    return (stdout || stderr).slice(0, MAX_BUFFER);
  } catch (err: unknown) {
    if (err && typeof err === "object") {
      const code = (err as { code?: string }).code;
      if (code === "EACCES") return "(permission denied — read-only lock active)";
      if (code === "ENOENT") return "(command not found)";
      // execFile throws with stdout/stderr on non-zero exit — still return output
      const stdout = (err as { stdout?: string }).stdout ?? "";
      const stderr = (err as { stderr?: string }).stderr ?? "";
      if (stdout || stderr) return (stdout || stderr).slice(0, MAX_BUFFER);
    }
    return `(command error: ${String(err)})`;
  }
}
