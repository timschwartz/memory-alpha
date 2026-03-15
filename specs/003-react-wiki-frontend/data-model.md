# Data Model: React + Vite Wiki Frontend

**Feature**: 003-react-wiki-frontend  
**Date**: 2026-03-15

---

## Overview

The frontend has no persistent storage — all data comes from the spec-002 Express REST API. This data model documents the client-side entities, their relationships, and how API response types map to UI rendering concerns.

## Entities

### ArticleView

Represents a fully rendered wiki article page.

| Field | Source | Description |
|---|---|---|
| pageId | `PageDetail.page_id` | Unique article identifier |
| title | `PageDetail.title` | Article title (display heading) |
| namespaceId | `PageDetail.namespace_id` | Namespace numeric ID |
| namespaceName | `PageDetail.namespace_name` | Namespace display name (empty for main) |
| rawWikitext | `PageDetail.latest_revision.text_content` | Raw wikitext content from API |
| renderedHtml | Derived (wikitext parser output) | Sanitized HTML for display |
| categories | `PageDetail.categories` | List of category names (displayed as links) |
| revisionId | `PageDetail.latest_revision.revision_id` | Used as cache key for memoization |
| timestamp | `PageDetail.latest_revision.timestamp` | Last edit timestamp |
| contributor | `PageDetail.latest_revision.contributor_name` | Last editor name |
| isRedirect | Derived (parsed from wikitext) | Whether article is a redirect |
| redirectTarget | Derived (parsed from `#REDIRECT [[Target]]`) | Target article title if redirect |

**State transitions**:
- Loading → Loaded → Rendered (wikitext parsed to HTML)
- Loading → Error (API failure or 404)
- Loaded → Redirect (wikitext starts with `#REDIRECT`)

### SearchResultItem

Represents a single search result in the search results list.

| Field | Source | Description |
|---|---|---|
| pageId | `SearchResult.page_id` | Article identifier |
| title | `SearchResult.title` | Article title (clickable link) |
| namespaceName | `SearchResult.namespace_name` | Namespace for context |
| snippet | `SearchResult.snippet` | HTML snippet with `<mark>` tags (sanitized before rendering) |
| rank | `SearchResult.rank` | BM25 relevance score (lower = more relevant) |

### BrowseEntry

Represents an article in the alphabetical browse list.

| Field | Source | Description |
|---|---|---|
| pageId | `PageSummary.page_id` | Article identifier |
| title | `PageSummary.title` | Article title (clickable link) |
| namespaceId | `PageSummary.namespace_id` | Namespace numeric ID |
| namespaceName | `PageSummary.namespace_name` | Namespace display name |

### CategoryItem

Represents a category in the category list or a category detail view.

| Field | Source | Description |
|---|---|---|
| categoryId | `CategorySummary.category_id` | Category identifier |
| name | `CategorySummary.name` | Category name (display and route param) |
| pageCount | `CategorySummary.page_count` | Number of articles in category |

### PaginationState

Shared pagination state used across browse, search, and category pages.

| Field | Source | Description |
|---|---|---|
| total | `PaginationMeta.total` | Total result count |
| limit | `PaginationMeta.limit` | Results per page |
| offset | `PaginationMeta.offset` | Current offset |
| hasMore | `PaginationMeta.hasMore` | Whether more pages exist |
| currentPage | Derived (`Math.floor(offset / limit) + 1`) | Current 1-based page number |
| totalPages | Derived (`Math.ceil(total / limit)`) | Total number of pages |

## Relationships

```
ArticleView ──renders──→ renderedHtml (via wikitext parser + DOMPurify)
ArticleView ──has many──→ categories (string[]) ──links to──→ CategoryItem
ArticleView ──may be──→ redirect ──navigates to──→ ArticleView (target)

SearchResultItem ──links to──→ ArticleView (via title)
BrowseEntry ──links to──→ ArticleView (via title)
CategoryItem ──has many──→ BrowseEntry (via /api/categories/:name/pages)

All list views use PaginationState for page navigation.
```

## Validation Rules

- Article titles in URLs use underscores as space separators; display titles use spaces.
- Namespace prefixes in titles (e.g., "Category:Starships") are preserved when navigating to the API.
- Search query `q` parameter must be non-empty before submitting to the API.
- Pagination `limit` is clamped to 1–100; `offset` must be >= 0.
- Browse page defaults to namespace 0 (main) on initial load.
- Redirect following is limited to one level — a redirected article that is itself a redirect displays content as-is with a visual note.

## Shared Types (from `shared/src/types/wiki.ts`)

The frontend imports these types directly from the `shared` workspace:

- `ApiResponse<T>` — Response envelope with `data`, `meta`, `error`
- `PaginationMeta` — Pagination metadata (`total`, `limit`, `offset`, `hasMore`)
- `ApiError` — Error object (`code`, `message`)
- `PageDetail` — Full article data with revision content and categories
- `PageSummary` — Article summary for browse lists
- `SearchResult` — Search result with snippet and rank
- `CategorySummary` — Category with article count
