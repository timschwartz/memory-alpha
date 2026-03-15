# Quickstart: React + Vite Wiki Frontend

**Feature**: 003-react-wiki-frontend  
**Date**: 2026-03-15

---

## Prerequisites

- Node.js 18+ and npm 9+
- The Express backend (spec-002) running on `http://localhost:3000` with imported data
- The FTS5 search index built (for search functionality)

## Setup

From the repository root:

```bash
# Install all workspace dependencies (including the new client/ workspace)
npm install

# Start the Express backend (in one terminal)
cd server && npm run dev

# Start the Vite dev server (in another terminal)
cd client && npm run dev
```

The Vite dev server starts on `http://localhost:5173` and proxies `/api` requests to `http://localhost:3000`.

## Routes

| URL | Description |
|---|---|
| `http://localhost:5173/` | Redirects to Browse page |
| `http://localhost:5173/browse` | Alphabetical article listing |
| `http://localhost:5173/wiki/USS_Enterprise_(NCC-1701)` | Article page |
| `http://localhost:5173/search?q=warp+drive` | Search results |
| `http://localhost:5173/categories` | Category listing |
| `http://localhost:5173/categories/Federation_starships` | Category detail |

## Development Commands

```bash
# Run tests
cd client && npm test

# Run tests in watch mode
cd client && npm run test:watch

# Type-check
cd client && npx tsc --noEmit

# Build for production
cd client && npm run build
```

## Production

The production build outputs to `client/dist/`. The Express server (spec-002) serves these static files and falls back to `index.html` for client-side routing.

```bash
# Build all workspaces
npm run build

# Start production server (serves API + static frontend)
cd server && npm start
```

## Key Directories

| Path | Purpose |
|---|---|
| `client/src/pages/` | Route-level page components |
| `client/src/components/` | Shared UI components (Header, Pagination, etc.) |
| `client/src/lib/wikitext-parser.ts` | Wikitext-to-HTML rendering pipeline |
| `client/src/api/client.ts` | API client (fetch wrapper) |
| `client/src/hooks/useApi.ts` | Shared data-fetching hook |
| `client/tests/` | Unit and component tests |
| `shared/src/types/wiki.ts` | Shared TypeScript types |
