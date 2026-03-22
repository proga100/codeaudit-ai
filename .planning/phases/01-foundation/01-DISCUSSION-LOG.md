# Phase 1: App Shell & Configuration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 01-app-shell-configuration (rewritten after local-first pivot)
**Areas discussed:** App startup & auth, Folder selection UX, Audit config layout, Cost estimate display

---

## App Startup & Auth

### Authentication

| Option | Description | Selected |
|--------|-------------|----------|
| No auth needed | Local tool, like VS Code | ✓ |
| Simple PIN/password | Optional PIN for API key protection | |
| You decide | Claude picks | |

**User's choice:** No auth needed

### Startup Method

| Option | Description | Selected |
|--------|-------------|----------|
| npx command | 'npx codeaudit' — downloads and runs | ✓ |
| npm global install | 'npm i -g codeaudit' then 'codeaudit' | |
| Both options | Support both | |
| You decide | Claude picks | |

**User's choice:** npx command

### First Run Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Straight to main screen | Main screen with prompt to add key | |
| Quick setup wizard | First time: add API key, then done | ✓ |
| You decide | Claude picks | |

**User's choice:** Quick setup wizard

---

## Folder Selection UX

### Selection Method

| Option | Description | Selected |
|--------|-------------|----------|
| Path input + browse | Text input + Browse button | ✓ |
| Drag & drop | Drag folder onto app | |
| Both | Path + browse + drag & drop | |
| You decide | Claude picks | |

**User's choice:** Path input + browse, with multi-folder support. If multiple folders, run individual audits then multi-repo audit.

### Non-Git Folders

| Option | Description | Selected |
|--------|-------------|----------|
| Still allow audit | Skip git-specific phases | ✓ |
| Require git repo | Refuse non-git folders | |
| You decide | Claude picks | |

**User's choice:** Ask user to confirm, then skip git-specific phases during audit.

### Recent Folders

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show recents | Main screen shows recently audited folders | ✓ |
| No, always pick fresh | Select folder each time | |
| You decide | Claude picks | |

**User's choice:** Yes, show recents

---

## Audit Config Layout

### Configuration Arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| All on one page | Folder + config + estimate on single page | ✓ |
| Two-step flow | Step 1: folder, Step 2: config | |
| You decide | Claude picks | |

**User's choice:** All on one page

### Remember Settings

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, remember last | Pre-fill with last used settings | |
| Always defaults | Always start with full/deep/first key | ✓ |
| You decide | Claude picks | |

**User's choice:** Always defaults

### Model Selection (user-added requirement)

**User's input:** After selecting a provider, show available models from that provider's API. Anthropic → Sonnet, Opus. Gemini → Flash, Pro. Include "Auto" mode that selects the best model per phase automatically.

---

## Cost Estimate Display

### When Estimate Appears

| Option | Description | Selected |
|--------|-------------|----------|
| After all config set | Appears once everything selected | |
| Live as you configure | Updates in real-time as config changes | ✓ |
| You decide | Claude picks | |

**User's choice:** Live as you configure

### Start Audit Action

| Option | Description | Selected |
|--------|-------------|----------|
| Simple button | One-click start | |
| Confirm dialog | Summary dialog before starting | ✓ |
| You decide | Claude picks | |

**User's choice:** Confirm dialog

---

## Claude's Discretion

- Card icons and descriptions for audit types
- Search/filter for recent folders
- Setup wizard transitions
- Cost heuristic formula
- Model capability mapping for Auto mode
- Error states for folder permissions

## Deferred Ideas

- Multi-repo audit execution logic — future phase
- npm global install / Homebrew distribution — v2
