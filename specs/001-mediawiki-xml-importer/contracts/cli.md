# CLI Contract: mw-import

**Branch**: `001-mediawiki-xml-importer` | **Date**: 2026-03-14

---

## Command

```
mw-import <xml-file> [options]
```

## Arguments

| Argument     | Required | Description                                    |
|--------------|----------|------------------------------------------------|
| `<xml-file>` | Yes      | Path to MediaWiki XML export file              |

## Options

| Option                      | Default              | Description                                      |
|-----------------------------|----------------------|--------------------------------------------------|
| `-d, --database <path>`     | `./memory-alpha.db`  | Path to SQLite database file                     |
| `-n, --namespaces <ids>`    | (all)                | Comma-separated namespace IDs to include (e.g., `0,14`) |
| `-l, --log <path>`          | `./import.log`       | Path to log file for warnings/errors             |
| `-h, --help`                |                      | Display help text                                |

## Exit Codes

| Code | Meaning                                        |
|------|------------------------------------------------|
| 0    | Import completed successfully                  |
| 1    | Invalid arguments (missing file, bad options)  |
| 2    | XML file not found or not readable             |
| 3    | Database initialization error                  |
| 4    | Import failed (unrecoverable error)            |

## Output

### stdout (final summary)

```
Import complete.
  Pages:      223,151
  Revisions:  8,412,603
  Categories: 14,827
  Skipped:    3 (see import.log)
  Duration:   42m 17s
```

### stderr (progress during import)

```
Importing... 1,000 pages (0.4%) [12s]
Importing... 5,000 pages (2.2%) [58s]
Importing... 10,000 pages (4.5%) [1m 52s]
...
```

Progress updates are written every 1,000 pages.

### Log file (warnings/errors)

```
[2026-03-14T10:32:15Z] WARN: Skipped page id=45821 "Foo": no revisions found
[2026-03-14T10:33:42Z] WARN: Skipped page id=92013 "Bar": malformed XML at revision 581234
[2026-03-14T10:45:01Z] ERROR: Failed to parse revision 712345 for page id=103421: invalid timestamp
```

---

## Programmatic API (TypeScript Class)

The `MediaWikiImporter` class is the reusable core, independent of the CLI:

```typescript
interface ImportOptions {
  xmlFilePath: string;
  databasePath: string;
  logFilePath?: string;
  namespaceFilter?: number[];
  batchSize?: number;            // default: 1000
  onProgress?: (stats: ImportProgress) => void;
}

interface ImportProgress {
  pagesProcessed: number;
  revisionsProcessed: number;
  elapsedMs: number;
}

interface ImportResult {
  totalPages: number;
  totalRevisions: number;
  totalCategories: number;
  skippedPages: number;
  durationMs: number;
}

class MediaWikiImporter {
  constructor(options: ImportOptions);
  run(): Promise<ImportResult>;
}
```

### Usage

```typescript
import { MediaWikiImporter } from '../lib/importer';

const importer = new MediaWikiImporter({
  xmlFilePath: './data/enmemoryalpha_pages_full.xml',
  databasePath: './memory-alpha.db',
  logFilePath: './import.log',
  namespaceFilter: [0, 14],
  onProgress: (stats) => {
    process.stderr.write(`\rImporting... ${stats.pagesProcessed} pages`);
  },
});

const result = await importer.run();
console.log(`Done: ${result.totalPages} pages, ${result.totalRevisions} revisions`);
```
