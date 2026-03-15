# Data Model: LCARS-Inspired UI with Dark Mode

**Feature Branch**: `005-lcars-ui-dark-mode` | **Date**: 2026-03-15

## Entities

### Theme Preference (Client-Side)

The user's stored appearance choice. Persisted in browser localStorage.

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| key | string (constant) | `"theme"` | localStorage key |
| value | string \| null | `"light"`, `"dark"`, `null` | `null` (key absent) = auto |

**Storage**: `localStorage.setItem("theme", value)` / `localStorage.removeItem("theme")` for auto.

**Validation Rules**:
- Only the values `"light"` and `"dark"` are valid stored values.
- Any unrecognized stored value MUST be treated as auto (same as absent/null).
- On read, invalid values are ignored — the system behaves as if the key is absent.

### Color Scheme (Runtime Computed)

The resolved active color mode. Not persisted — derived at runtime.

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| effectiveMode | enum | `"light"` \| `"dark"` | The mode currently applied to the DOM |
| source | enum | `"explicit"` \| `"system"` | Whether from user choice or OS preference |

**State Transitions**:

```
┌─────────────┐  user selects "dark"  ┌──────────────┐
│ Auto mode   │ ───────────────────► │ Dark mode     │
│ (follows OS)│ ◄─────────────────── │ (explicit)    │
└──────┬──────┘  user selects "auto" └──────────────┘
       │                                     ▲
       │  user selects "light"               │ user selects "dark"
       ▼                                     │
┌──────────────┐  user selects "auto"        │
│ Light mode   │ ────────────────────────────┘
│ (explicit)   │ ◄─── user selects "light"
└──────────────┘
```

When in Auto mode, the effective mode changes whenever the OS preference changes (via `matchMedia` listener).

### LCARS Color Palette (CSS Theme Tokens)

Defined in `@theme` block in `index.css`. Two sets: light and dark.

| Token | Light oklch | Dark oklch | Usage |
|-------|-------------|------------|-------|
| `lcars-amber` | `0.75 0.155 75` | — | Primary bars, buttons |
| `lcars-sunset` | `0.68 0.185 50` | — | Secondary accent |
| `lcars-peach` | `0.82 0.09 60` | — | Tertiary bars |
| `lcars-mars` | `0.62 0.22 35` | — | Alerts, important |
| `lcars-violet` | `0.52 0.2 300` | — | Nav bars, headers |
| `lcars-lilac` | `0.72 0.14 300` | — | Secondary purple |
| `lcars-blue` | `0.58 0.16 260` | — | Links, interactive |
| `lcars-ice` | `0.80 0.08 240` | — | Info panels |
| `lcars-gray` | `0.45 0.03 265` | — | Secondary text |
| `lcars-black` | `0.18 0.02 265` | — | Primary text |
| `lcars-bg` | `0.98 0.005 265` | — | Page background |
| `lcars-surface` | `0.95 0.008 265` | — | Panel background |
| `lcars-amber-d` | — | `0.78 0.155 75` | Primary bars (dark) |
| `lcars-sunset-d` | — | `0.72 0.175 50` | Secondary accent (dark) |
| `lcars-peach-d` | — | `0.78 0.08 60` | Tertiary bars (dark) |
| `lcars-mars-d` | — | `0.66 0.20 35` | Alerts (dark) |
| `lcars-violet-d` | — | `0.68 0.18 300` | Nav bars (dark) |
| `lcars-lilac-d` | — | `0.76 0.13 300` | Secondary purple (dark) |
| `lcars-blue-d` | — | `0.70 0.14 260` | Links (dark) |
| `lcars-ice-d` | — | `0.75 0.07 240` | Info panels (dark) |
| `lcars-gray-d` | — | `0.65 0.025 265` | Secondary text (dark) |
| `lcars-text-d` | — | `0.93 0.01 265` | Primary text (dark) |
| `lcars-bg-d` | — | `0.13 0.02 265` | Page background (dark) |
| `lcars-surface-d` | — | `0.18 0.025 265` | Panel background (dark) |

**Relationships**:
- Theme Preference → determines → Color Scheme (via FOUC script + React context)
- Color Scheme → selects → which palette set is active (light tokens or dark `*-d` tokens via `dark:` prefix)
- Color Palette tokens → consumed by → all UI components via Tailwind utility classes

## No Server-Side Entities

This feature does not modify the Express API, SQLite database, or shared types. All data is client-side only (localStorage + runtime state).
