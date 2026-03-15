# REST API Contract: Database Management

**Feature**: 006-database-download-mgmt  
**Base Path**: `/api/database`

---

## GET /api/database/files

List all XML files in the data directory.

**Request**: No parameters.

**Response** `200 OK`:
```json
{
  "data": [
    {
      "filename": "enmemoryalpha_pages_current.xml",
      "sizeBytes": 778043392,
      "sizeHuman": "742 MB",
      "modifiedAt": "2026-03-12T14:30:00.000Z",
      "ageMs": 259200000,
      "isMemoryAlphaDump": true,
      "isFresh": true
    }
  ],
  "meta": null,
  "error": null
}
```

**Response** `200 OK` (empty directory):
```json
{
  "data": [],
  "meta": null,
  "error": null
}
```

---

## POST /api/database/download

Start downloading the Memory Alpha XML dump. Returns immediately; progress is streamed via SSE.

**Request Body**: None (URL is hardcoded server-side for security — no user-supplied URLs).

**Response** `202 Accepted`:
```json
{
  "data": { "status": "started" },
  "meta": null,
  "error": null
}
```

**Response** `409 Conflict` (download already in progress):
```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "DOWNLOAD_IN_PROGRESS",
    "message": "A download is already in progress"
  }
}
```

---

## POST /api/database/cancel

Cancel an in-progress download or decompression.

**Request Body**: None.

**Response** `200 OK`:
```json
{
  "data": { "status": "cancelled" },
  "meta": null,
  "error": null
}
```

**Response** `409 Conflict` (no active operation):
```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "NO_ACTIVE_DOWNLOAD",
    "message": "No download or decompression operation is in progress"
  }
}
```

---

## GET /api/database/status

Get the current download/decompression status (for initial page load).

**Request**: No parameters.

**Response** `200 OK`:
```json
{
  "data": {
    "state": "downloading",
    "phase": "download",
    "percent": 42.5,
    "downloadedBytes": 83886080,
    "totalBytes": 197132288,
    "error": null,
    "startedAt": "2026-03-15T10:30:00.000Z",
    "completedAt": null
  },
  "meta": null,
  "error": null
}
```

---

## GET /api/database/events

Server-Sent Events stream for real-time progress updates.

**Request**: No parameters. Connection stays open.

**Response** `200 OK` with `Content-Type: text/event-stream`:

```
event: progress
data: {"state":"downloading","phase":"download","percent":42.5,"downloadedBytes":83886080,"totalBytes":197132288}

event: progress
data: {"state":"decompressing","phase":"decompress","percent":65.0,"downloadedBytes":null,"totalBytes":null}

event: complete
data: {"filename":"enmemoryalpha_pages_current.xml","sizeBytes":778043392,"sizeHuman":"742 MB"}

event: error
data: {"message":"Network error: connection reset"}

event: cancelled
data: {}
```

**Client disconnect**: Server cleans up the SSE connection listener. The underlying operation continues (it's decoupled from SSE connections).

---

## GET /api/indexing/events *(new — SSE migration)*

Server-Sent Events stream for real-time indexing progress. Replaces client-side polling of `GET /api/indexing/status`.

**Response** `200 OK` with `Content-Type: text/event-stream`:

```
event: progress
data: {"state":"in-progress","indexedPages":15000,"totalPages":50000,"percentage":30.0,"durationMs":12500}

event: complete
data: {"indexedPages":50000,"totalPages":50000,"durationMs":45200}

event: error
data: {"message":"Indexing failed: database locked"}
```

---

## POST /api/database/import

Trigger the mw-import pipeline for a specific XML file.

**Request Body**:
```json
{
  "filename": "enmemoryalpha_pages_current.xml"
}
```

**Response** `202 Accepted`:
```json
{
  "data": { "status": "started", "filename": "enmemoryalpha_pages_current.xml" },
  "meta": null,
  "error": null
}
```

**Response** `400 Bad Request` (invalid filename):
```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "INVALID_FILENAME",
    "message": "Filename must be a valid .xml file in the data directory"
  }
}
```

**Response** `404 Not Found` (file doesn't exist):
```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: example.xml"
  }
}
```

**Response** `409 Conflict` (import already running):
```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "IMPORT_IN_PROGRESS",
    "message": "An import is already in progress"
  }
}
```

---

## Notes

- All responses follow the standard `ApiResponse<T>` envelope: `{ data, meta, error }`.
- The download URL is hardcoded server-side (`https://s3.amazonaws.com/wikia_xml_dumps/e/en/enmemoryalpha_pages_current.xml.7z`) — the client never sends URLs. This prevents SSRF.
- Filenames in `POST /api/database/import` are validated against actual files in the data directory (path traversal prevention).
