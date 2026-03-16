# Contributing to Memory Alpha

Developer documentation for building, testing, and extending the project.

## Project Structure

This is an npm workspaces monorepo with three packages:

| Package | Description |
|---------|-------------|
| `@memory-alpha/shared` | Shared TypeScript types |
| `@memory-alpha/server` | Express 5 REST API + CLI tools |
| `@memory-alpha/client` | React 19 SPA with LCARS-inspired UI |

## Development Setup

```bash
# Install dependencies
npm install

# Build all packages (shared → server → client)
npm run build

# Start the API server
cd server && npm run serve

# In another terminal, start the Vite dev server (proxies /api → localhost:3000)
cd client && npm run dev
```

The client dev server runs at `http://localhost:5173`.

### Testing

```bash
cd server && npx vitest run   # Server tests
cd client && npm test          # Client tests (jsdom)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server listen port |
| `DATABASE_PATH` | `../memory-alpha.db` | SQLite database path |
| `STATIC_DIR` | `../client/dist` | Built client files (production) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (dev only) |

## CLI Tools

### `mw-import` — Import MediaWiki XML

```bash
npx mw-import <xml-file> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --database <path>` | `./memory-alpha.db` | SQLite database path |
| `-n, --namespaces <ids>` | all | Comma-separated namespace IDs to import (e.g. `0,14`) |
| `-l, --log <path>` | `./import.log` | Log file path |

Uses a streaming SAX parser (`saxes`) to handle multi-GB XML exports without loading them into memory.

### `mw-index` — Build Full-Text Search Index

```bash
npx mw-index [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --database <path>` | `./memory-alpha.db` | SQLite database path |
| `--rebuild` | false | Wipe existing index and re-index all pages |

Supports incremental indexing and handles SIGINT gracefully.

## API Reference

All responses use the envelope `{ data, meta, error }`.

### Pages & Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with page/category counts and search index status |
| GET | `/api/pages` | List pages — query: `limit`, `offset`, `prefix`, `namespace` |
| GET | `/api/pages/by-id/:pageId` | Get page by numeric ID |
| GET | `/api/pages/:title` | Get page by title (supports namespace prefixes like `Category:Ships`) |
| GET | `/api/search?q=<query>` | Full-text search with pagination |
| POST | `/api/search/rebuild` | Trigger FTS5 index rebuild |
| GET | `/api/categories` | List categories with optional `prefix` filter |
| GET | `/api/categories/:name/pages` | Pages in a category |

Pagination params: `limit` (1–100, default 20), `offset` (default 0).

### Indexing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/indexing/start` | Start indexing — body: `{ mode: "continue" \| "rebuild" }` |
| GET | `/api/indexing/status` | Indexing progress (state, percentage, timing) |
| GET | `/api/indexing/events` | SSE stream for real-time indexing progress |

### Database Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/database/status` | Current download/decompression state |
| POST | `/api/database/download` | Start downloading the Memory Alpha dump from S3 (202, progress via SSE) |
| POST | `/api/database/cancel` | Cancel an active download or decompression |
| GET | `/api/database/files` | List XML files in the data directory with metadata |
| POST | `/api/database/import` | Import an XML file into the database (202, progress via SSE) |
| GET | `/api/database/events` | SSE stream for download and import progress |

The download endpoint fetches the dump from Wikia's S3 bucket and decompresses the `.7z` archive using a Worker thread, keeping the main thread free.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| XML Parsing | saxes (streaming SAX) |
| Database | better-sqlite3 + FTS5 |
| Server | Express 5, TypeScript, Commander.js |
| Client | React 19, React Router 7, Vite 6, Tailwind CSS 4 |
| Wiki Rendering | wtf_wikipedia + DOMPurify |
| Decompression | 7z-wasm (Worker thread) |
| Real-time Events | Server-Sent Events (SSE) |
| Testing | Vitest, Testing Library, Supertest |
