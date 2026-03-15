# Research: Indexing Management

**Feature**: 004-indexing-management
**Date**: 2026-03-15

## R1: Incremental FTS5 Inserts on Contentless Tables

**Decision**: Use `NOT IN (SELECT rowid FROM search_index)` to skip already-indexed pages, inserting only un-indexed pages per batch.

**Rationale**: The FTS5 contentless table with `content=''` supports incremental INSERTs without deleting existing rows first. The `rowid` column maps to `page_id`, so a NOT IN subquery efficiently identifies un-indexed pages. This avoids the current approach of wiping the entire index on every build.

**Alternatives considered**:
- **Separate tracking table**: Adds schema complexity for no gain — FTS5 rowid queries are already efficient.
- **LEFT JOIN with IS NULL**: Equivalent to NOT IN but less readable for this pattern.

## R2: FTS5 Rowid Tracking for Resume Detection

**Decision**: Use `SELECT count(*) FROM search_index` to determine indexed count and `SELECT rowid FROM search_index` for set membership checks. For batch queries, use SQL-level filtering rather than loading all rowids into memory.

**Rationale**: Contentless FTS5 tables support efficient rowid lookups (O(log N)). The existing `search()` method already JOINs on `search_index.rowid`, confirming this pattern works. Counting indexed rows vs total pages provides the resume detection: if counts match, the index is up to date.

**Alternatives considered**:
- **Load all rowids into a Set**: Works for 223K pages (~2MB) but unnecessary when SQL filtering is available.
- **Shadow metadata table**: Over-engineered for this use case.

## R3: Batch Transaction Pattern (500 Pages)

**Decision**: Use `db.transaction()` wrapper per batch of 500 pages, consistent with the existing importer pattern.

**Rationale**: The codebase already uses explicit `BEGIN/COMMIT` in `importer.ts` for batch inserts with a similar batch size. Using `db.transaction()` provides automatic rollback on error within a batch. Each committed batch persists progress, enabling resume after interruption.

**Alternatives considered**:
- **Explicit BEGIN/COMMIT**: Slightly more control but `db.transaction()` is idiomatic for better-sqlite3.
- **Single large transaction**: Defeats resume purpose — an interruption loses all progress.

## R4: Terminal Progress Display

**Decision**: Use `process.stderr.write('\r...')` for in-place progress updates, matching the existing import CLI pattern.

**Rationale**: The import CLI (`server/src/cli/import.ts`) already implements this exact pattern: `process.stderr.write('\rImporting... ${count} pages')`. Using stderr keeps stdout clean for scripting. The `\r` carriage return overwrites the current line.

**Alternatives considered**:
- **Third-party progress bar library** (e.g., cli-progress): Adds a dependency for minimal benefit.
- **stdout**: Would mix progress with structured output; stderr is the established convention.

## R5: Background Indexing via Event Loop Yielding

**Decision**: Use `async/await` with `setImmediate()` between batch commits to yield to the Node.js event loop, allowing the Express server to handle concurrent requests (status queries) while indexing proceeds.

**Rationale**: better-sqlite3 is synchronous, so each 500-page batch briefly blocks the event loop (~10-100ms). Inserting `await new Promise(resolve => setImmediate(resolve))` between batches allows pending HTTP requests to be processed. This is the simplest approach that satisfies the requirement for the server to trigger indexing in the background and respond to status queries during indexing.

**Alternatives considered**:
- **Worker threads**: Would require serializing the database handle or opening a second connection. better-sqlite3 supports this but adds significant complexity for a local-only application.
- **Child process**: Similar complexity; requires IPC for progress reporting.
- **setTimeout(0)**: Lower priority than setImmediate; introduces unnecessary delay.

## R6: API Design for Indexing Endpoints

**Decision**: Add two endpoints under `/api/indexing`: `POST /api/indexing/start` to trigger indexing and `GET /api/indexing/status` to query progress. The POST endpoint accepts a `mode` parameter (`continue` or `rebuild`).

**Rationale**: Follows the existing REST conventions (Express routes return JSON, POST for actions, GET for state queries). A single route file (`routes/indexing.ts`) follows the pattern of existing routes (`health.ts`, `search.ts`, `pages.ts`, `categories.ts`). The `mode` parameter distinguishes resume from full rebuild, matching the two Settings page actions.

**Alternatives considered**:
- **Separate endpoints** (`POST /start-continue`, `POST /start-rebuild`): Less RESTful; single endpoint with mode is cleaner.
- **PUT /api/indexing**: Semantically wrong — indexing is an action, not a resource update.

## R7: Shared IndexingStatus Type

**Decision**: Add an `IndexingStatus` interface to `shared/src/types/wiki.ts` and export it from `shared/src/index.ts`. This type is used by both the server (status endpoint response) and client (polling response).

**Rationale**: The monorepo's shared package already defines all API response types (`HealthStatus`, `SearchResult`, etc.). Adding the indexing status type here maintains the established pattern and ensures type safety across client and server.

**Alternatives considered**:
- **Inline types in each package**: Duplicates definitions; no type safety across boundary.
