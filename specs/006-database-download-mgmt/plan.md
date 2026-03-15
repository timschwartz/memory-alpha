# Implementation Plan: Database Download Management

**Branch**: `006-database-download-mgmt` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-database-download-mgmt/spec.md`

## Summary

Add a "Database" section to the Settings page that allows users to download the Memory Alpha XML dump (7z compressed), decompress it, list XML files in the data directory (with size, date, import action), and display freshness notices for recently-downloaded files. Server pushes progress via SSE. The existing indexing progress is migrated from polling to SSE for consistency.

## Technical Context

**Language/Version**: TypeScript (strict mode) — Node.js 20+  
**Primary Dependencies**: Express.js 5, React 18+, Vite, Tailwind CSS, 7z-wasm (WASM-based 7z decompression)  
**Storage**: Filesystem (`data/` directory for XML files), SQLite (via better-sqlite3) for wiki data  
**Testing**: Vitest  
**Target Platform**: Linux (local machine)  
**Project Type**: Web application (monorepo: client + server + shared)  
**Performance Goals**: SSE progress updates at least every 5 seconds; file list loads within 2 seconds  
**Constraints**: Local-only deployment, no cloud services, single machine  
**Scale/Scope**: Single user, files up to ~1GB decompressed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|-----------|-------|
| I. TypeScript Everywhere | ✅ PASS | All new code in TypeScript strict mode |
| II. React + Vite Frontend | ✅ PASS | New Database section is a React functional component using hooks |
| III. Tailwind CSS Styling | ✅ PASS | All UI styling via Tailwind utility classes, matching existing LCARS theme |
| IV. Express.js Backend | ✅ PASS | New routes added to Express app; SSE is native HTTP (no extra framework) |
| V. SQLite Storage | ✅ PASS | No new database schema needed; file metadata read from filesystem, import triggers existing SQLite pipeline |
| VI. Vitest Testing | ✅ PASS | Unit tests for download service, SSE helpers; integration tests for new API endpoints |
| VII. Monorepo Structure | ✅ PASS | Changes span client/, server/, shared/ — existing monorepo structure preserved |
| VIII. MediaWiki XML Import | ✅ PASS | Import button reuses existing mw-import pipeline; no changes to importer itself |
| IX. Wiki Content Features | N/A | This feature is infrastructure, not content rendering |
| X. Local-Only Deployment | ✅ PASS | Download is server-side to local filesystem; no cloud services |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-database-download-mgmt/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (SSE event schemas, REST endpoints)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── indexing.ts          # MODIFY: migrate polling → SSE
│   │   │   └── database.ts          # NEW: download, cancel, file-list, import endpoints + SSE stream
│   │   └── app.ts                   # MODIFY: mount new database router
│   └── lib/
│       └── download-manager.ts      # NEW: download + decompress orchestrator with cancellation
└── tests/
    ├── integration/
    │   └── database-endpoints.test.ts  # NEW
    └── unit/
        └── download-manager.test.ts    # NEW

client/
├── src/
│   ├── api/
│   │   └── client.ts               # MODIFY: add SSE helper (EventSource wrapper)
│   ├── pages/
│   │   └── SettingsPage.tsx         # MODIFY: add Database section
│   └── hooks/
│       └── useSSE.ts                # NEW: reusable SSE hook for progress streaming
└── tests/
    ├── components/
    │   └── SettingsPage.test.tsx     # MODIFY: add Database section tests
    └── unit/
        └── useSSE.test.ts           # NEW

shared/
└── src/
    └── types/
        └── wiki.ts                  # MODIFY: add DownloadStatus, XmlFileInfo types
```

**Structure Decision**: Existing monorepo layout (client/, server/, shared/) preserved. New server-side logic goes into a single `download-manager.ts` library module and a `database.ts` route module, following the same pattern as the existing indexing feature. Client adds a reusable SSE hook that both the Database section and the migrated Indexing section will consume.

## Complexity Tracking

No constitution violations to justify.
