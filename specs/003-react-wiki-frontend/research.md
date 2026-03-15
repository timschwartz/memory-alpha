# Research: React + Vite Wiki Frontend

**Feature**: 003-react-wiki-frontend  
**Date**: 2026-03-15

---

## R1: Wikitext-to-HTML Rendering Approach

**Decision**: Use `wtf_wikipedia` + `wtf-plugin-html` library

**Rationale**: wtf_wikipedia is the only mature, actively maintained JavaScript wikitext parser that runs in the browser. It provides a structured Document API (`doc.sections()`, `.infoboxes()`, `.categories()`, `.images()`, `.isRedirect()`, `.redirectTo()`, `.links()`, `.tables()`, `.lists()`) giving fine-grained access to every element — ideal for React components. The `wtf-plugin-html` addon adds `.html()` methods to every document/section/sentence class. Coverage of all required markup (bold, italic, headings, lists, links, tables, templates, images, categories, redirects) is verified. Browser-compatible via dedicated client build (~143 kB min, ~40 kB gzip). Extensible via `wtf.extend()` for custom template handling.

**Alternatives considered**:

| Alternative | Why rejected |
|---|---|
| Custom regex/line-by-line parser | Too risky — wikitext tables, nested templates, and bold/italic disambiguation require 2,000–4,000 lines of well-tested code. `wtf_wikipedia` encapsulates 10+ years of edge-case handling. |
| Parsoid | PHP application requiring full MediaWiki installation. Not browser-compatible. |
| mwparser | Templates only, no HTML output, abandoned (4 years, 38 weekly downloads). |
| wikiparser-node | GPLv3 license — too restrictive. |
| Wiky.js / InstaView | Abandoned, minimal markup subset, no template support. |

---

## R2: HTML Sanitization Strategy

**Decision**: Use DOMPurify (browser-direct, not isomorphic-dompurify) with tag allowlists

**Rationale**: DOMPurify (21.8 kB min, 8.3 kB gzip) is written by cure53 security researchers, has 26M+ weekly downloads, uses the browser's native DOM parser for correctness, and provides configurable `ALLOWED_TAGS` / `ALLOWED_ATTR` allowlists. A custom regex/DOM-walking allowlist is a known security antipattern vulnerable to mutation XSS, encoding tricks, and DOM clobbering.

Two separate sanitization configurations:

1. **Wiki content** — allowlist of safe structural/inline tags: h1–h6, p, a, ul, ol, li, table, tr, td, th, strong, em, b, i, mark, span, div, dl, dt, dd, blockquote, pre, code, br, hr, caption, thead, tbody, sub, sup. Allowed attributes: href, target, rel, class, id, colspan, rowspan, scope, alt, title.
2. **Search snippets** — allowlist only `<mark>` tags with no attributes.

Both rendered via `dangerouslySetInnerHTML` after sanitization.

**Alternatives considered**:

| Alternative | Why rejected |
|---|---|
| sanitize-html | 62.7 kB gzip (7.5× larger), string-based parsing (less secure than DOM-based). |
| Custom allowlist (manual regex/DOM) | Security antipattern — invariably misses mutation XSS edge cases. |
| Parse snippets into React elements | Over-engineering — fragile string parsing for no security benefit over DOMPurify. |

---

## R3: React Router Configuration

**Decision**: React Router v7 with standard `<BrowserRouter>` and route-based code splitting

**Rationale**: React Router v7 is the current stable release (successor to v6). The route structure is straightforward:

| Route | Component | Data source |
|---|---|---|
| `/` | Redirect → `/browse` | — |
| `/wiki/:title` | ArticlePage | `GET /api/pages/:title` |
| `/browse` | BrowsePage | `GET /api/pages?limit=&offset=&prefix=&namespace=` |
| `/search` | SearchPage | `GET /api/search?q=&limit=&offset=` |
| `/categories` | CategoryListPage | `GET /api/categories?limit=&offset=&prefix=` |
| `/categories/:name` | CategoryPage | `GET /api/categories/:name/pages?limit=&offset=` |

Internal wiki links in rendered article HTML must use React Router's `<Link>` component (or equivalent navigation) for client-side routing. Since article HTML is rendered via `dangerouslySetInnerHTML`, a click handler on the wiki content container will intercept clicks on internal `<a>` links (those with `href` matching `/wiki/...`) and use `navigate()` programmatically to avoid full page reloads.

**Alternatives considered**: None — React Router is the de facto standard for React SPA routing and aligns with the React + Vite constitution mandate.

---

## R4: Vite Proxy & Monorepo Workspace Setup

**Decision**: Vite dev server proxy for `/api` → `http://localhost:3000` + npm workspace in `client/`

**Rationale**: Vite's built-in `server.proxy` configuration (backed by `http-proxy`) handles `/api` proxying with zero additional dependencies. The `client/` directory becomes a new npm workspace alongside `server/` and `shared/`.

Configuration:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

Root `package.json` workspaces array updated to include `"client"`. The `client/package.json` declares a dependency on the `shared` workspace package to import types (`ApiResponse`, `PageDetail`, `PageSummary`, `SearchResult`, `CategorySummary`).

**Alternatives considered**: None — this is the standard Vite + monorepo pattern.

---

## R5: Tailwind CSS 4 with Vite

**Decision**: Tailwind CSS v4 with the `@tailwindcss/vite` plugin

**Rationale**: Tailwind CSS v4 uses a new Vite-native architecture via `@tailwindcss/vite` (replaces PostCSS plugin from v3). Configuration is done via CSS `@theme` directives rather than a `tailwind.config.js` file. The main CSS file imports Tailwind via `@import "tailwindcss"`. This aligns cleanly with Vite's plugin system and Constitution Principle III (Tailwind CSS Styling).

**Alternatives considered**: Tailwind v3 with PostCSS — rejected because v4 is the current release with better Vite integration and smaller output.

---

## R6: wtf_wikipedia Template Handling Strategy

**Decision**: Use `wtf_wikipedia`'s structured template/infobox API for known templates; render unknown templates as raw blocks

**Rationale**: `wtf_wikipedia` extracts templates into structured objects accessible via `doc.infoboxes()` and `doc.templates()`. For known infobox-style templates (sidebar, infobox), the structured data (template name + key-value pairs) can be rendered as a styled card component. For unknown or unsupported templates, the template name and its raw parameters are displayed in a visually distinct block (per FR-003 and the edge case for unsupported templates). A `templateFallbackFn` can be registered via `wtf.extend()` to customize fallback rendering.

**Alternatives considered**: Stripping unknown templates entirely — rejected because the spec explicitly requires displaying template name and parameters as raw blocks rather than silently dropping them.

---

## Bundle Size Budget

| Package | Minified | Gzip | Purpose |
|---|---|---|---|
| wtf_wikipedia (client build) | 143.6 kB | ~40 kB | Wikitext parsing |
| wtf-plugin-html | 4.7 kB | 1.7 kB | HTML output from wtf |
| dompurify | 21.8 kB | 8.3 kB | HTML sanitization |
| **Total rendering pipeline** | **~170 kB** | **~50 kB** | |

~50 kB gzipped for the wikitext pipeline is acceptable — comparable to a small UI library. Both `wtf_wikipedia` and `dompurify` can be lazy-loaded (only needed on article pages, not browse/search/categories).

## Performance Notes

- `wtf_wikipedia` parses a typical article in <50ms in the browser. No concern for per-article rendering.
- DOMPurify sanitization is sub-millisecond.
- Parsed/rendered HTML should be cached in `useMemo` keyed on `revisionId` to avoid re-parsing on re-renders.
- Code-split the rendering pipeline (lazy import on ArticlePage) so browse/search/category pages don't pay the 50 kB bundle cost.
