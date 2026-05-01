# Phase Command Playbook

This playbook adapts the main CodeAudit phase guide into a self-contained Claude Code skill. Use it after `scripts/codebase_audit.py scan` has produced `repo_context.md`.

Always exclude third-party and generated folders unless the user explicitly asks:

```bash
--glob '!node_modules/**' --glob '!vendor/**' --glob '!.next/**' --glob '!dist/**' --glob '!build/**' --glob '!coverage/**' --glob '!target/**' --glob '!venv/**' --glob '!.venv/**'
```

## Phase 1: Orientation

Use the scanner output first, then inspect only what is needed.

```bash
find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' | sort
ls -la package.json pnpm-workspace.yaml turbo.json nx.json tsconfig.json pyproject.toml requirements.txt composer.json go.mod Cargo.toml Dockerfile 2>/dev/null
rg -n "\"scripts\"|\"dependencies\"|\"devDependencies\"" package.json
```

For Next.js:

```bash
find app pages src -maxdepth 3 -type f \( -name "page.tsx" -o -name "route.ts" -o -name "layout.tsx" -o -name "middleware.ts" \) 2>/dev/null | sort | head -80
```

For Laravel:

```bash
find app routes database config -maxdepth 3 -type f 2>/dev/null | sort | head -120
sed -n '1,220p' routes/web.php 2>/dev/null
sed -n '1,220p' routes/api.php 2>/dev/null
```

For FastAPI:

```bash
find . -maxdepth 4 -type f \( -name "*.py" -o -name "pyproject.toml" -o -name "requirements.txt" \) -not -path '*/venv/*' -not -path '*/.venv/*' | sort | head -120
rg -n "FastAPI\\(|APIRouter\\(|@.*\\.(get|post|put|patch|delete)\\(" --glob '*.py'
```

## Phase 2: Dependency Health

Do not install packages. Use existing manifests and read-only audit commands.

```bash
sed -n '1,240p' package.json 2>/dev/null
npm audit --dry-run 2>/dev/null || true
npm outdated 2>/dev/null || true
sed -n '1,240p' pyproject.toml 2>/dev/null
sed -n '1,240p' requirements.txt 2>/dev/null
sed -n '1,240p' composer.json 2>/dev/null
composer audit 2>/dev/null || true
```

Flag only evidence-backed dependency risks. If an audit tool is unavailable or dependencies are not installed, record that limitation.

## Phase 3: Tests

```bash
find . -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "test_*.py" -o -name "*_test.go" -o -name "*Test.java" \) -not -path '*/node_modules/*' -not -path '*/vendor/*' | sort | head -200
rg -n "\"test\"|\"coverage\"|pytest|vitest|jest|phpunit|go test|cargo test" package.json pyproject.toml pytest.ini composer.json Makefile .github/workflows 2>/dev/null
```

Assess whether critical routes/modules have tests. Do not claim zero coverage only because no coverage report exists.

## Phase 4: Complexity

Start with `deterministic_findings.json`.

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" -o -name "*.php" -o -name "*.go" \) -not -path '*/node_modules/*' -not -path '*/vendor/*' -not -path '*/dist/*' -not -path '*/build/*' -print0 | xargs -0 wc -l | sort -nr | head -30
rg -n "TODO|FIXME|HACK|XXX" --glob '!node_modules/**' --glob '!vendor/**' --glob '!dist/**' --glob '!build/**' | head -80
```

Read the largest/highest-churn files in focused chunks, not full repo-wide context.

## Phase 5: Git Archaeology

```bash
git log --since='6 months ago' --numstat --pretty=format: -- . ':!node_modules' ':!vendor' | awk 'NF==3 { churn[$3]+=$1+$2 } END { for (f in churn) print churn[f], f }' | sort -nr | head -30
git shortlog -sn --since='12 months ago'
git log --oneline --decorate --max-count=30
```

Report churn and bus-factor risks as engineering risks, not personal criticism.

## Phase 6: Security

Search broadly, then verify narrowly.

```bash
rg -n "password|secret|api[_-]?key|token|private[_-]?key|BEGIN (RSA|OPENSSH|PRIVATE)" --glob '!node_modules/**' --glob '!vendor/**' --glob '!.git/**' --glob '!dist/**' --glob '!build/**' | head -100
rg -n "eval\\(|exec\\(|shell_exec|system\\(|passthru|subprocess|pickle\\.loads|yaml\\.load|innerHTML|dangerouslySetInnerHTML|raw\\(" --glob '!node_modules/**' --glob '!vendor/**' | head -120
rg -n "SELECT .*\\+|whereRaw|DB::raw|query\\(|cursor\\.execute|Prisma\\.raw|\\$queryRawUnsafe" --glob '!node_modules/**' --glob '!vendor/**' | head -120
```

Before reporting a committed secret:

```bash
git ls-files --error-unmatch path/to/file 2>/dev/null
git log --all --full-history -- path/to/file
```

A local gitignored secret is not a critical leak. A secret in git history is serious.

## Phase 7: Deep Reads

Locate high-risk modules first:

```bash
rg -n "auth|login|session|jwt|permission|role|admin|billing|payment|stripe|upload|download|webhook|callback" --glob '!node_modules/**' --glob '!vendor/**' | head -150
```

Then read relevant files in full or in exact chunks. Prioritize auth, billing, user data, admin paths, file upload/download, webhooks, and background jobs.

## Phase 8: CI/CD

```bash
find .github .gitlab-ci.yml .circleci Jenkinsfile azure-pipelines.yml bitbucket-pipelines.yml Dockerfile docker-compose.yml docker-compose.yaml -maxdepth 3 -type f 2>/dev/null | sort
rg -n "secret|token|password|deploy|prod|production|staging|rollback|migrate|test|lint|build" .github .gitlab-ci.yml Dockerfile docker-compose.yml docker-compose.yaml 2>/dev/null
```

Check whether CI runs tests/lint/build and whether secrets are only referenced through platform secret stores.

## Phase 9: Documentation

```bash
find . -maxdepth 3 -type f \( -iname "README*" -o -iname "CONTRIBUTING*" -o -iname "CHANGELOG*" -o -iname ".env.example" -o -iname "docs" \) -not -path '*/node_modules/*' | sort
rg -n "install|setup|environment|env|deploy|test|lint|build|api|architecture" README* docs .env.example 2>/dev/null
```

Do not flag missing inline comments if project convention docs ask for minimal comments.

## Phase 10: Report

Write findings to `findings.md`, then run:

```bash
python3 <skill-root>/scripts/codebase_audit.py report --repo <repo-path> --out <audit-output-dir>
```

## Optional Phase 11: HTML

Only when requested:

```bash
python3 <skill-root>/scripts/codebase_audit.py html --repo <repo-path> --out <audit-output-dir>
```
