from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Iterable

from .constants import EXCLUDE_DIRS


def iter_files(repo: Path) -> Iterable[Path]:
    for root, dirs, files in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        root_path = Path(root)
        for name in files:
            path = root_path / name
            rel = path.relative_to(repo)
            if any(part in EXCLUDE_DIRS for part in rel.parts):
                continue
            yield path


def count_lines(path: Path) -> int:
    try:
        data = path.read_bytes()
    except Exception:
        return 0
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


def read_small_text(path: Path, max_chars: int = 80_000) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:max_chars]
    except Exception:
        return ""


def run_git(repo: Path, args: list[str], timeout: int = 10) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo), *args],
            check=False,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
    except Exception:
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout.strip()
