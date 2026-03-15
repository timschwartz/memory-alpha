# Quickstart: Indexing Management

**Feature**: 004-indexing-management
**Date**: 2026-03-15

## Prerequisites

- Database populated via `mw-import` CLI (Feature 001)
- Server running or CLI available

## CLI Usage

### Build index (with resume)

```bash
# From repo root
cd server
npx tsx src/cli/index-search.ts -d ../memory-alpha.db
```

Progress displays on stderr:
```
Indexing: 45.2% (100500/223145 pages) [28.3s]
```

If interrupted (Ctrl+C), restart the same command to resume.

### Force full rebuild

```bash
npx tsx src/cli/index-search.ts -d ../memory-alpha.db --rebuild
```

## Server API

### Start indexing

```bash
# Resume from checkpoint
curl -X POST http://localhost:3000/api/indexing/start \
  -H "Content-Type: application/json" \
  -d '{"mode":"continue"}'

# Full rebuild
curl -X POST http://localhost:3000/api/indexing/start \
  -H "Content-Type: application/json" \
  -d '{"mode":"rebuild"}'
```

### Check status

```bash
curl http://localhost:3000/api/indexing/status
```

## Settings Page

1. Start the application (`npm start` from repo root)
2. Open browser to `http://localhost:3000`
3. Click **Settings** in the navigation bar
4. The **Indexing** section shows:
   - Current index status (idle / in-progress / complete)
   - Number of indexed pages vs total pages
   - **Continue Indexing** button (resumes from checkpoint)
   - **Rebuild Index** button (wipes and re-indexes)
5. While indexing runs, a progress bar updates automatically every 2 seconds

## Development

### Run tests

```bash
# Server unit tests
cd server && npx vitest run tests/unit/fts5-indexer.test.ts

# Server integration tests
cd server && npx vitest run tests/integration/indexing-route.test.ts

# Client component tests
cd client && npx vitest run tests/components/SettingsPage.test.tsx
```

### Key files

| File | Purpose |
|------|---------|
| `server/src/lib/fts5-indexer.ts` | Core indexer with incremental build, batch commits, progress |
| `server/src/cli/index-search.ts` | CLI entry point with progress display and --rebuild flag |
| `server/src/api/routes/indexing.ts` | REST endpoints for start and status |
| `client/src/pages/SettingsPage.tsx` | Settings page with indexing controls |
| `shared/src/types/wiki.ts` | IndexingStatus shared type |
