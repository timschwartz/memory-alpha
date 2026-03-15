# API Contract: Indexing Endpoints

**Feature**: 004-indexing-management
**Date**: 2026-03-15
**Base path**: `/api/indexing`

## POST /api/indexing/start

Trigger an indexing operation. Returns immediately; indexing runs in the background.

### Request

```json
{
  "mode": "continue" | "rebuild"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mode | string | Yes | `"continue"` to resume from last checkpoint. `"rebuild"` to wipe index and re-index all pages. |

### Response — 202 Accepted

```json
{
  "data": {
    "status": "started",
    "totalPages": 223145
  },
  "meta": null,
  "error": null
}
```

### Response — 409 Conflict (indexing already in progress)

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "INDEXING_IN_PROGRESS",
    "message": "Indexing is already in progress"
  }
}
```

### Response — 400 Bad Request (invalid mode)

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "INVALID_MODE",
    "message": "Mode must be 'continue' or 'rebuild'"
  }
}
```

---

## GET /api/indexing/status

Query the current indexing state.

### Request

No parameters.

### Response — 200 OK (idle / never run)

```json
{
  "data": {
    "state": "idle",
    "indexedPages": 0,
    "totalPages": 223145,
    "percentage": 0,
    "startedAt": null,
    "completedAt": null,
    "durationMs": null
  },
  "meta": null,
  "error": null
}
```

### Response — 200 OK (in progress)

```json
{
  "data": {
    "state": "in-progress",
    "indexedPages": 45000,
    "totalPages": 223145,
    "percentage": 20.2,
    "startedAt": "2026-03-15T10:30:00.000Z",
    "completedAt": null,
    "durationMs": 12345
  },
  "meta": null,
  "error": null
}
```

### Response — 200 OK (complete)

```json
{
  "data": {
    "state": "complete",
    "indexedPages": 223145,
    "totalPages": 223145,
    "percentage": 100,
    "startedAt": "2026-03-15T10:30:00.000Z",
    "completedAt": "2026-03-15T10:35:42.000Z",
    "durationMs": 342000
  },
  "meta": null,
  "error": null
}
```

---

## CLI Contract

### Command: `mw-index`

```
mw-index [options]

Options:
  -d, --database <path>   Path to SQLite database (default: ./memory-alpha.db)
  --rebuild               Wipe existing index and re-index all pages from scratch
  -h, --help              Display help
```

### Behavior

| Scenario | Flag | Action |
|----------|------|--------|
| No existing index | (none) | Index all pages with progress |
| Partial index | (none) | Resume from last checkpoint |
| Complete index | (none) | Report "Index is up to date" and exit |
| Any state | `--rebuild` | Delete all index data, re-index all pages |

### Progress output (stderr)

```
Indexing: 20.2% (45000/223145 pages) [12.3s]
```

Final line (stderr → newline, then stdout):
```
Indexed 223,145 pages in 342.0s
```

---

## Response Envelope

All responses follow the existing `ApiResponse<T>` pattern from `@memory-alpha/shared`:

```typescript
interface ApiResponse<T> {
  data: T | null;
  meta: PaginationMeta | null;
  error: ApiError | null;
}
```
