# Research: Express.js REST API

**Feature**: 002-express-rest-api
**Date**: 2026-03-15
**Purpose**: Resolve technical decisions for the Express REST API implementation

---

## Topic 1: Express.js + better-sqlite3 Integration

### Decision: App factory pattern with db passed as constructor argument

The Express app is created via a `createApp(db)` factory function. The factory instantiates model classes (which already take `db` in their constructors), mounts middleware, wires routes, and returns the Express app. Route handlers receive models via closure.

### Rationale

- **Testability**: Tests create an in-memory database, call `createApp(db)`, and use `supertest` against the returned app without starting a real server.
- **Consistency**: The existing models (`PageModel`, `RevisionModel`, etc.) already accept `db: Database.Database` in their constructors. This follows the same dependency injection pattern.
- **No singleton**: A module-level singleton db would create shared mutable state across test files, preventing parallel test suites from using isolated databases.

### Concurrency

- better-sqlite3 is synchronous and blocks the event loop during query execution. For well-indexed read queries returning in <10ms, this is acceptable for 50 concurrent reads.
- WAL mode (already enabled) allows multiple concurrent reads at the SQLite level.
- **Exception**: The FTS5 rebuild operation can take seconds/minutes on 223K pages. This must run either as a CLI command (separate process) or in a Worker thread — not on the main Express thread.

### Alternatives Considered

- `app.locals.db`: Implicit dependency; models already use constructor injection.
- Module-level singleton: Shared state across tests; can't use in-memory DBs per test.
- Async wrapper: Unnecessary complexity; defeats better-sqlite3's design philosophy.
- Worker threads for all reads: Over-engineering for <10ms queries.

---

## Topic 2: SQLite FTS5 Implementation

### Decision: Contentless FTS5 table with porter tokenizer, full rebuild after import

**Table definition:**

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  title,
  text_content,
  content='',
  contentless_delete=1,
  tokenize='porter unicode61',
  prefix='2 3'
);
```

**Key choices:**

- **`content=''` (contentless)**: Saves disk space. Article text already lives in the `revisions` table — no need to duplicate it in FTS shadow tables. Column reads from FTS return NULL; we JOIN back to `pages`/`revisions` for display data.
- **`contentless_delete=1`**: Allows DELETE and INSERT OR REPLACE (SQLite 3.43.0+, bundled with better-sqlite3).
- **`tokenize='porter unicode61'`**: Porter stemming enables "enterprise" matching "enterprises". Unicode61 handles non-ASCII characters correctly.
- **`prefix='2 3'`**: Pre-built prefix indexes for 2 and 3 character prefixes, enabling fast prefix search (e.g., `enterpri*`).

### Index Population

Since the FTS table is contentless, populate via INSERT..SELECT joining pages to their latest revision:

```sql
INSERT INTO search_index(rowid, title, text_content)
SELECT p.page_id, p.title, r.text_content
FROM pages p
JOIN revisions r ON r.page_id = p.page_id
WHERE r.revision_id = (
  SELECT MAX(r2.revision_id) FROM revisions r2 WHERE r2.page_id = p.page_id
);
```

**Rebuild strategy**: DELETE all rows from search_index, then re-INSERT. Wrap in a transaction. The FTS5 `rebuild` command is not available for contentless tables.

### Search Queries

```sql
SELECT
  p.page_id,
  p.title,
  snippet(search_index, 1, '<mark>', '</mark>', '...', 32) AS snippet,
  rank
FROM search_index
JOIN pages p ON p.page_id = search_index.rowid
WHERE search_index MATCH ?
ORDER BY rank
LIMIT ? OFFSET ?;
```

- `snippet(table, col_index, before, after, ellipsis, max_tokens)` — column 1 is `text_content`
- `ORDER BY rank` uses BM25 by default (pre-computed, faster than calling `bm25()`)
- Separate count query: `SELECT count(*) FROM search_index WHERE search_index MATCH ?`

### Query Sanitization

FTS5 has special syntax characters that can cause errors from user input: `"`, `:`, `(`, `)`, `{`, `}`, `^`, `+`, `-`, `*`, `\`, and reserved words `AND`, `OR`, `NOT`, `NEAR`.

Sanitization strategy:
1. Strip special FTS5 characters (replace with spaces)
2. Quote reserved words
3. Wrap each word in quotes and append `*` for prefix matching
4. User types `warp drive` → query becomes `"warp"* "drive"*` (implicit AND between terms)

### Graceful Degradation

Check `sqlite_master` for the `search_index` table before querying. If absent, the search endpoint returns 503 with error code `SEARCH_INDEX_NOT_BUILT`.

### Alternatives Considered

- External content table (`content='pages'`): Can't point at a JOIN result; revisions is a separate table.
- Regular content table (default): Doubles disk usage storing text in both revisions and FTS shadow tables.
- Trigram tokenizer: Larger index; porter + prefix matching is sufficient for wiki search.
- Incremental updates via triggers: Data is read-only after import; full rebuild is simpler.

---

## Topic 3: Static File Serving + SPA Fallback

### Decision: API routes first → express.static() → SPA fallback, with existence check

**Middleware order:**
1. **API routes** (`/api/*`) — always mounted first. API 404s are handled by the API router's error handler before the SPA fallback is reached.
2. **`express.static(staticDir)`** — serves JS, CSS, images from the Vite build output. Only mounted if the build directory exists.
3. **SPA catch-all** (`app.get('*', ...)`) — returns `index.html` for any unmatched route so React Router handles client-side routing. Only mounted if the build directory exists.

**Directory existence guard**: Use `fs.existsSync(staticDir)` at startup. If the client hasn't been built (dev mode), static middleware and SPA fallback are not mounted. The server functions as a pure API server.

### Alternatives Considered

- `connect-history-api-fallback` middleware: Extra dependency for something achievable in 3 lines.
- Separate port for static files: Violates Constitution Principle X (single start command).
- Checking `Accept: text/html` header: Over-engineered; path-based `/api` prefix is sufficient.

---

## Topic 4: Extending Existing Model Classes

### Decision: Add read methods directly to existing model classes with prepared statements in constructor

Extend `PageModel`, `RevisionModel`, `CategoryModel`, and `NamespaceModel` with read query methods alongside existing upsert methods. Prepared statements for reads are created in the constructor, matching the established pattern.

### Rationale

- **Consistency**: All four models already create prepared statements in the constructor. Adding read statements follows the same convention.
- **Performance**: `db.prepare()` compiles SQL once per model lifetime, not once per request.
- **Cohesion**: Models are small (20-40 lines each). Adding 3-5 read methods keeps them under 100 lines. Splitting into separate query modules fragments related SQL.

### Alternatives Considered

- Separate read-only query modules: Fragments related SQL across files; no benefit for small models.
- On-demand `db.prepare()` per method call: Wasteful; recompiles SQL on every request.
- Repository pattern: Over-abstraction for a local-only app with 4 tables.
- Raw SQL in route handlers: Mixes concerns; harder to test.
