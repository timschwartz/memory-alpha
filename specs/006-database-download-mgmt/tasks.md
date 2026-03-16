# Tasks: Database Download Management

**Input**: Design documents from `/specs/006-database-download-mgmt/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, contracts/sse-events.md, quickstart.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependency, add shared types, create reusable SSE infrastructure

- [X] T001 Install 7z-wasm dependency in server/package.json
- [X] T002 Add DownloadStatus, XmlFileInfo, SSE event types, and ApiErrorCode union to shared/src/types/wiki.ts
- [X] T003 Export new types from shared/src/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server-side SSE helper, useSSE React hook, and DownloadManager service — all user stories depend on these

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create DownloadManager class (download + decompress + cancel + state + event emitter) in server/src/lib/download-manager.ts
- [X] T005 [P] Create useSSE React hook (generic EventSource wrapper with typed events, auto-reconnect, cleanup) in client/src/hooks/useSSE.ts
- [X] T006 [P] Create database route module skeleton (router, mount in app.ts) in server/src/api/routes/database.ts and server/src/api/app.ts
- [X] T007 Migrate indexing route to add SSE endpoint GET /api/indexing/events in server/src/api/routes/indexing.ts
- [X] T008 Migrate SettingsPage indexing section from polling to useSSE hook in client/src/pages/SettingsPage.tsx

**Checkpoint**: SSE infrastructure in place, indexing SSE migration complete, DownloadManager service ready

---

## Phase 3: User Story 1 — Download Memory Alpha XML Dump (Priority: P1) 🎯 MVP

**Goal**: User clicks a download button, the system downloads the .7z archive, decompresses it, deletes the archive, and shows real-time SSE progress throughout. A cancel button aborts the operation and cleans up.

**Independent Test**: Click "Download Memory Alpha Dump" button, see progress bar update through download and decompress phases, verify XML file appears in data/ directory.

### Implementation for User Story 1

- [X] T009 [US1] Implement POST /api/database/download endpoint (triggers DownloadManager.start, returns 202 or 409) in server/src/api/routes/database.ts
- [X] T010 [US1] Implement POST /api/database/cancel endpoint (triggers DownloadManager.cancel, returns 200 or 409) in server/src/api/routes/database.ts
- [X] T011 [US1] Implement GET /api/database/status endpoint (returns current DownloadStatus JSON) in server/src/api/routes/database.ts
- [X] T012 [US1] Implement GET /api/database/events SSE endpoint (streams download/decompress progress events) in server/src/api/routes/database.ts
- [X] T013 [US1] Create 7z-wasm Worker thread script for decompression with progress reporting in server/src/lib/decompress-worker.ts
- [X] T014 [US1] Add Database section card with download button, SSE progress bar, cancel button, and phase label to client/src/pages/SettingsPage.tsx

**Checkpoint**: User Story 1 fully functional — download, decompress, progress, cancel all working end-to-end

---

## Phase 4: User Story 2 — View Available XML Files (Priority: P2)

**Goal**: Display a table of all XML files in the data directory with filename, size, date, and an import button per file.

**Independent Test**: Place XML files in data/ directory, load Settings page, verify file list table shows correct metadata and import buttons.

### Implementation for User Story 2

- [X] T015 [US2] Implement GET /api/database/files endpoint (scan data/ for .xml files, return XmlFileInfo[]) in server/src/api/routes/database.ts
- [X] T016 [US2] Implement POST /api/database/import endpoint (validate filename, trigger import via server/src/lib/importer.ts for selected file) in server/src/api/routes/database.ts
- [X] T017 [US2] Add XML file list table component (columns: name, size, date, import button) to Database section in client/src/pages/SettingsPage.tsx
- [X] T018 [US2] Add empty state message ("No XML files available — download one to get started") when file list is empty in client/src/pages/SettingsPage.tsx
- [X] T019 [US2] Wire import button to POST /api/database/import and refresh file list on completion in client/src/pages/SettingsPage.tsx

**Checkpoint**: File list displays correctly, import button triggers pipeline, empty state shown when no files exist

---

## Phase 5: User Story 3 — Re-download with Freshness Check (Priority: P3)

**Goal**: When the Memory Alpha XML file exists and is less than 7 days old, show an advisory notice suggesting a re-download may not be necessary. User can still proceed.

**Independent Test**: Have enmemoryalpha_pages_current.xml with mtime < 7 days ago, verify freshness notice appears with file age. Set mtime > 7 days ago, verify no notice.

### Implementation for User Story 3

- [X] T020 [US3] Add freshness check logic to Database section — compute file age from XmlFileInfo.ageMs, show advisory notice when isFresh is true in client/src/pages/SettingsPage.tsx
- [X] T021 [US3] Add human-readable age formatting ("3 days ago", "12 hours ago") for freshness notice in client/src/pages/SettingsPage.tsx
- [X] T022 [US3] Change download button label to "Re-download" when Memory Alpha XML file already exists in client/src/pages/SettingsPage.tsx

**Checkpoint**: Freshness notice displays correctly based on file age, re-download button remains functional

---

## Phase 6: User Story 4 — Handle Download Errors Gracefully (Priority: P3)

**Goal**: Display clear error messages when download or decompression fails. Offer retry. Clean up partial files automatically.

**Independent Test**: Simulate network failure mid-download, verify error message appears, partial files are removed, retry button works.

### Implementation for User Story 4

- [X] T023 [US4] Add error state handling to DownloadManager — cleanup partial .7z and extracted files on failure/cancellation in server/src/lib/download-manager.ts
- [X] T024 [US4] Add error display and retry button to Database section — show error message from SSE error event, enable retry in client/src/pages/SettingsPage.tsx
- [X] T025 [US4] Handle SSE connection errors gracefully in useSSE hook — fallback to GET /api/database/status on reconnect in client/src/hooks/useSSE.ts

**Checkpoint**: Errors display clearly, retry works, no partial files remain after failure

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, edge cases

- [X] T026 [P] Add unit tests for DownloadManager (state transitions, cleanup, cancellation) in server/tests/unit/download-manager.test.ts
- [X] T027 [P] Add integration tests for database API endpoints in server/tests/integration/database-endpoints.test.ts
- [X] T028 [P] Add unit tests for useSSE hook in client/tests/unit/useSSE.test.ts
- [X] T029 [P] Update SettingsPage tests for Database section in client/tests/components/SettingsPage.test.tsx
- [X] T030 Run quickstart.md validation — verify end-to-end workflow from download through import

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — delivers core MVP
- **User Story 2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Phase 4 (needs file list with freshness data)
- **User Story 4 (Phase 6)**: Depends on Phase 3 (needs download flow to add error handling)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Download)**: Independent after foundational — core MVP
- **US2 (File List)**: Independent after foundational — can parallel with US1
- **US3 (Freshness)**: Depends on US2 (needs file list with isFresh flag)
- **US4 (Error Handling)**: Depends on US1 (needs download flow to augment)

### Within Each User Story

- Server endpoints before client UI (API must exist before client consumes it)
- SSE endpoint before client SSE subscription
- Core flow before edge cases

### Parallel Opportunities

- T004, T005, T006 can all run in parallel (different packages, different files)
- T009–T012 (US1 server endpoints) can be done together (same file, additive)
- T015 and T016 (US2 server endpoints) can run in parallel with US1 client work
- All Phase 7 test tasks (T026–T029) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# These three tasks touch completely different files and can run simultaneously:
Task T004: "Create DownloadManager class in server/src/lib/download-manager.ts"
Task T005: "Create useSSE React hook in client/src/hooks/useSSE.ts"
Task T006: "Create database route skeleton in server/src/api/routes/database.ts"
```

## Parallel Example: User Story 1 + User Story 2

```bash
# After foundational phase, US1 and US2 server work can proceed in parallel:
US1: T009-T013 (download/cancel/status/events endpoints + worker)
US2: T015-T016 (file list + import endpoints)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T008)
3. Complete Phase 3: User Story 1 (T009–T014)
4. **STOP and VALIDATE**: Download and decompress a real .7z file with SSE progress
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → SSE infrastructure and indexing migration ready
2. Add US1 → Download works with real-time progress → MVP!
3. Add US2 → File list with import buttons → Richer UI
4. Add US3 → Freshness notices → Smarter UX
5. Add US4 → Error resilience → Production-ready
6. Polish → Tests and validation → Ship it

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- The download URL is hardcoded server-side (SSRF prevention) — client never sends URLs
- Filename validation in POST /api/database/import prevents path traversal
- 7z-wasm runs in a Worker thread to avoid blocking the Express event loop
- SSE migration (T007, T008) is foundational because both indexing and download sections use it
