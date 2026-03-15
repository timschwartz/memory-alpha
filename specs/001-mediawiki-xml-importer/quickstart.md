# Quickstart: MediaWiki XML Importer

**Branch**: `001-mediawiki-xml-importer` | **Date**: 2026-03-14

---

## Prerequisites

- Node.js 20 LTS or later
- npm 9+
- The MediaWiki XML export file at `data/enmemoryalpha_pages_full.xml`

## Setup

```bash
# Clone and enter the repo
cd memory-alpha

# Install dependencies (monorepo)
npm install

# Build the server package
cd server
npm run build
```

## Import Data

### Full import (all namespaces)

```bash
npx mw-import ./data/enmemoryalpha_pages_full.xml
```

This creates `./memory-alpha.db` and `./import.log` in the current directory.

### Import only main articles and categories

```bash
npx mw-import ./data/enmemoryalpha_pages_full.xml --namespaces 0,14
```

### Specify database and log paths

```bash
npx mw-import ./data/enmemoryalpha_pages_full.xml \
  --database ./data/memory-alpha.db \
  --log ./data/import.log
```

## Verify

```bash
# Check page count
sqlite3 ./memory-alpha.db "SELECT COUNT(*) FROM pages;"

# Check revision count
sqlite3 ./memory-alpha.db "SELECT COUNT(*) FROM revisions;"

# Check a specific article
sqlite3 ./memory-alpha.db "SELECT title FROM pages WHERE namespace_id = 0 LIMIT 10;"

# Check categories
sqlite3 ./memory-alpha.db "SELECT c.name, COUNT(*) as page_count FROM categories c JOIN page_categories pc ON c.category_id = pc.category_id GROUP BY c.name ORDER BY page_count DESC LIMIT 10;"
```

## Re-import (Idempotent)

Running the import again on the same file will update existing records without creating duplicates:

```bash
npx mw-import ./data/enmemoryalpha_pages_full.xml
```

## Troubleshooting

- **"XML file not found"**: Verify the path to the XML file. The file is 35 GB — ensure it's fully downloaded.
- **Out of memory**: The importer uses stream parsing and should stay below 512 MB RSS. If you see OOM, check if another process is consuming memory.
- **Skipped pages**: Check `import.log` for details on any pages that were skipped due to malformed XML or missing revisions.
- **Slow import**: Ensure the SQLite database is on a local disk (not a network mount). The import is I/O-bound.
