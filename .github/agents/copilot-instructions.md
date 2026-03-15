# memory-alpha Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-15

## Active Technologies
- TypeScript 5.x (strict mode) on Node.js 20 LTS + express (HTTP server), better-sqlite3 (SQLite driver, existing), cors (CORS middleware), commander (CLI for FTS5 indexer) (002-express-rest-api)
- SQLite via better-sqlite3 with WAL mode and FTS5 extensions (existing database from spec-001) (002-express-rest-api)
- TypeScript 5.x (strict mode) — Constitution Principle I + React 18+, Vite 6.x, React Router 7.x, Tailwind CSS 4.x (003-react-wiki-frontend)
- N/A (frontend only — data via REST API from Express/SQLite backend) (003-react-wiki-frontend)
- TypeScript (strict mode) on Node.js + Express.js (server), React 18 + Vite (client), Commander (CLI), better-sqlite3 (database) (004-indexing-management)
- SQLite via better-sqlite3, FTS5 virtual table for search (004-indexing-management)

- TypeScript 5.x (strict mode) on Node.js 20 LTS + saxes (streaming XML parser), better-sqlite3 (synchronous SQLite driver), commander (CLI argument parsing) (001-mediawiki-xml-importer)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (strict mode) on Node.js 20 LTS: Follow standard conventions

## Recent Changes
- 004-indexing-management: Added TypeScript (strict mode) on Node.js + Express.js (server), React 18 + Vite (client), Commander (CLI), better-sqlite3 (database)
- 003-react-wiki-frontend: Added TypeScript 5.x (strict mode) — Constitution Principle I + React 18+, Vite 6.x, React Router 7.x, Tailwind CSS 4.x
- 002-express-rest-api: Added TypeScript 5.x (strict mode) on Node.js 20 LTS + express (HTTP server), better-sqlite3 (SQLite driver, existing), cors (CORS middleware), commander (CLI for FTS5 indexer)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
