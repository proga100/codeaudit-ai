from __future__ import annotations

import html
import json
from datetime import datetime, timezone
from pathlib import Path

from .context import write_scan_artifacts
from .findings import grade, load_all_structured_findings, load_reviewed_findings_markdown, score, severity_counts


def report(repo: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    if not (out / "repo_context.md").exists():
        write_scan_artifacts(repo, out)
    findings = load_all_structured_findings(out)
    reviewed_markdown = load_reviewed_findings_markdown(out)
    health = score(findings)
    counts = severity_counts(findings)
    meta = _load_meta(out)
    phases_completed = _completed_phases(out)

    lines = [
        "# Codebase Audit Summary",
        "",
        f"Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        f"Repo: {repo.name}",
        f"Audit type: {meta.get('audit_type', 'manual')}",
        f"Depth: {meta.get('depth', 'manual')}",
        f"Phases completed: {', '.join(str(item) for item in phases_completed) or 'none'}",
        f"Score: {health}/100 ({grade(health)})",
        "",
        "## Severity Counts",
        "",
    ]
    for severity in ["critical", "high", "medium", "low", "info"]:
        lines.append(f"- {severity}: {counts.get(severity, 0)}")
    lines.extend(["", "## Structured Findings", ""])
    if findings:
        for item in findings:
            lines.extend(
                [
                    f"### {str(item.get('severity', 'info')).upper()}: {item.get('title', 'Untitled')}",
                    "",
                    f"Category: {item.get('category', 'general')}",
                    f"Phase: {item.get('phase', 0)}",
                    f"Evidence: {item.get('description', '')}",
                    f"Files: {', '.join(str(f) for f in item.get('filePaths', []))}",
                    f"Recommendation: {item.get('recommendation', '')}",
                    "",
                ]
            )
    else:
        lines.append("No structured findings. Add reviewed findings to `findings.md` before final delivery.")
    if reviewed_markdown:
        lines.extend(["", "## Reviewed Findings", "", reviewed_markdown, ""])
    lines.extend(
        [
            "",
            "## Limitations",
            "",
            "- Python phases collect evidence; Claude Code must still review phase artifacts for reasoning-heavy findings.",
            "- Third-party and generated folders were excluded by default.",
            "",
        ]
    )
    (out / "audit-summary.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out / 'audit-summary.md'}")


def html_report(repo: Path, out: Path) -> None:
    if not (out / "audit-summary.md").exists():
        report(repo, out)
    findings = load_all_structured_findings(out)
    reviewed_markdown = load_reviewed_findings_markdown(out)
    health = score(findings)
    counts = severity_counts(findings)
    meta = _load_meta(out)
    body = render_html_body(repo.name, health, counts, findings, reviewed_markdown, meta)
    (out / "report-management.html").write_text(render_html_page(f"{repo.name} Management Audit Report", body), encoding="utf-8")
    (out / "report-technical.html").write_text(render_html_page(f"{repo.name} Technical Audit Report", body), encoding="utf-8")
    print(f"Wrote HTML reports to {out}")


def render_html_page(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>
:root {{ color-scheme: light dark; --bg: #f8fafc; --fg: #172033; --card: #ffffff; --muted: #5b6472; --border: #d7dde7; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg: #0f141b; --fg: #edf2f7; --card: #151c25; --muted: #9aa6b2; --border: #263241; }} }}
body {{ margin: 0; font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--fg); }}
main {{ max-width: 1120px; margin: 0 auto; padding: 32px 20px 56px; }}
.header {{ display: flex; justify-content: space-between; gap: 20px; align-items: start; border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; }}
.score {{ font-size: 44px; font-weight: 800; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 20px 0; }}
.card {{ background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; }}
.sev {{ text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: .04em; color: var(--muted); }}
.critical {{ border-left: 4px solid #dc2626; }}
.high {{ border-left: 4px solid #ea580c; }}
.medium {{ border-left: 4px solid #ca8a04; }}
.low {{ border-left: 4px solid #2563eb; }}
.info {{ border-left: 4px solid #64748b; }}
h1, h2, h3 {{ line-height: 1.15; }}
pre {{ white-space: pre-wrap; overflow-wrap: anywhere; }}
</style>
</head>
<body><main>{body}</main></body>
</html>
"""


def render_html_body(repo_name: str, health: int, counts: object, findings: list[dict[str, object]], reviewed_markdown: str, meta: dict[str, object]) -> str:
    stat_cards = "".join(
        f'<div class="card"><div class="sev">{html.escape(sev)}</div><strong>{counts.get(sev, 0)}</strong></div>'  # type: ignore[attr-defined]
        for sev in ["critical", "high", "medium", "low", "info"]
    )
    finding_cards = "".join(
        f"""<section class="card {html.escape(str(item.get('severity', 'info')))}">
<div class="sev">{html.escape(str(item.get('severity', 'info')))} · phase {html.escape(str(item.get('phase', 0)))}</div>
<h3>{html.escape(str(item.get('title', 'Untitled')))}</h3>
<p>{html.escape(str(item.get('description', '')))}</p>
<p><strong>Recommendation:</strong> {html.escape(str(item.get('recommendation', '')))}</p>
</section>"""
        for item in findings
    )
    if not finding_cards:
        finding_cards = '<section class="card info"><h3>No structured findings</h3><p>Add reviewed findings to the Markdown report for a complete audit.</p></section>'
    reviewed_block = f"<h2>Reviewed Findings</h2><section class='card'><pre>{html.escape(reviewed_markdown)}</pre></section>" if reviewed_markdown else ""
    return f"""<div class="header">
<div><h1>{html.escape(repo_name)} Audit Report</h1><p>{html.escape(str(meta.get('audit_type', 'manual')))} · {html.escape(str(meta.get('depth', 'manual')))}</p></div>
<div class="score">{health}/100 ({grade(health)})</div>
</div>
<h2>Severity Breakdown</h2>
<div class="grid">{stat_cards}</div>
<h2>Findings</h2>
{finding_cards}
{reviewed_block}
"""


def _load_meta(out: Path) -> dict[str, object]:
    path = out / "audit_meta.json"
    if not path.exists():
        return {}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _completed_phases(out: Path) -> list[int]:
    try:
        progress = json.loads((out / "progress.json").read_text(encoding="utf-8"))
    except Exception:
        return []
    return sorted(int(key) for key, value in progress.items() if isinstance(value, dict) and value.get("status") == "completed")
