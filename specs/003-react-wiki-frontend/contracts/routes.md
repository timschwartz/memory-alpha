# Routes Contract: React + Vite Wiki Frontend

**Feature**: 003-react-wiki-frontend  
**Date**: 2026-03-15  
**Base URL**: `http://localhost:5173` (dev) or same-origin (production)

---

## Client-Side Routes

The frontend exposes these URL routes as user-facing contracts. External links, bookmarks, and the Express SPA fallback all depend on this route structure.

### GET /

Home page. Redirects to `/browse`.

### GET /wiki/:title

Display a single wiki article.

**URL Parameters**:

| Param | Type | Description |
|---|---|---|
| title | string | URL-encoded page title. Underscores treated as spaces. May include namespace prefix (e.g., `Category:Starships`). |

**Behavior**:
- Fetches article from `GET /api/pages/:title`
- Renders wikitext to styled HTML
- Displays categories at bottom as links to `/categories/:name`
- If article is a `#REDIRECT`, navigates to target article
- If 404, shows "Article not found" with search/browse suggestions

### GET /browse

Paginated alphabetical article listing.

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| prefix | string | (none) | Filter titles starting with this string (A–Z index) |
| namespace | integer | 0 | Filter by namespace ID |
| page | integer | 1 | Page number (1-based, mapped to API offset) |

### GET /search

Full-text search results.

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| q | string | (required) | Search query terms |
| page | integer | 1 | Page number (1-based, mapped to API offset) |

### GET /categories

Paginated category listing with article counts.

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| prefix | string | (none) | Filter category names starting with this string |
| page | integer | 1 | Page number |

### GET /categories/:name

Articles within a specific category.

**URL Parameters**:

| Param | Type | Description |
|---|---|---|
| name | string | URL-encoded category name |

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| page | integer | 1 | Page number |

---

## API Dependency

The frontend consumes the spec-002 Express REST API. See [specs/002-express-rest-api/contracts/api.md](../../002-express-rest-api/contracts/api.md) for the full API contract.

**Endpoints consumed**:

| Frontend Route | API Endpoint |
|---|---|
| `/wiki/:title` | `GET /api/pages/:title` |
| `/browse` | `GET /api/pages?limit=&offset=&prefix=&namespace=` |
| `/search` | `GET /api/search?q=&limit=&offset=` |
| `/categories` | `GET /api/categories?limit=&offset=&prefix=` |
| `/categories/:name` | `GET /api/categories/:name/pages?limit=&offset=` |

---

## Internal Link Contract

Internal wiki links in rendered article content (e.g., `[[Warp drive]]`) are rendered as `<a href="/wiki/Warp_drive">Warp drive</a>`. Clicks on these links are intercepted client-side for SPA navigation — no full page reload occurs.

Title encoding: spaces → underscores in URLs, underscores → spaces in display text.
