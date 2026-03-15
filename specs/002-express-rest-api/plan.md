# Implementation Plan: Express.js REST API

**Branch**: `002-express-rest-api` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-express-rest-api/spec.md`

## Summary

Build an Express.js REST API server that exposes the imported MediaWiki data (pages, revisions, categories, namespaces) from the SQLite database as JSON endpoints. The API supports single-article retrieval (by title or ID), paginated article browsing with prefix/namespace filtering, full-text search via SQLite FTS5 with ranked results and snippets, and category navigation. The server serves Vite-built frontend static assets in production mode and provides structured request logging, health checks, and configurable CORS for development.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Node.js 20 LTS
**Primary Dependencies**: express (HTTP server), better-sqlite3 (SQLite driver, existing), cors (CORS middleware), commander (CLI for FTS5 indexer)
**Storage**: SQLite via better-sqlite3 with WAL mode and FTS5 extensions (existing database from spec-001)
**Testing**: Vitest
**Target Platform**: Linux/macOS/Windows local machine (Node.js 20+)
**Project Type**: Web service (REST API) + CLI (FTS5 index builder)
**Performance Goals**: <1s article retrieval, <2s search, <5s server startup; 50 concurrent reads without degradation
**Constraints**: Local-only (no external services), read-only API (data populated by spec-001 importer), SQLite single-writer
**Scale/Scope**: 223,000+ pages, millions of revisions, FTS5 index over latest revision text content

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TypeScript Everywhere | ✅ PASS | All API code in TypeScript strict mode |
| II. React + Vite Frontend | ⬜ N/A | Frontend is a separate spec (003); this spec serves static assets only |
| III. Tailwind CSS Styling | ⬜ N/A | No frontend styling in this feature |
| IV. Express.js Backend | ✅ PASS | Express.js is the HTTP framework; REST endpoints return JSON; serves Vite frontend in production |
| V. SQLite Storage | ✅ PASS | Reads from existing SQLite database; FTS5 for search |
| VI. Vitest Testing | ✅ PASS | Unit + integration tests via Vitest |
| VII. Monorepo Structure | ✅ PASS | Code in server/ workspace; shared types in shared/; extends spec-001 codebase |
| VIII. MediaWiki XML Import | ⬜ N/A | Import handled by spec-001; this spec reads the imported data |
| IX. Wiki Content Features | ✅ PASS | Browsing by title, full-text search, category navigation all covered; wikitext returned as-is (rendering deferred to frontend spec) |
| X. Local-Only Deployment | ✅ PASS | No cloud services; single `npm run serve` command; all data local |

**Gate result**: ✅ PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-express-rest-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # REST API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── api/
│   │   ├── app.ts             # Express app factory (middleware, routes, error handler)
│   │   ├── server.ts          # Server entry point (listen, config, startup)
│   │   ├── middleware/
│   │   │   ├── error-handler.ts   # Centralized error → envelope response
│   │   │   ├── request-logger.ts  # Structured stdout logging
│   │   │   └── validate.ts        # Query param validation helpers
│   │   └── routes/
│   │       ├── pages.ts       # GET /api/pages, /api/pages/:title, /api/pages/by-id/:pageId
│   │       ├── search.ts      # GET /api/search, POST /api/search/rebuild
│   │       ├── categories.ts  # GET /api/categories, /api/categories/:name/pages
│   │       └── health.ts      # GET /api/health
│   ├── cli/
│   │   ├── import.ts          # (existing) XML import CLI
│   │   └── index-search.ts    # FTS5 index builder CLI
│   ├── lib/
│   │   ├── importer.ts        # (existing)
│   │   ├── xml-parser.ts      # (existing)
│   │   ├── category-extractor.ts  # (existing)
│   │   └── fts5-indexer.ts    # FTS5 index build/rebuild logic
│   └── models/
│       ├── database.ts        # (existing) DB init + migrations
│       ├── page.ts            # (existing, extended with read queries)
│       ├── revision.ts        # (existing, extended with read queries)
│       ├── namespace.ts       # (existing, extended with read queries)
│       └── category.ts        # (existing, extended with read queries)
├── tests/
│   ├── unit/
│   │   ├── xml-parser.test.ts         # (existing)
│   │   ├── category-extractor.test.ts # (existing)
│   │   ├── importer.test.ts           # (existing)
│   │   ├── fts5-indexer.test.ts       # New
│   │   ├── pages-route.test.ts        # New
│   │   ├── search-route.test.ts       # New
│   │   ├── categories-route.test.ts   # New
│   │   └── validate.test.ts           # New
│   ├── integration/
│   │   ├── import-pipeline.test.ts    # (existing)
│   │   └── api-endpoints.test.ts      # New: full API integration test
│   └── fixtures/
│       └── sample-export.xml          # (existing)
├── package.json
├── tsconfig.json
└── vitest.config.ts

shared/
├── src/
│   ├── index.ts
│   └── types/
│       └── wiki.ts            # (existing, extended with API response types)
├── package.json
└── tsconfig.json
```

**Structure Decision**: Extends the existing `server/` monorepo workspace from spec-001. New API code is organized under `server/src/api/` with routes, middleware, and the app factory separated from the existing `lib/` and `models/` directories. The existing models are extended with read query methods (they currently only have upsert). Shared API response types are added to `shared/src/types/wiki.ts` for future frontend consumption.

## Complexity Tracking

No Constitution Check violations — this section is intentionally empty.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts were generated.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. TypeScript Everywhere | ✅ PASS | All source in `server/src/**/*.ts`, shared types in `shared/src/**/*.ts`; strict mode in both tsconfigs |
| II. React + Vite Frontend | ⬜ N/A | Frontend is a separate feature (spec-003); this feature only serves static assets |
| III. Tailwind CSS Styling | ⬜ N/A | No frontend styling in this feature |
| IV. Express.js Backend | ✅ PASS | Express.js serves REST JSON endpoints; serves Vite frontend in production; middleware is composable (routes, CORS, error handler, logger) |
| V. SQLite Storage | ✅ PASS | Reads from existing better-sqlite3 database; FTS5 for full-text search; WAL mode; new migration (v2) adds search_index and composite index |
| VI. Vitest Testing | ✅ PASS | Unit tests for routes, validation, FTS5 indexer; integration tests for full API (supertest against createApp) |
| VII. Monorepo Structure | ✅ PASS | Extends `server/` workspace; shared API types in `shared/src/types/wiki.ts`; no new workspaces added |
| VIII. MediaWiki XML Import | ⬜ N/A | Import handled by spec-001; this feature reads the imported data |
| IX. Wiki Content Features | ✅ PASS | Browsing by title (FR-002/004), full-text search (FR-005), category navigation (FR-007/008) all covered in contracts; wikitext returned as-is (rendering deferred to frontend) |
| X. Local-Only Deployment | ✅ PASS | No cloud services; single `npm run serve` command; all data local; env vars for configuration |

**Post-design gate result**: ✅ PASS — no violations.
