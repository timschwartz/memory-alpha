# Tasks: LCARS-Inspired UI with Dark Mode

**Input**: Design documents from `/specs/005-lcars-ui-dark-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution Principle VI (Vitest Testing) requires unit tests for non-trivial modules. Test tasks included for new modules (`useTheme.ts`, `ThemeToggle.tsx`).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tailwind CSS v4 dark mode configuration, LCARS color token definitions, and FOUC prevention

- [ ] T001 Add `@custom-variant dark` and LCARS color palette `@theme` tokens (24 oklch colors: 12 light + 12 dark) in client/src/index.css
- [ ] T002 Add inline FOUC-prevention `<script>` in `<head>` of client/index.html that reads localStorage key `"theme"` and applies `dark` class to `<html>` before first paint
- [ ] T003 Create ThemeProvider context and `useTheme` hook with `preference` / `effectiveMode` / `setPreference` in client/src/hooks/useTheme.ts — includes one-time `matchMedia` check on mount to resolve "auto" to initial `effectiveMode`; real-time change event listener deferred to T032
- [ ] T004 Create unit tests for useTheme hook — preference read/write, effectiveMode resolution, localStorage persistence, invalid-value fallback to auto, DOM class toggling in client/tests/unit/useTheme.test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire up the theme provider in the app shell and create the LCARS layout structure. All user stories depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Wrap app root with `ThemeProvider` and update the `Layout` component in client/src/App.tsx to use LCARS page shell (bg-lcars-bg dark:bg-lcars-bg-d page background, optional side bar with end-cap, bottom accent bar)
- [ ] T006 Restyle Header with LCARS-inspired design (rounded end-cap, title area, horizontal accent bar, inline nav links, search bar) for desktop (≥ 768px) in client/src/components/Header.tsx
- [ ] T007 Add hamburger menu to Header for mobile (< 768px) with accessible `<button>` (aria-expanded, aria-controls, aria-label), slide-down nav panel, and Escape key handling in client/src/components/Header.tsx

**Checkpoint**: LCARS shell is visible on all pages. Theme provider is active. Dark class can be toggled manually. Mobile hamburger menu works.

---

## Phase 3: User Story 1 — LCARS-Inspired Visual Redesign (Priority: P1) 🎯 MVP

**Goal**: All pages display the LCARS-inspired visual identity — LCARS palette colors, panel framing, styled components, consistent design across Browse, Article, Search, Categories, Category detail, and Settings.

**Independent Test**: Load any page and verify the header shows end-cap + bars + amber/violet/blue palette. Browse page shows LCARS-styled index and list. Article page shows content in framed panel. Mobile shows hamburger menu.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Restyle BrowsePage with LCARS panel aesthetic — alphabetical index bar uses lcars-violet/lcars-amber buttons, article list in lcars-surface panel, pagination styled with LCARS colors in client/src/pages/BrowsePage.tsx
- [ ] T009 [P] [US1] Restyle ArticlePage with LCARS panel framing — content area in lcars-surface panel with left accent cap, category links styled with LCARS colors in client/src/pages/ArticlePage.tsx
- [ ] T010 [P] [US1] Restyle SearchPage with LCARS styling — search input border with lcars-lilac, results in lcars-surface panels, snippets styled in client/src/pages/SearchPage.tsx
- [ ] T011 [P] [US1] Restyle CategoryListPage with LCARS panel aesthetic — category list in lcars-surface panel, letter groupings with bar headers in client/src/pages/CategoryListPage.tsx
- [ ] T012 [P] [US1] Restyle CategoryPage with LCARS panel aesthetic — page list in lcars-surface panel, category title bar in client/src/pages/CategoryPage.tsx
- [ ] T013 [P] [US1] Restyle SettingsPage section cards with LCARS panel caps and palette colors (lcars-surface background, accent cap on left) in client/src/pages/SettingsPage.tsx
- [ ] T014 [P] [US1] Restyle Pagination component with LCARS colors — active page bg-lcars-violet, inactive bg-lcars-surface, hover bg-lcars-peach in client/src/components/Pagination.tsx
- [ ] T015 [P] [US1] Restyle ErrorMessage component with LCARS mars color and panel cap in client/src/components/ErrorMessage.tsx
- [ ] T016 [P] [US1] Restyle LoadingSpinner component with LCARS amber spinner color in client/src/components/LoadingSpinner.tsx
- [ ] T017 [US1] Update `.wiki-content` light-mode styles to use LCARS color palette — table headers bg-lcars-surface, links text-lcars-blue, blockquote border-lcars-lilac, code bg-lcars-surface, infobox styled with panel cap in client/src/index.css

**Checkpoint**: All pages render with the LCARS-inspired visual design in light mode. No default gray/blue colors remain in any component.

---

## Phase 4: User Story 2 — Dark Mode / Light Mode Toggle in Settings (Priority: P2)

**Goal**: Users can switch between Light, Dark, and Auto modes via a segmented button bar in Settings. Theme persists across sessions.

**Independent Test**: Navigate to Settings → Appearance → click Light / Dark / Auto → theme switches instantly. Reload → preference is preserved.

### Implementation for User Story 2

- [ ] T018 [US2] Create ThemeToggle segmented button bar component (three buttons: Light/Dark/Auto, active highlighted with lcars-amber, inactive with lcars-surface) using useTheme() hook in client/src/components/ThemeToggle.tsx
- [ ] T019 [US2] Create component tests for ThemeToggle — renders three buttons, highlights active selection, calls setPreference on click, reflects preference changes in client/tests/components/ThemeToggle.test.tsx
- [ ] T020 [US2] Add "Appearance" section with ThemeToggle above the existing "Indexing" section in client/src/pages/SettingsPage.tsx

**Checkpoint**: Three-way theme toggle works. Persistence works. Light/Dark/Auto selections produce the correct visual result.

---

## Phase 5: User Story 4 — Wiki Content Readability in Both Modes (Priority: P2)

**Goal**: All wiki content elements (tables, code blocks, blockquotes, infoboxes, links, lists) remain readable with sufficient contrast in both light and dark modes.

**Independent Test**: Open articles with tables, infoboxes, and code blocks in both light and dark modes. Verify all text is readable with sufficient contrast against backgrounds.

### Implementation for User Story 4

- [ ] T021 [US4] Add `@variant dark` styles for all `.wiki-content` elements in client/src/index.css — tables (dark borders, dark header bg, dark stripe rows), code blocks (dark bg), blockquotes (dark border, light text), links (lcars-blue-d), hr, infobox (dark bg/border), template-block, image-placeholder
- [ ] T022 [P] [US4] Add dark: variants to BrowsePage — dark backgrounds, dark text colors, dark hover states for alphabet buttons, article links, namespace selector in client/src/pages/BrowsePage.tsx
- [ ] T023 [P] [US4] Add dark: variants to ArticlePage — dark panel background, dark text, dark category link colors, dark tab styles in client/src/pages/ArticlePage.tsx
- [ ] T024 [P] [US4] Add dark: variants to SearchPage — dark input, dark result panels, dark snippet text in client/src/pages/SearchPage.tsx
- [ ] T025 [P] [US4] Add dark: variants to CategoryListPage — dark panel, dark letter headers, dark category links in client/src/pages/CategoryListPage.tsx
- [ ] T026 [P] [US4] Add dark: variants to CategoryPage — dark panel, dark page links in client/src/pages/CategoryPage.tsx
- [ ] T027 [P] [US4] Add dark: variants to SettingsPage — dark section cards, dark text, dark status badges, dark progress bar, dark buttons in client/src/pages/SettingsPage.tsx
- [ ] T028 [P] [US4] Add dark: variants to Header — dark end cap bg, dark bar, dark nav links, dark search input, dark hamburger menu panel in client/src/components/Header.tsx
- [ ] T029 [P] [US4] Add dark: variants to Pagination — dark active/inactive/hover states in client/src/components/Pagination.tsx
- [ ] T030 [P] [US4] Add dark: variants to ErrorMessage — dark mars background, dark text in client/src/components/ErrorMessage.tsx
- [ ] T031 [P] [US4] Add dark: variants to LoadingSpinner — dark spinner color, dark text in client/src/components/LoadingSpinner.tsx

**Checkpoint**: All pages and components render correctly in both light and dark modes. Wiki content (tables, code, infoboxes) is readable in dark mode.

---

## Phase 6: User Story 3 — Auto Mode Responds to System Preference Changes (Priority: P3)

**Goal**: When set to "Auto", the app listens for real-time OS color scheme changes via `matchMedia` and transitions without page reload. Explicit selections override system changes.

**Independent Test**: Set to Auto → toggle OS dark mode setting → app follows in real time. Set to Dark → toggle OS → app stays dark.

### Implementation for User Story 3

- [ ] T032 [US3] Add `matchMedia('(prefers-color-scheme: dark)')` change event listener to ThemeProvider — subscribe when preference is "auto", unsubscribe when preference is "light" or "dark", update effectiveMode and DOM class on change event in client/src/hooks/useTheme.ts

**Checkpoint**: Auto mode responds to real-time OS preference changes. Explicit Light/Dark selections are not affected by OS changes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, focus states, and final validation

- [ ] T033 [P] Add visible focus indicators (`focus-visible:ring-2 ring-lcars-blue dark:ring-lcars-blue-d`) to all interactive elements: nav links, search input/button, alphabet buttons (BrowsePage), article/category links, pagination buttons, theme toggle buttons, hamburger button, and form controls across Header, ThemeToggle, Pagination, and all page components
- [ ] T034 [P] Add `motion-reduce:transition-none` to hamburger menu animation in client/src/components/Header.tsx
- [ ] T035 Run quickstart.md manual verification checklist — validate all 8 items pass (theme toggle, persistence, auto mode, FOUC, LCARS visual, mobile, wiki content, contrast). Additionally: (a) spot-check WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text) in both modes per SC-003, (b) verify layout at 320px minimum viewport width per SC-007, (c) confirm no trademarked LCARS assets, fonts, or exact layouts are used per FR-002

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (needs color tokens and theme provider) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — can proceed after LCARS shell is in place
- **User Story 2 (Phase 4)**: Depends on Phase 2 — can run in parallel with Phase 3
- **User Story 4 (Phase 5)**: Depends on Phase 3 (needs LCARS light-mode styling before adding dark variants) AND Phase 4 (needs toggle to test dark mode)
- **User Story 3 (Phase 6)**: Depends on Phase 4 (needs theme toggle working to test auto behavior)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — provides the LCARS visual identity
- **US2 (P2)**: Depends only on Foundational — provides theme toggle; can run parallel with US1
- **US4 (P2)**: Depends on US1 (needs LCARS styled components to add dark variants to) + US2 (needs toggle to switch modes)
- **US3 (P3)**: Depends on US2 (needs working theme toggle to enable auto mode)

### Within Each User Story

- All page/component tasks marked [P] within a story can run in parallel (different files)
- CSS changes in index.css (T017, T021) should be done before or alongside component dark variants
- Non-[P] tasks within a story must be sequential

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel (different files: index.css, index.html, useTheme.ts). T004 depends on T003.
- **Phase 2**: T006 and T007 both modify Header.tsx — must be sequential. T005 is independent.
- **Phase 3**: T008–T016 all modify different files — can all run in parallel. T017 modifies index.css.
- **Phase 4**: T018, T019, T020 are sequential (create component, test it, then integrate it).
- **Phase 5**: T022–T031 all modify different files — can all run in parallel. T021 modifies index.css.
- **Phase 6**: T032 is a single task.
- **Phase 7**: T033 and T034 are independent — can run in parallel.

---

## Parallel Example: User Story 1

```bash
# All page restyling tasks can run in parallel (different files):
T008: BrowsePage.tsx
T009: ArticlePage.tsx
T010: SearchPage.tsx
T011: CategoryListPage.tsx
T012: CategoryPage.tsx
T013: SettingsPage.tsx
T014: Pagination.tsx
T015: ErrorMessage.tsx
T016: LoadingSpinner.tsx
# Then: T017 (index.css wiki-content styles)
```

## Parallel Example: User Story 4

```bash
# All dark variant tasks can run in parallel (different files):
T022: BrowsePage.tsx
T023: ArticlePage.tsx
T024: SearchPage.tsx
T025: CategoryListPage.tsx
T026: CategoryPage.tsx
T027: SettingsPage.tsx
T028: Header.tsx
T029: Pagination.tsx
T030: ErrorMessage.tsx
T031: LoadingSpinner.tsx
# Also: T021 (index.css dark wiki-content styles)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (Tailwind dark mode config, FOUC script, theme hook)
2. Complete Phase 2: Foundational (LCARS layout shell, header, hamburger menu)
3. Complete Phase 3: User Story 1 (all pages restyled with LCARS palette)
4. **STOP and VALIDATE**: All pages show LCARS visual identity in light mode
5. Deploy/demo if ready — this is the MVP

### Incremental Delivery

1. Setup + Foundational → LCARS shell functional
2. User Story 1 → Full LCARS visual redesign → Deploy/Demo (MVP!)
3. User Story 2 → Theme toggle in Settings → Deploy/Demo
4. User Story 4 → Dark mode readability across all content → Deploy/Demo
5. User Story 3 → Real-time auto mode tracking → Deploy/Demo
6. Polish → Focus indicators, reduced motion, final validation → Deploy/Demo
