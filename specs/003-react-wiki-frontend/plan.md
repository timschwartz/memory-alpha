# Implementation Plan: React + Vite Wiki Frontend

**Branch**: `003-react-wiki-frontend` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-react-wiki-frontend/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a React single-page application using Vite and Tailwind CSS that consumes the spec-002 Express REST API to provide a complete wiki reading experience. The frontend supports article viewing with wikitext-to-HTML rendering, full-text search with highlighted snippets, alphabetical article browsing with A–Z index and namespace filtering, category navigation, persistent header navigation, and automatic redirect handling. The app resides in a new `client/` workspace within the existing monorepo, imports shared types from `shared/`, and proxies `/api` requests to the Express backend during development.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) — Constitution Principle I  
**Primary Dependencies**: React 18+, Vite 6.x, React Router 7.x, Tailwind CSS 4.x  
**Storage**: N/A (frontend only — data via REST API from Express/SQLite backend)  
**Testing**: Vitest + @testing-library/react — Constitution Principle VI  
**Target Platform**: Modern browsers (local-only, latest Chrome/Firefox/Edge)  
**Project Type**: Single-page web application (SPA)  
**Performance Goals**: <2s page load for article/browse/search/categories (SC-001–SC-003)  
**Constraints**: Local-only deployment (Principle X), no external CDNs or cloud services, all data from local Express API  
**Scale/Scope**: ~5 routes, ~10–15 components, 1 wikitext renderer library, 1 API client module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applies | Pre-Design | Post-Design | Notes |
|---|-----------|---------|------------|-------------|-------|
| I | TypeScript Everywhere | ✅ | PASS | PASS | All client code in TypeScript strict mode. wtf_wikipedia ships TS types. |
| II | React + Vite Frontend | ✅ | PASS | PASS | React SPA with Vite. No additional bundlers or transpilers. |
| III | Tailwind CSS Styling | ✅ | PASS | PASS | `@tailwindcss/vite` plugin for Tailwind v4. No CSS-in-JS. |
| IV | Express.js Backend | ⬜ | N/A | N/A | Backend already exists (spec-002) |
| V | SQLite Storage | ⬜ | N/A | N/A | No direct DB access from frontend |
| VI | Vitest Testing | ✅ | PASS | PASS | Vitest + @testing-library/react for component tests |
| VII | Monorepo Structure | ✅ | PASS | PASS | New `client/` workspace; imports from `shared/` |
| VIII | MediaWiki XML Import | ⬜ | N/A | N/A | Import is spec-001 concern |
| IX | Wiki Content Features | ✅ | PASS | PASS | Browse, search, wikitext rendering (via wtf_wikipedia), categories, internal link resolution |
| X | Local-Only Deployment | ✅ | PASS | PASS | No external APIs. wtf_wikipedia in offline mode, DOMPurify browser-native. |

**Pre-design gate**: PASS — no violations.  
**Post-design gate**: PASS — no violations. New dependencies (wtf_wikipedia, dompurify) are browser-local with no network calls.

## Project Structure

### Documentation (this feature)

```text
specs/003-react-wiki-frontend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (none — frontend consumes spec-002 API contract)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
client/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx                  # App entry point
│   ├── App.tsx                   # Root component with Router
│   ├── api/
│   │   └── client.ts            # API client (fetch wrapper, base URL config)
│   ├── components/
│   │   ├── Header.tsx            # Persistent nav header with search
│   │   ├── Pagination.tsx        # Reusable pagination controls
│   │   ├── LoadingSpinner.tsx    # Centered spinner with text
│   │   ├── ErrorMessage.tsx      # User-friendly error display
│   │   └── WikiContent.tsx       # Renders parsed wikitext HTML
│   ├── lib/
│   │   └── wikitext-parser.ts   # Wikitext-to-HTML renderer
│   ├── pages/
│   │   ├── ArticlePage.tsx       # /wiki/:title — article display
│   │   ├── BrowsePage.tsx        # /browse — alphabetical listing
│   │   ├── SearchPage.tsx        # /search — search results
│   │   ├── CategoryListPage.tsx  # /categories — category listing
│   │   └── CategoryPage.tsx      # /categories/:name — category detail
│   └── hooks/
│       └── useApi.ts             # Shared fetch/loading/error hook
└── tests/
    ├── unit/
    │   ├── wikitext-parser.test.ts
    │   ├── api-client.test.ts
    │   └── sanitize.test.ts
    └── components/
        ├── Header.test.tsx
        ├── ArticlePage.test.tsx
        ├── BrowsePage.test.tsx
        ├── SearchPage.test.tsx
        └── Pagination.test.tsx
```

**Structure Decision**: Web application variant (Option 2) — the `client/` directory is a new workspace added alongside the existing `server/` and `shared/` workspaces. The frontend has no direct backend code; it communicates exclusively through the REST API. Shared types are imported from the `shared` workspace package.

## Complexity Tracking

No constitution violations — table not needed.
