<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)

  Modified principles: N/A (initial creation)

  Added sections:
    - Core Principles (10 principles)
    - Technology Stack
    - Development Workflow
    - Governance

  Removed sections: N/A

  Templates requiring updates:
    - .specify/templates/plan-template.md        ✅ compatible (no changes needed)
    - .specify/templates/spec-template.md         ✅ compatible (no changes needed)
    - .specify/templates/tasks-template.md        ✅ compatible (no changes needed)

  Follow-up TODOs: None
-->

# Memory Alpha Wiki Viewer Constitution

## Core Principles

### I. TypeScript Everywhere

All application code — frontend, backend, CLI scripts, and shared
utilities — MUST be written in TypeScript with strict mode enabled.
JavaScript-only files are not permitted in source directories.
Rationale: A single language across the stack reduces context-switching,
enables shared type definitions, and catches errors at compile time.

### II. React + Vite Frontend

The frontend MUST be a React single-page application built with Vite.
Components MUST be functional components using hooks. Vite MUST be the
sole build and dev-server tool for the frontend — no additional bundlers
or transpilers are permitted.
Rationale: Vite provides fast HMR and modern defaults; React offers a
mature component model for rendering wiki content.

### III. Tailwind CSS Styling

All styling MUST use Tailwind CSS utility classes. Custom CSS files are
permitted only for Tailwind's `@layer` directives or third-party
overrides that cannot be expressed as utilities. No CSS-in-JS libraries.
Rationale: Utility-first CSS keeps styles co-located with markup,
eliminates naming collisions, and reduces bundle size via purging.

### IV. Express.js Backend

The API server MUST use Express.js. All endpoints MUST follow REST
conventions and return JSON. The server MUST serve the Vite-built
frontend in production mode. Middleware MUST be composable and
minimal — avoid opaque "framework magic."
Rationale: Express is the most widely adopted Node.js server framework
with extensive middleware ecosystem and documentation.

### V. SQLite Storage

All imported wiki data MUST be stored in a local SQLite database. The
application MUST use a migration system for schema changes. Full-text
search MUST leverage SQLite FTS5 extensions. No external database
servers are permitted.
Rationale: SQLite is zero-configuration, file-based, and sufficient for
a local-only application; FTS5 provides performant search without
additional infrastructure.

### VI. Vitest Testing

Tests MUST use Vitest as the test runner. Each module with non-trivial
logic MUST have corresponding unit tests. Integration tests MUST cover
API endpoints and the XML import pipeline. Test files MUST be co-located
with source or in a parallel `tests/` directory matching the source
structure.
Rationale: Vitest shares Vite's config and transform pipeline,
providing fast execution and consistent TypeScript handling.

### VII. Monorepo Structure

The project MUST be organized as a monorepo with at minimum `client/`
and `server/` directories at the repository root. Shared types and
utilities MUST reside in a `shared/` directory (or equivalent) imported
by both client and server. The `data/` directory holds the source XML
export and MUST NOT be committed to version control (except a
`.gitkeep` or README).
Rationale: Clear separation of concerns while enabling code sharing
(e.g., type definitions) across client and server.

### VIII. MediaWiki XML Import

A CLI script MUST parse the MediaWiki XML export file
(`data/enmemoryalpha_pages_full.xml`) and load articles, categories,
and metadata into SQLite. The importer MUST be idempotent — repeated
runs MUST NOT create duplicate records. The importer MUST stream-parse
the XML to handle large files without excessive memory consumption.
Rationale: The XML export is the sole data source; idempotent import
enables safe re-runs after schema or parser changes.

### IX. Wiki Content Features

The application MUST support: browsing articles by title, full-text
search across article content, rendering MediaWiki markup as HTML, and
category-based navigation. Internal wiki links MUST resolve to local
article routes. MediaWiki templates and transclusions SHOULD be
supported on a best-effort basis.
Rationale: These features constitute the minimum viable wiki reading
experience.

### X. Local-Only Deployment

The application MUST run entirely on a single local machine with no
cloud services, external APIs, or remote database dependencies. All
data MUST remain on disk. The application MUST start with a single
command (e.g., `npm start` or equivalent).
Rationale: This is a personal reference tool; simplicity and
offline capability are paramount.

## Technology Stack

| Layer        | Technology                 |
|--------------|----------------------------|
| Language     | TypeScript (strict mode)   |
| Frontend     | React 18+ with Vite        |
| Styling      | Tailwind CSS               |
| Backend      | Express.js                 |
| Database     | SQLite (via better-sqlite3) |
| Search       | SQLite FTS5               |
| Testing      | Vitest                     |
| Package Mgmt | npm workspaces             |

## Development Workflow

1. **Branch strategy**: Feature branches off `main`; merge via PR.
2. **Linting**: ESLint with TypeScript rules MUST pass before commit.
3. **Formatting**: Prettier MUST be configured; all code MUST be
   formatted consistently.
4. **Pre-commit**: Lint and type-check MUST run before each commit
   (e.g., via lint-staged + husky or equivalent).
5. **Test gate**: All tests MUST pass before merging to `main`.
6. **Import workflow**: Run the import CLI to populate the database
   before starting the application for the first time.

## Governance

This constitution is the authoritative source of project standards.
All code contributions MUST comply with the principles above.

- **Amendments**: Any change to this constitution MUST be documented
  with a version bump, rationale, and migration plan if principles
  are removed or redefined.
- **Versioning**: Semantic versioning — MAJOR for principle removals
  or incompatible redefinitions, MINOR for new principles or material
  expansions, PATCH for clarifications and typo fixes.
- **Compliance review**: Every PR MUST be checked against the
  constitution principles before merge.

**Version**: 1.0.0 | **Ratified**: 2026-03-14 | **Last Amended**: 2026-03-14
