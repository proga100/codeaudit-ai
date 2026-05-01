from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from .constants import (
    CI_NAMES,
    CONVENTION_FILES,
    EXCLUDE_DIRS,
    EXTENSION_LANGUAGE,
    HIGH_FILE_THRESHOLD,
    LARGE_FILE_THRESHOLD,
    MANIFEST_NAMES,
    MEDIUM_FILE_THRESHOLD,
    SOURCE_EXTS,
)
from .utils import count_lines, iter_files, read_small_text, run_git


def detect_manifests(repo: Path) -> list[str]:
    found: list[str] = []
    for path in iter_files(repo):
        rel = path.relative_to(repo).as_posix()
        if path.name in MANIFEST_NAMES:
            found.append(rel)
        elif rel.startswith(".github/workflows/") and path.suffix in {".yml", ".yaml"}:
            found.append(rel)
    return sorted(found)


def detect_ci(repo: Path) -> list[str]:
    found: list[str] = []
    for rel in CI_NAMES:
        if (repo / rel).exists():
            found.append(rel)
    workflows = repo / ".github" / "workflows"
    if workflows.exists():
        for path in workflows.glob("*"):
            if path.suffix in {".yml", ".yaml"}:
                found.append(path.relative_to(repo).as_posix())
    return sorted(set(found))


def detect_package_manager(repo: Path, manifests: list[str]) -> str:
    names = {Path(rel).name for rel in manifests}
    if "pnpm-lock.yaml" in names or "pnpm-workspace.yaml" in names:
        return "pnpm"
    if "yarn.lock" in names:
        return "yarn"
    if "package-lock.json" in names or "package.json" in names:
        return "npm"
    pyprojects = [repo / rel for rel in manifests if Path(rel).name == "pyproject.toml"]
    if any("tool.poetry" in read_small_text(path) for path in pyprojects):
        return "poetry"
    if {"requirements.txt", "Pipfile", "pyproject.toml", "setup.py", "setup.cfg"} & names:
        return "pip"
    if "go.mod" in names:
        return "go mod"
    if "Cargo.toml" in names:
        return "cargo"
    if "pom.xml" in names:
        return "maven"
    if {"build.gradle", "build.gradle.kts"} & names:
        return "gradle"
    if "Gemfile" in names:
        return "bundler"
    if "composer.json" in names:
        return "composer"
    return "unknown"


def detect_frameworks(repo: Path, manifests: list[str]) -> list[str]:
    found: set[str] = set()
    names = {Path(rel).name for rel in manifests}
    marker_files = {
        "next.config.js": "Next.js",
        "next.config.mjs": "Next.js",
        "next.config.ts": "Next.js",
        "nuxt.config.js": "Nuxt",
        "nuxt.config.ts": "Nuxt",
        "vite.config.js": "Vite",
        "vite.config.ts": "Vite",
        "angular.json": "Angular",
        "svelte.config.js": "SvelteKit",
        "svelte.config.ts": "SvelteKit",
        "nest-cli.json": "NestJS",
    }
    for marker, framework in marker_files.items():
        if marker in names:
            found.add(framework)

    for rel in manifests:
        if Path(rel).name == "package.json":
            text = read_small_text(repo / rel)
            for marker, framework in {
                '"next"': "Next.js",
                '"nuxt"': "Nuxt",
                '"vite"': "Vite",
                '"@angular/core"': "Angular",
                '"@sveltejs/kit"': "SvelteKit",
                '"@nestjs/core"': "NestJS",
                '"express"': "Express",
                '"fastify"': "Fastify",
            }.items():
                if marker in text:
                    found.add(framework)

    python_text = "\n".join(
        read_small_text(repo / rel)
        for rel in manifests
        if Path(rel).name in {"requirements.txt", "pyproject.toml", "setup.py"}
    ).lower()
    for marker, framework in {"fastapi": "FastAPI", "django": "Django", "flask": "Flask", "starlette": "Starlette"}.items():
        if marker in python_text:
            found.add(framework)
    if (repo / "manage.py").exists():
        found.add("Django")

    php_text = "\n".join(read_small_text(repo / rel) for rel in manifests if Path(rel).name == "composer.json").lower()
    if "laravel/framework" in php_text:
        found.add("Laravel")
    if "symfony/" in php_text:
        found.add("Symfony")
    if "wordpress" in php_text or (repo / "wp-content").exists():
        found.add("WordPress")

    ruby_text = "\n".join(read_small_text(repo / rel) for rel in manifests if Path(rel).name == "Gemfile").lower()
    if "rails" in ruby_text:
        found.add("Rails")

    java_text = "\n".join(
        read_small_text(repo / rel)
        for rel in manifests
        if Path(rel).name in {"pom.xml", "build.gradle", "build.gradle.kts"}
    ).lower()
    if "spring-boot" in java_text:
        found.add("Spring Boot")
    return sorted(found)


def detect_tests(repo: Path, files: list[Path], manifests: list[str]) -> dict[str, object]:
    test_files: set[str] = set()
    patterns: set[str] = set()
    for path in files:
        rel = path.relative_to(repo).as_posix()
        name = path.name
        checks = [
            ("**/*.test.ts", name.endswith(".test.ts")),
            ("**/*.test.tsx", name.endswith(".test.tsx")),
            ("**/*.spec.ts", name.endswith(".spec.ts")),
            ("**/*.spec.tsx", name.endswith(".spec.tsx")),
            ("**/*.test.js", name.endswith(".test.js")),
            ("**/*.spec.js", name.endswith(".spec.js")),
            ("tests/test_*.py", path.suffix == ".py" and (name.startswith("test_") or "/tests/" in rel)),
            ("**/*_test.go", name.endswith("_test.go")),
            ("**/*_test.rs", name.endswith("_test.rs")),
            ("src/test/**", "/src/test/" in rel),
            ("spec/**/*", "/spec/" in rel),
        ]
        for pattern, matched in checks:
            if matched:
                test_files.add(rel)
                patterns.add(pattern)
                break

    config_text = "\n".join(
        read_small_text(repo / rel)
        for rel in manifests
        if Path(rel).name in {"package.json", "pyproject.toml", "pytest.ini", "tox.ini", "Cargo.toml", "go.mod", "Gemfile", "composer.json", "pom.xml"}
    ).lower()
    frameworks = []
    for marker, name in {
        "vitest": "vitest",
        "jest": "jest",
        "playwright": "playwright",
        "cypress": "cypress",
        "pytest": "pytest",
        "unittest": "unittest",
        "rspec": "rspec",
        "phpunit": "phpunit",
        "junit": "junit",
    }.items():
        if marker in config_text:
            frameworks.append(name)
    if any(path.endswith("_test.go") for path in test_files):
        frameworks.append("go test")
    if any(path.endswith("_test.rs") for path in test_files):
        frameworks.append("cargo test")

    return {
        "test_files": sorted(test_files)[:200],
        "test_file_count": len(test_files),
        "test_patterns": sorted(patterns),
        "test_frameworks": sorted(set(frameworks)) or ["unknown"],
    }


def detect_monorepo(repo: Path, manifests: list[str]) -> dict[str, object]:
    names = {Path(rel).name for rel in manifests}
    tools = []
    if "pnpm-workspace.yaml" in names:
        tools.append("pnpm workspaces")
    if "turbo.json" in names:
        tools.append("turborepo")
    if "nx.json" in names:
        tools.append("nx")
    if "lerna.json" in names:
        tools.append("lerna")
    if "go.work" in names:
        tools.append("go workspaces")
    for rel in manifests:
        name = Path(rel).name
        text = read_small_text(repo / rel)
        if name == "Cargo.toml" and "[workspace]" in text:
            tools.append("cargo workspaces")
        if name in {"settings.gradle", "settings.gradle.kts"} and "include" in text:
            tools.append("gradle multi-project")
        if name == "pom.xml" and "<modules>" in text:
            tools.append("maven multi-module")
        if name == "package.json" and '"workspaces"' in text:
            tools.append("npm/yarn workspaces")
    return {"is_monorepo": bool(tools), "monorepo_tools": sorted(set(tools))}


def top_level_dirs(repo: Path) -> list[str]:
    try:
        return sorted(p.name for p in repo.iterdir() if p.is_dir() and p.name not in EXCLUDE_DIRS)
    except Exception:
        return []


def read_convention_docs(repo: Path) -> list[dict[str, str]]:
    docs = []
    for rel in CONVENTION_FILES:
        path = repo / rel
        if path.exists():
            docs.append({"path": rel, "excerpt": read_small_text(path, 2048)})
    return docs


def build_context(repo: Path) -> tuple[dict[str, object], list[dict[str, object]], list[Path]]:
    language_counts: Counter[str] = Counter()
    line_counts: Counter[str] = Counter()
    large_files: list[dict[str, object]] = []
    scanned_files = list(iter_files(repo))

    for path in scanned_files:
        ext = path.suffix.lower()
        if ext not in SOURCE_EXTS:
            continue
        rel = path.relative_to(repo).as_posix()
        lines = count_lines(path)
        language_counts[ext] += 1
        line_counts[ext] += lines
        if lines > LARGE_FILE_THRESHOLD:
            large_files.append({"path": rel, "lines": lines})

    large_files.sort(key=lambda item: (-int(item["lines"]), str(item["path"])))
    manifests = detect_manifests(repo)
    tests = detect_tests(repo, scanned_files, manifests)
    monorepo = detect_monorepo(repo, manifests)
    language_lines: Counter[str] = Counter()
    for ext, lines in line_counts.items():
        language_lines[EXTENSION_LANGUAGE.get(ext, ext)] += lines

    contributors_raw = run_git(repo, ["shortlog", "-sn", "--since=12 months ago"])
    contributors = []
    for line in contributors_raw.splitlines():
        parts = line.strip().split(maxsplit=1)
        if len(parts) == 2 and parts[0].isdigit():
            contributors.append({"name": parts[1], "commits": int(parts[0])})

    context = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo": str(repo),
        "repo_name": repo.name,
        "remote": run_git(repo, ["remote", "get-url", "origin"]),
        "branch": run_git(repo, ["branch", "--show-current"]),
        "head": run_git(repo, ["rev-parse", "HEAD"]),
        "last_commit": run_git(repo, ["log", "-1", "--format=%ci"]),
        "contributors_last_12_months": contributors,
        "source_files": sum(language_counts.values()),
        "lines_by_extension": dict(sorted(line_counts.items())),
        "lines_by_language": dict(sorted(language_lines.items())),
        "files_by_extension": dict(sorted(language_counts.items())),
        "manifests": manifests,
        "ci_files": detect_ci(repo),
        "package_manager": detect_package_manager(repo, manifests),
        "frameworks": detect_frameworks(repo, manifests),
        "top_level_dirs": top_level_dirs(repo),
        "convention_docs": read_convention_docs(repo),
        **tests,
        **monorepo,
        "excluded_dirs": sorted(EXCLUDE_DIRS),
    }
    return context, large_files, scanned_files


def render_repo_context(context: dict[str, object], large_files: list[dict[str, object]]) -> str:
    lines = [
        "# Repo Context",
        "",
        f"Generated: {context['generated_at']}",
        f"Repo: {context['repo_name']}",
        f"Path: {context['repo']}",
        f"Remote: {context.get('remote') or 'unknown'}",
        f"Branch: {context.get('branch') or 'unknown'}",
        f"HEAD: {context.get('head') or 'unknown'}",
        f"Source files: {context['source_files']}",
        "",
        "## Lines by Language",
    ]
    for language, count in (context.get("lines_by_language") or {}).items():  # type: ignore[union-attr]
        lines.append(f"- `{language}`: {count}")
    lines.extend(["", "## Detected Stack"])
    lines.append(f"- Package manager: `{context.get('package_manager') or 'unknown'}`")
    lines.append("- Frameworks: " + _inline_list(context.get("frameworks") or [], "unknown"))
    lines.append(f"- Monorepo: `{context.get('is_monorepo')}`")
    lines.append("- Monorepo tools: " + _inline_list(context.get("monorepo_tools") or [], "none"))
    lines.append("- Test frameworks: " + _inline_list(context.get("test_frameworks") or [], "unknown"))
    lines.append(f"- Test files: `{context.get('test_file_count')}`")
    lines.extend(["", "## Top-Level Directories"])
    lines.extend([f"- `{item}`" for item in context.get("top_level_dirs") or []] or ["- none detected"])
    lines.extend(["", "## Manifests"])
    lines.extend([f"- `{item}`" for item in context.get("manifests") or []] or ["- none detected"])
    lines.extend(["", "## CI / Deployment Files"])
    lines.extend([f"- `{item}`" for item in context.get("ci_files") or []] or ["- none detected"])
    lines.extend(["", "## Project Convention Docs"])
    docs = context.get("convention_docs") or []
    lines.extend([f"- `{doc['path']}`" for doc in docs] or ["- none detected"])  # type: ignore[index]
    lines.extend(["", "## Largest Source Files"])
    lines.extend([f"- `{item['path']}`: {item['lines']} lines" for item in large_files[:20]] or ["- none over threshold"])
    lines.extend(["", "## Default Excludes"])
    lines.append(", ".join(f"`{item}`" for item in context["excluded_dirs"]))  # type: ignore[index]
    lines.append("")
    return "\n".join(lines)


def write_scan_artifacts(repo: Path, out: Path) -> None:
    from .findings import deterministic_size_findings

    out.mkdir(parents=True, exist_ok=True)
    context, large_files, _ = build_context(repo)
    findings = deterministic_size_findings(large_files, phase=4)
    (out / "repo_context.json").write_text(json.dumps(context, indent=2), encoding="utf-8")
    (out / "deterministic_findings.json").write_text(json.dumps(findings, indent=2), encoding="utf-8")
    (out / "repo_context.md").write_text(render_repo_context(context, large_files), encoding="utf-8")
    findings_md = out / "findings.md"
    if not findings_md.exists():
        findings_md.write_text("# Findings\n\n", encoding="utf-8")
    print(f"Wrote scan artifacts to {out}")


def _inline_list(items: object, empty: str) -> str:
    values = [str(item) for item in items] if isinstance(items, list) else []
    return ", ".join(f"`{item}`" for item in values) if values else f"`{empty}`"
