# Audit Methodology

Use this reference as the phase model. For concrete commands, use `phase-command-playbook.md`.

The main web app's real audit engine is mostly LLM-guided tool use: phase prompt + guide chunk + read-only command tool + structured finding parser. In this skill, Claude Code replaces the web app's LLM runner, while this folder provides the same portable methodology, command policy, and deterministic bootstrap helpers.

## Phase 0: Bootstrap

Use the deterministic scanner first. It detects:

- repo name, git remote, branch, head commit
- language counts and source line counts
- manifest/config files
- package manager, frameworks, test framework signals
- monorepo signals
- CI/deploy files
- large source files
- default excluded folders

Read `repo_context.md` before deciding which stack-specific checks apply.

## Phase 1: Orientation

Goal: understand shape before reading code.

Check:

- top-level directories
- app entry points
- framework markers
- package/dependency manifests
- tests and docs presence
- source vs generated boundaries

Write only factual observations unless a structural issue is clear.

## Phase 2: Dependency Health

Check manifests and lockfiles for the detected stack:

- JavaScript/TypeScript: `package.json`, lockfiles, scripts, known deprecated packages
- Python: `requirements.txt`, `pyproject.toml`, pinned vs floating dependencies
- PHP: `composer.json`
- Go/Rust/Java/.NET: native manifests

Run dependency audit commands only if the environment supports them and they do not mutate the repo. If packages are not installed, report that limitation instead of installing.

## Phase 3: Tests

Check:

- test framework and scripts
- test file count vs source file count
- critical modules without tests
- CI test execution
- coverage artifacts if already present

Do not run long or integration-heavy tests unless the user asks.

## Phase 4: Complexity

Start from `deterministic_findings.json` for large files. Then inspect:

- oversized modules
- long functions
- duplicated logic
- tangled imports
- routes/controllers/services doing too much

Prefer concrete examples from a few high-risk files over broad claims.

## Phase 5: Git and Team Signals

Use read-only git commands:

- recent churn hotspots
- single-owner critical files
- recent commit frequency
- stale branches or tags if relevant

Do not infer personal performance from sensitive traits. Report team workflow risks only from repository evidence.

## Phase 6: Security

Prioritize:

- committed secrets
- auth and authorization bypass risk
- input validation
- SQL/NoSQL/command injection
- XSS and unsafe HTML
- CORS, CSRF, security headers
- weak crypto and sensitive logging
- Docker/CI secret exposure

Use focused searches and verify exploit paths before high/critical severity.

## Phase 7: Deep Reads

Read high-risk modules in full only after locating them:

- auth/session/middleware
- payment/billing
- user data/privacy
- admin endpoints
- file upload/download
- third-party integrations
- background jobs and retries

Deep reads should produce fewer but higher-quality findings.

## Phase 8: CI/CD and Deployment

Check:

- CI config presence
- tests/lint/build/security scans in CI
- deployment scripts
- Docker hardening
- environment variable documentation
- rollback and staging signals

## Phase 9: Documentation

Check:

- README onboarding quality
- env variable reference
- API docs or route documentation
- architecture notes
- runbook/deploy instructions

Respect project conventions. Missing inline comments are not automatically a defect.

## Phase 10: Markdown Report

The final Markdown report should include:

- executive summary
- scorecard
- findings by severity
- high-risk files
- recommended next steps
- limitations and skipped checks

Use `scripts/codebase_audit.py report` to produce a deterministic baseline, then improve it with audited findings.

## Optional Phase 11: HTML Reports

Use `scripts/codebase_audit.py html` only when requested. HTML must be deterministic and based on existing findings. Do not spend LLM tokens generating decorative report markup.
