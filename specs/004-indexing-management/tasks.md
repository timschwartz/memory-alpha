# Tasks: Indexing Management

**Input**: Design documents from `/specs/004-indexing-management/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md, quickstart.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared types and client utilities needed by multiple user stories

- [x] T001 Add IndexingStatus, IndexingStartRequest, and IndexingStartResponse interfaces to shared/src/types/wiki.ts and export from shared/src/index.ts
- [x] T002 [P] Add apiPost helper function to client/src/api/client.ts following the existing apiGet pattern

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor FTS5Indexer to support incremental batch indexing with progress tracking and resume capability

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add getIndexedCount() and getTotalIndexableCount() helper methods to FTS5Indexer in server/src/lib/fts5-indexer.ts
- [x] T004 Add buildIncremental() method with 500-page batch commits, progress callback, and NOT IN (SELECT rowid FROM search_index) resume detection to FTS5Indexer in server/src/lib/fts5-indexer.ts. Must also handle newly imported pages (FR-013) and surface clear errors when the database is inaccessible (edge case)
- [x] T005 Add clearIndex() method that deletes all rows from search_index for full rebuild support in server/src/lib/fts5-indexer.ts

- [x] T005a [P] Add unit tests for getIndexedCount(), getTotalIndexableCount(), buildIncremental(), and clearIndex() in server/tests/unit/fts5-indexer.test.ts

**Checkpoint**: FTS5Indexer now supports incremental builds, batch commits, progress callbacks, and full rebuild — all user stories can proceed

---

## Phase 3: User Story 1 — CLI Progress Indicator (Priority: P1) 🎯 MVP

**Goal**: Display a live in-place progress indicator on stderr during indexing, showing percentage, pages indexed, and total pages

**Independent Test**: Run `npx tsx src/cli/index-search.ts -d ../memory-alpha.db` against a populated database and observe progress updates overwriting the terminal line

- [x] T006 [US1] Update CLI action to call buildIncremental() with a progress callback that writes in-place progress to stderr using \r in server/src/cli/index-search.ts
- [x] T007 [US1] Add --rebuild flag to CLI that calls clearIndex() before buildIncremental() in server/src/cli/index-search.ts

**Checkpoint**: CLI displays live progress during indexing and supports --rebuild for full re-index

---

## Phase 4: User Story 2 — Interrupt and Resume (Priority: P1)

**Goal**: Allow indexing to be interrupted (Ctrl+C) and resumed from where it left off on the next run

**Independent Test**: Start indexing, interrupt after partial progress, restart and verify only remaining pages are processed

- [x] T008 [US2] Add up-to-date detection that compares indexedCount to totalCount and exits early with a message when index is complete in server/src/cli/index-search.ts
- [x] T009 [US2] Add SIGINT handler that sets a stop flag to allow the current batch to complete before exiting gracefully in server/src/cli/index-search.ts

**Checkpoint**: CLI resumes from last checkpoint, detects up-to-date index, and handles Ctrl+C gracefully

---

## Phase 5: User Story 3 — Server Trigger Endpoint (Priority: P2)

**Goal**: Expose POST /api/indexing/start to trigger background indexing from the API

**Independent Test**: `curl -X POST http://localhost:3000/api/indexing/start -H "Content-Type: application/json" -d '{"mode":"continue"}'` returns 202; a second request returns 409

- [x] T010 [US3] Create indexing route file with in-memory state tracking and POST /api/indexing/start handler that validates mode and rejects concurrent requests in server/src/api/routes/indexing.ts
- [x] T011 [US3] Implement async background indexing with setImmediate yielding between batches to keep the event loop responsive in server/src/api/routes/indexing.ts
- [x] T012 [US3] Register indexing router at /api/indexing in createApp() and pass FTS5Indexer and PageModel in server/src/api/app.ts

**Checkpoint**: Server can trigger indexing in the background and reject concurrent requests

---

## Phase 6: User Story 4 — Server Status Endpoint (Priority: P2)

**Goal**: Expose GET /api/indexing/status returning state, progress, and timing details

**Independent Test**: `curl http://localhost:3000/api/indexing/status` returns IndexingStatus JSON before, during, and after indexing

- [x] T013 [US4] Add GET /api/indexing/status endpoint returning IndexingStatus from in-memory state and live DB counts in server/src/api/routes/indexing.ts

- [x] T013a [P] Add integration tests for POST /api/indexing/start and GET /api/indexing/status in server/tests/integration/indexing-route.test.ts

**Checkpoint**: Status endpoint returns idle/in-progress/complete state with accurate progress metrics

---

## Phase 7: User Story 5 — Settings Page with Indexing Controls (Priority: P3)

**Goal**: Add a Settings page with an Indexing section showing live status, progress bar, and Continue/Rebuild controls

**Independent Test**: Navigate to /settings, click Build Index or Rebuild Index, and observe the progress bar updating every 2 seconds until completion

- [x] T014 [P] [US5] Create SettingsPage component with indexing status display, progress bar, Continue Indexing button, and Rebuild Index button in client/src/pages/SettingsPage.tsx
- [x] T015 [US5] Add polling logic to SettingsPage via useEffect/setInterval that fetches GET /api/indexing/status every 2 seconds while indexing is in-progress in client/src/pages/SettingsPage.tsx
- [x] T016 [P] [US5] Add Settings navigation link to the nav section of the Header component in client/src/components/Header.tsx
- [x] T017 [US5] Add /settings route with lazy-loaded SettingsPage to the Routes in client/src/App.tsx

- [x] T017a [P] Add component tests for SettingsPage (idle, in-progress, complete states; button interactions; polling) in client/tests/components/SettingsPage.test.tsx

**Checkpoint**: Settings page is accessible from navigation, displays live indexing progress, and provides working Continue/Rebuild controls

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation across all user stories

- [x] T018 [P] Run quickstart.md validation end-to-end for CLI, API endpoints, and Settings page
- [x] T019 Verify all acceptance scenarios from spec.md pass across all five user stories
- [x] T019a Validate SC-002: run indexing to ~90%, interrupt, resume, and confirm the resumed run completes in under 10% of a full re-index duration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (shared types) — BLOCKS all user stories. T005a (unit tests) can run in parallel after T003-T005 are complete.
- **US1 (Phase 3)**: Depends on Phase 2 (buildIncremental, clearIndex)
- **US2 (Phase 4)**: Depends on Phase 3 (CLI must exist with progress before adding resume/interrupt)
- **US3 (Phase 5)**: Depends on Phase 2 (buildIncremental, clearIndex) — can run in parallel with US1/US2
- **US4 (Phase 6)**: Depends on Phase 5 (state tracking must exist in indexing route). T013a (integration tests) can run in parallel after T013.
- **US5 (Phase 7)**: Depends on Phase 1 (apiPost), Phase 5 (trigger endpoint), Phase 6 (status endpoint). T017a (component tests) can run in parallel after T014-T017.
- **Polish (Phase 8)**: Depends on all user story phases. T019a (SC-002 benchmark) depends on a populated database.

### Parallel Opportunities

- **After Phase 2 completes**: US1/US2 (CLI stream) and US3/US4 (server stream) can proceed in parallel
- **Within Phase 1**: T001 and T002 are in different files — can run in parallel
- **Within Phase 7**: T014 (SettingsPage) and T016 (Header link) are in different files — can run in parallel

### Within Each User Story

- Models/types before services
- Services before endpoints/UI
- Core implementation before integration

---

## Parallel Example: After Phase 2

```
Stream A (CLI):                    Stream B (Server):         Stream C (Tests):
  T006 [US1] CLI progress           T010 [US3] Create route     T005a Unit tests
  T007 [US1] --rebuild flag         T011 [US3] Background idx
  T008 [US2] Up-to-date exit        T012 [US3] Register router
  T009 [US2] SIGINT handler         T013 [US4] Status endpoint
                                    T013a Integration tests
                                      │
                          ┌───────────┘
                          ▼
                   T014-T017 [US5] Settings page
                   T017a Component tests
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shared types + apiPost)
2. Complete Phase 2: Foundational (incremental indexer)
3. Complete Phase 3: User Story 1 (CLI progress)
4. **STOP and VALIDATE**: Run CLI against database, verify progress display
5. The indexer is now functional with progress — immediate value delivered

### Incremental Delivery

1. Setup + Foundational → Core indexer upgraded
2. Add US1 → CLI has progress display → **MVP!**
3. Add US2 → CLI supports interrupt/resume → Practical for large datasets
4. Add US3 + US4 → Server endpoints available → API-accessible
5. Add US5 → Settings page with live controls → Full feature complete
6. Each story adds value without breaking previous stories

### Task Count Summary

| Phase | Story | Tasks |
|-------|-------|-------|
| Phase 1: Setup | — | 2 |
| Phase 2: Foundational | — | 3 |
| Phase 3: US1 | CLI Progress (P1) | 2 |
| Phase 4: US2 | Interrupt/Resume (P1) | 2 |
| Phase 5: US3 | Trigger Endpoint (P2) | 3 |
| Phase 6: US4 | Status Endpoint (P2) | 1 |
| Phase 7: US5 | Settings Page (P3) | 4 |
| Phase 8: Polish | — | 2 |
| **Total** | | **19** |
