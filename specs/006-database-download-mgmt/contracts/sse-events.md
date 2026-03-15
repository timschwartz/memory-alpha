# SSE Event Contract: Database & Indexing Streams

**Feature**: 006-database-download-mgmt  
**Date**: 2026-03-15

## Connection Protocol

Both SSE endpoints follow the same connection pattern:

1. Client opens `EventSource` to the endpoint URL
2. Server responds with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
3. Server sends events as they occur
4. Client closes connection when it receives `complete`, `error`, or `cancelled` event
5. If client disconnects, server removes the listener but the underlying operation continues

---

## Download Events: `/api/database/events`

### `progress`

Sent repeatedly during download and decompression phases.

```typescript
interface DownloadProgressEvent {
  state: 'downloading' | 'decompressing';
  phase: 'download' | 'decompress';
  percent: number | null;       // 0-100 when known, null when indeterminate
  downloadedBytes: number | null; // only during download phase
  totalBytes: number | null;      // only during download phase (from Content-Length)
}
```

**Frequency**: At least every 5 seconds; may be more frequent during active transfer (every ~500ms on fast connections).

### `complete`

Sent once when the entire operation (download + decompress + archive cleanup) succeeds.

```typescript
interface DownloadCompleteEvent {
  filename: string;      // e.g., "enmemoryalpha_pages_current.xml"
  sizeBytes: number;
  sizeHuman: string;     // e.g., "742 MB"
}
```

### `error`

Sent once when the operation fails. No further events after this.

```typescript
interface DownloadErrorEvent {
  message: string;       // Human-readable error description
}
```

### `cancelled`

Sent once when the user cancels the operation.

```typescript
interface DownloadCancelledEvent {}
```

---

## Indexing Events: `/api/indexing/events`

### `progress`

Sent repeatedly during indexing.

```typescript
interface IndexingProgressEvent {
  state: 'in-progress';
  indexedPages: number;
  totalPages: number;
  percentage: number;      // 0-100, one decimal precision
  durationMs: number;
}
```

**Frequency**: Every ~1 second (one event per batch of pages indexed).

### `complete`

Sent once when indexing finishes.

```typescript
interface IndexingCompleteEvent {
  indexedPages: number;
  totalPages: number;
  durationMs: number;
}
```

### `error`

Sent once when indexing fails.

```typescript
interface IndexingErrorEvent {
  message: string;
}
```

---

## Client Reconnection

If the SSE connection drops unexpectedly:
- The client should use `GET /api/database/status` or `GET /api/indexing/status` to check current state
- If an operation is still in progress, reconnect to the SSE endpoint
- The `EventSource` API handles automatic reconnection by default; however, the client should verify state on reconnect since events during the disconnect are lost
