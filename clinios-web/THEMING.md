# ClinicOS Theme Engine

All color, radius, and elevation decisions live in **one file**:
[`src/styles/tokens.css`](src/styles/tokens.css). Components never hardcode
colors — they consume semantic Tailwind utilities mapped in
[`tailwind.config.ts`](tailwind.config.ts). Change the tokens, re-skin the app.

## Architecture

```
tokens.css                       tailwind.config.ts            components
─────────────────────            ──────────────────            ─────────────────
1. Raw palette (--shade-*)  ──▶  colors.shade.*           ──▶  (avoid direct use)
2. Semantic tokens          ──▶  bg-surface, text-primary,──▶  className="bg-surface
   (--surface, --primary…)       border-border, …               text-text-primary"
3. Theme blocks
   :root            = light
   [data-theme=dark]= dark
   @media fallback  = system
```

Values are `R G B` triplets so Tailwind opacity modifiers work everywhere:
`bg-primary/10`, `border-danger/30`, `bg-overlay/50`.

## Theme switching

`useThemeToggle()` ([src/hooks/use-theme.ts](src/hooks/use-theme.ts)) cycles
**system → light → dark**, persisted in the UI store. Explicit choices set
`data-theme="light|dark"` on `<html>`; *system* removes the attribute and the
`prefers-color-scheme` media block takes over. Tailwind `dark:` variants key
off `[data-theme="dark"]` (but prefer tokens over `dark:` — tokens handle the
system fallback automatically; `dark:` does not).

## Current theme: monochrome

The active look is line-based black & white — borders carry hierarchy, shadows
whisper, `--primary` is near-black in light / near-white in dark. **Exception:**
status colors (`success/warning/danger/info`) stay chromatic even here; a
clinic app must keep emergency and danger states unmistakable at a glance.
They're muted-deep in light, softened in dark, and remain fully swappable.

## Token inventory

| Group | Tokens |
|---|---|
| Canvas | `background`, `surface`, `surface-muted`, `surface-elevated`, `surface-hover` |
| Lines | `border`, `border-strong`, `border-subtle` |
| Ink | `text-primary`, `text-secondary`, `text-tertiary`, `text-disabled`, `text-inverse` |
| Brand | `primary` (+`-hover`, `-active`, `-foreground`, `-muted`), `secondary` (+`-hover`, `-foreground`), `accent` (+`-foreground`) |
| Status | `success`, `warning`, `danger`, `info` — each with `-muted` (subtle bg) and `-foreground` (text on solid) |
| Chrome | `focus-ring`, `overlay` |
| Charts | `chart-1` … `chart-6` (ordered for adjacent-series contrast) |
| Geometry | `--radius-sm/DEFAULT/lg/xl`, `--shadow-card`, `--shadow-popover` |

## How to rebrand later

1. Open `src/styles/tokens.css`.
2. Edit the **semantic blocks only** (light `:root`, dark `[data-theme='dark']`,
   and the `@media` system-fallback copy — keep all three in sync).
   E.g. bring back medical blue: `--primary: 15 92 140;`
   `--primary-hover: 12 74 114;` `--primary-foreground: 255 255 255;` …
3. Nothing else changes. No component edits, no Tailwind edits.

To add a *selectable* brand (not replace), scope overrides under a new
attribute block, e.g. `:root[data-brand='teal'] { --primary: …; }`, and set
`data-brand` alongside `data-theme`.

## Rules for new code

- **Never** use raw palette classes (`bg-gray-100`, `text-white`, hex values).
  Use semantic utilities; reach for `shade-*` only when nothing semantic fits.
- Text on solid status/brand fills uses the matching `-foreground` token
  (`bg-danger text-danger-foreground`), never `text-white`.
- Subtle status backgrounds: `bg-success-muted` (solid) or `bg-success/10`
  (translucent) — both theme-safe.
- Charts read `--chart-*` at render time; don't hardcode series colors.
