# Feature Specification: MediaWiki XML Importer

**Feature Branch**: `001-mediawiki-xml-importer`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Create a TypeScript class for processing MediaWiki export XML, create/update articles in SQLite database, with data models and CLI script"

## Clarifications

### Session 2026-03-14

- Q: Should categories be extracted from the latest revision only, or from every revision? → A: Latest revision only (current category state per page)
- Q: How should redirect pages (#REDIRECT) be handled? → A: Import as normal pages (store redirect wikitext as-is)
- Q: What transaction batch size for SQLite commits? → A: 1000 pages per transaction
- Q: Should warnings/errors go to stderr only or also a log file? → A: Both stderr and a log file
- Q: How should anonymous contributors (IP instead of username) be handled? → A: Store as-is: username/IP in one field, contributor ID nullable

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import XML Into Database (Priority: P1)

A developer runs a CLI command, providing the path to a MediaWiki XML export file. The importer reads the file, extracts all pages and all of their revisions, and inserts or updates them in the SQLite database. Progress is reported to the terminal. When complete, the database contains one row per page and one row per revision, preserving the full edit history.

**Why this priority**: Without data in the database, no other feature (browsing, search, display) can function. This is the foundational data pipeline.

**Independent Test**: Can be fully tested by running the CLI against the XML export and querying the resulting SQLite database to verify page counts and content integrity.

**Acceptance Scenarios**:

1. **Given** an empty database and a valid MediaWiki XML file, **When** the user runs the import CLI, **Then** the database is populated with all pages and all of their revisions, and a summary (total pages imported, total revisions imported, elapsed time) is printed to stdout.
2. **Given** a database already containing imported pages and the same XML file, **When** the user runs the import CLI again, **Then** existing pages are updated (not duplicated) and any new pages are inserted.
3. **Given** a valid XML file, **When** the user runs the import CLI, **Then** progress indication is displayed during processing (e.g., pages processed count updated periodically).

---

### User Story 2 - Define and Manage Data Models (Priority: P1)

A developer can rely on well-defined data models for pages, revisions, namespaces, and categories that correspond to the MediaWiki export schema. The database schema is created automatically on first run via migrations or auto-initialization.

**Why this priority**: The data models are required by the importer (User Story 1) and by any future feature that reads from the database. They are co-equal in priority.

**Independent Test**: Can be tested by initializing a fresh database and verifying all tables are created with the expected columns and constraints.

**Acceptance Scenarios**:

1. **Given** no existing database file, **When** the application initializes the database, **Then** all required tables (pages, revisions, namespaces, categories, page_categories) are created with appropriate columns and constraints.
2. **Given** an existing database from a previous version, **When** a schema change is introduced, **Then** the migration system applies updates without data loss.

---

### User Story 3 - Filter by Namespace (Priority: P2)

A developer can configure the import to include or exclude specific MediaWiki namespaces (e.g., import only main articles from namespace 0, or include categories from namespace 14). By default, all namespaces are imported.

**Why this priority**: The XML export contains 223,000+ pages across many namespaces (User, Talk, Template, etc.). Most users only need main articles and categories. Filtering reduces import time and database size.

**Independent Test**: Can be tested by running the CLI with a namespace filter flag and verifying only pages from the specified namespaces appear in the database.

**Acceptance Scenarios**:

1. **Given** a valid XML file, **When** the user runs the import CLI with a namespace include filter (e.g., `--namespaces 0,14`), **Then** only pages from the specified namespaces are imported.
2. **Given** a valid XML file, **When** the user runs the import CLI with no namespace filter, **Then** all pages from all namespaces are imported.

---

### User Story 4 - Category Extraction (Priority: P2)

During import, the system extracts category memberships from each page's **latest revision** wikitext content (via `[[Category:...]]` links) and stores them as structured relationships in the database. Categories reflect the current state of the page, not historical revisions.

**Why this priority**: Category navigation is a core feature of the future web interface. Extracting categories during import avoids re-parsing content later.

**Independent Test**: Can be tested by importing a known article that contains category links and verifying the page_categories join table is populated correctly.

**Acceptance Scenarios**:

1. **Given** a page whose wikitext contains `[[Category:Star Trek episodes]]`, **When** the page is imported, **Then** a category record for "Star Trek episodes" exists and is linked to the page.
2. **Given** a page with no category links, **When** the page is imported, **Then** no category associations are created for that page.

---

### Edge Cases

- What happens when the XML file is malformed or truncated mid-page? The importer MUST skip the corrupted page, log a warning, and continue processing remaining pages.
- What happens when a page has zero revisions? The importer MUST skip the page and log a warning.
- What happens when the XML file does not exist at the provided path? The CLI MUST exit with a clear error message and non-zero exit code.
- What happens when the XML file is extremely large (35 GB+)? The importer MUST use stream-based parsing to avoid loading the entire file into memory.
- What happens when a page title contains special characters (quotes, unicode)? The importer MUST handle them correctly via parameterized queries.
- What happens when a `<text>` element is empty or contains only whitespace? The page MUST still be imported with empty content.
- What happens when a page is a redirect (`#REDIRECT [[Target]]`)? The page MUST be imported as a normal page with the redirect wikitext stored as-is. Redirect resolution is deferred to the web frontend.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a TypeScript class (`MediaWikiImporter`) that accepts a file path and database connection, and processes MediaWiki XML export files.
- **FR-002**: The system MUST stream-parse the XML file to support files exceeding available system memory (the source file is 35 GB).
- **FR-003**: The system MUST extract from each `<page>` element: title, namespace ID, page ID, and all revisions contained within the page.
- **FR-004**: The system MUST extract from each `<revision>` element: revision ID, parent revision ID, timestamp, contributor username (or IP address for anonymous edits), contributor ID (nullable for anonymous contributors), content model, content format, text content, and SHA-1 hash.
- **FR-005**: The system MUST insert new pages and update existing pages (matched by page ID), and insert new revisions and update existing revisions (matched by revision ID) — the import operation MUST be idempotent.
- **FR-006**: The system MUST extract `[[Category:...]]` links from the **latest revision** of each page's wikitext and store them as structured relationships. Historical revisions are not scanned for categories.
- **FR-007**: The system MUST store namespace definitions from the `<siteinfo>` section of the XML.
- **FR-008**: The system MUST provide a CLI entry point that accepts: the XML file path (required), database file path (optional, with a sensible default), and namespace filter (optional).
- **FR-009**: The CLI MUST display import progress to stderr (page count, elapsed time) and a final summary to stdout. Warnings and errors MUST also be written to a log file (e.g., `import.log` alongside the database file) for post-run diagnostics.
- **FR-010**: The system MUST automatically initialize the database schema (create tables) if the database file does not exist or tables are missing.
- **FR-011**: The system MUST use database transactions to batch inserts for performance, committing every 1000 pages (with their associated revisions and category links).
- **FR-012**: The system MUST handle and log malformed pages without aborting the entire import. Errors MUST be written to both stderr and the log file with sufficient detail to identify the problematic page.

### Key Entities

- **Page**: Represents a MediaWiki page. Key attributes: page ID (unique identifier from the wiki), title, namespace ID.
- **Revision**: Represents a single revision of a page. Key attributes: revision ID, parent revision ID, page ID (foreign key), timestamp, contributor username or IP address, contributor ID (nullable for anonymous edits), content model, text content, SHA-1 hash. All revisions for each page are stored, preserving full edit history.
- **Namespace**: Represents a MediaWiki namespace. Key attributes: namespace key (integer), name, case-sensitivity setting. Populated from the `<siteinfo>` section.
- **Category**: Represents a wiki category. Key attributes: name (unique). Derived from `[[Category:...]]` links in page content.
- **PageCategory**: Join entity linking pages to categories. Key attributes: page ID (foreign key), category name or ID (foreign key).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The importer processes the full 35 GB, 223,000+ page XML export (with all revisions) to completion without running out of memory (peak memory usage stays below 512 MB).
- **SC-002**: Running the import twice on the same XML file produces the same database state (idempotent) — no duplicate pages or revisions.
- **SC-003**: All main-namespace (ns=0) pages from the export are present in the database after a full import.
- **SC-004**: Category relationships extracted from page content are queryable — given a category name, all member pages can be retrieved.
- **SC-005**: The CLI provides clear, actionable error messages for invalid inputs (missing file, bad path, invalid namespace filter).
- **SC-006**: The importer class is reusable — it can be instantiated and called from other code (e.g., a future Express route) without depending on CLI-specific logic.

## Assumptions

- The XML export follows MediaWiki export schema version 0.11 as indicated in the file header.
- All revisions per page are stored to preserve the full edit history.
- The `data/enmemoryalpha_pages_full.xml` file is the sole data source and will not change frequently.
- The database file will be stored locally alongside the application (no network database).
- The importer does not need to handle incremental/delta exports — it processes complete dumps.
- "Create or update" uses the MediaWiki page ID as the unique key for matching existing records.
