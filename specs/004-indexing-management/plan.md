# Implementation Plan: Indexing Management

**Branch**: `004-indexing-management` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-indexing-management/spec.md`

## Summary

Enhance the FTS5 indexer to support incremental batch indexing with progress tracking, interrupt/resume capability, and a `--rebuild` CLI flag. Add server endpoints (`POST /api/indexing/start`, `GET /api/indexing/status`) to trigger and monitor indexing. Add a Settings page to the React frontend with an Indexing section that displays live progress via polling and provides "Continue Indexing" and "Rebuild Index" controls. Add shared `IndexingStatus` type to the shared package.

## Technical Context

**Language/Version**: TypeScript (strict mode) on Node.js
**Primary Dependencies**: Express.js (server), React 18 + Vite (client), Commander (CLI), better-sqlite3 (database)
**Storage**: SQLite via better-sqlite3, FTS5 virtual table for search
**Testing**: Vitest
**Target Platform**: Local machine (Linux/macOS/Windows)
**Project Type**: Monorepo (server + client + shared) — web application with CLI tools
**Performance Goals**: Index 223,000+ pages; resume within seconds; status polling ≤2s latency
**Constraints**: Single-threaded Node.js (better-sqlite3 is synchronous); no external services
**Scale/Scope**: ~223,000 wiki pages; single concurrent user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TypeScript Everywhere | ✅ PASS | All new code in TypeScript strict mode |
| II. React + Vite Frontend | ✅ PASS | Settings page is a React functional component with hooks, built with Vite |
| III. Tailwind CSS Styling | ✅ PASS | Settings page will use Tailwind utility classes only |
| IV. Express.js Backend | ✅ PASS | New indexing routes follow REST conventions, return JSON |
| V. SQLite Storage | ✅ PASS | FTS5 index stored in SQLite; incremental tracking via existing tables |
| VI. Vitest Testing | ✅ PASS | Unit tests for indexer changes, integration tests for API endpoints, component tests for Settings page |
| VII. Monorepo Structure | ✅ PASS | Changes span server/, client/, shared/ — shared types in shared package |
| VIII. MediaWiki XML Import | N/A | Import pipeline not modified |
| IX. Wiki Content Features | N/A | No changes to wiki rendering |
| X. Local-Only Deployment | ✅ PASS | No external services; all local |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-indexing-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # Indexing API endpoint contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── api/
│   │   └── routes/
│   │       └── indexing.ts          # NEW — POST /start, GET /status
│   ├── cli/
│   │   └── index-search.ts         # MODIFY — add progress, resume, --rebuild
│   └── lib/
│       └── fts5-indexer.ts          # MODIFY — incremental build, batch commits, progress callbacks
└── tests/
    ├── unit/
    │   └── fts5-indexer.test.ts     # MODIFY — test incremental/resume/rebuild
    └── integration/
        └── indexing-route.test.ts   # NEW — test API endpoints

client/
├── src/
│   ├── api/
│   │   └── client.ts               # MODIFY — add apiPost helper
│   ├── pages/
│   │   └── SettingsPage.tsx         # NEW — Settings page with indexing controls
│   ├── components/
│   │   └── Header.tsx              # MODIFY — add Settings nav link
│   └── App.tsx                     # MODIFY — add /settings route
└── tests/
    └── components/
        └── SettingsPage.test.tsx    # NEW — component tests

shared/
└── src/
    └── types/
        └── wiki.ts                 # MODIFY — add IndexingStatus type
```

**Structure Decision**: Follows existing monorepo layout. New route file for indexing endpoints. New page component for Settings. Shared types extended for indexing status.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
