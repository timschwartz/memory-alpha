# Data Model: Indexing Management

**Feature**: 004-indexing-management
**Date**: 2026-03-15

## Entities

### IndexingStatus (shared type)

Represents the current state of the indexing system as returned by the status endpoint and consumed by the Settings page.

| Field | Type | Description |
|-------|------|-------------|
| state | `'idle' \| 'in-progress' \| 'complete'` | Current indexing state |
| indexedPages | `number` | Pages currently in the search index |
| totalPages | `number` | Total pages available to index |
| percentage | `number` | Completion percentage (0-100) |
| startedAt | `string \| null` | ISO timestamp when current/last run started |
| completedAt | `string \| null` | ISO timestamp when last run completed |
| durationMs | `number \| null` | Duration of current/last run in milliseconds |

**State transitions**:
```
idle ──(start)──> in-progress ──(finish)──> complete
  ^                                            │
  └────────(start new run)─────────────────────┘
```

- `idle`: No indexing has ever been run, or the index was wiped (rebuild requested).
- `in-progress`: Indexing is actively running. `indexedPages` updates as batches commit.
- `complete`: Last run finished. `indexedPages` equals `totalPages` (for a full run) or reflects partial progress if resumed.

### IndexingStartRequest (API request body)

| Field | Type | Description |
|-------|------|-------------|
| mode | `'continue' \| 'rebuild'` | `continue` resumes from checkpoint; `rebuild` wipes and restarts |

### IndexingStartResponse (API response)

| Field | Type | Description |
|-------|------|-------------|
| status | `'started'` | Confirmation that indexing began |
| totalPages | `number` | Estimated total pages to index |

## Existing Entities (unchanged)

### search_index (FTS5 virtual table)

No schema changes. The existing FTS5 table structure is sufficient:

```sql
CREATE VIRTUAL TABLE search_index USING fts5(
  title,
  text_content,
  content='',
  contentless_delete=1,
  tokenize='porter unicode61',
  prefix='2 3'
);
```

The `rowid` column inherently tracks which `page_id` values have been indexed. Resume detection uses `NOT IN (SELECT rowid FROM search_index)` to find un-indexed pages.

### pages (existing table)

No schema changes. The `page_id` primary key is used to identify indexable pages and join to the search_index `rowid`.

### revisions (existing table)

No schema changes. The latest revision per page (`MAX(revision_id)`) provides the text content for indexing.

## No New Database Tables

Resume capability is achieved using the existing `search_index` FTS5 table's rowid tracking. No additional metadata tables or checkpoint tables are needed. The count of rows in `search_index` compared to the count of rows in `pages` determines whether indexing is complete, partial, or not started.

## Relationships

```
pages.page_id  ──(1:0..1)──>  search_index.rowid
     │
     └──(1:N)──>  revisions.page_id  (latest revision provides text_content)
```

A page either has a corresponding search_index entry (indexed) or does not (un-indexed).
