# API Contract: Express.js REST API

**Feature**: 002-express-rest-api
**Date**: 2026-03-15
**Base URL**: `http://localhost:{PORT}/api` (default PORT: 3000)

---

## Response Envelope

All endpoints return the same JSON envelope:

```json
{
  "data": <payload | null>,
  "meta": <pagination | null>,
  "error": <error | null>
}
```

**Success** (2xx):
```json
{
  "data": { ... },
  "meta": { "total": 1234, "limit": 20, "offset": 0, "hasMore": true },
  "error": null
}
```

**Error** (4xx/5xx):
```json
{
  "data": null,
  "meta": null,
  "error": { "code": "NOT_FOUND", "message": "Page not found" }
}
```

**Error codes**: `NOT_FOUND`, `BAD_REQUEST`, `SEARCH_INDEX_NOT_BUILT`, `REBUILD_IN_PROGRESS`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`

---

## Endpoints

### GET /api/health

Health check and database status.

**Parameters**: None

**Response** (200):
```json
{
  "data": {
    "status": "ok",
    "database": "connected",
    "totalPages": 223151,
    "totalCategories": 8432,
    "searchIndexReady": true
  },
  "meta": null,
  "error": null
}
```

---

### GET /api/pages

Browse articles with pagination, optional namespace and prefix filtering.

**Query Parameters**:

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| limit | integer | 20 | 1–100 | Results per page |
| offset | integer | 0 | >= 0 | Offset for pagination |
| prefix | string | (none) | (none) | Filter titles starting with this string |
| namespace | integer | (none) | valid namespace_id | Filter by namespace |

**Response** (200):
```json
{
  "data": [
    {
      "page_id": 1234,
      "title": "USS Enterprise (NCC-1701)",
      "namespace_id": 0,
      "namespace_name": ""
    }
  ],
  "meta": {
    "total": 223151,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "error": null
}
```

**Errors**:
- 400 `BAD_REQUEST`: Invalid limit, offset, or namespace value

---

### GET /api/pages/:title

Retrieve a single article by title. Titles may include namespace prefixes (e.g., "Category:Starships").

**URL Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| title | string | URL-encoded page title, optionally namespace-prefixed |

**Response** (200):
```json
{
  "data": {
    "page_id": 1234,
    "title": "USS Enterprise (NCC-1701)",
    "namespace_id": 0,
    "namespace_name": "",
    "latest_revision": {
      "revision_id": 56789,
      "text_content": "{{sidebar}}\nThe '''USS Enterprise'''...",
      "timestamp": "2025-12-15T10:30:00Z",
      "contributor_name": "WikiAdmin"
    },
    "categories": ["Federation starships", "Constitution class starships"]
  },
  "meta": null,
  "error": null
}
```

**Errors**:
- 404 `NOT_FOUND`: Page with the given title does not exist

**Namespace resolution**: If the title contains a `:` prefix matching a known namespace name (e.g., "Category:"), the prefix is stripped and the corresponding `namespace_id` is used for lookup. If no namespace prefix is found, defaults to namespace 0 (main).

---

### GET /api/pages/by-id/:pageId

Retrieve a single article by numeric page ID.

**URL Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| pageId | integer | The page_id from the database |

**Response** (200): Same shape as `GET /api/pages/:title`

**Errors**:
- 400 `BAD_REQUEST`: pageId is not a valid integer
- 404 `NOT_FOUND`: No page with the given ID

---

### GET /api/search

Full-text search across article content and titles.

**Query Parameters**:

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| q | string | (required) | non-empty | Search terms |
| limit | integer | 20 | 1–100 | Results per page |
| offset | integer | 0 | >= 0 | Offset for pagination |

**Response** (200):
```json
{
  "data": [
    {
      "page_id": 1234,
      "title": "Warp drive",
      "namespace_name": "",
      "snippet": "...the <mark>warp</mark> <mark>drive</mark> was invented...",
      "rank": -12.345
    }
  ],
  "meta": {
    "total": 87,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "error": null
}
```

**Notes**:
- `rank` is the FTS5 BM25 relevance score (more negative = more relevant)
- `snippet` contains `<mark>` tags around matched terms
- The `q` parameter is sanitized to prevent FTS5 syntax errors. Each word is quoted and prefix-matched (e.g., "warp drive" → `"warp"* "drive"*`)

**Errors**:
- 400 `BAD_REQUEST`: Missing or empty `q` parameter, invalid limit/offset
- 503 `SEARCH_INDEX_NOT_BUILT`: FTS5 index has not been created yet

---

### POST /api/search/rebuild

Trigger a full rebuild of the FTS5 search index. Long-running operation.

**Parameters**: None (request body ignored)

**Response** (200):
```json
{
  "data": {
    "indexedPages": 223151,
    "durationMs": 45230
  },
  "meta": null,
  "error": null
}
```

**Errors**:
- 409 `REBUILD_IN_PROGRESS`: A rebuild is already running

**Notes**: This operation blocks the response until complete. For 223K pages, expect 30–120 seconds. The caller should set an appropriate timeout.

---

### GET /api/categories

List categories with article counts.

**Query Parameters**:

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| limit | integer | 20 | 1–100 | Results per page |
| offset | integer | 0 | >= 0 | Offset for pagination |
| prefix | string | (none) | (none) | Filter category names starting with this string |

**Response** (200):
```json
{
  "data": [
    {
      "category_id": 42,
      "name": "Federation starships",
      "page_count": 312
    }
  ],
  "meta": {
    "total": 8432,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "error": null
}
```

**Errors**:
- 400 `BAD_REQUEST`: Invalid limit or offset

---

### GET /api/categories/:name/pages

List all pages in a category.

**URL Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| name | string | URL-encoded category name |

**Query Parameters**:

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| limit | integer | 20 | 1–100 | Results per page |
| offset | integer | 0 | >= 0 | Offset for pagination |

**Response** (200):
```json
{
  "data": [
    {
      "page_id": 1234,
      "title": "USS Enterprise (NCC-1701)",
      "namespace_id": 0,
      "namespace_name": ""
    }
  ],
  "meta": {
    "total": 312,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "error": null
}
```

**Errors**:
- 400 `BAD_REQUEST`: Invalid limit or offset
- 404 `NOT_FOUND`: Category with the given name does not exist

---

## CLI Contract: mw-index

FTS5 search index builder CLI command.

**Usage**:
```
mw-index [options]
```

**Options**:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| --database, -d | string | ./memory-alpha.db | Path to SQLite database |

**Output** (stdout):
```
Building FTS5 search index...
Indexed 223,151 pages in 45.2s
```

**Exit codes**:
- 0: Success
- 1: Error (database not found, no pages to index)

---

## HTTP Headers

### CORS (Development Mode)

When the static frontend directory does NOT exist (development mode):
```
Access-Control-Allow-Origin: {CORS_ORIGIN}
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

When the static frontend directory exists (production mode): CORS headers are NOT set (same-origin).

### Content-Type

All API responses: `Content-Type: application/json; charset=utf-8`

### Request Logging (stdout)

Each request logs a JSON line to stdout:
```json
{"method": "GET", "path": "/api/pages/Enterprise", "status": 200, "durationMs": 12}
```
