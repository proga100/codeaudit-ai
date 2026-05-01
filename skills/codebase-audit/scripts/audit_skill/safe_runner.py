from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path


ALLOWED_COMMANDS = {
    "find",
    "rg",
    "grep",
    "egrep",
    "cat",
    "head",
    "tail",
    "wc",
    "ls",
    "tree",
    "file",
    "stat",
    "du",
    "sort",
    "uniq",
    "awk",
    "sed",
    "git",
    "npm",
    "pnpm",
    "yarn",
    "pip",
    "pip3",
    "cargo",
    "go",
    "python",
    "python3",
    "ruby",
    "php",
    "java",
    "javac",
    "dotnet",
    "swift",
    "cloc",
    "tokei",
    "scc",
    "jscpd",
    "composer",
}

DANGEROUS_PATTERNS = [
    r"\brm\s",
    r"\bmv\s",
    r"\bcp\s",
    r"\bmkdir\b",
    r"\brmdir\b",
    r"\bchmod\b",
    r"\bchown\b",
    r">\s",
    r">>\s",
    r"\btee\s",
    r"\btouch\s",
    r"\bcurl\s",
    r"\bwget\s",
    r"\bfetch\s",
    r"\bnc\s",
    r"\bssh\s",
    r"\bscp\s",
    r"\bnpm\s+install\b",
    r"\bnpm\s+ci\b",
    r"\byarn\s+add\b",
    r"\bpnpm\s+add\b",
    r"\bpip\s+install\b",
    r"\bcargo\s+add\b",
    r"\bgo\s+get\b",
    r"\bgit\s+push\b",
    r"\bgit\s+commit\b",
    r"\bgit\s+add\b",
    r"\bgit\s+merge\b",
    r"\bgit\s+rebase\b",
    r"\bgit\s+checkout\s+-b\b",
    r"\bsed\s+-i\b",
    r"--force\b",
    r"--hard\b",
]

MAX_OUTPUT_CHARS = 60_000


@dataclass
class CommandResult:
    command: list[str]
    ok: bool
    blocked: bool
    returncode: int | None
    output: str


def run_safe_command(repo: Path, command: list[str], timeout: int = 30) -> CommandResult:
    if not command:
        return CommandResult(command, False, True, None, "(blocked: empty command)")
    executable = command[0].lower()
    if executable not in ALLOWED_COMMANDS:
        return CommandResult(command, False, True, None, f"(blocked: command '{command[0]}' is not allowed)")

    joined = " ".join(command)
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, joined, flags=re.IGNORECASE):
            return CommandResult(command, False, True, None, f"(blocked: matched dangerous pattern {pattern})")

    boundary_error = _check_boundary(repo, command[1:])
    if boundary_error:
        return CommandResult(command, False, True, None, f"(blocked: {boundary_error})")

    try:
        result = subprocess.run(command, cwd=repo, text=True, capture_output=True, timeout=timeout, check=False)
        output = "\n".join(part for part in [result.stdout.strip(), result.stderr.strip()] if part)
    except FileNotFoundError:
        return CommandResult(command, False, False, 127, "(command not found)")
    except subprocess.TimeoutExpired:
        return CommandResult(command, False, False, None, f"(timeout after {timeout}s)")
    except Exception as exc:
        return CommandResult(command, False, False, None, f"(error: {exc})")

    if len(output) > MAX_OUTPUT_CHARS:
        output = output[:MAX_OUTPUT_CHARS] + f"\n\n... truncated at {MAX_OUTPUT_CHARS} chars"
    return CommandResult(command, result.returncode == 0, False, result.returncode, output)


def _check_boundary(repo: Path, args: list[str]) -> str | None:
    repo_real = repo.resolve()
    for arg in args:
        if ".." in Path(arg).parts:
            return f"argument '{arg}' contains '..'"
        if arg.startswith("-") or "*" in arg or arg.startswith(":!"):
            continue
        path = Path(arg)
        if not path.is_absolute() and ("/" not in arg and not (repo / arg).exists()):
            continue
        candidate = path if path.is_absolute() else repo / path
        if path.is_absolute() and not str(candidate).startswith(str(repo_real)):
            return f"absolute path '{arg}' is outside repo"
        if candidate.exists():
            try:
                resolved = candidate.resolve()
            except Exception:
                continue
            if not str(resolved).startswith(str(repo_real)):
                return f"path '{arg}' resolves outside repo"
    return None
