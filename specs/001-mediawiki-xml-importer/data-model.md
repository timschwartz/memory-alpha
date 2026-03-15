# Data Model: MediaWiki XML Importer

**Branch**: `001-mediawiki-xml-importer` | **Date**: 2026-03-14 | **Plan**: [plan.md](plan.md)

---

## Entities

### 1. Namespace

Represents a MediaWiki namespace (e.g., Main, Talk, User, Category). Populated from the `<siteinfo>` section of the XML export.

| Column          | Type    | Constraints              | Source XML              |
|-----------------|---------|--------------------------|-------------------------|
| `namespace_id`  | INTEGER | PRIMARY KEY              | `<namespace key="...">`  |
| `name`          | TEXT    | NOT NULL                 | `<namespace>` text       |
| `case_setting`  | TEXT    | NOT NULL                 | `<namespace case="...">` |

**Notes**:
- `namespace_id` is the MediaWiki namespace key (e.g., 0 = Main, 14 = Category).
- The main namespace (key=0) has an empty name in the XML; store as empty string.

---

### 2. Page

Represents a MediaWiki page. Has many revisions.

| Column          | Type    | Constraints                          | Source XML       |
|-----------------|---------|--------------------------------------|------------------|
| `page_id`       | INTEGER | PRIMARY KEY                          | `<id>` (child of `<page>`) |
| `title`         | TEXT    | NOT NULL                             | `<title>`        |
| `namespace_id`  | INTEGER | NOT NULL, FK → namespaces(namespace_id) | `<ns>`           |

**Indexes**:
- `idx_pages_title` on `(title)` — for title-based lookup and search
- `idx_pages_namespace_id` on `(namespace_id)` — for namespace filtering

---

### 3. Revision

Represents a single revision (edit) of a page. A page has one or more revisions.

| Column             | Type    | Constraints                         | Source XML          |
|--------------------|---------|-------------------------------------|---------------------|
| `revision_id`      | INTEGER | PRIMARY KEY                         | `<id>` (child of `<revision>`) |
| `page_id`          | INTEGER | NOT NULL, FK → pages(page_id)       | parent `<page>` id  |
| `parent_id`        | INTEGER | NULLABLE                            | `<parentid>`        |
| `timestamp`        | TEXT    | NOT NULL                            | `<timestamp>`       |
| `contributor_name` | TEXT    | NULLABLE                            | `<username>` or `<ip>` |
| `contributor_id`   | INTEGER | NULLABLE                            | `<contributor><id>` |
| `content_model`    | TEXT    | NOT NULL, DEFAULT 'wikitext'        | `<model>`           |
| `content_format`   | TEXT    | NULLABLE                            | `<format>`          |
| `text_content`     | TEXT    | NULLABLE                            | `<text>`            |
| `sha1`             | TEXT    | NULLABLE                            | `<sha1>`            |

**Indexes**:
- `idx_revisions_page_id` on `(page_id)` — for fetching all revisions of a page
- `idx_revisions_timestamp` on `(timestamp)` — for chronological ordering

**Notes**:
- `contributor_name` stores the `<username>` for registered users or `<ip>` for anonymous edits.
- `contributor_id` is NULL for anonymous contributors.
- `text_content` can be NULL for deleted/suppressed revisions.
- `timestamp` is stored as ISO 8601 text (e.g., `2003-11-23T14:54:23Z`).

---

### 4. Category

Represents a wiki category. Derived from `[[Category:...]]` links in the latest revision's wikitext.

| Column        | Type    | Constraints        |
|---------------|---------|---------------------|
| `category_id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `name`        | TEXT    | NOT NULL, UNIQUE    |

**Indexes**:
- UNIQUE constraint on `name` serves as the index.

---

### 5. PageCategory (Join Table)

Links pages to their categories. Derived from `[[Category:...]]` links in the latest revision's wikitext.

| Column        | Type    | Constraints                            |
|---------------|---------|----------------------------------------|
| `page_id`     | INTEGER | NOT NULL, FK → pages(page_id)          |
| `category_id` | INTEGER | NOT NULL, FK → categories(category_id) |

**Constraints**:
- PRIMARY KEY (`page_id`, `category_id`) — composite key, also enforces uniqueness
- ON DELETE CASCADE for both foreign keys

**Notes**:
- On re-import, existing page_categories for a page should be deleted and re-inserted from the latest revision to reflect any category changes.

---

## Entity Relationships

```
Namespace 1 ──── * Page 1 ──── * Revision
                       |
                       * ──── PageCategory ──── * Category
```

- A **Namespace** has many **Pages**.
- A **Page** has many **Revisions** (full edit history).
- A **Page** has many **Categories** (via PageCategory join table).
- A **Category** has many **Pages** (via PageCategory join table).

---

## Schema DDL

```sql
CREATE TABLE IF NOT EXISTS namespaces (
  namespace_id INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  case_setting TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  page_id      INTEGER PRIMARY KEY,
  title        TEXT NOT NULL,
  namespace_id INTEGER NOT NULL,
  FOREIGN KEY (namespace_id) REFERENCES namespaces(namespace_id)
);

CREATE INDEX IF NOT EXISTS idx_pages_title ON pages(title);
CREATE INDEX IF NOT EXISTS idx_pages_namespace_id ON pages(namespace_id);

CREATE TABLE IF NOT EXISTS revisions (
  revision_id      INTEGER PRIMARY KEY,
  page_id          INTEGER NOT NULL,
  parent_id        INTEGER,
  timestamp        TEXT NOT NULL,
  contributor_name TEXT,
  contributor_id   INTEGER,
  content_model    TEXT NOT NULL DEFAULT 'wikitext',
  content_format   TEXT,
  text_content     TEXT,
  sha1             TEXT,
  FOREIGN KEY (page_id) REFERENCES pages(page_id)
);

CREATE INDEX IF NOT EXISTS idx_revisions_page_id ON revisions(page_id);
CREATE INDEX IF NOT EXISTS idx_revisions_timestamp ON revisions(timestamp);

CREATE TABLE IF NOT EXISTS categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS page_categories (
  page_id     INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (page_id, category_id),
  FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);
```

---

## Validation Rules

- `page_id` and `revision_id` must be positive integers (from XML).
- `title` must be a non-empty string.
- `namespace_id` must reference an existing namespace (or be inserted in the same transaction).
- `timestamp` must be a valid ISO 8601 datetime string.
- `contributor_name` and `contributor_id` can both be NULL (rare edge case — deleted accounts).
- `sha1` is optional; some revisions in the XML may not include it.

---

## State Transitions

### Import Lifecycle per Page

```
XML <page> opened
  → Extract page_id, title, namespace_id
  → For each <revision>:
      → Extract all revision fields
      → Accumulate in memory
  → On </page>:
      → UPSERT page row
      → UPSERT all revision rows
      → Extract categories from latest revision text
      → DELETE existing page_categories for this page
      → INSERT new page_categories
      → Add to batch buffer
      → If batch buffer reaches 1000 pages → COMMIT transaction
```

### Idempotency

- Pages: matched by `page_id` → UPSERT
- Revisions: matched by `revision_id` → UPSERT
- Categories: matched by `name` → INSERT OR IGNORE (for the category row)
- PageCategories: DELETE all for page, then re-insert → ensures current state
