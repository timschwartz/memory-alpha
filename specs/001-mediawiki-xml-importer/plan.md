# Implementation Plan: MediaWiki XML Importer

**Branch**: `001-mediawiki-xml-importer` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-mediawiki-xml-importer/spec.md`

## Summary

Build a reusable TypeScript class (`MediaWikiImporter`) and CLI script that stream-parses a 35 GB MediaWiki XML export file, extracts all pages with their full revision history, namespace metadata, and category relationships, and upserts them into a local SQLite database. The importer must be idempotent, memory-efficient (<512 MB), and produce a log file alongside stderr output.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Node.js 20 LTS
**Primary Dependencies**: saxes (streaming XML parser), better-sqlite3 (synchronous SQLite driver), commander (CLI argument parsing)
**Storage**: SQLite via better-sqlite3, with FTS5 for future full-text search
**Testing**: Vitest
**Target Platform**: Linux/macOS/Windows local machine (Node.js 20+)
**Project Type**: Library + CLI (server/src/lib/ + server/src/cli/)
**Performance Goals**: Process 35 GB / 223K+ pages without exceeding 512 MB RSS; batch commits every 1000 pages
**Constraints**: Stream-only XML parsing (no DOM), local-only (no network), idempotent upserts
**Scale/Scope**: 223,151 pages, millions of revisions, ~35 GB XML input

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TypeScript Everywhere | ✅ PASS | All code in TypeScript strict mode |
| II. React + Vite Frontend | ⬜ N/A | This feature is backend/CLI only |
| III. Tailwind CSS Styling | ⬜ N/A | No frontend component in this feature |
| IV. Express.js Backend | ⬜ N/A | CLI-only for now; class is reusable for future Express integration |
| V. SQLite Storage | ✅ PASS | SQLite via better-sqlite3; schema auto-init |
| VI. Vitest Testing | ✅ PASS | Unit + integration tests via Vitest |
| VII. Monorepo Structure | ✅ PASS | Code in server/ directory; shared types in shared/ |
| VIII. MediaWiki XML Import | ✅ PASS | Stream-parsed, idempotent, categories extracted |
| IX. Wiki Content Features | ⬜ N/A | Deferred to future features (web viewer) |
| X. Local-Only Deployment | ✅ PASS | No cloud, no external APIs, all local |

**Gate result**: ✅ PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-mediawiki-xml-importer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── cli/
│   │   └── import.ts          # CLI entry point
│   ├── lib/
│   │   ├── importer.ts        # MediaWikiImporter class
│   │   ├── xml-parser.ts      # SAX stream parser wrapper
│   │   └── category-extractor.ts  # [[Category:...]] regex extractor
│   ├── models/
│   │   ├── database.ts        # Database initialization & migration
│   │   ├── page.ts            # Page model / queries
│   │   ├── revision.ts        # Revision model / queries
│   │   ├── namespace.ts       # Namespace model / queries
│   │   └── category.ts        # Category & PageCategory models / queries
│   └── types/
│       └── index.ts           # Re-exports from shared/src/types/wiki.ts for local convenience
├── tests/
│   ├── unit/
│   │   ├── xml-parser.test.ts
│   │   ├── category-extractor.test.ts
│   │   └── importer.test.ts
│   ├── integration/
│   │   └── import-pipeline.test.ts
│   └── fixtures/
│       └── sample-export.xml  # Small test XML fixture
├── package.json
├── tsconfig.json
└── vitest.config.ts

shared/
├── src/
│   └── types/
│       └── wiki.ts            # Shared type definitions (PageData, RevisionData, etc.)
├── package.json
└── tsconfig.json

data/
└── enmemoryalpha_pages_full.xml   # Source XML (not committed)
```

**Structure Decision**: Monorepo with `server/` and `shared/` per Constitution Principle VII. The importer lives in `server/src/lib/` as a reusable class, with the CLI entry point in `server/src/cli/`. Shared type definitions in `shared/` enable future frontend consumption. No `client/` directory created yet (deferred to web viewer feature).

## Complexity Tracking

No Constitution Check violations — this section is intentionally empty.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts were generated.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. TypeScript Everywhere | ✅ PASS | All source in `server/src/**/*.ts`, shared types in `shared/src/**/*.ts` |
| II. React + Vite Frontend | ⬜ N/A | No frontend in this feature |
| III. Tailwind CSS Styling | ⬜ N/A | No frontend in this feature |
| IV. Express.js Backend | ⬜ N/A | `MediaWikiImporter` class is reusable for future Express integration (SC-006) |
| V. SQLite Storage | ✅ PASS | better-sqlite3 with FTS5; schema DDL in data-model.md; WAL mode |
| VI. Vitest Testing | ✅ PASS | Test files planned in `server/tests/unit/` and `server/tests/integration/` |
| VII. Monorepo Structure | ✅ PASS | `server/` for code, `shared/` for types, `data/` for XML |
| VIII. MediaWiki XML Import | ✅ PASS | Stream-parsed via saxes, idempotent upserts, categories from latest revision |
| IX. Wiki Content Features | ⬜ N/A | Deferred to web viewer feature |
| X. Local-Only Deployment | ✅ PASS | No external services; all local file I/O |

**Post-design gate result**: ✅ PASS — no violations.
