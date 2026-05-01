from __future__ import annotations

import argparse
from pathlib import Path

from .context import write_scan_artifacts
from .phases import run_audit, run_phase
from .reports import html_report, report


def main() -> None:
    parser = argparse.ArgumentParser(description="Self-contained codebase audit helper")
    sub = parser.add_subparsers(dest="command", required=True)

    for name in ["scan", "report", "html"]:
        cmd = sub.add_parser(name)
        cmd.add_argument("--repo", required=True, type=Path)
        cmd.add_argument("--out", required=True, type=Path)

    phase = sub.add_parser("run-phase")
    phase.add_argument("--repo", required=True, type=Path)
    phase.add_argument("--out", required=True, type=Path)
    phase.add_argument("--phase", required=True, type=int)
    phase.add_argument("--depth", choices=["quick", "deep"], default="deep")
    phase.add_argument("--force", action="store_true")

    audit = sub.add_parser("run-audit")
    audit.add_argument("--repo", required=True, type=Path)
    audit.add_argument("--out", required=True, type=Path)
    audit.add_argument("--type", choices=["full", "security", "team-collaboration", "code-quality"], default="full")
    audit.add_argument("--depth", choices=["quick", "deep"], default="deep")
    audit.add_argument("--force", action="store_true")

    args = parser.parse_args()
    repo = args.repo.expanduser().resolve()
    out = args.out.expanduser().resolve()
    if not repo.exists() or not repo.is_dir():
        raise SystemExit(f"Repo path does not exist or is not a directory: {repo}")

    if args.command == "scan":
        write_scan_artifacts(repo, out)
    elif args.command == "report":
        report(repo, out)
    elif args.command == "html":
        html_report(repo, out)
    elif args.command == "run-phase":
        run_phase(repo, out, args.phase, depth=args.depth, force=args.force)
    elif args.command == "run-audit":
        run_audit(repo, out, args.type, args.depth, force=args.force)
