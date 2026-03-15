# Tasks: MediaWiki XML Importer

**Input**: Design documents from `/specs/001-mediawiki-xml-importer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/cli.md, quickstart.md

**Tests**: Each user story includes acceptance scenarios and independent test criteria. Test tasks cover unit and integration testing per Constitution Principle VI.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `server/src/`, `server/tests/`, `shared/src/`
- Per plan.md structure decision

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo, install dependencies, configure TypeScript and tooling

- [x] T001 Create monorepo root with npm workspaces in package.json, .gitignore, README.md, and data/.gitkeep placeholder
- [x] T002 Initialize server/ workspace with package.json, tsconfig.json (strict mode), and vitest.config.ts
- [x] T003 [P] Initialize shared/ workspace with package.json and tsconfig.json (strict mode) in shared/
- [x] T004 Install dependencies: saxes, better-sqlite3, @types/better-sqlite3, commander in server/package.json
- [x] T005 [P] Configure ESLint with TypeScript rules in server/.eslintrc.cjs
- [x] T006 [P] Configure Prettier in root .prettierrc
- [x] T028 [P] Configure lint-staged + husky for pre-commit lint and type-check hooks in root package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared type definitions and database initialization that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define shared TypeScript interfaces (PageData, RevisionData, NamespaceData, ImportOptions, ImportProgress, ImportResult) in shared/src/types/wiki.ts
- [x] T008 Re-export shared types from shared/src/index.ts
- [x] T009 Implement database initialization module with schema DDL (CREATE TABLE IF NOT EXISTS for namespaces, pages, revisions, categories, page_categories), WAL mode, and performance PRAGMAs in server/src/models/database.ts
- [x] T010 Create sample MediaWiki XML test fixture (3-5 pages across 2 namespaces, with multiple revisions per page, category links, and edge cases: redirect page, page with empty text, page with special characters in title, page with no categories) in server/tests/fixtures/sample-export.xml
- [x] T029 Implement schema migration system with version tracking table (schema_version) and incremental DDL runner in server/src/models/database.ts

**Checkpoint**: Foundation ready — shared types defined, database auto-initializes with migrations, test fixture available

---

## Phase 3: User Story 2 — Data Models (Priority: P1) 🎯 MVP

**Goal**: Well-defined data models for pages, revisions, namespaces, and categories with UPSERT queries. Database schema auto-creates on first run.

**Independent Test**: Initialize a fresh database and verify all tables exist with correct columns and constraints.

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement Namespace model with upsert prepared statement in server/src/models/namespace.ts
- [x] T012 [P] [US2] Implement Page model with upsert prepared statement (INSERT ... ON CONFLICT(page_id) DO UPDATE) in server/src/models/page.ts
- [x] T013 [P] [US2] Implement Revision model with upsert prepared statement (INSERT ... ON CONFLICT(revision_id) DO UPDATE) in server/src/models/revision.ts
- [x] T014 [P] [US2] Implement Category and PageCategory models with insert-or-ignore for categories and delete+re-insert for page_categories in server/src/models/category.ts

**Checkpoint**: All data models created with prepared UPSERT statements. Database can be initialized and tables verified.

---

## Phase 4: User Story 1 — Import XML Into Database (Priority: P1) 🎯 MVP

**Goal**: Stream-parse the 35 GB MediaWiki XML export, extract pages with all revisions, and upsert into SQLite with progress reporting and logging.

**Independent Test**: Run CLI against sample-export.xml fixture, verify pages/revisions in database, run again to confirm idempotency.

### Implementation for User Story 1

- [x] T015 [US1] Implement SAX stream parser wrapper (saxes) with event handlers for siteinfo, page, revision, text, contributor elements in server/src/lib/xml-parser.ts
- [x] T016 [US1] Implement MediaWikiImporter class with batch transaction logic (1000 pages per commit), progress callback, error handling, and log file writer in server/src/lib/importer.ts
- [x] T017 [US1] Implement CLI entry point using commander with required xml-file argument, --database, --log options, progress display to stderr, and summary to stdout in server/src/cli/import.ts
- [x] T018 [US1] Add bin entry for mw-import in server/package.json pointing to compiled server/dist/cli/import.js
- [x] T019 [US1] Add npm scripts: build (tsc), start (node dist/cli/import.js) in server/package.json

**Checkpoint**: Full import pipeline works end-to-end. `npx mw-import sample-export.xml` populates the database correctly. Re-running produces identical state (idempotent).

---

## Phase 5: User Story 3 — Filter by Namespace (Priority: P2)

**Goal**: Allow the CLI user to specify which namespaces to import via --namespaces flag, reducing import time and database size.

**Independent Test**: Run CLI with `--namespaces 0,14` against fixture, verify only ns=0 and ns=14 pages imported.

### Implementation for User Story 3

- [x] T020 [US3] Add --namespaces option parsing (comma-separated integers) to CLI in server/src/cli/import.ts
- [x] T021 [US3] Add namespace filtering logic to MediaWikiImporter — skip pages whose namespace_id is not in the filter set (when filter is provided) in server/src/lib/importer.ts

**Checkpoint**: Running with `--namespaces 0` imports only main articles. Running without the flag imports all namespaces.

---

## Phase 6: User Story 4 — Category Extraction (Priority: P2)

**Goal**: Extract `[[Category:...]]` links from the latest revision of each page and store as structured category relationships.

**Independent Test**: Import fixture page with known categories, query page_categories join table to verify correct associations.

### Implementation for User Story 4

- [x] T022 [US4] Implement category extractor function that strips nowiki/comments/pre blocks then matches [[Category:Name]] patterns in server/src/lib/category-extractor.ts
- [x] T023 [US4] Integrate category extraction into MediaWikiImporter — after upserting a page, extract categories from the latest revision text (highest revision_id), upsert category rows, delete+re-insert page_categories in server/src/lib/importer.ts

**Checkpoint**: After import, categories are queryable. `SELECT c.name FROM categories c JOIN page_categories pc ON c.category_id = pc.category_id WHERE pc.page_id = ?` returns correct categories.

---

## Phase 7: Testing (Constitution Principle VI)

**Purpose**: Unit and integration tests for all non-trivial modules per Constitution Principle VI

- [x] T030 [P] Unit test for SAX stream parser: siteinfo extraction, page/revision/contributor events, malformed XML recovery, empty text elements in server/tests/unit/xml-parser.test.ts
- [x] T031 [P] Unit test for category extractor: standard [[Category:...]] links, nowiki/comments/pre exclusion zones, empty input, special characters, no categories in server/tests/unit/category-extractor.test.ts
- [x] T032 [P] Unit test for MediaWikiImporter: batch commit at 1000 pages, idempotent upsert behavior, skipped malformed pages, progress callback invocation in server/tests/unit/importer.test.ts
- [x] T033 Integration test for import pipeline end-to-end: CLI invocation → XML parse → DB upsert → verify page/revision/category counts and content integrity → re-run for idempotency in server/tests/integration/import-pipeline.test.ts

**Checkpoint**: All unit and integration tests pass. Test coverage for xml-parser, category-extractor, importer, and end-to-end pipeline.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and cleanup across all stories

- [x] T024 [P] Add build scripts to root package.json (build all workspaces, clean) in package.json
- [x] T025 [P] Update quickstart.md with final verified commands and output examples in specs/001-mediawiki-xml-importer/quickstart.md
- [x] T026 Run quickstart.md validation — execute the full import flow from scratch and verify all steps complete successfully
- [x] T027 [P] Add .gitignore entries for data/*.xml, *.db, *.log, node_modules/, dist/ in .gitignore
- [x] T034 Verify peak memory usage stays below 512 MB during fixture import by monitoring RSS (SC-001 validation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US2 Data Models (Phase 3)**: Depends on Phase 2 (shared types + database.ts)
- **US1 Import Pipeline (Phase 4)**: Depends on Phase 3 (needs models for upserts)
- **US3 Namespace Filter (Phase 5)**: Depends on Phase 4 (extends importer)
- **US4 Categories (Phase 6)**: Depends on Phase 4 (extends importer); can run in parallel with US3
- **Testing (Phase 7)**: T030, T032 can start after Phase 4; T031 requires Phase 6; T033 requires Phases 5 and 6
- **Polish (Phase 8)**: Depends on Phases 5, 6, and 7 completion

### User Story Dependencies

- **User Story 2 (P1) — Data Models**: Can start after Phase 2. No dependency on other stories.
- **User Story 1 (P1) — Import Pipeline**: Depends on US2 (needs models to write data).
- **User Story 3 (P2) — Namespace Filter**: Depends on US1 (extends importer with filtering).
- **User Story 4 (P2) — Category Extraction**: Depends on US1 (extends importer with category logic). Independent of US3.

### Within Each User Story

- Models before services
- Parser/library before CLI integration
- Core pipeline before extensions (filtering, categories)

### Parallel Opportunities

- T003, T005, T006, T028 can all run in parallel (setup config files)
- T011, T012, T013, T014 can all run in parallel (independent model files)
- T020/T021 (US3) and T022/T023 (US4) can run in parallel after US1 is complete
- T030, T031, T032 can run in parallel (independent test files, after their subject modules exist)
- T024, T025, T027 (polish) can run in parallel

---

## Parallel Example: User Story 2 (Data Models)

```
Phase 2 complete
       │
       ▼
┌──────┼──────┬──────┐
│      │      │      │
T011   T012   T013   T014
(ns)   (page) (rev)  (cat)
│      │      │      │
└──────┴──────┴──────┘
       │
       ▼
Phase 4 begins (US1)
```

## Parallel Example: User Stories 3 & 4

```
Phase 4 complete (US1)
       │
       ├──────────┐
       ▼          ▼
   ┌──────┐  ┌──────┐
   │ US3  │  │ US4  │
   │T020  │  │T022  │
   │T021  │  │T023  │
   └──────┘  └──────┘
       │          │
       └────┬─────┘
            ▼
     Phase 7 (Testing)
            │
            ▼
     Phase 8 (Polish)
```

---

## Implementation Strategy

### MVP (Minimum Viable Product)

Phases 1–4 (Setup + Foundational + Data Models + Import Pipeline) deliver a working importer that:
- Stream-parses the full XML export
- Upserts all pages and revisions into SQLite
- Is idempotent
- Provides progress and logging
- Runs via CLI

This is independently useful without namespace filtering or category extraction.

### Incremental Delivery

1. **Increment 1 (MVP)**: Phases 1–4 → Working importer CLI
2. **Increment 2**: Phase 5 → Add namespace filtering
3. **Increment 3**: Phase 6 → Add category extraction
4. **Increment 4**: Phase 7 → Testing and validation
5. **Increment 5**: Phase 8 → Polish and documentation
