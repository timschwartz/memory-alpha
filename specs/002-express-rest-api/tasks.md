# Tasks: Express.js REST API

**Input**: Design documents from `/specs/002-express-rest-api/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: Included — Constitution Principle VI mandates Vitest testing, and the implementation plan specifies unit and integration test files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and configure project scripts for the API server

- [ ] T001 Install express, cors, @types/express, and @types/cors as dependencies and supertest and @types/supertest as devDependencies in server/package.json
- [ ] T002 [P] Add `serve` script (`ts-node src/api/server.ts`) and `mw-index` bin entry (`src/cli/index-search.ts`) to server/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, database migration, model read queries, and middleware — MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Add shared API response types (ApiResponse\<T\>, PaginationMeta, ApiError, PageSummary, PageDetail, SearchResult, CategorySummary, HealthStatus) to shared/src/types/wiki.ts and re-export from shared/src/index.ts
- [ ] T004 Add migration v2 creating FTS5 search_index virtual table (`content=''`, `contentless_delete=1`, `tokenize='porter unicode61'`, `prefix='2 3'`) and idx_pages_title_namespace composite index in server/src/models/database.ts
- [ ] T005 [P] Extend PageModel with getByTitle(title, namespaceId), getById(pageId), list(limit, offset, prefix?, namespaceId?), and count(prefix?, namespaceId?) prepared-statement read queries in server/src/models/page.ts
- [ ] T006 [P] Extend RevisionModel with getLatestByPageId(pageId) prepared-statement read query in server/src/models/revision.ts
- [ ] T007 [P] Extend NamespaceModel with getAll() and getByName(name) prepared-statement read queries in server/src/models/namespace.ts
- [ ] T008 [P] Extend CategoryModel with list(limit, offset, prefix?), count(prefix?), getByName(name), getPagesByCategory(categoryId, limit, offset), and getCategoriesByPageId(pageId) prepared-statement read queries in server/src/models/category.ts
- [ ] T009 [P] Implement query parameter validation helpers (parsePaginationParams with limit 1–100 and offset >= 0, parseIntParam) in server/src/api/middleware/validate.ts
- [ ] T010 [P] Implement structured JSON request logger middleware (method, path, status, durationMs to stdout) in server/src/api/middleware/request-logger.ts
- [ ] T011 [P] Implement centralized error handler middleware mapping errors to ApiResponse envelope with appropriate HTTP status codes (including SQLITE_BUSY/LOCKED → 503 with Retry-After: 5 header) in server/src/api/middleware/error-handler.ts

**Checkpoint**: Foundation ready — shared types defined, database migration registered, all models support read queries, middleware available for route handlers

---

## Phase 3: User Story 6 — Server Startup & Health (Priority: P1)

**Goal**: Express server starts with a single command, auto-initializes the database, provides a health check, and accepts configuration via environment variables

**Independent Test**: Start the server, hit `GET /api/health`, verify 200 response with database status and page count

### Implementation for User Story 6

- [ ] T012 [US6] Implement Express app factory createApp(db, options) mounting request logger, CORS (configurable origin), JSON body parser, API route routers, and error handler in server/src/api/app.ts
- [ ] T013 [P] [US6] Implement GET /api/health route returning HealthStatus (status, database connection, totalPages, totalCategories, searchIndexReady) in server/src/api/routes/health.ts
- [ ] T014 [US6] Implement server entry point reading env vars (PORT, DATABASE_PATH, STATIC_DIR, CORS_ORIGIN), calling initializeDatabase and createApp, and listening on configured port with startup log in server/src/api/server.ts

**Checkpoint**: `npm run serve` starts the server, `GET /api/health` returns database status — server startup story is complete

---

## Phase 4: User Story 1 — Retrieve a Single Article (Priority: P1) 🎯 MVP

**Goal**: A user can fetch any article by title (with namespace prefix resolution) or by numeric page ID, receiving full metadata and latest revision content

**Independent Test**: Start the server against a populated database, request a known article by title and by page ID, verify JSON response contains correct page metadata, wikitext content, and categories

### Implementation for User Story 1

- [ ] T015 [US1] Implement pages router with namespace prefix resolution helper (parse "Category:Starships" into namespace + title via NamespaceModel.getByName) and GET /api/pages/:title route returning PageDetail in server/src/api/routes/pages.ts
- [ ] T016 [US1] Implement GET /api/pages/by-id/:pageId route returning PageDetail (validate pageId is integer, 404 if not found) in server/src/api/routes/pages.ts
- [ ] T017 [US1] Mount pages router on /api/pages in server/src/api/app.ts

**Checkpoint**: Can retrieve any article by title or page ID — core wiki viewer read operation works

---

## Phase 5: User Story 2 — Browse Articles with Pagination (Priority: P1)

**Goal**: A user can browse a paginated list of article summaries with optional prefix and namespace filtering

**Independent Test**: Request `GET /api/pages?limit=5&prefix=Star` and verify correct PageSummary array with pagination metadata

### Implementation for User Story 2

- [ ] T018 [US2] Implement GET /api/pages list route with limit (default 20, max 100), offset (default 0), prefix, and namespace query parameters returning paginated PageSummary array in server/src/api/routes/pages.ts

**Checkpoint**: Can browse and filter all articles with pagination — content discovery works

---

## Phase 6: User Story 3 — Full-Text Search (Priority: P1)

**Goal**: A user can search article content via FTS5, receiving ranked results with contextual snippets. The FTS5 index can be built via CLI or API endpoint

**Independent Test**: Build the FTS5 index via CLI, search for a known term, verify ranked results with `<mark>` highlighted snippets

### Implementation for User Story 3

- [ ] T019 [US3] Implement FTS5Indexer class with build (DELETE + INSERT from pages/revisions), isIndexReady (check sqlite_master), search (sanitized FTS5 MATCH query with snippet and rank), and searchCount methods in server/src/lib/fts5-indexer.ts
- [ ] T020 [US3] Implement mw-index CLI command (commander) that opens database, calls FTS5Indexer.build, and logs indexed page count and duration in server/src/cli/index-search.ts
- [ ] T021 [US3] Implement GET /api/search route with q (required), limit, offset parameters returning paginated SearchResult array (503 if index not built) in server/src/api/routes/search.ts
- [ ] T022 [US3] Implement POST /api/search/rebuild route with in-progress flag guard (409 if rebuild already running) returning indexedPages and durationMs in server/src/api/routes/search.ts
- [ ] T023 [US3] Mount search router on /api/search in server/src/api/app.ts

**Checkpoint**: Full-text search works end-to-end — users can discover articles by content

---

## Phase 7: User Story 4 — Category Navigation (Priority: P2)

**Goal**: A user can list categories with article counts and browse pages within a specific category

**Independent Test**: Request `GET /api/categories`, verify category list with page_count. Request `GET /api/categories/:name/pages`, verify correct pages listed

### Implementation for User Story 4

- [ ] T024 [P] [US4] Implement GET /api/categories route with limit, offset, prefix query parameters returning paginated CategorySummary array in server/src/api/routes/categories.ts
- [ ] T025 [US4] Implement GET /api/categories/:name/pages route with limit, offset parameters returning paginated PageSummary array (404 if category not found) in server/src/api/routes/categories.ts
- [ ] T026 [US4] Mount categories router on /api/categories in server/src/api/app.ts

**Checkpoint**: Category browsing works — secondary content discovery path available

---

## Phase 8: User Story 5 — Serve Frontend Static Files (Priority: P2)

**Goal**: In production mode, Express serves the Vite-built React frontend from a static directory with SPA client-side routing fallback

**Independent Test**: Place a minimal index.html in the static directory, start the server, request `/` and `/some/route` — both return index.html. Request `/api/health` — still returns JSON

### Implementation for User Story 5

- [ ] T027 [US5] Add express.static middleware for STATIC_DIR and SPA catch-all fallback (`GET *` returns index.html) with fs.existsSync guard (skip if dir absent) in server/src/api/app.ts
- [ ] T028 [US5] Make CORS middleware conditional — enabled only when STATIC_DIR does not exist (development mode), disabled in production (same-origin) in server/src/api/app.ts

**Checkpoint**: Single `npm run serve` command serves both API and frontend — deployment story complete

---

## Phase 9: Testing

**Purpose**: Unit and integration tests per Constitution Principle VI (Vitest Testing)

- [ ] T029 [P] Write unit tests for validation helpers (parsePaginationParams, parseIntParam edge cases) in server/tests/unit/validate.test.ts
- [ ] T030 [P] Write unit tests for FTS5Indexer (build, search, query sanitization, isIndexReady) using in-memory database in server/tests/unit/fts5-indexer.test.ts
- [ ] T031 [P] Write unit tests for pages routes (get by title, get by ID, list, namespace resolution, 404 handling) using supertest + createApp in server/tests/unit/pages-route.test.ts
- [ ] T032 [P] Write unit tests for search routes (search query, empty results, missing q param, 503 no index, rebuild 409) using supertest + createApp in server/tests/unit/search-route.test.ts
- [ ] T033 [P] Write unit tests for categories routes (list, prefix filter, pages in category, 404 unknown category) using supertest + createApp in server/tests/unit/categories-route.test.ts
- [ ] T034 Write integration tests for full API endpoint flow (health → pages → search → categories) against populated in-memory database in server/tests/integration/api-endpoints.test.ts

**Checkpoint**: All tests pass — code quality verified

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T035 [P] Update server/tsconfig.json if needed for new source directories (src/api/**)
- [ ] T036 Validate quickstart.md steps end-to-end (install → build → import → index → serve → verify curl commands)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US6 (Phase 3)**: Depends on Foundational — BLOCKS all other user stories (server must run)
- **US1 (Phase 4)**: Depends on US6 (needs running server with app factory)
- **US2 (Phase 5)**: Depends on US6 (adds list route to pages router, can parallel with US1)
- **US3 (Phase 6)**: Depends on US6 (needs app factory; uses migration v2 FTS5 table)
- **US4 (Phase 7)**: Depends on US6 (independent of US1–US3)
- **US5 (Phase 8)**: Depends on US6 (modifies app factory; independent of US1–US4)
- **Testing (Phase 9)**: Depends on all user story phases being complete
- **Polish (Phase 10)**: Depends on Testing

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US6)
                                                │
                    ┌───────────┬───────────┬───┴───────┬───────────┐
                    ▼           ▼           ▼           ▼           ▼
              Phase 4 (US1) Phase 5 (US2) Phase 6 (US3) Phase 7 (US4) Phase 8 (US5)
                    │           │           │           │           │
                    └───────────┴───────────┴───────────┴───────────┘
                                            │
                                    Phase 9 (Testing)
                                            │
                                    Phase 10 (Polish)
```

- **US1, US2**: Both work on pages router (server/src/api/routes/pages.ts) — sequential recommended
- **US3**: Independent search router — can parallel with US1/US2/US4
- **US4**: Independent categories router — can parallel with US1/US2/US3
- **US5**: Modifies app factory — run after US6, can parallel with US1–US4

### Within Each User Story

- Route implementation before mounting in app.ts
- Model queries (Phase 2) already available for all stories
- Core implementation before edge case handling

### Parallel Opportunities

- **Phase 2**: T005–T011 all marked [P] — seven tasks on different files, all parallelizable
- **Phase 3**: T013 [P] can parallel with T012 (different files)
- **After Phase 3**: US3 (Phase 6) + US4 (Phase 7) + US5 (Phase 8) can all run in parallel
- **Phase 9**: T029–T033 all marked [P] — five test files, all parallelizable

---

## Parallel Example: After Phase 3 (US6 complete)

```
Worker A (Pages)          Worker B (Search)         Worker C (Categories)
──────────────────        ──────────────────        ─────────────────────
T015 pages/:title         T019 FTS5Indexer          T024 categories list
T016 pages/by-id          T020 mw-index CLI         T025 categories/pages
T017 mount pages          T021 search route         T026 mount categories
T018 pages list           T022 rebuild route
                          T023 mount search
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Phases 1–5**: Setup → Foundational → US6 → US1 → US2

This delivers a running server where users can retrieve articles by title/ID and browse paginated article lists. This is a functional wiki viewer API without search or categories.

### Incremental Delivery

1. **MVP** (Phases 1–5): Server + article retrieval + browsing
2. **+Search** (Phase 6): Full-text search with FTS5
3. **+Categories** (Phase 7): Category navigation
4. **+Static** (Phase 8): Production frontend serving
5. **+Quality** (Phases 9–10): Tests and validation
