# Implementation Plan: LCARS-Inspired UI with Dark Mode

**Branch**: `005-lcars-ui-dark-mode` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-lcars-ui-dark-mode/spec.md`

## Summary

Redesign the Memory Alpha frontend with an LCARS-inspired visual identity (rounded end-cap elements, horizontal/vertical bars, amber/orange/purple/blue palette, bold sans-serif typography, panel-based layouts) and implement a three-way dark mode system (Light / Dark / Auto) with localStorage persistence, FOUC prevention via inline `<head>` script, and responsive mobile navigation via hamburger menu. All existing wiki content styles get dark-mode variants. The theme state is managed via a React context that applies/removes a `dark` class on `<html>`.

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode)
**Primary Dependencies**: React 19, Vite 6, Tailwind CSS 4.1 (`@tailwindcss/vite`), React Router 7
**Storage**: localStorage (theme preference only — no server-side changes)
**Testing**: Vitest 3 + React Testing Library 16 + jsdom 26
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge — no IE)
**Project Type**: Web application (SPA frontend — this feature is client-only)
**Performance Goals**: Theme switch < 16ms (single frame), zero FOUC on load
**Constraints**: WCAG AA contrast (4.5:1 normal, 3:1 large text) in both modes; legally distinct from LCARS (no trademarked assets/fonts/layouts)
**Scale/Scope**: 6 page components, 5 shared components, 1 CSS file with ~30 wiki-content rules — all need dark-mode variants and LCARS restyling

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TypeScript Everywhere | PASS | All new code is TypeScript (theme context, hooks, components) |
| II. React + Vite Frontend | PASS | Using React functional components + hooks; Vite remains sole bundler |
| III. Tailwind CSS Styling | PASS | All styling via Tailwind utilities + `@layer` directives for `.wiki-content` dark variants; no CSS-in-JS |
| IV. Express.js Backend | N/A | This feature is client-only — no backend changes |
| V. SQLite Storage | N/A | No database changes |
| VI. Vitest Testing | PASS | Theme hook, FOUC script, and component tests via Vitest |
| VII. Monorepo Structure | PASS | All changes within `client/` directory; no new top-level dirs |
| VIII. MediaWiki XML Import | N/A | No importer changes |
| IX. Wiki Content Features | PASS | Wiki content rendering preserved; dark-mode variants added to existing `.wiki-content` styles |
| X. Local-Only Deployment | PASS | No external services; localStorage for theme persistence |

**Gate result: PASS** — No violations. All applicable principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/005-lcars-ui-dark-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal UI contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
client/
├── index.html                          # Add inline FOUC-prevention script
├── src/
│   ├── index.css                       # Add @custom-variant dark, LCARS color tokens, dark: wiki-content variants
│   ├── App.tsx                         # Wrap with ThemeProvider, update Layout shell to LCARS design
│   ├── main.tsx                        # (unchanged)
│   ├── hooks/
│   │   └── useTheme.ts                 # NEW: Theme context, provider, and hook
│   ├── components/
│   │   ├── Header.tsx                  # Restyle to LCARS-inspired header with end-caps, bars, hamburger menu
│   │   ├── ThemeToggle.tsx             # NEW: Segmented button bar (Light/Dark/Auto)
│   │   ├── ErrorMessage.tsx            # Add dark: variants
│   │   ├── LoadingSpinner.tsx          # Add dark: variants
│   │   ├── Pagination.tsx             # Add dark: variants, LCARS-styled
│   │   └── WikiContent.tsx            # (unchanged — styles come from index.css)
│   ├── pages/
│   │   ├── ArticlePage.tsx            # Add dark: variants, LCARS panel framing
│   │   ├── BrowsePage.tsx             # Add dark: variants, LCARS-styled index/list
│   │   ├── SearchPage.tsx             # Add dark: variants
│   │   ├── CategoryListPage.tsx       # Add dark: variants
│   │   ├── CategoryPage.tsx           # Add dark: variants
│   │   └── SettingsPage.tsx           # Add Appearance section with ThemeToggle
│   └── api/
│       └── client.ts                  # (unchanged)
└── tests/
    ├── components/
    │   └── ThemeToggle.test.tsx        # NEW: Tests for theme toggle
    └── unit/
        └── useTheme.test.ts           # NEW: Tests for theme hook/context
```

**Structure Decision**: Existing `client/` monorepo directory. This is a frontend-only feature — no new top-level directories. One new hook file (`useTheme.ts`), one new component (`ThemeToggle.tsx`), and two new test files. All other changes are modifications to existing files.

## Complexity Tracking

No constitution violations — table not needed.
