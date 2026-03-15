# Data Model: Express.js REST API

**Feature**: 002-express-rest-api
**Date**: 2026-03-15
**Depends on**: spec-001 schema (namespaces, pages, revisions, categories, page_categories)

---

## Existing Schema (from spec-001, unchanged)

These tables are already created by the spec-001 importer's migration system in `server/src/models/database.ts`.

### namespaces

| Column | Type | Constraints |
|--------|------|-------------|
| namespace_id | INTEGER | PRIMARY KEY |
| name | TEXT | NOT NULL |
| case_setting | TEXT | NOT NULL |

### pages

| Column | Type | Constraints |
|--------|------|-------------|
| page_id | INTEGER | PRIMARY KEY |
| title | TEXT | NOT NULL |
| namespace_id | INTEGER | NOT NULL, FK → namespaces |

**Indexes**: `idx_pages_title (title)`, `idx_pages_namespace_id (namespace_id)`

### revisions

| Column | Type | Constraints |
|--------|------|-------------|
| revision_id | INTEGER | PRIMARY KEY |
| page_id | INTEGER | NOT NULL, FK → pages |
| parent_id | INTEGER | nullable |
| timestamp | TEXT | NOT NULL |
| contributor_name | TEXT | nullable |
| contributor_id | INTEGER | nullable |
| content_model | TEXT | NOT NULL, DEFAULT 'wikitext' |
| content_format | TEXT | nullable |
| text_content | TEXT | nullable |
| sha1 | TEXT | nullable |

**Indexes**: `idx_revisions_page_id (page_id)`, `idx_revisions_timestamp (timestamp)`

### categories

| Column | Type | Constraints |
|--------|------|-------------|
| category_id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | NOT NULL, UNIQUE |

### page_categories

| Column | Type | Constraints |
|--------|------|-------------|
| page_id | INTEGER | NOT NULL, FK → pages (CASCADE) |
| category_id | INTEGER | NOT NULL, FK → categories (CASCADE) |

**Primary key**: (page_id, category_id)

---

## New Schema: FTS5 Search Index

Added as migration version 2 in `database.ts`.

### search_index (FTS5 Virtual Table)

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  title,
  text_content,
  content='',
  contentless_delete=1,
  tokenize='porter unicode61',
  prefix='2 3'
);
```

| Virtual Column | Source | Notes |
|---------------|--------|-------|
| rowid | pages.page_id | Implicit FTS5 rowid mapped to page_id |
| title | pages.title | Indexed for title-based search |
| text_content | revisions.text_content | Latest revision text (highest revision_id per page) |

**Properties**:
- **Contentless** (`content=''`): No text stored in FTS shadow tables; JOIN to pages/revisions for display data
- **Contentless delete** (`contentless_delete=1`): Allows DELETE for index rebuilds
- **Tokenizer**: Porter stemming with Unicode61 for proper unicode handling
- **Prefix indexes**: 2 and 3 character prefixes for fast prefix matching

**Population query** (used by FTS5 indexer):

```sql
DELETE FROM search_index;

INSERT INTO search_index(rowid, title, text_content)
SELECT p.page_id, p.title, r.text_content
FROM pages p
JOIN revisions r ON r.page_id = p.page_id
WHERE r.revision_id = (
  SELECT MAX(r2.revision_id) FROM revisions r2 WHERE r2.page_id = p.page_id
);
```

---

## New Schema: Additional Indexes

For efficient paginated browsing and filtering, add these indexes as part of migration version 2:

```sql
CREATE INDEX IF NOT EXISTS idx_pages_title_namespace
  ON pages(namespace_id, title);
```

This composite index supports the `GET /api/pages?namespace=0&prefix=Star` query pattern — filtering by namespace and sorting/prefix-filtering by title simultaneously.

---

## Shared API Response Types

New TypeScript interfaces added to `shared/src/types/wiki.ts` for the API layer.

### ApiResponse\<T\> (Response Envelope)

```typescript
export interface ApiResponse<T> {
  data: T | null;
  meta: PaginationMeta | null;
  error: ApiError | null;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
}
```

### PageSummary (List/Browse responses)

```typescript
export interface PageSummary {
  page_id: number;
  title: string;
  namespace_id: number;
  namespace_name: string;
}
```

### PageDetail (Single article responses)

```typescript
export interface PageDetail {
  page_id: number;
  title: string;
  namespace_id: number;
  namespace_name: string;
  latest_revision: {
    revision_id: number;
    text_content: string | null;
    timestamp: string;
    contributor_name: string | null;
  };
  categories: string[];
}
```

### SearchResult (Search responses)

```typescript
export interface SearchResult {
  page_id: number;
  title: string;
  namespace_name: string;
  snippet: string;
  rank: number;
}
```

### CategorySummary (Category list responses)

```typescript
export interface CategorySummary {
  category_id: number;
  name: string;
  page_count: number;
}
```

### HealthStatus (Health check response)

```typescript
export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  totalPages: number;
  totalCategories: number;
  searchIndexReady: boolean;
}
```

---

## Entity Relationships (API Read Paths)

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│ namespaces  │◄────│   pages     │────►│  revisions   │
│             │  FK │             │  FK │ (latest only  │
│ namespace_id│     │ page_id     │     │  for API)     │
│ name        │     │ title       │     │ revision_id   │
│             │     │ namespace_id│     │ text_content  │
└─────────────┘     └──────┬──────┘     │ timestamp     │
                           │            │ contributor   │
                           │            └──────────────┘
                           │
                    ┌──────┴──────┐
                    │page_categories│
                    │             │
                    │ page_id     │
                    │ category_id │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐     ┌──────────────┐
                    │ categories  │     │ search_index │
                    │             │     │ (FTS5)       │
                    │ category_id │     │              │
                    │ name        │     │ rowid→page_id│
                    └─────────────┘     │ title        │
                                        │ text_content │
                                        └──────────────┘
```

---

## Key Query Patterns

### Get page by title (US1)

```sql
SELECT p.page_id, p.title, p.namespace_id, n.name as namespace_name,
       r.revision_id, r.text_content, r.timestamp, r.contributor_name
FROM pages p
JOIN namespaces n ON n.namespace_id = p.namespace_id
JOIN revisions r ON r.page_id = p.page_id
WHERE p.title = ? AND p.namespace_id = ?
ORDER BY r.revision_id DESC
LIMIT 1;
```

### List pages with pagination (US2)

```sql
SELECT p.page_id, p.title, p.namespace_id, n.name as namespace_name
FROM pages p
JOIN namespaces n ON n.namespace_id = p.namespace_id
WHERE (? IS NULL OR p.namespace_id = ?)
  AND (? IS NULL OR p.title LIKE ? || '%')
ORDER BY p.title
LIMIT ? OFFSET ?;
```

Count query:
```sql
SELECT COUNT(*) as total FROM pages p
WHERE (? IS NULL OR p.namespace_id = ?)
  AND (? IS NULL OR p.title LIKE ? || '%');
```

### Full-text search (US3)

```sql
SELECT p.page_id, p.title, n.name as namespace_name,
       snippet(search_index, 1, '<mark>', '</mark>', '...', 32) AS snippet,
       search_index.rank
FROM search_index
JOIN pages p ON p.page_id = search_index.rowid
JOIN namespaces n ON n.namespace_id = p.namespace_id
WHERE search_index MATCH ?
ORDER BY search_index.rank
LIMIT ? OFFSET ?;
```

### List categories with page counts (US4)

```sql
SELECT c.category_id, c.name, COUNT(pc.page_id) as page_count
FROM categories c
LEFT JOIN page_categories pc ON pc.category_id = c.category_id
WHERE (? IS NULL OR c.name LIKE ? || '%')
GROUP BY c.category_id
ORDER BY c.name
LIMIT ? OFFSET ?;
```

### Pages in a category (US4)

```sql
SELECT p.page_id, p.title, p.namespace_id, n.name as namespace_name
FROM page_categories pc
JOIN pages p ON p.page_id = pc.page_id
JOIN namespaces n ON n.namespace_id = p.namespace_id
JOIN categories c ON c.category_id = pc.category_id
WHERE c.name = ?
ORDER BY p.title
LIMIT ? OFFSET ?;
```
