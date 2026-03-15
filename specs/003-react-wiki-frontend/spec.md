# Feature Specification: React + Vite Wiki Frontend

**Feature Branch**: `003-react-wiki-frontend`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "React + Vite frontend for the Memory Alpha wiki viewer — SPA consuming the spec-002 Express REST API with article viewing, browsing, search, category navigation, wikitext rendering, and redirect handling."

## Clarifications

### Session 2026-03-15

- Q: How should the application display loading states while API requests are in progress? → A: Centered spinner/loading indicator with brief text (e.g., "Loading article...")
- Q: How should the wikitext renderer handle image/file references (`[[File:...]]`)? → A: Show a placeholder block with the image caption text but no actual image
- Q: How should the search results page render API-provided HTML snippets containing `<mark>` tags? → A: Sanitize snippet HTML, allowlisting only `<mark>` tags, before inserting into the DOM
- Q: What should the default namespace filter be on the Browse page? → A: Default to main namespace only (namespace 0); user can broaden via the selector
- Q: Should the wikitext renderer sanitize its HTML output before inserting into the DOM? → A: Yes — sanitize with an allowlist of safe tags (defense-in-depth)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Read a Wiki Article (Priority: P1) 🎯 MVP

A user navigates to an article — either by typing a URL, clicking an internal wiki link, or selecting a search result — and sees the article rendered as readable, styled HTML. The page title is displayed as a heading, the wikitext body is converted to HTML (bold, italic, headings, lists, internal links, external links, tables, and template/infobox blocks rendered as structured sidebars), and the article's categories are listed at the bottom as clickable links. If the article contains a `#REDIRECT [[Target]]` directive, the user is automatically navigated to the target article without manual intervention.

**Why this priority**: Displaying a single article is the fundamental purpose of a wiki viewer. Every other feature (search, browsing, categories) ultimately serves to get the user to an article page. Without article rendering, nothing else is useful.

**Independent Test**: Can be tested by starting the frontend against a running backend with imported data, navigating to `/wiki/USS_Enterprise_(NCC-1701)`, and verifying the article title, rendered HTML content, and category links appear correctly. Test redirect by navigating to a known redirect article and confirming automatic navigation to the target.

**Acceptance Scenarios**:

1. **Given** the frontend is running and the backend has imported data, **When** the user navigates to `/wiki/USS_Enterprise_(NCC-1701)`, **Then** the page displays the article title as a heading and the wikitext rendered as styled HTML with bold, italic, headings, lists, and links.
2. **Given** an article contains internal wiki links like `[[Warp drive]]`, **When** the article is rendered, **Then** internal links are displayed as clickable links that route to `/wiki/Warp_drive` client-side without a full page reload.
3. **Given** an article contains external links like `[https://example.com Example]`, **When** the article is rendered, **Then** external links open in a new browser tab.
4. **Given** an article contains an infobox or sidebar template (e.g., `{{sidebar starship|...}}`), **When** the article is rendered, **Then** the template is displayed as a structured block (title and key-value pairs) visually set apart from the body text.
5. **Given** an article's wikitext begins with `#REDIRECT [[Target Article]]`, **When** the user navigates to that article's URL, **Then** the browser is automatically redirected to `/wiki/Target_Article`.
6. **Given** the user navigates to `/wiki/Nonexistent_Article`, **When** the API returns a 404 error, **Then** a user-friendly "Article not found" message is displayed with a suggestion to search or browse.
7. **Given** an article contains a wikitext table, **When** the article is rendered, **Then** the table is displayed as a formatted HTML table with rows and columns.
8. **Given** an article contains category tags (e.g., `[[Category:Federation starships]]`), **When** the article is rendered, **Then** the categories are listed at the bottom of the article as clickable links that navigate to the corresponding category page.

---

### User Story 2 — Search for Articles (Priority: P1) 🎯 MVP

A user types a query into the persistent search bar in the site header and sees ranked search results with highlighted text snippets showing where matches occur. The user can click any result to navigate directly to the article. The search bar is always accessible from any page.

**Why this priority**: With 200,000+ articles, search is the primary way users find content. Browsing alphabetically is impractical at this scale. The search bar being persistently visible in the header means users can search from any page without navigating away first.

**Independent Test**: Can be tested by typing "warp drive" into the search bar and verifying ranked results appear with highlighted snippets. Click a result and verify the article page loads.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** they type "warp drive" in the header search bar and submit, **Then** the app navigates to the search results page showing articles matching "warp drive", ranked by relevance, each with a text snippet containing highlighted match terms.
2. **Given** search results are displayed, **When** the user clicks on a result title, **Then** the app navigates to that article's page (`/wiki/:title`).
3. **Given** the user searches for a term with no matches, **When** the search results page loads, **Then** a "No results found" message is displayed with a suggestion to try different terms.
4. **Given** search returns more results than the page size, **When** the user views the results page, **Then** pagination controls allow navigating through additional pages of results.
5. **Given** the user is on the search page, **When** they modify the search query in the search bar and resubmit, **Then** the results update to reflect the new query.

---

### User Story 3 — Browse Articles Alphabetically (Priority: P1) 🎯 MVP

A user opens the Browse page and sees a paginated, alphabetical list of article titles. An A–Z letter index at the top allows jumping to articles starting with a specific letter. An optional namespace selector lets the user filter by namespace (e.g., main articles only, or categories only). The user can click any article title to navigate to its article page.

**Why this priority**: Browsing provides content discovery for users who want to explore without a specific search term. The A–Z index makes it practical to navigate a large article set. Combined with search, this covers the two primary discovery patterns.

**Independent Test**: Can be tested by navigating to `/browse`, verifying the alphabetical article list loads, clicking the "S" letter index, and confirming articles starting with "S" are displayed. Verify pagination controls work across multiple pages of results.

**Acceptance Scenarios**:

1. **Given** the user navigates to `/browse`, **When** the page loads, **Then** a paginated list of article titles is displayed in alphabetical order with pagination controls.
2. **Given** the browse page is displayed, **When** the user clicks the letter "S" in the A–Z index, **Then** the list updates to show only articles whose titles start with "S".
3. **Given** the browse page is displayed, **When** the user selects a namespace from the namespace selector, **Then** the list updates to show only articles in that namespace.
4. **Given** a filtered or unfiltered article list, **When** the user clicks an article title, **Then** the app navigates to the corresponding article page (`/wiki/:title`).
5. **Given** the browse page is displaying results, **When** the user clicks "Next" in the pagination controls, **Then** the next page of alphabetically sorted results is displayed.

---

### User Story 4 — Browse by Category (Priority: P2)

A user opens the Categories page and sees a list of all categories with their article counts. The user can click a category to see all articles belonging to it. This provides a topic-based alternative to alphabetical browsing.

**Why this priority**: Category navigation is a secondary discovery path — useful when users know the general topic area (e.g., "Star Trek: The Next Generation episodes") but not a specific article title. It complements search and alphabetical browsing.

**Independent Test**: Can be tested by navigating to `/categories`, verifying categories are listed with article counts, clicking a known category, and confirming the correct articles appear.

**Acceptance Scenarios**:

1. **Given** the user navigates to `/categories`, **When** the page loads, **Then** a paginated list of categories is displayed, each showing the category name and number of articles it contains.
2. **Given** the categories page is displayed, **When** the user clicks a category name (e.g., "Federation starships"), **Then** the app navigates to `/categories/Federation_starships` and displays a list of all articles in that category.
3. **Given** a category page is displayed, **When** the user clicks an article title in the list, **Then** the app navigates to the corresponding article page.
4. **Given** the categories page, **When** the user uses prefix filtering, **Then** only categories whose names start with the entered text are shown.
5. **Given** the user navigates to `/categories/Nonexistent_Category`, **When** the API returns a 404, **Then** a "Category not found" message is displayed.

---

### User Story 5 — Navigate the Application (Priority: P1) 🎯 MVP

A user sees a persistent header on every page containing the site title ("Memory Alpha"), a search input, and navigation links to Browse and Categories. The header provides a consistent entry point to all major sections of the app from any page. Clicking the site title navigates to the home/browse page.

**Why this priority**: Navigation is the connective tissue of the application. Without a persistent header and routing, users cannot move between features. This is infrastructure-level MVP functionality.

**Independent Test**: Can be tested by loading any page and verifying the header is present with the site title, search input, and nav links. Click each link and verify correct navigation.

**Acceptance Scenarios**:

1. **Given** the user is on any page in the application, **When** they look at the top of the page, **Then** a header is visible containing the site title, a search input, and links to Browse and Categories.
2. **Given** the header is visible, **When** the user clicks "Browse", **Then** the app navigates to `/browse`.
3. **Given** the header is visible, **When** the user clicks "Categories", **Then** the app navigates to `/categories`.
4. **Given** the header is visible, **When** the user clicks the site title "Memory Alpha", **Then** the app navigates to the home page.
5. **Given** the user types a query in the header search input and presses Enter, **Then** the app navigates to `/search?q=<query>`.

---

### Edge Cases

- What happens when the API backend is unreachable? → The frontend displays a clear error message indicating the backend is unavailable and suggests checking that the server is running.
- What happens when an article's wikitext contains deeply nested or malformed markup? → The renderer handles it on a best-effort basis, displaying raw wikitext for any portion it cannot parse rather than crashing or showing a blank page.
- What happens when a redirect target article does not exist? → The frontend navigates to the target URL; if the target article returns 404, the "Article not found" page is displayed (no infinite redirect loops).
- What happens when a redirect creates a chain (A → B → C)? → The frontend follows one redirect only. If the redirected article is also a redirect, it displays the content as-is with a note rather than following further.
- What happens when the URL contains special characters (e.g., parentheses, apostrophes)? → Titles in URLs are URL-encoded/decoded properly so that articles like "USS Enterprise (NCC-1701)" are accessible.
- What happens when the user navigates directly to a deep link (e.g., `/wiki/Spock`) by pasting it in the browser? → Client-side routing handles the URL and loads the correct article (in dev via Vite, in production via SPA fallback from Express).
- What happens when a search query returns thousands of results? → Only the current page of results is displayed with pagination; the total count is shown to the user.
- What happens when wikitext contains templates the renderer does not support? → Unsupported templates are displayed as raw blocks showing the template name and parameters, rather than being silently dropped.

## Requirements *(mandatory)*

### Functional Requirements

#### Article Viewing

- **FR-001**: The application MUST fetch and display a single wiki article by title via the `GET /api/pages/:title` endpoint.
- **FR-002**: The application MUST render MediaWiki wikitext to styled HTML, supporting: bold (`'''text'''`), italic (`''text''`), headings (`== H2 ==` through `====== H6 ======`), unordered lists (`*`), ordered lists (`#`), internal wiki links (`[[Page]]` and `[[Page|display text]]`), external links (`[url text]` and bare URLs), and wikitext tables (`{| ... |}`).  
- **FR-002a**: The wikitext renderer MUST sanitize its HTML output before DOM insertion, allowlisting only safe tags (h1–h6, p, a, ul, ol, li, table, tr, td, th, strong, em, mark, span, div, dl, dt, dd, blockquote, br, hr) and stripping all other tags as a defense-in-depth measure.
- **FR-003**: The application MUST render MediaWiki template/infobox markup (e.g., `{{sidebar starship|...}}`) as structured blocks displaying the template name and key-value parameters.
- **FR-003a**: The application MUST render image/file references (`[[File:...]]` and `[[Image:...]]`) as placeholder blocks displaying the caption text (if provided) without attempting to load actual image files.
- **FR-004**: The application MUST detect `#REDIRECT [[Target]]` directives in article wikitext and automatically navigate the user to the target article's route.
- **FR-005**: The application MUST limit redirect following to one level — if the target is also a redirect, display the target's content as-is with a visual note.
- **FR-006**: The application MUST display article categories as clickable links at the bottom of the article, navigating to the corresponding category page.
- **FR-007**: The application MUST strip category tags (`[[Category:...]]`) from the rendered article body (they are shown in the categories section instead).
- **FR-008**: The application MUST display a user-friendly error message when an article is not found (404), suggesting search or browsing as alternatives.

#### Search

- **FR-009**: The application MUST provide a persistent search input in the site header, visible on every page.
- **FR-010**: The application MUST submit search queries to `GET /api/search?q=<query>` and display ranked results with highlighted text snippets.
- **FR-010a**: The application MUST sanitize search snippet HTML before rendering, allowlisting only `<mark>` tags and stripping all other HTML to prevent cross-site scripting.
- **FR-011**: The application MUST support paginated search results with controls to navigate between result pages.
- **FR-012**: The application MUST display a "No results found" message when a search query returns zero results.

#### Browsing

- **FR-013**: The application MUST display a paginated, alphabetically sorted list of article titles via `GET /api/pages`.
- **FR-014**: The application MUST provide an A–Z letter index that, when a letter is selected, filters the list to articles starting with that letter (via the `prefix` query parameter).
- **FR-015**: The application MUST provide a namespace selector that filters the article list by namespace (via the `namespace` query parameter). The Browse page MUST default to the main namespace (namespace 0) on initial load; the user can broaden to other namespaces via the selector.
- **FR-016**: Each article title in the browse list MUST be a clickable link that navigates to the corresponding article page.

#### Categories

- **FR-017**: The application MUST display a paginated list of categories with article counts via `GET /api/categories`.
- **FR-018**: The application MUST allow the user to click a category to view its articles via `GET /api/categories/:name/pages`.
- **FR-019**: The application MUST support prefix filtering on the categories list.
- **FR-020**: The application MUST display a user-friendly error when a category is not found (404).

#### Navigation & Routing

- **FR-021**: The application MUST use client-side routing with the following routes: `/wiki/:title` (article), `/browse` (alphabetical listing), `/search` (search results), `/categories` (category list), `/categories/:name` (category detail).
- **FR-022**: The application MUST display a persistent header containing the site title ("Memory Alpha"), a search input, and navigation links to Browse and Categories.
- **FR-023**: Internal wiki links in rendered article content MUST navigate to the corresponding article page client-side (no full page reload).
- **FR-024**: The site title in the header MUST link to the home page.
- **FR-025**: The home route (`/`) MUST redirect to the Browse page.

#### API Integration

- **FR-026**: All API calls MUST use a configurable base URL, defaulting to same-origin in production.
- **FR-027**: In development, the Vite dev server MUST proxy `/api` requests to the Express backend (default `http://localhost:3000`).
- **FR-028**: The application MUST handle API errors gracefully, displaying user-friendly messages for common errors (network failure, 404, 500) rather than crashing or showing blank content.
- **FR-029**: The application MUST display a centered spinner/loading indicator with brief descriptive text (e.g., "Loading article...") while API requests are in progress on every data-fetching page (article, browse, search, categories).

#### Monorepo Integration

- **FR-030**: The frontend MUST reside in a `client/` workspace directory within the existing monorepo.
- **FR-031**: The frontend MUST import shared types (`ApiResponse`, `PageDetail`, `PageSummary`, `SearchResult`, `CategorySummary`) from the `shared` workspace package.
- **FR-032**: All frontend code MUST be written in TypeScript with strict mode enabled.
- **FR-033**: All components with non-trivial logic MUST have corresponding unit tests using Vitest.

### Key Entities

- **Article Page**: A rendered view of a wiki article identified by its title. Composed of a title heading, rendered HTML body (from wikitext), and a categories section. Corresponds to a `PageDetail` from the API.
- **Search Result**: A ranked item returned from a full-text search query, containing the article title, a highlighted text snippet, and a relevance rank. Corresponds to a `SearchResult` from the API.
- **Category**: A grouping of articles by topic, displayed with its name and article count. Can be drilled into to see member articles. Corresponds to a `CategorySummary` from the API.
- **Browse Entry**: A summary-level article listing (title, namespace) used in the alphabetical browse view. Corresponds to a `PageSummary` from the API.

## Assumptions

- The Express.js REST API from spec-002 is fully implemented and available at `http://localhost:3000` during development.
- The API returns data in the envelope format defined in the spec-002 API contract (`{ data, meta, error }`).
- The FTS5 search index has been built before search functionality is used (the frontend does not trigger index rebuilds).
- Article titles use underscores as space separators in URLs (consistent with MediaWiki convention), and the API accepts both underscored and spaced titles.
- The wikitext renderer is best-effort — full MediaWiki parity (Lua modules, parser functions, advanced transclusions) is explicitly out of scope.
- Tailwind CSS is used for all styling per Constitution Principle III.
- The application is local-only per Constitution Principle X — no authentication, user accounts, or external service dependencies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to any article by title and see rendered HTML content within 2 seconds of page load.
- **SC-002**: Users can search for articles and see ranked results with highlighted snippets within 2 seconds of submitting a query.
- **SC-003**: Users can browse the full article list alphabetically with working A–Z index and pagination, loading each page within 2 seconds.
- **SC-004**: Users can navigate from any page to any other major section (article, browse, search, categories) in one click via the persistent header.
- **SC-005**: Internal wiki links in articles navigate to the correct article page client-side without a full page reload.
- **SC-006**: Redirect articles automatically navigate the user to the target article without manual intervention.
- **SC-007**: 90% of common MediaWiki markup (bold, italic, headings, lists, links, tables) renders correctly as styled HTML.
- **SC-008**: The application displays meaningful error messages (not blank pages or stack traces) when articles are not found, the API is unreachable, or search returns no results.
- **SC-009**: All components with non-trivial logic have corresponding unit tests that pass.
