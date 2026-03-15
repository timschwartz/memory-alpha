# Feature Specification: Express.js REST API

**Feature Branch**: `002-express-rest-api`
**Created**: 2026-03-15
**Status**: Draft
**Input**: User description: "Express.js REST API for the Memory Alpha wiki viewer. Build a JSON API server using Express.js (Constitution Principle IV) that serves imported MediaWiki data from the SQLite database populated by the spec-001 XML importer."

## Clarifications

### Session 2026-03-15

- Q: How should the FTS5 index be built — CLI only, API only, or both? → A: Both a CLI command and a POST /api/search/rebuild API endpoint
- Q: How should HTTP requests be logged? → A: Structured request logging to stdout (method, path, status, duration)
- Q: Should the CORS allowed origin be configurable, and what is the production behavior? → A: Configurable via CORS_ORIGIN env var (default: http://localhost:5173); CORS middleware disabled when serving static frontend (same-origin)
- Q: Should error responses use the same envelope as success responses? → A: Yes, same envelope always: { data, meta, error } — error responses set data: null and populate error with code and message
- Q: Should the POST /api/search/rebuild endpoint have access protection? → A: No authentication (local-only app); rate-limited to one concurrent rebuild, reject with 409 Conflict if already running

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve a Single Article (Priority: P1) 🎯 MVP

A user navigates to an article URL (by title or page ID) and the API returns the article's metadata and content. This is the core read operation — the foundation of a wiki viewer. The response includes the page title, namespace, latest revision content, and timestamp. Namespace prefixes in titles (e.g., "Category:Star Trek") are resolved correctly so the user can access any page regardless of namespace.

**Why this priority**: Without the ability to fetch a single article, there is no wiki viewer. Every other feature (search, browsing, categories) ultimately leads users to an article page. This is the atomic unit of value.

**Independent Test**: Can be tested by starting the server against a populated database and requesting a known article by title. The JSON response should contain correct page metadata and wikitext content.

**Acceptance Scenarios**:

1. **Given** a running server with imported data, **When** a client requests `GET /api/pages/:title`, **Then** the server returns JSON with the page's ID, title, namespace, latest revision content, contributor, and timestamp with a 200 status.
2. **Given** a running server with imported data, **When** a client requests `GET /api/pages/:title` with a title that does not exist, **Then** the server returns a 404 status with an error message.
3. **Given** a running server with imported data, **When** a client requests a page in a non-default namespace (e.g., "Category:Starships"), **Then** the namespace prefix is parsed correctly and the correct page is returned.
4. **Given** a running server, **When** a client requests `GET /api/pages/by-id/:pageId`, **Then** the server returns the page matching that ID or 404 if not found.

---

### User Story 2 - Browse Articles with Pagination (Priority: P1) 🎯 MVP

A user browses a list of articles with pagination support. The API returns a paginated list of article summaries (title, namespace, page ID) sortable alphabetically. An optional prefix filter lets users jump to articles starting with a specific letter or string, enabling an "A-Z index" style navigation.

**Why this priority**: Users need a way to discover content without knowing exact titles. Browsing with pagination is the most basic content discovery mechanism and enables a usable frontend even without search.

**Independent Test**: Can be tested by requesting the browse endpoint with various page sizes and offsets, verifying correct article counts and ordering. Test prefix filtering by requesting articles starting with "S" and confirming all returned titles begin with "S".

**Acceptance Scenarios**:

1. **Given** a running server with imported data, **When** a client requests `GET /api/pages?limit=20&offset=0`, **Then** the server returns the first 20 articles sorted alphabetically by title, along with total count and pagination metadata.
2. **Given** a running server, **When** a client requests `GET /api/pages?prefix=Star`, **Then** only pages whose titles start with "Star" are returned.
3. **Given** a running server, **When** a client requests `GET /api/pages?namespace=0&limit=10`, **Then** only main-namespace articles are returned, limited to 10 results.
4. **Given** fewer remaining articles than the requested limit, **When** the client requests the last page, **Then** the response contains only the remaining articles and indicates there are no more pages.

---

### User Story 3 - Full-Text Search (Priority: P1) 🎯 MVP

A user enters a search query and the API returns ranked results with text snippets showing where the matches occur. The search leverages SQLite FTS5 for efficient full-text indexing of article content. Results include relevance ranking and contextual snippet excerpts so users can evaluate matches before clicking through.

**Why this priority**: Search is the primary discovery mechanism for a wiki with 200,000+ articles. Users rarely browse alphabetically — they search. Without search, the application is barely usable at scale.

**Independent Test**: Can be tested by indexing the test fixture data, searching for a known term, and verifying the response includes relevant articles with highlighted snippets.

**Acceptance Scenarios**:

1. **Given** a running server with FTS5-indexed data, **When** a client requests `GET /api/search?q=warp+drive`, **Then** the server returns articles containing "warp drive" ranked by relevance, each with a text snippet showing the match in context.
2. **Given** a running server, **When** a client searches for a term that matches no articles, **Then** the server returns an empty results array with a 200 status.
3. **Given** a running server, **When** a client requests `GET /api/search?q=enterprise&limit=5`, **Then** at most 5 results are returned with pagination metadata indicating total match count.
4. **Given** a running server, **When** a client searches for a partial word, **Then** the FTS5 prefix matching returns relevant results (e.g., "enterpri*" matches "Enterprise").

---

### User Story 4 - Category Navigation (Priority: P2)

A user explores the wiki by category. The API provides endpoints to list all categories (with article counts), and to list all pages within a given category. This enables tree-like navigation of the wiki's organizational structure.

**Why this priority**: Category navigation is a secondary discovery path. Users who know the general topic area (e.g., "Star Trek: The Next Generation episodes") can browse by category rather than searching. It requires the category data already extracted by the spec-001 importer.

**Independent Test**: Can be tested by querying the categories endpoint and verifying known categories appear with correct article counts. Then querying a specific category and verifying the correct pages are listed.

**Acceptance Scenarios**:

1. **Given** a running server with imported category data, **When** a client requests `GET /api/categories?limit=20&offset=0`, **Then** the server returns a paginated list of categories with the number of pages in each category.
2. **Given** a running server, **When** a client requests `GET /api/categories/:name/pages`, **Then** the server returns all pages belonging to that category.
3. **Given** a running server, **When** a client requests a category that does not exist, **Then** the server returns a 404 status with an error message.
4. **Given** a running server, **When** a client requests `GET /api/categories?prefix=Star`, **Then** only categories whose names start with "Star" are returned.

---

### User Story 5 - Serve Frontend Static Files (Priority: P2)

In production mode, the Express server serves the Vite-built React frontend from a static directory. Any route not matched by the API falls through to the SPA's `index.html`, supporting client-side routing. In development, the frontend runs on Vite's dev server separately.

**Why this priority**: This completes the deployment story — a single `npm start` command runs both API and frontend. It's not needed for API development or testing, but is required for the end-user experience defined in Constitution Principle X.

**Independent Test**: Can be tested by building a minimal frontend, placing it in the expected directory, starting the server, and verifying that non-API routes return `index.html` while API routes still return JSON.

**Acceptance Scenarios**:

1. **Given** a production build of the frontend exists in the expected directory, **When** a client requests `/`, **Then** the server returns `index.html`.
2. **Given** a production build exists, **When** a client requests `/some/client/route`, **Then** the server returns `index.html` (SPA fallback).
3. **Given** a production build exists, **When** a client requests `/api/pages`, **Then** the server returns JSON (API routes take precedence over static fallback).
4. **Given** no frontend build directory exists, **When** the server starts, **Then** API endpoints still function correctly and requests to non-API routes return a JSON `ApiResponse` with error code `NOT_FOUND` and message "No frontend build available. Run 'npm run build' in client/ to generate static assets."

---

### User Story 6 - Server Startup and Health (Priority: P1)

The server starts with a single command, auto-initializes the database connection (reusing the existing `initializeDatabase` from spec-001), and provides a health check endpoint. Configuration (port, database path) is accepted via environment variables with sensible defaults.

**Why this priority**: The server must start reliably before any other user story can be exercised. Health checks enable basic monitoring and integration testing.

**Independent Test**: Can be tested by starting the server and hitting the health endpoint. Verify the server uses the configured port and database path.

**Acceptance Scenarios**:

1. **Given** a valid database file, **When** the user runs the server start command, **Then** the server starts on the configured port (default: 3000) and logs a startup message.
2. **Given** a running server, **When** a client requests `GET /api/health`, **Then** the server returns a 200 status with database connection status and article count.
3. **Given** no database file at the configured path, **When** the server starts, **Then** it auto-initializes an empty database (tables created) and starts successfully.
4. **Given** environment variable `PORT=8080`, **When** the server starts, **Then** it listens on port 8080 instead of the default.

---

### Edge Cases

- What happens when a page title contains URL-unsafe characters (spaces, slashes, unicode)? The API MUST accept URL-encoded titles and decode them correctly.
- What happens when the database file is locked by an ongoing import? The API MUST return a 503 status with a `Retry-After: 5` header (5 seconds), since SQLite WAL mode allows concurrent reads but the import holds long write transactions.
- What happens when the FTS5 index does not exist yet? The search endpoint MUST return a 503 status with a message indicating the search index needs to be built.
- What happens when a search query contains FTS5 special syntax characters (AND, OR, NOT, *, quotes)? The API MUST sanitize the query to prevent FTS5 syntax errors while still supporting basic prefix matching with `*`.
- What happens when `limit` or `offset` query parameters are negative or non-numeric? The API MUST validate inputs and return a 400 status with a descriptive error message.
- What happens when a very large `limit` is requested (e.g., 100,000)? The API MUST cap the maximum page size at a reasonable limit (e.g., 100) to prevent excessive memory usage.
- What happens when `POST /api/search/rebuild` is called while a rebuild is already in progress? The API MUST return a 409 Conflict status with a message indicating the rebuild is already running.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an Express.js HTTP server that exposes a REST JSON API for reading wiki data from the SQLite database.
- **FR-002**: The system MUST provide a `GET /api/pages/:title` endpoint that returns a single page's metadata (page ID, title, namespace) and the content of its latest revision (revision ID, text content, timestamp, contributor).
- **FR-003**: The system MUST provide a `GET /api/pages/by-id/:pageId` endpoint as an alternative lookup by numeric page ID.
- **FR-004**: The system MUST provide a `GET /api/pages` endpoint that returns a paginated list of pages with `limit` (default: 20, max: 100), `offset` (default: 0), optional `prefix` filter, and optional `namespace` filter. The response MUST include `total` count and pagination metadata.
- **FR-005**: The system MUST provide a `GET /api/search` endpoint that queries a SQLite FTS5 index, returning ranked results with `snippet()` excerpts. The endpoint MUST accept `q` (search terms), `limit` (default: 20, max: 100), and `offset` (default: 0) parameters.
- **FR-006**: The system MUST create and maintain an FTS5 virtual table indexing the `text_content` of the latest revision of each page. The FTS5 index MUST be buildable via both (a) a CLI command (e.g., `mw-index --database ./memory-alpha.db`) for initial setup and scripted workflows, and (b) a `POST /api/search/rebuild` API endpoint for on-demand re-indexing without server restart.
- **FR-007**: The system MUST provide a `GET /api/categories` endpoint that returns a paginated list of categories with article counts, supporting `limit`, `offset`, and `prefix` filter parameters.
- **FR-008**: The system MUST provide a `GET /api/categories/:name/pages` endpoint that returns all pages belonging to a given category, with pagination support.
- **FR-009**: The system MUST provide a `GET /api/health` endpoint that returns server status, database connection state, and basic statistics (total pages, total categories).
- **FR-010**: The system MUST serve Vite-built static frontend assets from a configurable directory (default: `../client/dist`) when the directory exists. Non-API routes MUST fall through to `index.html` for SPA routing.
- **FR-011**: The system MUST accept configuration via environment variables: `PORT` (default: 3000), `DATABASE_PATH` (default: `./memory-alpha.db`), `STATIC_DIR` (default: `../client/dist`), `CORS_ORIGIN` (default: `http://localhost:5173`).
- **FR-012**: The system MUST validate all query parameters and URL parameters, returning 400 status with descriptive error messages for invalid input.
- **FR-013**: The system MUST set CORS headers using the origin specified by the `CORS_ORIGIN` environment variable (default: `http://localhost:5173`) to allow the Vite dev server to make API requests during development. CORS middleware MUST be disabled when the static frontend directory exists and is being served (same-origin production mode).
- **FR-014**: The system MUST handle namespace-prefixed titles (e.g., "Category:Starships") by parsing the prefix and matching against the namespaces table.
- **FR-015**: The system MUST reuse the existing database initialization (`initializeDatabase`) and model classes (`PageModel`, `RevisionModel`, `NamespaceModel`, `CategoryModel`) from the spec-001 implementation.
- **FR-016**: The system MUST log all HTTP requests to stdout in a structured format including HTTP method, request path, response status code, and response duration in milliseconds.
- **FR-017**: The `POST /api/search/rebuild` endpoint MUST reject concurrent rebuild requests with a 409 Conflict status if a rebuild is already in progress. No authentication is required (local-only application per Constitution Principle X).

### Key Entities

- **API Response Envelope**: Standard wrapper for ALL API responses (success and error) containing `data` (the payload, null on error), `meta` (pagination info: total, limit, offset, hasMore; null when not applicable), and `error` (null on success; on error: object with `code` string and `message` string). Clients always parse the same shape and check `error` first.
- **Page Summary**: Lightweight representation of a page for list/browse responses: page ID, title, namespace ID, namespace name.
- **Page Detail**: Full representation of a page for single-article responses: page ID, title, namespace ID, namespace name, latest revision content, revision timestamp, contributor name.
- **Search Result**: A page match from the FTS5 query: page ID, title, namespace name, relevance rank, text snippet with match highlights.
- **Category Summary**: A category with its article count: category ID, name, page count.
- **FTS5 Index**: Virtual table (`search_index`) indexing the text content of the latest revision for each page, enabling full-text search with ranking and snippet extraction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can retrieve any article by title in under 1 second response time for a database with 200,000+ pages.
- **SC-002**: Search queries return ranked results with snippets in under 2 seconds for a database with 200,000+ pages.
- **SC-003**: Paginated browsing of articles loads a page of 20 results in under 1 second.
- **SC-004**: The server starts and is ready to serve requests within 5 seconds from launch.
- **SC-005**: All API endpoints return valid JSON responses with consistent envelope structure and appropriate HTTP status codes.
- **SC-006**: The server runs with a single start command and no external service dependencies (Constitution Principle X).
- **SC-007**: Category navigation returns pages for any category in under 1 second.
- **SC-008**: The API correctly handles 50 concurrent read requests without errors or significant degradation.

## Assumptions

- The SQLite database has already been populated by the spec-001 XML importer before the API is expected to serve meaningful content. The server still starts and responds to health checks with an empty database.
- The FTS5 index is built as a separate step after import (either a CLI command or an API-triggered rebuild). It is not built automatically on every server start.
- The existing `server/` workspace, `shared/` types, and model classes from spec-001 are the foundation. New API code extends this codebase rather than creating a parallel structure.
- Redirect pages (`#REDIRECT [[Target]]`) are stored as-is. Redirect resolution (following the redirect to the target page) is deferred to the frontend feature specification.
- MediaWiki wikitext is returned as-is from the API. Rendering wikitext to HTML is the responsibility of the frontend (spec-003). The API serves raw wikitext content.
- The "latest revision" for a page is the revision with the highest `revision_id` for that `page_id`.
- CORS is needed only during development when the frontend runs on a separate Vite dev server. In production, the Express server serves both API and frontend from the same origin.
