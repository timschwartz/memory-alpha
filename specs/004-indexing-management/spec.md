# Feature Specification: Indexing Management

**Feature Branch**: `004-indexing-management`
**Created**: 2026-03-15
**Status**: Draft
**Input**: User description: "Update the index command line to show a progress indicator. I also want to be able to interrupt and restart from where it left off. Add an endpoint to the server to trigger indexing and one to show its current status. Add a Settings page to the application with a section to control indexing."

## Assumptions

- The progress indicator for the CLI uses standard terminal output (not a TUI library). Percentage complete and pages-indexed counters are sufficient.
- "Interrupt and restart" means the indexer tracks which pages have been indexed so that a subsequent run skips already-indexed pages and resumes from where it stopped.
- The server endpoints for triggering and monitoring indexing do not require authentication. The application is assumed to run in a trusted local or internal network environment.
- Only one indexing operation can be active at a time (server-wide). Concurrent requests to start indexing while one is already running are rejected gracefully.
- The Settings page is a new top-level route in the frontend application, accessible from the main navigation.

## Clarifications

### Session 2026-03-15

- Q: What should "Rebuild Index" do — resume or full re-index? → A: Both actions available: "Continue Indexing" (resume from checkpoint) and "Rebuild Index" (wipe and re-index from scratch)
- Q: How should the Settings page receive live indexing status updates? → A: Polling the status endpoint at a fixed interval (e.g., every 2 seconds)
- Q: What batch size should the indexer use when committing pages? → A: 500 pages per batch
- Q: Should the indexing trigger endpoint have any access restriction? → A: No restriction — trusted network assumption is sufficient; single-operation lock prevents abuse
- Q: Should the CLI support a --rebuild flag for full re-index (mirroring Settings page)? → A: Yes, add a --rebuild flag that wipes existing index and re-indexes from scratch

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CLI Progress Indicator During Indexing (Priority: P1)

A developer runs the index CLI command to build the full-text search index. While indexing is in progress, the terminal displays a live progress indicator showing the percentage complete, the number of pages indexed so far, and the total number of pages. When indexing finishes, a summary is printed with the total pages indexed and elapsed time.

**Why this priority**: The current CLI provides no feedback during indexing, leaving the user uncertain whether the process is running, stalled, or how long it will take. Progress visibility is the most fundamental improvement.

**Independent Test**: Can be fully tested by running the CLI against a populated database and observing terminal output updates during indexing.

**Acceptance Scenarios**:

1. **Given** a database with imported pages, **When** the user runs the index CLI, **Then** the terminal displays a progress indicator showing percentage complete and pages indexed out of total.
2. **Given** indexing is in progress, **When** a new batch of pages is indexed, **Then** the progress indicator updates in-place (overwrites the current line) rather than printing new lines.
3. **Given** indexing completes, **When** the final summary is displayed, **Then** it shows the total pages indexed and the elapsed time.
4. **Given** a fully or partially indexed database, **When** the user runs the index CLI with a rebuild flag, **Then** the existing index is wiped and all pages are re-indexed from scratch with progress displayed.

---

### User Story 2 - Interrupt and Resume Indexing (Priority: P1)

A developer starts indexing but needs to stop it partway through (e.g., via Ctrl+C or by stopping the server). When the developer restarts the indexing process later, it picks up from where it left off rather than re-indexing all pages from scratch. Only pages that have not yet been indexed are processed on the subsequent run.

**Why this priority**: For large datasets (223,000+ pages), re-indexing from scratch after an interruption wastes significant time. Resume capability makes the indexer practical for real-world usage.

**Independent Test**: Can be tested by starting indexing, interrupting it after partial progress, then restarting and verifying only remaining pages are indexed.

**Acceptance Scenarios**:

1. **Given** indexing is in progress, **When** the user interrupts the process (e.g., Ctrl+C), **Then** all pages indexed up to that point are persisted and not lost.
2. **Given** a partially indexed database, **When** the user runs the index command again, **Then** only un-indexed pages are processed and the progress indicator reflects the remaining work.
3. **Given** a fully indexed database, **When** the user runs the index command, **Then** the system reports that the index is already up to date and exits quickly.
4. **Given** new pages have been imported since the last indexing run, **When** the user runs the index command, **Then** only the newly imported pages are indexed.

---

### User Story 3 - Server Endpoint to Trigger Indexing (Priority: P2)

An administrator triggers full-text search indexing via the server's API without needing CLI access. The server exposes an endpoint that starts the indexing process in the background and returns immediately with an acknowledgment. If indexing is already in progress, the request is rejected with an appropriate status.

**Why this priority**: Once the application is deployed, CLI access may not be available. A server endpoint enables indexing to be triggered from the web interface or external tools.

**Independent Test**: Can be tested by sending a request to the endpoint and verifying the indexing process starts, then sending a second request and verifying it is rejected while the first is still running.

**Acceptance Scenarios**:

1. **Given** no indexing is in progress, **When** a request is made to start indexing, **Then** the server begins indexing in the background and responds with an acknowledgment including the estimated total pages.
2. **Given** indexing is already running, **When** a second request to start indexing is made, **Then** the server responds with a conflict status indicating indexing is already in progress.
3. **Given** the server is restarted while indexing was in progress, **When** indexing is triggered again, **Then** it resumes from where it left off (same resume logic as the CLI).

---

### User Story 4 - Server Endpoint to Check Indexing Status (Priority: P2)

An administrator or the frontend application queries the current indexing status via the server's API. The status endpoint returns whether indexing is idle, in progress, or complete, along with progress details (pages indexed, total pages, percentage, elapsed time) when applicable.

**Why this priority**: The status endpoint is required by the frontend Settings page to display live progress and is also useful for monitoring and automation.

**Independent Test**: Can be tested by querying the status endpoint before, during, and after indexing and verifying the response reflects the correct state.

**Acceptance Scenarios**:

1. **Given** no indexing has ever been run, **When** the status endpoint is queried, **Then** it returns an idle state with zero indexed pages and the total number of indexable pages.
2. **Given** indexing is in progress, **When** the status endpoint is queried, **Then** it returns an in-progress state with the current page count, total pages, percentage complete, and elapsed time.
3. **Given** indexing has completed, **When** the status endpoint is queried, **Then** it returns a complete state with the total pages indexed and the duration of the last run.

---

### User Story 5 - Settings Page with Indexing Controls (Priority: P3)

A user navigates to the Settings page from the main navigation. The Settings page displays an "Indexing" section that shows the current indexing status and provides controls to start or rebuild the index. While indexing is running, the page shows a live progress bar or indicator that updates automatically.

**Why this priority**: The Settings page provides a user-friendly graphical interface for managing indexing, building on the server endpoints (User Stories 3 and 4). It is the final piece that ties the feature together for non-technical users.

**Independent Test**: Can be tested by navigating to the Settings page, clicking the start/rebuild button, and observing the progress indicator update in real time until completion.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** the user clicks the Settings link in the navigation, **Then** the Settings page opens showing the Indexing section.
2. **Given** the index has never been built, **When** the Settings page loads, **Then** it displays a "Build Index" button and shows that the index is not yet built.
3. **Given** indexing is idle and a partial index exists, **When** the user clicks "Continue Indexing," **Then** indexing resumes from the last checkpoint and the page shows a live progress indicator.
4. **Given** indexing is idle and the index exists (partial or complete), **When** the user clicks "Rebuild Index," **Then** the existing index is wiped, indexing restarts from scratch, and a live progress indicator is shown.
5. **Given** indexing is in progress, **When** the user views the Settings page, **Then** the progress indicator shows the current state (percentage, pages indexed) and updates automatically via polling without requiring a page refresh.
6. **Given** indexing completes while the user is viewing the Settings page, **When** the process finishes, **Then** the progress indicator shows 100% and a completion summary replaces it.

---

### Edge Cases

- What happens when the database has zero pages to index? The system reports "0 pages to index" and exits immediately with a success status.
- What happens when indexing is interrupted during the very first page? The system gracefully handles partial state; the next run re-indexes from page 1 since no pages were fully committed.
- What happens when the user navigates away from the Settings page while indexing is running? Indexing continues in the background on the server; returning to Settings shows the current progress.
- What happens when the server shuts down during indexing? Pages indexed up to the last committed batch are preserved. The next indexing run resumes from the last committed point.
- What happens when the database file is locked or inaccessible? The system returns a clear error message indicating the database cannot be accessed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The index CLI MUST display a progress indicator during indexing showing percentage complete, pages indexed, and total pages.
- **FR-002**: The progress indicator MUST update in-place on the terminal (overwrite the current line) rather than printing a new line per update.
- **FR-003**: The indexer MUST track which pages have been indexed so that interrupted runs can be resumed.
- **FR-004**: When resumed, the indexer MUST skip already-indexed pages and only process remaining pages. *(Note: FR-004 and FR-013 share the same underlying mechanism — the `NOT IN (SELECT rowid FROM search_index)` query identifies both un-indexed and newly imported pages.)*
- **FR-005**: When all pages are already indexed, the indexer MUST report the index is up to date and exit without re-processing.
- **FR-006**: The indexer MUST commit indexed pages in batches of 500 pages so that progress is preserved even if the process is interrupted between batches.
- **FR-007**: The server MUST expose an endpoint to trigger indexing that starts the process in the background and returns immediately.
- **FR-008**: The server MUST reject concurrent indexing requests with an appropriate status when indexing is already in progress.
- **FR-009**: The server MUST expose an endpoint to query the current indexing status including state (idle/in-progress/complete), pages indexed, total pages, percentage, and elapsed time.
- **FR-010**: The frontend MUST include a Settings page accessible from the main navigation.
- **FR-011**: The Settings page MUST display an Indexing section with the current index status and two distinct controls: "Continue Indexing" (resume from checkpoint) and "Rebuild Index" (wipe existing index and re-index all pages from scratch).
- **FR-012**: The Settings page MUST display a live progress indicator that updates automatically by polling the status endpoint every 2 seconds while indexing is in progress.
- **FR-013**: The indexer MUST detect newly imported pages that are not yet in the search index and include them in subsequent indexing runs.
- **FR-014**: The index CLI MUST support a rebuild flag that wipes the existing index and re-indexes all pages from scratch, providing the same full re-index capability as the Settings page "Rebuild Index" action.

### Key Entities

- **IndexingStatus** (shared type): Represents the current state of an indexing operation. Key attributes: state (idle, in-progress, complete), indexedPages, totalPages, percentage, startedAt, completedAt, durationMs. See data-model.md for full definition.
- **IndexingStartRequest** (API request body): Specifies the indexing mode — `continue` (resume from checkpoint) or `rebuild` (wipe and re-index). See contracts/api.md.
- **Index Resume Mechanism**: Tracks which pages have been indexed via the existing FTS5 `search_index.rowid` column. No additional checkpoint table is needed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see indexing progress (percentage and page count) at all times during an indexing operation, whether via CLI or the Settings page.
- **SC-002**: An interrupted indexing run, when restarted, completes in less than 10% of the time a full re-index would take (for an interruption at 90% progress).
- **SC-003**: The Settings page reflects live indexing status within 2 seconds of any state change.
- **SC-004**: Users can trigger indexing from the Settings page and monitor it to completion without needing terminal access.
- **SC-005**: The system correctly prevents multiple simultaneous indexing operations 100% of the time.
