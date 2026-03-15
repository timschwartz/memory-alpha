# Data Model: Database Download Management

**Feature**: 006-database-download-mgmt  
**Date**: 2026-03-15

## Entities

### XmlFileInfo

Represents an XML file in the data directory as presented to the client.

| Field | Type | Description |
|-------|------|-------------|
| `filename` | string | File name (e.g., `enmemoryalpha_pages_current.xml`) |
| `sizeBytes` | number | File size in bytes |
| `sizeHuman` | string | Human-readable size (e.g., `"742 MB"`) |
| `modifiedAt` | string (ISO 8601) | Last modification timestamp |
| `ageMs` | number | Milliseconds since last modification |
| `isMemoryAlphaDump` | boolean | Whether this is the known Memory Alpha dump file |
| `isFresh` | boolean | Whether the file is less than 7 days old |

**Source**: Derived from `fs.stat()` on each `.xml` file in the data directory. Not persisted — computed on every request.

**Validation Rules**:
- `filename` must end with `.xml`
- `sizeBytes` must be >= 0
- `modifiedAt` must be a valid ISO 8601 date string

---

### DownloadStatus

Represents the current state of a download/decompression operation. Maintained in server memory (singleton — only one active operation at a time).

| Field | Type | Description |
|-------|------|-------------|
| `state` | `'idle' \| 'downloading' \| 'decompressing' \| 'complete' \| 'failed' \| 'cancelled'` | Current operation phase |
| `phase` | `'download' \| 'decompress' \| null` | Active phase label for UI display |
| `percent` | number \| null | Progress percentage (0–100 for download; 0–100 for decompress; null when indeterminate) |
| `downloadedBytes` | number \| null | Bytes downloaded so far |
| `totalBytes` | number \| null | Total file size from Content-Length header |
| `error` | string \| null | Error message if state is `'failed'` |
| `startedAt` | string \| null | ISO 8601 timestamp when operation started |
| `completedAt` | string \| null | ISO 8601 timestamp when operation completed |

**State Transitions**:

```
idle → downloading → decompressing → complete
                  ↘               ↘
                   failed          failed
                  ↘               ↘
                   cancelled       cancelled

complete → idle  (reset on next operation)
failed → idle    (reset on retry)
cancelled → idle (reset after cleanup)
```

**Invariants**:
- Only one download operation can be active at a time (singleton state)
- `percent` is non-null only when `state` is `'downloading'` or `'decompressing'`
- `error` is non-null only when `state` is `'failed'`
- Transition to `'idle'` always cleans up partial files

---

### SSE Event Types

Events sent over Server-Sent Events streams for both download and indexing progress.

#### Download Events (`/api/database/events`)

| Event Name | Payload | When |
|------------|---------|------|
| `progress` | `{ state, phase, percent, downloadedBytes, totalBytes }` | During download/decompress |
| `complete` | `{ filename, sizeBytes, sizeHuman }` | Operation succeeded |
| `error` | `{ message }` | Operation failed |
| `cancelled` | `{}` | Operation cancelled by user |

#### Indexing Events (`/api/indexing/events`)

| Event Name | Payload | When |
|------------|---------|------|
| `progress` | `{ state, indexedPages, totalPages, percentage, durationMs }` | During indexing |
| `complete` | `{ indexedPages, totalPages, durationMs }` | Indexing finished |
| `error` | `{ message }` | Indexing failed |

---

## Relationships

```
Settings Page
├── Database Section
│   ├── XmlFileInfo[]        ← GET /api/database/files
│   ├── DownloadStatus       ← SSE /api/database/events
│   └── Import trigger       → POST /api/indexing/start (existing)
└── Indexing Section
    ├── IndexingStatus       ← GET /api/indexing/status (existing, for initial load)
    └── IndexingProgress     ← SSE /api/indexing/events (new, replaces polling)
```

The `XmlFileInfo` list and `DownloadStatus` are independent — the file list is refreshed via REST after operations complete, while `DownloadStatus` streams in real-time via SSE.
