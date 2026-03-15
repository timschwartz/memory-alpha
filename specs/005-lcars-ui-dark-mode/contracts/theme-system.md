# UI Contract: Theme System

**Feature**: 005-lcars-ui-dark-mode | **Date**: 2026-03-15

## Theme Context API

The theme system is exposed to React components via a context provider and hook.

### `ThemeProvider` Component

Wraps the application root. Manages theme state, localStorage persistence, and DOM class toggling.

```typescript
interface ThemeContextValue {
  /** The user's stored preference: "light", "dark", or "auto" */
  preference: "light" | "dark" | "auto";
  
  /** The resolved active mode (what's actually displayed) */
  effectiveMode: "light" | "dark";
  
  /** Update the theme preference. Immediately updates DOM and persists to localStorage. */
  setPreference: (pref: "light" | "dark" | "auto") => void;
}
```

**Provider placement**: Wraps `<BrowserRouter>` in `App.tsx` (or in `main.tsx`).

**Behavior**:
- On mount: reads `localStorage.getItem("theme")`, maps to preference
- On preference change: updates `localStorage`, toggles `document.documentElement.classList` ("dark")
- When preference is "auto": listens to `matchMedia("(prefers-color-scheme: dark)")` change events
- When preference is "light" or "dark": removes the matchMedia listener

### `useTheme()` Hook

```typescript
function useTheme(): ThemeContextValue;
```

Returns the current theme context. Must be called within a `ThemeProvider`.

### localStorage Contract

| Key | Valid Values | Default (absent) |
|-----|-------------|-------------------|
| `"theme"` | `"light"`, `"dark"` | Treated as "auto" |

- **Write**: `localStorage.setItem("theme", "light" | "dark")` or `localStorage.removeItem("theme")` for auto
- **Read**: `localStorage.getItem("theme")` — returns `"light"`, `"dark"`, or `null`
- **Invalid values**: Any value other than `"light"` or `"dark"` is treated as auto

### FOUC Prevention Script Contract

The inline `<script>` in `index.html` `<head>` and the React `ThemeProvider` MUST agree on:

| Shared Contract | Value |
|----------------|-------|
| localStorage key | `"theme"` |
| Valid stored values | `"light"`, `"dark"` |
| Auto behavior | absent key → check `matchMedia` |
| DOM target | `document.documentElement.classList` |
| Class name | `"dark"` |

Both the inline script and the React code apply the same logic independently (the inline script for initial load, React for runtime changes).

## ThemeToggle Component API

### Props

```typescript
interface ThemeToggleProps {
  // No props — reads from ThemeContext via useTheme() hook
}
```

### Rendered Output

A segmented button bar with three buttons:

```
┌─────────┬─────────┬─────────┐
│  Light  │  Dark   │  Auto   │
└─────────┴─────────┴─────────┘
```

**Behavior**:
- Active button is visually highlighted (LCARS accent color background)
- Inactive buttons have a muted/outline style
- Clicking a button calls `setPreference(...)` from the theme context
- Theme change takes effect instantaneously (no transition animation)
- The component uses the LCARS color palette for styling

### Placement

Rendered within the Settings page, inside an "Appearance" section, above the existing "Indexing" section.

## CSS Custom Variant Contract

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This enables the `dark:` prefix for all Tailwind utilities. The `dark` class on `<html>` activates dark-mode styles globally.

## Color Token Naming Contract

All custom LCARS colors are defined in `@theme` and follow this naming pattern:

| Pattern | Example | Usage |
|---------|---------|-------|
| `lcars-{name}` | `lcars-amber` | Light-mode color |
| `lcars-{name}-d` | `lcars-amber-d` | Dark-mode variant |
| `lcars-bg` / `lcars-bg-d` | — | Page background |
| `lcars-surface` / `lcars-surface-d` | — | Panel/card background |
| `lcars-black` / `lcars-text-d` | — | Primary text |

Usage in components:
```jsx
<div className="bg-lcars-bg dark:bg-lcars-bg-d text-lcars-black dark:text-lcars-text-d">
```
