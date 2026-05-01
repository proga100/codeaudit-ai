from __future__ import annotations

import re
import uuid
from collections import Counter
from pathlib import Path
from typing import Any

from .constants import HIGH_FILE_THRESHOLD, LARGE_FILE_THRESHOLD, MEDIUM_FILE_THRESHOLD, SEVERITY_ORDER, SEVERITY_WEIGHTS


def deterministic_size_findings(large_files: list[dict[str, object]], phase: int = 4) -> list[dict[str, object]]:
    if not large_files:
        return []
    largest = large_files[0]
    max_lines = int(largest["lines"])
    severity = "high" if max_lines >= HIGH_FILE_THRESHOLD else "medium" if max_lines >= MEDIUM_FILE_THRESHOLD else "low"
    return [
        normalize_finding(
            {
                "id": str(uuid.uuid4()),
                "phase": phase,
                "severity": severity,
                "category": "complexity",
                "title": f"{len(large_files)} source files exceed {LARGE_FILE_THRESHOLD}-line threshold",
                "description": f"Largest file is {largest['path']} at {largest['lines']} lines.",
                "filePaths": [item["path"] for item in large_files[:20]],
                "lineNumbers": [],
                "recommendation": "Review the largest files for extraction into smaller modules with focused responsibilities.",
            }
        )
    ]


def normalize_finding(raw: dict[str, Any]) -> dict[str, object]:
    severity = str(raw.get("severity", "info")).lower()
    if severity not in SEVERITY_ORDER:
        severity = "info"
    file_paths = raw.get("filePaths", raw.get("files", []))
    if not isinstance(file_paths, list):
        file_paths = [str(file_paths)]
    line_numbers = raw.get("lineNumbers", [])
    if not isinstance(line_numbers, list):
        line_numbers = []
    return {
        "id": str(raw.get("id") or uuid.uuid4()),
        "phase": int(raw.get("phase") or 0),
        "category": str(raw.get("category") or "general"),
        "severity": severity,
        "title": str(raw.get("title") or "Untitled finding"),
        "description": str(raw.get("description") or raw.get("evidence") or ""),
        "filePaths": [str(item) for item in file_paths],
        "lineNumbers": [int(item) for item in line_numbers if isinstance(item, int) or str(item).isdigit()],
        "recommendation": str(raw.get("recommendation") or ""),
    }


def load_json_findings(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    try:
        parsed = __import__("json").loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    return [normalize_finding(item) for item in parsed if isinstance(item, dict)]


def load_reviewed_findings_markdown(out: Path) -> str:
    findings_md = out / "findings.md"
    if not findings_md.exists():
        return ""
    text = findings_md.read_text(encoding="utf-8").strip()
    if text in {"", "# Findings"}:
        return ""
    return text


def load_all_structured_findings(out: Path) -> list[dict[str, object]]:
    findings = load_json_findings(out / "deterministic_findings.json")
    for path in sorted(out.glob("phase-*.json")):
        findings.extend(load_json_findings(path))
    return group_similar_findings(findings)


def group_similar_findings(findings: list[dict[str, object]]) -> list[dict[str, object]]:
    groups: dict[str, list[dict[str, object]]] = {}
    for finding in findings:
        key = f"{finding.get('phase')}::{finding.get('category')}::{_normalize_title(str(finding.get('title', '')))}"
        groups.setdefault(key, []).append(finding)
    merged = []
    for items in groups.values():
        first = dict(items[0])
        if len(items) == 1:
            merged.append(first)
            continue
        severities = [str(item.get("severity", "info")) for item in items]
        first["severity"] = max(severities, key=lambda sev: SEVERITY_ORDER.get(sev, 0))
        first["filePaths"] = sorted({path for item in items for path in item.get("filePaths", [])})  # type: ignore[union-attr]
        first["lineNumbers"] = sorted({line for item in items for line in item.get("lineNumbers", [])})  # type: ignore[union-attr]
        first["title"] = f"{first.get('title')} ({len(items)} occurrences)"
        first["description"] = f"{first.get('description', '')}\n\nGrouped from {len(items)} similar findings."
        merged.append(first)
    return merged


def score(findings: list[dict[str, object]]) -> int:
    deduction = sum(SEVERITY_WEIGHTS.get(str(item.get("severity", "info")), 0) for item in findings)
    return max(0, 100 - deduction)


def grade(score_value: int) -> str:
    if score_value >= 90:
        return "A"
    if score_value >= 75:
        return "B"
    if score_value >= 60:
        return "C"
    if score_value >= 40:
        return "D"
    return "F"


def severity_counts(findings: list[dict[str, object]]) -> Counter[str]:
    return Counter(str(item.get("severity", "info")) for item in findings)


def _normalize_title(title: str) -> str:
    head = re.split(r"[:\-—–|(]", title.lower())[0]
    return " ".join(re.sub(r"[^a-z0-9\s]", " ", head).split()[:6])
