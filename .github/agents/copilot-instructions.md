# memory-alpha Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-15

## Active Technologies
- TypeScript 5.x (strict mode) on Node.js 20 LTS + express (HTTP server), better-sqlite3 (SQLite driver, existing), cors (CORS middleware), commander (CLI for FTS5 indexer) (002-express-rest-api)
- SQLite via better-sqlite3 with WAL mode and FTS5 extensions (existing database from spec-001) (002-express-rest-api)

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
- 002-express-rest-api: Added TypeScript 5.x (strict mode) on Node.js 20 LTS + express (HTTP server), better-sqlite3 (SQLite driver, existing), cors (CORS middleware), commander (CLI for FTS5 indexer)

- 001-mediawiki-xml-importer: Added TypeScript 5.x (strict mode) on Node.js 20 LTS + saxes (streaming XML parser), better-sqlite3 (synchronous SQLite driver), commander (CLI argument parsing)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
