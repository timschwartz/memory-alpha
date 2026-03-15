# Tasks: React + Vite Wiki Frontend

**Input**: Design documents from `/specs/003-react-wiki-frontend/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included — FR-033 requires unit tests for all components with non-trivial logic.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo web app**: `client/src/`, `client/tests/` (new workspace alongside `server/` and `shared/`)

---

## Phase 1: Setup (Project Scaffolding)

**Purpose**: Create the `client/` workspace with all build tooling, TypeScript config, and entry points.

- [X] T001 Create client/package.json with react, react-dom, react-router-dom, wtf_wikipedia, wtf-plugin-html, dompurify, @types/dompurify devDependency, and shared workspace dependency; add "client" to workspaces array in root package.json
- [X] T002 [P] Create client/tsconfig.json with TypeScript strict mode, JSX react-jsx transform, module ESNext, moduleResolution bundler, and path resolution for shared workspace imports
- [X] T003 [P] Create client/vite.config.ts with @vitejs/plugin-react, @tailwindcss/vite plugin, and server.proxy routing /api to http://localhost:3000
- [X] T004 [P] Create client/vitest.config.ts with jsdom environment, test file glob patterns (tests/**/*.test.{ts,tsx}), and setup file reference
- [X] T005 [P] Create client/src/index.css with `@import "tailwindcss"` directive and base theme customizations for wiki content
- [X] T006 Create client/index.html entry point referencing /src/main.tsx, client/src/main.tsx rendering React root with App component, and client/src/App.tsx placeholder shell component

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Implement typed API client with configurable base URL, generic GET helper with query parameter support, ApiResponse envelope parsing, and structured error handling (network failure, HTTP errors, API error codes) in client/src/api/client.ts
- [X] T008 [P] Create useApi generic data-fetching hook that manages loading, error, and data states, accepts a fetch function and dependency array, and re-fetches when dependencies change in client/src/hooks/useApi.ts
- [X] T009 [P] Create LoadingSpinner component with centered layout, animated spinner, and configurable descriptive text prop (e.g., "Loading article...") in client/src/components/LoadingSpinner.tsx
- [X] T010 [P] Create ErrorMessage component with error title, user-friendly message, and optional retry callback button in client/src/components/ErrorMessage.tsx
- [X] T011 [P] Create Pagination component with previous/next controls and page number display, derived from PaginationMeta (total, limit, offset, hasMore), with onPageChange callback in client/src/components/Pagination.tsx

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 5 — Navigate the Application (Priority: P1) 🎯 MVP

**Goal**: Persistent header with site title, search bar, and nav links visible on every page; client-side routing to all major sections.

**Independent Test**: Load any page and verify the header is present with "Memory Alpha" title, search input, and Browse/Categories links. Click each link and verify correct navigation without full page reload.

### Implementation for User Story 5

- [X] T012 [US5] Create Header component with "Memory Alpha" site title linking to /, search input with form submit navigating to /search?q=, and Browse (/browse) and Categories (/categories) nav links styled with Tailwind in client/src/components/Header.tsx
- [X] T013 [US5] Configure BrowserRouter with route definitions for /wiki/:title, /browse, /search, /categories, /categories/:name and a shared layout wrapper rendering Header above an Outlet in client/src/App.tsx
- [X] T014 [US5] Implement home route (/) redirect to /browse using React Router Navigate component in client/src/App.tsx

### Tests for User Story 5

- [X] T015 [US5] Write component tests for Header (site title links to /, search form navigates to /search?q=query, Browse and Categories nav links render with correct hrefs) in client/tests/components/Header.test.tsx

**Checkpoint**: App shell is functional — all pages render within a shared layout with persistent navigation.

---

## Phase 4: User Story 1 — Read a Wiki Article (Priority: P1) 🎯 MVP

**Goal**: Fetch and display a wiki article by title with rendered wikitext, category links, redirect handling, and error states.

**Independent Test**: Navigate to `/wiki/USS_Enterprise_(NCC-1701)`, verify article title heading, rendered HTML content (bold, italic, headings, lists, links, tables), and category links at bottom. Navigate to a known redirect article and confirm automatic redirect to target.

### Implementation for User Story 1

- [X] T016 [P] [US1] Create wikitext-parser module using wtf_wikipedia + wtf-plugin-html: parse raw wikitext to HTML, sanitize output with DOMPurify (allowlisted safe tags: h1–h6, p, a, ul, ol, li, table, tr, td, th, thead, tbody, caption, strong, em, b, i, mark, span, div, dl, dt, dd, blockquote, pre, code, br, hr, sub, sup; allowed attrs: href, target, rel, class, id, colspan, rowspan, scope, alt, title), extract categories array, detect #REDIRECT directives and return target title, render templates/infoboxes as structured name+key-value blocks, and render image/file references as placeholder blocks with caption text in client/src/lib/wikitext-parser.ts
- [X] T017 [P] [US1] Create WikiContent component that renders sanitized HTML string via dangerouslySetInnerHTML, intercepts clicks on internal wiki links (href matching /wiki/...) using a container onClick handler, and navigates client-side via useNavigate instead of full page reload in client/src/components/WikiContent.tsx
- [X] T018 [US1] Create ArticlePage that extracts :title route param, fetches article via GET /api/pages/:title using API client, passes wikitext to parser, renders HTML via WikiContent, displays categories as clickable links to /categories/:name at page bottom, and shows LoadingSpinner while loading or ErrorMessage with search/browse suggestions for 404/error states in client/src/pages/ArticlePage.tsx
- [X] T019 [US1] Implement redirect handling in ArticlePage: check parser redirect flag, navigate to /wiki/:target for single-level redirects, pass state to prevent chained redirects, and display a visual note ("Redirected from ...") when arriving via redirect in client/src/pages/ArticlePage.tsx
- [X] T020 [US1] Add wiki content CSS styling for rendered article HTML — headings hierarchy, table borders and striping, infobox/template card styling, blockquote indentation, list spacing, external link indicators, and code block formatting — using Tailwind utility classes and @layer components in client/src/index.css

### Tests for User Story 1

- [X] T021 [P] [US1] Write unit tests for wikitext-parser: bold/italic/heading rendering, internal/external link generation, DOMPurify sanitization strips unsafe tags, redirect detection returns target title, category extraction, template/infobox rendering as structured blocks, image placeholder with caption, and malformed wikitext fallback in client/tests/unit/wikitext-parser.test.ts
- [X] T022 [US1] Write component tests for ArticlePage: successful article render with title and content, category links at bottom, redirect navigation to target, chained redirect visual note, 404 error display with suggestions, and loading spinner during fetch in client/tests/components/ArticlePage.test.tsx

**Checkpoint**: Users can view any article with rendered wikitext, follow internal links, and handle redirects.

---

## Phase 5: User Story 2 — Search for Articles (Priority: P1) 🎯 MVP

**Goal**: Submit search queries via the header search bar and view ranked results with highlighted snippets and pagination.

**Independent Test**: Type "warp drive" in the header search bar, submit, verify ranked results with highlighted (`<mark>`) snippets appear, click a result title and verify article page loads. Search for a nonsense string and verify "No results found" message.

### Implementation for User Story 2

- [X] T023 [US2] Create SearchPage that reads q param from URL search params, fetches results from /api/search with query and pagination offset, renders each result as a title link to /wiki/:title and a DOMPurify-sanitized snippet (ALLOWED_TAGS: ['mark'] only, no attributes), displays Pagination component, shows "No results found" message with alternative suggestions for empty results, and shows LoadingSpinner during fetch in client/src/pages/SearchPage.tsx

### Tests for User Story 2

- [X] T024 [US2] Write component tests for SearchPage: results render with title links and highlighted snippets, snippet HTML is sanitized (only mark tags survive), empty results show message, pagination controls appear for multi-page results, and query parameter drives fetch in client/tests/components/SearchPage.test.tsx

**Checkpoint**: Users can search from any page and navigate to found articles.

---

## Phase 6: User Story 3 — Browse Articles Alphabetically (Priority: P1) 🎯 MVP

**Goal**: Paginated alphabetical article listing with A–Z letter index and namespace selector defaulting to main namespace.

**Independent Test**: Navigate to `/browse`, verify alphabetical article list loads with pagination. Click "S" in the A–Z index and confirm articles starting with "S" appear. Change namespace selector and verify list updates.

### Implementation for User Story 3

- [X] T025 [US3] Create BrowsePage with paginated article list fetched from /api/pages, A–Z letter index that sets prefix query param on click, namespace selector dropdown defaulting to namespace 0 (main) with option to select other namespaces, article title links to /wiki/:title, Pagination component, LoadingSpinner during fetch, and URL query param sync (prefix, namespace, page) via useSearchParams in client/src/pages/BrowsePage.tsx

### Tests for User Story 3

- [X] T026 [US3] Write component tests for BrowsePage: article list renders with clickable titles, A–Z index letter click updates prefix filter, namespace selector defaults to 0 and updates on change, pagination controls navigate pages, and loading state shows spinner in client/tests/components/BrowsePage.test.tsx

**Checkpoint**: Users can browse all articles alphabetically with filtering and pagination.

---

## Phase 7: User Story 4 — Browse by Category (Priority: P2)

**Goal**: Category listing with article counts and drill-down to articles within a category.

**Independent Test**: Navigate to `/categories`, verify category list with counts loads. Click a category and verify its articles are listed. Navigate to a nonexistent category URL and verify 404 message.

### Implementation for User Story 4

- [X] T027 [P] [US4] Create CategoryListPage with paginated category list fetched from /api/categories, each showing category name as link to /categories/:name and article count, prefix text filter input, Pagination component, and LoadingSpinner in client/src/pages/CategoryListPage.tsx
- [X] T028 [US4] Create CategoryPage that extracts :name route param, fetches articles from /api/categories/:name/pages, displays paginated article list with title links to /wiki/:title, shows "Category not found" ErrorMessage for 404 responses, and LoadingSpinner during fetch in client/src/pages/CategoryPage.tsx

### Tests for User Story 4

- [X] T029 [P] [US4] Write component tests for CategoryListPage: category list renders with names and article counts, prefix filter updates displayed categories, pagination controls navigate pages, and loading state shows spinner in client/tests/components/CategoryListPage.test.tsx
- [X] T030 [US4] Write component tests for CategoryPage: article list renders with clickable titles, 404 error displays "Category not found" message, pagination works, and loading state shows spinner in client/tests/components/CategoryPage.test.tsx

**Checkpoint**: Users can discover articles by topic via categories.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Remaining test coverage for foundational components and final validation.

- [X] T031 [P] Write unit tests for API client (GET helper constructs correct URLs with query params, response envelope parsing extracts data, error handling for network failures and HTTP error codes, configurable base URL) in client/tests/unit/api-client.test.ts
- [X] T032 [P] Write component tests for Pagination (page number display, previous/next button disabled states at boundaries, onPageChange callback fires with correct page number) in client/tests/components/Pagination.test.tsx
- [X] T033 Run quickstart.md validation to verify full setup, all routes load correctly, and end-to-end navigation works against running backend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US5 Navigation (Phase 3)**: Depends on Foundational — provides app shell for all other stories
- **US1 Article (Phase 4)**: Depends on US5 (needs routing and Header)
- **US2 Search (Phase 5)**: Depends on US5 (needs Header search bar and routing)
- **US3 Browse (Phase 6)**: Depends on US5 (needs routing) — independent of US1/US2
- **US4 Categories (Phase 7)**: Depends on US5 (needs routing) — independent of US1/US2/US3
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US5 Navigation (P1)**: First story — provides app shell. Must complete before other stories.
- **US1 Article (P1)**: Depends on US5 for routing. No dependency on other stories.
- **US2 Search (P1)**: Depends on US5 for Header search bar. Independent of US1/US3/US4.
- **US3 Browse (P1)**: Depends on US5 for routing. Independent of US1/US2/US4.
- **US4 Categories (P2)**: Depends on US5 for routing. Independent of US1/US2/US3.

### Within Each User Story

- Implementation tasks before tests
- Library/utility modules ([P]) before page components that depend on them
- Core page implementation before enhancements (e.g., redirects after basic article display)
- Tests validate implemented behavior

### Parallel Opportunities

- Setup: T002, T003, T004, T005 can all run in parallel (independent config files)
- Foundational: T008, T009, T010, T011 can all run in parallel after T007 (independent components)
- US1: T016 and T017 are parallel (parser and WikiContent are independent); T021 is parallel with other tests
- US4: T027 and T029 are parallel (CategoryListPage and its tests independent of other story work)
- Polish: T031 and T032 are parallel (independent test files)
- After US5 completes: US1, US2, US3, US4 can all proceed in parallel

---

## Parallel Example: After US5 Completes

```bash
# All four stories can start simultaneously:
# Developer A: US1 — Article rendering pipeline
Task T016: "Create wikitext-parser module in client/src/lib/wikitext-parser.ts"
Task T017: "Create WikiContent component in client/src/components/WikiContent.tsx"

# Developer B: US2 — Search results page
Task T023: "Create SearchPage in client/src/pages/SearchPage.tsx"

# Developer C: US3 — Browse page
Task T025: "Create BrowsePage in client/src/pages/BrowsePage.tsx"

# Developer D: US4 — Category pages
Task T027: "Create CategoryListPage in client/src/pages/CategoryListPage.tsx"
Task T028: "Create CategoryPage in client/src/pages/CategoryPage.tsx"
```

---

## Implementation Strategy

### MVP First (US5 + US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US5 — Navigation (app shell)
4. Complete Phase 4: US1 — Article viewing
5. **STOP and VALIDATE**: Navigate to an article, verify rendering, test redirects
6. Deploy/demo if ready — users can view articles via direct URL

### Incremental Delivery

1. Setup + Foundational → Project builds and runs
2. US5 → App shell with header, search bar, nav links (no page content yet)
3. US1 → Article viewing with wikitext rendering, redirects, categories → **MVP!**
4. US2 → Search works end-to-end (header → results → article)
5. US3 → Browse page with A–Z index and namespace filter
6. US4 → Category navigation (P2, deferred if needed)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational + US5 together
2. Once US5 is done:
   - Developer A: US1 (Article — most complex)
   - Developer B: US2 (Search) + US3 (Browse)
   - Developer C: US4 (Categories)
3. Stories complete and integrate independently
