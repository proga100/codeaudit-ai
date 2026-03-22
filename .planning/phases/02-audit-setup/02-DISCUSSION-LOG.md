# Phase 2: Audit Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 02-audit-setup
**Areas discussed:** Repo browser UX, Audit config flow, Cost estimate gate, Sandbox behavior

---

## Repo Browser UX

### Repo List Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Flat searchable list | All repos in one list with search bar — simple, like GitHub's repo tab | ✓ |
| Grouped by org | Repos grouped under org headers with search within | |
| You decide | Claude picks | |

**User's choice:** Flat searchable list

### Repo Info Display

| Option | Description | Selected |
|--------|-------------|----------|
| Name + description | Repo name and GitHub description | ✓ |
| Language + size | Primary language badge, repo size | |
| Last activity | Last push/commit date | |
| Audit status | Whether audited before, last audit date | ✓ |

**User's choice:** Name + description, Audit status (multi-select)

### Repo Click Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Opens config page | Dedicated audit configuration page | |
| Inline config panel | Expands config panel in the repo list | ✓ |
| You decide | Claude picks | |

**User's choice:** Inline config panel

---

## Audit Config Flow

### Audit Type Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Card selection | 4 cards with icons, name, description, estimated time | ✓ |
| Radio buttons | Simple radio list with type name and description | |
| You decide | Claude picks | |

**User's choice:** Card selection

### Depth Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle with details | Quick/Deep toggle showing estimated time and cost | ✓ |
| Comparison table | Side-by-side comparison of what's included | |
| You decide | Claude picks | |

**User's choice:** Toggle with details

### API Key Picker

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown grouped by provider | One dropdown: "Anthropic — Personal", "OpenAI — Work", etc. | ✓ |
| Provider first, then key | Pick provider card, then pick key | |
| You decide | Claude picks | |

**User's choice:** Dropdown grouped by provider

---

## Cost Estimate Gate

### Estimate Precision

| Option | Description | Selected |
|--------|-------------|----------|
| Rough range | "$3–$8 estimated" based on repo size heuristic | ✓ |
| Detailed breakdown | Per-phase token estimates with provider pricing | |
| You decide | Claude picks | |

**User's choice:** Rough range

### Expensive Audit Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Warning + confirm | Yellow warning banner, explicit "Start audit" click | ✓ |
| Suggest alternatives | Suggest quick scan to reduce cost, option to proceed | |
| You decide | Claude handles | |

**User's choice:** Warning + confirm

---

## Sandbox Behavior

### Clone Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Invisible | Cloning happens behind the scenes | |
| Brief status | "Cloning repository..." message, then transitions | ✓ |
| You decide | Claude picks | |

**User's choice:** Brief status

### Clone Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Clear error + retry | Error message explaining issue, with Retry button | ✓ |
| You decide | Claude handles | |

**User's choice:** Clear error + retry

---

## Claude's Discretion

- Card icons and descriptions for audit types
- Search debounce and empty states
- Inline config panel transitions
- Cost heuristic formula
- Sandbox container configuration
- Clone timeout/retry limits

## Deferred Ideas

None — discussion stayed within phase scope
