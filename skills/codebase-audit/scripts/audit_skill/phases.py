from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .context import write_scan_artifacts
from .safe_runner import CommandResult, run_safe_command

AuditType = str
AuditDepth = str


@dataclass(frozen=True)
class PhaseDefinition:
    number: int
    name: str
    complexity: str
    included_in: tuple[str, ...]


PHASE_REGISTRY = [
    PhaseDefinition(0, "Bootstrap", "simple", ("full", "security", "team-collaboration", "code-quality")),
    PhaseDefinition(1, "Orientation", "medium", ("full", "security", "team-collaboration", "code-quality")),
    PhaseDefinition(2, "Dependency Health", "simple", ("full", "code-quality")),
    PhaseDefinition(3, "Test Coverage", "medium", ("full", "code-quality")),
    PhaseDefinition(4, "Code Complexity", "medium", ("full", "code-quality")),
    PhaseDefinition(5, "Git Archaeology", "medium", ("full", "team-collaboration")),
    PhaseDefinition(6, "Security Audit", "complex", ("full", "security")),
    PhaseDefinition(7, "Deep Reads", "complex", ("full", "security")),
    PhaseDefinition(8, "CI/CD", "simple", ("full", "code-quality")),
    PhaseDefinition(9, "Documentation", "medium", ("full", "code-quality")),
    PhaseDefinition(10, "Final Report", "complex", ("full", "security", "team-collaboration", "code-quality")),
    PhaseDefinition(11, "HTML Reports", "complex", ("full", "security", "team-collaboration", "code-quality")),
]

PHASE_GUIDES = {
    1: "Understand project shape, entry points, stack, source/generated boundaries, and package scripts.",
    2: "Inspect dependency manifests and read-only audit/outdated signals when available.",
    3: "Assess test framework presence, test file count, critical modules without tests, and CI test execution.",
    4: "Use deterministic size scan, then inspect complexity, TODOs, duplication, and oversized modules.",
    5: "Inspect churn hotspots, contributor distribution, recent commit patterns, and release/tag signals.",
    6: "Search for secrets, auth risks, injection sinks, unsafe HTML, weak crypto, and sensitive logging.",
    7: "Locate high-risk auth, billing, admin, upload, webhook, and user-data modules for focused human review.",
    8: "Inspect CI/CD, Docker, deploy scripts, environment handling, test/lint/build steps, and rollback signals.",
    9: "Inspect onboarding docs, env examples, API docs, architecture notes, and project conventions.",
}

FIND_EXCLUDES = [
    "-not",
    "-path",
    "*/node_modules/*",
    "-not",
    "-path",
    "*/vendor/*",
    "-not",
    "-path",
    "*/.next/*",
    "-not",
    "-path",
    "*/dist/*",
    "-not",
    "-path",
    "*/build/*",
    "-not",
    "-path",
    "*/coverage/*",
    "-not",
    "-path",
    "*/target/*",
    "-not",
    "-path",
    "*/venv/*",
    "-not",
    "-path",
    "*/.venv/*",
]

PHASE_COMMANDS: dict[int, list[list[str]]] = {
    1: [
        ["find", ".", "-maxdepth", "2", "-type", "d", *FIND_EXCLUDES],
        ["ls", "-la"],
        ["rg", "-n", "\"scripts\"|\"dependencies\"|\"devDependencies\"", "package.json"],
        ["find", ".", "-maxdepth", "4", "-type", "f", "-name", "page.tsx", *FIND_EXCLUDES],
        ["find", ".", "-maxdepth", "4", "-type", "f", "-name", "route.ts", *FIND_EXCLUDES],
    ],
    2: [
        ["sed", "-n", "1,240p", "package.json"],
        ["sed", "-n", "1,240p", "pyproject.toml"],
        ["sed", "-n", "1,240p", "requirements.txt"],
        ["sed", "-n", "1,240p", "composer.json"],
        ["npm", "audit", "--dry-run"],
        ["composer", "audit"],
    ],
    3: [
        ["find", ".", "-type", "f", "-name", "*.test.*", *FIND_EXCLUDES],
        ["find", ".", "-type", "f", "-name", "*.spec.*", *FIND_EXCLUDES],
        ["find", ".", "-type", "f", "-name", "test_*.py", *FIND_EXCLUDES],
        ["find", ".", "-type", "f", "-name", "*_test.go", *FIND_EXCLUDES],
        ["rg", "-n", "\"test\"|\"coverage\"|pytest|vitest|jest|phpunit|go test|cargo test", "package.json", "pyproject.toml", "pytest.ini", "composer.json", "Makefile", ".github/workflows"],
    ],
    4: [
        ["rg", "-n", "TODO|FIXME|HACK|XXX", "--glob", "!node_modules/**", "--glob", "!vendor/**", "--glob", "!dist/**", "--glob", "!build/**"],
        ["jscpd", "--silent", "--min-lines", "20", "--ignore", "node_modules,vendor,dist,build,.next"],
    ],
    5: [
        ["git", "shortlog", "-sn", "--since=12 months ago"],
        ["git", "log", "--oneline", "--decorate", "--max-count=30"],
        ["git", "log", "--since=6 months ago", "--name-only", "--pretty=format:"],
        ["git", "tag", "--sort=-creatordate"],
    ],
    6: [
        ["rg", "-n", "password|secret|api[_-]?key|token|private[_-]?key|BEGIN (RSA|OPENSSH|PRIVATE)", "--glob", "!node_modules/**", "--glob", "!vendor/**", "--glob", "!.git/**", "--glob", "!dist/**", "--glob", "!build/**"],
        ["rg", "-n", "eval\\(|exec\\(|shell_exec|system\\(|passthru|subprocess|pickle\\.loads|yaml\\.load|innerHTML|dangerouslySetInnerHTML|raw\\(", "--glob", "!node_modules/**", "--glob", "!vendor/**"],
        ["rg", "-n", "SELECT .*\\+|whereRaw|DB::raw|query\\(|cursor\\.execute|Prisma\\.raw|\\$queryRawUnsafe", "--glob", "!node_modules/**", "--glob", "!vendor/**"],
        ["rg", "-n", "csrf|cors|rate.?limit|helmet|sanitize|validate|authorize|permission|role", "--glob", "!node_modules/**", "--glob", "!vendor/**"],
    ],
    7: [
        ["rg", "-n", "auth|login|session|jwt|permission|role|admin|billing|payment|stripe|upload|download|webhook|callback", "--glob", "!node_modules/**", "--glob", "!vendor/**"],
    ],
    8: [
        ["find", ".github", "-maxdepth", "3", "-type", "f"],
        ["find", ".", "-maxdepth", "2", "-type", "f", "-name", "Dockerfile", *FIND_EXCLUDES],
        ["find", ".", "-maxdepth", "2", "-type", "f", "-name", "docker-compose.y*", *FIND_EXCLUDES],
        ["rg", "-n", "secret|token|password|deploy|prod|production|staging|rollback|migrate|test|lint|build", ".github", ".gitlab-ci.yml", "Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
    ],
    9: [
        ["find", ".", "-maxdepth", "3", "-type", "f", "-iname", "README*", *FIND_EXCLUDES],
        ["find", ".", "-maxdepth", "3", "-type", "f", "-iname", ".env.example", *FIND_EXCLUDES],
        ["find", ".", "-maxdepth", "3", "-type", "f", "-path", "./docs/*", *FIND_EXCLUDES],
        ["rg", "-n", "install|setup|environment|env|deploy|test|lint|build|api|architecture", "README.md", "docs", ".env.example"],
    ],
}


def get_phase(number: int) -> PhaseDefinition:
    for phase in PHASE_REGISTRY:
        if phase.number == number:
            return phase
    raise ValueError(f"Unknown phase: {number}")


def get_phases_for_audit_type(audit_type: AuditType, depth: AuditDepth) -> list[int]:
    valid_types = {"full", "security", "team-collaboration", "code-quality"}
    if audit_type not in valid_types:
        raise ValueError(f"Unknown audit type: {audit_type}")
    if depth not in {"quick", "deep"}:
        raise ValueError(f"Unknown audit depth: {depth}")
    phases = [phase.number for phase in PHASE_REGISTRY if audit_type in phase.included_in]
    if depth == "quick":
        phases = [number for number in phases if number not in {6, 7, 11}]
    return phases


def run_phase(repo: Path, out: Path, phase_number: int, depth: AuditDepth = "deep", force: bool = False) -> None:
    out.mkdir(parents=True, exist_ok=True)
    phase = get_phase(phase_number)
    phase_file = out / f"phase-{phase_number:02d}.md"
    if phase_file.exists() and not force:
        print(f"Skipping phase {phase_number}; {phase_file} already exists. Use --force to rerun.")
        return

    if phase_number == 0:
        write_scan_artifacts(repo, out)
        _write_phase_markdown(out, phase, "Bootstrap scan completed. See repo_context.md and deterministic_findings.json.", [])
        _update_progress(out, phase_number, "completed")
        return
    if phase_number == 10:
        from .reports import report

        report(repo, out)
        _write_phase_markdown(out, phase, "Final Markdown report generated. See audit-summary.md.", [])
        _update_progress(out, phase_number, "completed")
        return
    if phase_number == 11:
        from .reports import html_report

        html_report(repo, out)
        _write_phase_markdown(out, phase, "HTML reports generated: report-management.html and report-technical.html.", [])
        _update_progress(out, phase_number, "completed")
        return

    if not (out / "repo_context.md").exists():
        write_scan_artifacts(repo, out)

    results = []
    for command in PHASE_COMMANDS.get(phase_number, []):
        results.append(run_safe_command(repo, command, timeout=15 if depth == "quick" else 30))
    _write_phase_markdown(out, phase, PHASE_GUIDES.get(phase_number, ""), results)
    _update_progress(out, phase_number, "completed")
    print(f"Wrote {phase_file}")


def run_audit(repo: Path, out: Path, audit_type: AuditType, depth: AuditDepth, force: bool = False) -> None:
    phases = get_phases_for_audit_type(audit_type, depth)
    metadata = {
        "audit_type": audit_type,
        "depth": depth,
        "phases_requested": phases,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "audit_meta.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    for phase in phases:
        try:
            run_phase(repo, out, phase, depth=depth, force=force)
        except Exception as exc:
            _update_progress(out, phase, "failed", str(exc))
            print(f"Phase {phase} failed: {exc}")
    metadata["completed_at"] = datetime.now(timezone.utc).isoformat()
    (out / "audit_meta.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def _write_phase_markdown(out: Path, phase: PhaseDefinition, guide: str, results: list[CommandResult]) -> None:
    lines = [
        f"# Phase {phase.number} - {phase.name}",
        "",
        f"Complexity: {phase.complexity}",
        "",
    ]
    if guide:
        lines.extend(["## Objective", "", guide, ""])
    if results:
        lines.extend(["## Command Evidence", ""])
        for result in results:
            status = "blocked" if result.blocked else "ok" if result.ok else f"exit {result.returncode}"
            lines.extend(
                [
                    f"### `$ {' '.join(result.command)}`",
                    "",
                    f"Status: {status}",
                    "",
                    "```text",
                    result.output or "(no output)",
                    "```",
                    "",
                ]
            )
    lines.extend(
        [
            "## Reviewer Notes",
            "",
            "Claude Code should review this evidence, inspect focused files if needed, and append evidence-backed findings to `findings.md`.",
            "",
        ]
    )
    (out / f"phase-{phase.number:02d}.md").write_text("\n".join(lines), encoding="utf-8")


def _update_progress(out: Path, phase_number: int, status: str, error: str | None = None) -> None:
    path = out / "progress.json"
    try:
        progress = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    except Exception:
        progress = {}
    progress[str(phase_number)] = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **({"error": error} if error else {}),
    }
    path.write_text(json.dumps(progress, indent=2), encoding="utf-8")
