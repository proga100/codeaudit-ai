# CodeAudit AI — Implementation Guide for Claude Code

## Overview

This document describes the complete UI design for **CodeAudit AI**, a local-first codebase audit tool built with Next.js. Use the companion file `codeaudit-ai.jsx` as the **visual reference prototype** — it contains all screens, components, themes, and interactions as a single React component.

---

## Quick Start

```bash
# In Claude Code, run:
npx create-next-app@latest codeaudit-ai --typescript --tailwind --app --src-dir
cd codeaudit-ai
npx shadcn@latest init
```

Then tell Claude Code:

> "Implement the CodeAudit AI app using the design in `codeaudit-ai.jsx` as the visual reference. Follow the implementation guide in `IMPLEMENTATION_GUIDE.md`."

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (Radix UI primitives) |
| Charts | Recharts |
| Fonts | Geist (sans), JetBrains Mono (mono) |
| Theme | Dark (default) + Light, toggle in sidebar |

---

## Design Tokens

### Colors — Dark Theme (default)

```
Background:        #0a0a0b
Surface:           #111113
Elevated:          #18181b
Hover:             #1f1f23
Border:            #27272a
Border Subtle:     #1e1e22
Text:              #fafafa
Text Secondary:    #a1a1aa
Text Muted:        #71717a
Accent:            #facc15  (bright yellow)
Accent Hover:      #fde047
Accent Subtle:     rgba(250,204,21,0.12)
Success:           #22c55e
Destructive:       #ef4444
Warning:           #f97316
```

### Colors — Light Theme

```
Background:        #fafafa
Surface:           #ffffff
Elevated:          #f4f4f5
Hover:             #e4e4e7
Border:            #e4e4e7
Border Subtle:     #f0f0f2
Text:              #09090b
Text Secondary:    #52525b
Text Muted:        #a1a1aa
Accent:            #ca8a04  (darker yellow for legibility)
Accent Hover:      #a16207
Accent Subtle:     rgba(202,138,4,0.1)
Success:           #16a34a
Destructive:       #dc2626
Warning:           #ea580c
```

### Severity Colors (sacred — never change)

```
Critical:  #ef4444
High:      #f97316
Medium:    #eab308
Low:       #3b82f6
Info:      #71717a
```

### Typography

- **Sans:** Geist, SF Pro Display, system sans-serif
- **Mono:** JetBrains Mono, Fira Code, SF Mono — used for file paths, line numbers, code snippets, costs, token counts

### Spacing & Radius

- Card border-radius: 14px
- Button border-radius: 10px
- Badge border-radius: 6px
- Standard padding: 20px (cards), 14-18px (rows)

---

## App Structure

```
src/app/
├── layout.tsx                  # Root layout with sidebar
├── setup/page.tsx              # Setup wizard (first run only)
├── dashboard/page.tsx          # Dashboard (default landing)
├── audit/
│   ├── new/page.tsx            # New audit configuration
│   └── [id]/
│       ├── page.tsx            # Audit progress (live)
│       ├── results/page.tsx    # Results dashboard
│       ├── executive/page.tsx  # Executive report (iframe)
│       └── technical/page.tsx  # Technical report (iframe)
├── history/page.tsx            # All past audits
├── audit/compare/page.tsx      # Side-by-side comparison
└── settings/
    └── api-keys/page.tsx       # API key management
```

---

## Screens & Components

### 1. Setup Wizard (`/setup`)

**When:** First run only (no API key stored).

**Step 1 — Welcome:**
- Centered layout, full viewport height
- Logo: 72×72px rounded-20 gradient (accent → #f59e0b), shield icon in dark color
- "Welcome to CodeAudit AI" heading (30px, weight 700)
- Subtitle in textSecondary
- 2×2 grid of feature cards with icon + title + description
- "Get Started" button (full width, primary)
- **Floating theme toggle** in top-right corner (sun/moon segmented button)

**Step 2 — API Key:**
- Back button top-left
- Provider selector: 3 cards (Anthropic, OpenAI, Google Gemini) — selected has solid accent border + accent background
- API key input (password type, monospace, provider-specific placeholder)
- Optional label input
- "Add Key & Continue" button — validates before saving
- Same floating theme toggle

### 2. Sidebar (persistent, all pages except setup)

- Width: 252px, sticky, full viewport height
- Logo: 32×32px gradient square + "CodeAudit" text + "AI" subtext
- Nav items: Dashboard, New Audit, History, API Keys — each with icon
- Active item: accent background subtle + accent text color + font-weight 600
- Bottom: theme toggle (segmented sun/moon buttons) separated by border-top
- Theme toggle uses neutral colors (text/bg), NOT accent color

### 3. Dashboard (`/dashboard`)

- 3 quick-action cards in a row (New Audit, View History, Manage Keys) — hover lifts card with accent shadow
- Recent audits table with columns: folder (mono), date, type badge, depth badge, health score ring, edit button (pencil icon)
- Edit button: pencil icon, stops propagation, navigates to new audit page
- "View all →" link to history

### 4. New Audit (`/audit/new`)

**All on one page, no multi-step wizard.**

Sections (top to bottom):
1. **Folder Selection** — mono input, validation icons (green check / red X), git warning (yellow), recent folder chips
2. **Audit Type** — 2×2 grid of SelectCards: Full Audit (shield), Security Only (lock), Team & Collab (users), Code Quality (code). Selected = solid accent border + accent subtle bg + box-shadow
3. **Audit Depth** — 2 side-by-side SelectCards: Quick Scan (zap), Deep Audit (shield)
4. **Provider & Key** — dropdown grouped by provider
5. **Model** — dropdown (Auto recommended + specific models)
6. **Cost Estimate** — live-updating card with cost range + file/token stats
7. **Start Audit** — large primary button, opens confirmation modal

**Confirmation Modal:**
- Backdrop blur overlay
- Summary grid (folder, type, depth, model, est. cost)
- Warning note about folder locking
- "Go Back" + "Start Audit" buttons

### 5. Audit Progress (`/audit/[id]`)

- Folder name + badges as subtitle
- Animated progress bar (accent gradient, pulse glow animation)
- Live stats: token count, running cost, elapsed time
- "Cancel audit" destructive button
- "Show details" toggle → expands phase list
- Phase list: 13 rows with status icon (✓ green / spinner blue / ○ gray / ✗ red), phase name, findings count, duration, token cost
- On completion: green progress bar, "View Results" button

### 6. Results Dashboard (`/audit/[id]/results`)

- Header: folder name, badges, completion stats
- **Health Score card:** large ring (110px), score number, letter grade, colored by health
- **Severity Breakdown card:** bar chart (5 bars, severity colors)
- Cost summary banner with per-phase expandable breakdown
- Action buttons: Executive Report, Technical Report, Download All
- **Findings list:**
  - Filter bar: severity pills (All, Critical, High, Medium, Low, Info) with counts
  - Finding cards: colored left border by severity, severity badge, title (bold), file path (mono, accent color), evidence snippet, expandable remediation section

### 7. History (`/history`)

- Audits grouped by folder path
- **Selection system:**
  - Checkbox on each row (yellow accent when checked, row highlights)
  - "Select all" button in page header
  - Bulk action bar appears when any selected: count + "Deselect" + "Delete selected" (destructive)
- Per-row: checkbox, date, type+depth badges, status, health score ring, trash icon button
- Trash icon: hover shows destructive subtle background
- Delete confirmation modal with warning icon, message, "cannot be undone" warning
- "Compare" button on folder groups with 2+ audits

### 8. Comparison (`/audit/compare`)

- Delta banner: "+N points" (green/up) or "-N points" (red/down)
- Side-by-side cards: previous vs latest, each with health score ring + severity bars
- Three finding sections:
  - Resolved (green, line-through text)
  - New (red)
  - Persisted (gray)

### 9. API Keys Settings (`/settings/api-keys`)

- Key list: provider initial icon, provider name, label, masked key (mono), created date
- Edit + Delete buttons per row
- "Add New Key" button → inline form (same as setup step 2)

---

## Shared Components Reference

| Component | Key Props | Notes |
|-----------|-----------|-------|
| `Badge` | color, children | Pill shape, 11px text, colored border+bg |
| `Button` | variant (primary/outline/destructive/ghost), size (sm/md/lg), icon | Primary uses dark text (#0a0a0b) on yellow bg |
| `Card` | hover, onClick | 14px radius, surface bg, hover lifts with accent shadow |
| `SelectCard` | selected, onClick | 2px border, selected = accent border + subtle bg + box-shadow |
| `Input` | mono (boolean) | 10px radius, elevated bg, accent border on focus |
| `HealthScore` | score, size (sm/lg) | SVG ring, color by score threshold (>70 green, >40 yellow, else red) |
| `SeverityBar` | data object | 5 colored bars, proportional height |
| `Modal` | open, onClose | Fixed overlay, backdrop blur, 18px radius, fade-in animation |

---

## Design Principles

1. **Selected states must be obvious** — solid fills, prominent 2px borders, box-shadows. Never just a subtle ring.
2. **Primary buttons use dark text** — because accent is bright yellow, button text must be #0a0a0b for contrast.
3. **Monospace for code** — file paths, line numbers, costs, tokens, API keys always in JetBrains Mono.
4. **Information density** — developers like data. Results show findings immediately, no tabs.
5. **Professional aesthetic** — Linear/Vercel/GitHub dark mode style. Not playful.
6. **Both themes must be polished** — dark is default. Light theme uses darker yellow (#ca8a04) for legibility.
7. **Severity colors are sacred** — Critical=#ef4444, High=#f97316, Medium=#eab308, Low=#3b82f6, Info=#71717a.

---

## Animations

- `fadeIn`: opacity 0→1 + translateY 8→0, 350ms ease-out
- `slideIn`: opacity 0→1 + translateX -12→0
- `progressPulse`: box-shadow glow with yellow rgba(250,204,21)
- `spin`: rotate 360deg (for loading spinners)
- Staggered entry: `.stagger-1` through `.stagger-5` with 50ms incremental delays
- Hover states: translateY(-1px) on buttons, translateY(-2px) on hoverable cards

---

## Notes for Implementation

- The `.jsx` prototype uses inline styles for portability. In the real app, convert these to Tailwind classes and shadcn/ui components.
- The prototype simulates navigation with state (`page`). In Next.js, use App Router with `<Link>` and route params.
- The audit progress simulation uses setInterval — replace with real WebSocket/SSE connection to backend.
- API key validation shows a fake delay — replace with actual provider API test calls.
- All data is hardcoded in the prototype — wire up to your actual backend/storage.
