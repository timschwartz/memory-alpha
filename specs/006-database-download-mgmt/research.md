# Research: Database Download Management

**Feature**: 006-database-download-mgmt  
**Date**: 2026-03-15

## R1: 7z Decompression in Node.js

### Decision: `7z-wasm`

A WebAssembly build of 7-Zip 24.09 compiled with Emscripten. No native binary dependencies — pure WASM that runs in any JS environment.

### Rationale

- **No native binaries**: Unlike `node-7z` + `7zip-bin` (which ships platform-specific executables), `7z-wasm` is a single WASM bundle that runs anywhere Node.js runs. Simpler install, no platform edge cases.
- **Built-in TypeScript**: Declarations included out of the box.
- **Modern 7-Zip**: Based on 7-Zip 24.09 (Nov 2024), supports all 7z format variants.
- **Active**: 6,167 weekly downloads, v1.2.0, last published ~9 months ago.
- **Small footprint**: 1.83 MB unpacked.

### Architecture: Worker Thread for Non-Blocking Execution

`callMain()` is synchronous (WASM execution blocks the event loop). Solution: run decompression in a Node.js Worker thread.

```
Main thread (Express)          Worker thread
──────────────────────         ──────────────
POST /api/database/download    
  → start download (streaming)    
  → download complete            
  → spawn Worker ────────────→  import SevenZip
    ← progress messages ←───── callMain(["x", ...])
    ← done/error ←────────────   (with NODEFS mount)
```

- **Cancellation**: `worker.terminate()` kills the WASM execution. Main thread cleans up partial files.
- **Progress**: Emscripten print callbacks capture 7z CLI stdout, parse percentage, post to main thread via `parentPort.postMessage()`.
- **Filesystem**: NODEFS mount gives direct disk access — no need to load files into WASM memory.

### Alternatives Considered

| Package | Rejected Because |
|---------|-----------------|
| `node-7z` + `7zip-bin` | Requires shipping native binaries per platform; adds two dependencies |
| `7zip-min` | No cancellation support, no progress events |
| `node-7z-forall` | Deprecated |
| System `7z` binary | Requires manual installation, violates portability goal |

### Install

```bash
npm install 7z-wasm
```

One dependency, zero native binaries.

---

## R2: Server-Sent Events (SSE) with Express

### Decision: Native Express SSE (no library)

SSE is simple enough to implement directly with Express response objects. No library needed.

### Rationale

- SSE is a standard HTTP feature — set `Content-Type: text/event-stream`, `Connection: keep-alive`, `Cache-Control: no-cache`, then write `data: ...\n\n` frames.
- Express 5's `res.write()` / `res.flush()` work natively for streaming.
- Adding an SSE library for a simple unidirectional stream is unnecessary overhead.
- Client uses the native `EventSource` API (browser-built-in, no library needed).

### Pattern

**Server** (Express route):
```typescript
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Send progress updates...
  sendEvent('progress', { phase: 'downloading', percent: 42 });

  // Client disconnect cleanup
  req.on('close', () => { /* cleanup */ });
});
```

**Client** (React hook):
```typescript
const source = new EventSource('/api/database/events');
source.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  // update state
});
source.addEventListener('complete', () => source.close());
source.addEventListener('error', () => source.close());
```

### Alternatives Considered

| Approach | Rejected Because |
|----------|-----------------|
| WebSocket (ws/socket.io) | Bidirectional capability unnecessary; adds dependency and protocol complexity |
| Polling | Adds latency (2s intervals currently used for indexing); more HTTP overhead; less smooth UX |
| SSE library (e.g., `better-sse`) | Unnecessary abstraction; native Express SSE is ~10 lines |

---

## R3: Indexing SSE Migration Scope

### Decision: Migrate to SSE with backward-compatible pattern

### Current State

The indexing feature uses client-side polling:
- **Server**: `GET /api/indexing/status` returns current `IndexingStatus` JSON
- **Client**: `SettingsPage.tsx` polls every 2 seconds via `setInterval` while `state === 'in-progress'`

### Migration Plan

1. **Add SSE endpoint**: `GET /api/indexing/events` — streams progress during indexing
2. **Keep REST endpoint**: `GET /api/indexing/status` remains for initial state load on page mount
3. **Client**: Replace `setInterval` polling with `EventSource` subscription when indexing is in-progress
4. **Shared hook**: Both indexing and download will use the same `useSSE` React hook

### Impact

- **Server**: Add ~20 lines to `indexing.ts` for the SSE endpoint + broadcasting progress from the `buildIncrementalAsync` loop
- **Client**: Replace `setInterval`/`clearInterval` in `SettingsPage.tsx` with `useSSE` hook
- **Shared types**: Add SSE event type definitions alongside existing `IndexingStatus`

---

## R4: HTTP Download with Progress

### Decision: Node.js native `fetch` (or `http`/`https`) with streaming

### Rationale

- Node.js 20+ has built-in `fetch` with streaming response bodies via `ReadableStream`.
- The download URL returns `Content-Length` header, enabling percentage calculation.
- No library needed — `response.body` is a `ReadableStream` that can be piped to a file write stream.
- Alternative: `node:https` module with `response.on('data')` events for even more control.

### Pattern

```typescript
const response = await fetch(url);
const contentLength = Number(response.headers.get('content-length'));
const reader = response.body!.getReader();
let downloaded = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  downloaded += value.length;
  fileStream.write(value);
  onProgress(downloaded / contentLength * 100);
}
```

### Cancellation

`AbortController` passed to `fetch()`:
```typescript
const controller = new AbortController();
const response = await fetch(url, { signal: controller.signal });
// Later: controller.abort();
```

---

## R5: File Age / Freshness Calculation

### Decision: Use `fs.stat()` `mtime` (modification time)

### Rationale

- File modification time is the simplest reliable indicator of when data was acquired.
- No need to store download timestamps separately — `mtime` is set when the file is written.
- Comparing `Date.now() - mtime` against 7 days (604,800,000 ms) is a single arithmetic operation.
- Human-readable age formatting: "3 days ago", "12 hours ago", etc.

### Alternatives Considered

| Approach | Rejected Because |
|----------|-----------------|
| Store download date in SQLite/JSON | Adds unnecessary persistence layer for a single timestamp already on the filesystem |
| Query remote server `Last-Modified` | Adds network dependency on every page load; URL may not return this header |
