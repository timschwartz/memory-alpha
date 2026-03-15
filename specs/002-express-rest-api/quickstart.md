# Quickstart: Express.js REST API

**Feature**: 002-express-rest-api
**Prerequisites**: Node.js 20+, npm, a populated SQLite database (from spec-001 importer)

---

## 1. Install Dependencies

```bash
cd /path/to/memory-alpha
npm install
```

This installs all workspace dependencies including the new `express` and `cors` packages in the `server/` workspace.

## 2. Build

```bash
npm run build
```

Compiles TypeScript for both `shared/` and `server/` workspaces.

## 3. Import Data (if not already done)

```bash
cd server
npx mw-import ../data/enmemoryalpha_pages_full.xml --database ./memory-alpha.db
```

## 4. Build the Search Index

```bash
npx mw-index --database ./memory-alpha.db
```

This creates the FTS5 full-text search index over all imported pages. Takes 30–120 seconds for the full dataset.

## 5. Start the Server

```bash
npm run serve
```

Or with environment variables:

```bash
PORT=8080 DATABASE_PATH=./memory-alpha.db npm run serve
```

Expected output:
```
Server listening on http://localhost:3000
Database: ./memory-alpha.db (223,151 pages)
Search index: ready
```

## 6. Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Get a page by title
curl http://localhost:3000/api/pages/USS%20Enterprise%20(NCC-1701)

# Browse pages
curl "http://localhost:3000/api/pages?limit=5&prefix=Star"

# Search
curl "http://localhost:3000/api/search?q=warp+drive"

# List categories
curl "http://localhost:3000/api/categories?limit=5"

# Pages in a category
curl "http://localhost:3000/api/categories/Federation%20starships/pages"
```

## 7. Rebuild Search Index (API)

If you re-import data, rebuild the search index via the API:

```bash
curl -X POST http://localhost:3000/api/search/rebuild
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | HTTP server port |
| DATABASE_PATH | ./memory-alpha.db | Path to SQLite database file |
| STATIC_DIR | ../client/dist | Path to Vite-built frontend (production) |
| CORS_ORIGIN | http://localhost:5173 | Allowed CORS origin (dev mode only) |

## Development

For frontend development, start the API server and the Vite dev server separately:

```bash
# Terminal 1: API server
cd server && npm run serve

# Terminal 2: Frontend dev server (future spec-003)
cd client && npm run dev
```

The API server enables CORS for `http://localhost:5173` when no static frontend directory is detected.
