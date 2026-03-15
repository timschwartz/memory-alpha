# Quickstart: LCARS-Inspired UI with Dark Mode

**Feature Branch**: `005-lcars-ui-dark-mode` | **Date**: 2026-03-15

## Prerequisites

- Node.js 20+
- npm workspaces (the project monorepo is already set up)
- The Memory Alpha database populated via the import CLI

## Development Setup

```bash
# Switch to the feature branch
git checkout 005-lcars-ui-dark-mode

# Install dependencies (from repo root)
npm install

# Start the dev server (client + server)
npm run dev
```

The client runs on `http://localhost:5173` with HMR. The API server runs on `http://localhost:3000`.

## Key Files to Know

| File | Purpose |
|------|---------|
| `client/index.html` | FOUC prevention script (inline `<script>` in `<head>`) |
| `client/src/index.css` | Tailwind config: `@custom-variant dark`, `@theme` color tokens, `.wiki-content` dark variants |
| `client/src/hooks/useTheme.ts` | Theme context provider + hook (state, localStorage, DOM class toggling) |
| `client/src/components/ThemeToggle.tsx` | Segmented button bar for Light/Dark/Auto selection |
| `client/src/components/Header.tsx` | LCARS-inspired header with end caps, bars, hamburger menu |
| `client/src/App.tsx` | Layout shell with ThemeProvider wrapper, LCARS page framing |
| `client/src/pages/SettingsPage.tsx` | Appearance section with ThemeToggle |

## Testing

```bash
# Run all client tests
cd client && npm test

# Run specific test file
npx vitest run tests/unit/useTheme.test.ts
npx vitest run tests/components/ThemeToggle.test.tsx
```

## Manual Verification Checklist

1. **Theme toggle**: Settings → Appearance → click Light / Dark / Auto — theme changes instantly
2. **Persistence**: Select Dark → reload page → still dark
3. **Auto mode**: Select Auto → change OS dark mode setting → app follows
4. **FOUC**: Select Dark → hard refresh (Ctrl+Shift+R) → no flash of light mode
5. **LCARS visual**: Header shows rounded end-cap, horizontal bars, amber/violet/blue palette
6. **Mobile**: Resize to < 768px → hamburger menu appears → nav links in dropdown
7. **Wiki content**: Open an article with tables/infoboxes → readable in both light and dark
8. **Contrast**: Use browser DevTools accessibility panel to verify contrast ratios

## Architecture Overview

```
index.html
  └── <script> (FOUC prevention: reads localStorage, applies dark class)

main.tsx
  └── App.tsx
        └── ThemeProvider (useTheme hook)
              └── BrowserRouter
                    └── Layout (LCARS shell: header, side bar, content area)
                          ├── Header (end caps, nav, search, hamburger)
                          └── <Outlet> (page content)
                                └── SettingsPage
                                      └── ThemeToggle (segmented button bar)
```

**Data flow**: User clicks ThemeToggle → `setPreference()` → updates localStorage + toggles `dark` class on `<html>` → Tailwind `dark:` utilities activate/deactivate → UI updates instantaneously.
