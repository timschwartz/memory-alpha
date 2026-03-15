# Research: MediaWiki XML Importer

**Branch**: `001-mediawiki-xml-importer` | **Date**: 2026-03-14 | **Plan**: [plan.md](plan.md)

---

## Topic 1: Streaming XML Parser for Node.js

### Decision

**`saxes`** — a pure-JS, spec-compliant SAX parser with built-in TypeScript declarations, chunk-based `write()` API, and constant memory usage regardless of file size.

### Rationale

| Criterion | sax | saxes | fast-xml-parser | node-expat |
|---|---|---|---|---|
| **Memory model** | Streaming (SAX events) | Streaming (SAX events) | DOM-first; stream mode is a wrapper that still builds objects per node | Streaming (SAX events via libexpat) |
| **35 GB safe** | ✅ Yes — write chunks, get events | ✅ Yes — write chunks, get events | ⚠️ Risky — stream mode accumulates per-tag objects; no true constant-memory guarantee for deeply nested or very large text nodes | ✅ Yes |
| **TypeScript** | ❌ No built-in types (`@types/sax` exists) | ✅ Built-in `.d.ts` declarations | ✅ Built-in `.d.ts` declarations | ❌ No built-in types (`@types/node-expat` exists) |
| **Maintenance** | v1.5.0 published 13 days ago; active after long pause | v6.0.0 published 4 years ago; stable/complete, 44M weekly downloads | v5.5.5 published 2 days ago; very actively maintained | v2.4.1 published 2 years ago; low activity |
| **Native deps** | ✅ None (pure JS) | ✅ None (pure JS) | ✅ None (pure JS) | ❌ Requires C++ compilation (libexpat); node-gyp issues on some platforms |
| **Correctness** | Loose by default; "strict mode" still not fully XML-compliant | Strict XML 1.0/1.1 + Namespaces; well-formedness errors reported | Partial validation; not SAX-style event-driven at core | Full libexpat compliance |
| **Performance** | Baseline | ~3x faster than sax (redesigned parsing logic per saxes benchmarks) | Fastest for full-document parse; streaming mode adds overhead | Fastest raw throughput (native C), but node-gyp install cost |
| **MediaWiki compat** | ✅ Handles `<page>`, `<revision>`, `<text>` nesting fine | ✅ Handles nested elements; proper namespace support if needed | ✅ Works but accumulates full tag objects | ✅ Works |
| **Error recovery** | Silently accepts some malformed XML | Reports errors strictly; continues parsing after errors (configurable handler) | Reports errors | Reports errors |

**Why saxes over sax:** saxes is a direct fork of sax with substantially better performance, stricter XML compliance, and built-in TypeScript types. The MediaWiki export schema uses nested `<page>` → `<revision>` → `<text>` elements — a straightforward SAX use case. saxes handles this with constant memory via chunk-based `write()` piped from a `fs.createReadStream()`.

**Why not fast-xml-parser:** Despite being the most popular and actively maintained, fast-xml-parser is fundamentally a DOM parser. Its "stream" mode (`XMLParser` with event callbacks) still constructs JavaScript objects for each tag. For a 35 GB file with text nodes that can be megabytes each, this creates GC pressure and risks memory spikes. A true SAX parser that emits events without constructing intermediate objects is safer for this scale.

**Why not node-expat:** While node-expat offers the best raw throughput via the C libexpat library, it requires native compilation (node-gyp + system libexpat). This adds install complexity and CI friction for a project that doesn't need sub-millisecond parse times — saxes is fast enough for a one-shot import job.

**`@xml-stream/parser` was not evaluable** — the npm page requires authentication to view; the package appears to have limited adoption and documentation.

### Usage Pattern

```typescript
import { SaxesParser } from 'saxes';
import { createReadStream } from 'fs';

const parser = new SaxesParser();
parser.on('opentag', (node) => { /* handle <page>, <revision>, etc. */ });
parser.on('text', (text) => { /* accumulate text content */ });
parser.on('closetag', (name) => { /* emit completed page/revision */ });

const stream = createReadStream(xmlFilePath, { highWaterMark: 64 * 1024 });
for await (const chunk of stream) {
  parser.write(chunk.toString());
}
parser.close();
```

### Alternatives Considered

| Library | Verdict | Reason Rejected |
|---|---|---|
| `sax` | Runner-up | Slower, no built-in TS types, less strict XML compliance. Would work fine functionally. |
| `fast-xml-parser` | Rejected | DOM-first architecture; not true constant-memory streaming for 35 GB files. |
| `node-expat` | Rejected | Native C dependency adds install complexity with no meaningful benefit for a batch import. |
| `@xml-stream/parser` | Not evaluated | npm page requires authentication; limited community adoption. |

---

## Topic 2: SQLite Driver for Node.js

### Decision

**`better-sqlite3`** — synchronous, native SQLite driver with the best bulk-insert performance, first-class transaction support, and WAL mode for optimal write throughput.

### Rationale

| Criterion | better-sqlite3 | sqlite3 (node-sqlite3) | sql.js (WASM) |
|---|---|---|---|
| **API style** | Synchronous | Callback/Promise async | Synchronous (in-memory) |
| **Bulk insert perf** | Baseline (1x) | 2.9x–24.4x slower (per better-sqlite3 benchmarks) | Significantly slower; entire DB must fit in memory |
| **Memory model** | Native file I/O; only active pages in memory | Native file I/O | ❌ Entire DB loaded into memory as ArrayBuffer — impossible for millions of revisions |
| **TypeScript** | `@types/better-sqlite3` (DefinitelyTyped) | `@types/sqlite3` (DefinitelyTyped) | `@types/sql.js` (DefinitelyTyped) |
| **FTS5 support** | ✅ Compiled with FTS5 by default | ✅ Supported | ✅ Compiled in |
| **Transaction handling** | `db.transaction(fn)` — elegant, auto-commit/rollback | Manual `BEGIN`/`COMMIT` via callbacks | Manual `db.run("BEGIN")` |
| **Prepared statements** | `db.prepare(sql)` — reusable, parameterized | Supported but async | Supported |
| **WAL mode** | ✅ `db.pragma('journal_mode = WAL')` | ✅ Supported | N/A (in-memory) |
| **Native deps** | ✅ Prebuilt binaries for LTS Node.js | ✅ Prebuilt binaries | ❌ None (WASM) |
| **Weekly downloads** | 5.4M | ~3.5M | 450K |
| **Maintenance** | v12.8.0 published 1 day ago; very active | Active | Active |

**Why better-sqlite3:** The synchronous API is actually an advantage for this use case. SQLite serializes writes internally — async APIs like node-sqlite3 just add overhead by bouncing between the event loop and a thread pool for what ends up being serial execution anyway. better-sqlite3 eliminates this overhead entirely.

The `db.transaction()` wrapper is particularly valuable: it automatically commits on success and rolls back on error, making the 1000-page batch commit pattern clean and safe:

```typescript
const insertBatch = db.transaction((pages: PageData[]) => {
  for (const page of pages) {
    insertPage.run(page);
    for (const rev of page.revisions) {
      insertRevision.run(rev);
    }
  }
});
```

For 223K pages with millions of revisions, the combination of:
- WAL mode (concurrent reads during writes)
- Prepared statements (parse SQL once, bind many times)
- Synchronous transactions (no async overhead)
- Batch commits (1000 pages per transaction)

...delivers the best possible write throughput in Node.js SQLite.

**Why not sql.js:** sql.js loads the entire database into a WASM memory buffer. For millions of revisions, this will exhaust memory. Its own README recommends native bindings for Node.js use cases.

### Alternatives Considered

| Library | Verdict | Reason Rejected |
|---|---|---|
| `sqlite3` (node-sqlite3) | Runner-up | Functional but 2.9x–24.4x slower on benchmarks due to async overhead. Callback-heavy API is more cumbersome for batch operations. |
| `sql.js` (WASM) | Rejected | In-memory-only model is incompatible with the data volume (millions of rows). Designed for browser use cases. |

---

## Topic 3: Category Extraction from MediaWiki Wikitext

### Decision

**Regex-based extraction** with explicit handling of `<nowiki>` blocks and HTML comments. No full wikitext parser needed.

### Rationale

MediaWiki categories follow a well-defined syntax: `[[Category:Name]]` or `[[Category:Name|Sort key]]`. Unlike general wikitext parsing (templates, transclusion, Lua modules), category links are always literal text in the source — they are not generated by templates at render time in the stored wikitext.

However, several edge cases must be handled:

#### Cases to Handle

1. **Basic:** `[[Category:Star Trek episodes]]` → category "Star Trek episodes"
2. **With sort key:** `[[Category:Star Trek episodes|Episode Title]]` → category "Star Trek episodes" (sort key captured but not stored in DB per spec)
3. **Multiple per page:** Pages commonly have 3–10 category links
4. **Case-insensitive namespace:** `[[category:Foo]]` is valid (MediaWiki normalizes the namespace prefix)
5. **Whitespace:** `[[ Category : Foo ]]` — whitespace around the colon and name is trimmed by MediaWiki

#### Cases to Exclude

1. **Inside `<nowiki>` tags:** `<nowiki>[[Category:Foo]]</nowiki>` — must NOT be extracted
2. **Inside HTML comments:** `<!-- [[Category:Foo]] -->` — must NOT be extracted
3. **Inside `<pre>` tags:** `<pre>[[Category:Foo]]</pre>` — must NOT be extracted
4. **Template-generated categories:** Templates like `{{Infobox}}` may add categories at render time. These do NOT appear in the stored wikitext and thus cannot be extracted by any regex/parser approach. This is an accepted limitation.

#### Recommended Implementation

```typescript
/**
 * Extract category names from MediaWiki wikitext.
 * Strips <nowiki>, <!-- -->, and <pre> blocks before matching.
 */
export function extractCategories(wikitext: string): string[] {
  // Step 1: Remove <nowiki>...</nowiki> blocks (non-greedy)
  let cleaned = wikitext.replace(/<nowiki>[\s\S]*?<\/nowiki>/gi, '');
  
  // Step 2: Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Step 3: Remove <pre>...</pre> blocks
  cleaned = cleaned.replace(/<pre>[\s\S]*?<\/pre>/gi, '');
  
  // Step 4: Match [[Category:Name]] or [[Category:Name|Sort key]]
  const regex = /\[\[\s*[Cc]ategory\s*:\s*([^\]|]+?)(?:\s*\|[^\]]*)?\s*\]\]/g;
  
  const categories: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const name = match[1].trim();
    if (name) categories.push(name);
  }
  
  return [...new Set(categories)]; // deduplicate
}
```

#### Why Not a Full Wikitext Parser?

Full wikitext parsers (e.g., `wtf_wikipedia`, `parsoid`) are designed to render wikitext to HTML. They are:
- Heavyweight dependencies (parsoid requires a full MediaWiki installation)
- Overkill for extracting a single well-defined pattern
- Not meaningfully more accurate for `[[Category:...]]` extraction, since the syntax is unambiguous

The regex approach handles all cases present in stored wikitext. Template-generated categories are invisible regardless of approach (they only exist after server-side template expansion).

### Alternatives Considered

| Approach | Verdict | Reason |
|---|---|---|
| Regex (chosen) | ✅ Selected | Simple, fast, handles all stored-wikitext cases. |
| `wtf_wikipedia` npm package | Rejected | Parses wikitext to structured data but adds a large dependency for a single extraction task. May normalize text in unwanted ways. |
| Parsoid / full parser | Rejected | Requires MediaWiki server-side infrastructure. Orders of magnitude more complex than needed. |
| Simple `indexOf`/`split` | Rejected | Too fragile; doesn't handle sort keys, whitespace variants, or exclusion zones. |

---

## Topic 4: CLI Framework

### Decision

**`commander`** — the most widely used Node.js CLI framework with built-in TypeScript declarations, a simple declarative API, and excellent maintenance.

### Rationale

| Criterion | commander | yargs | clipanion | citty |
|---|---|---|---|---|
| **TypeScript** | ✅ Built-in `.d.ts` + `@commander-js/extra-typings` for inferred option types | ❌ Requires `@types/yargs` | ✅ Built-in (TypeScript-first) | ✅ Built-in `.d.ts` |
| **API style** | Fluent chaining: `.option()`, `.argument()`, `.action()` | Builder pattern with `.command()`, `.option()` | Class-based: extend `Command`, use `Option` decorators | `defineCommand()` function-based |
| **Simplicity** | ✅ Minimal boilerplate for simple CLIs | ⚠️ More verbose; designed for complex multi-command CLIs | ⚠️ Class-based is heavier for a single-command tool | ✅ Very minimal |
| **Dependencies** | 0 | 6 | 1 | 0 |
| **Weekly downloads** | 254M | 134M | 4.3M | 15.6M |
| **Maintenance** | v14.0.3, published 22 days ago; very active | v18.0.0, published 10 months ago; active | v4.0.0-rc.4, published 2 years ago; pre-release only | v0.2.1, published 1 month ago; active but pre-1.0 |
| **Maturity** | Battle-tested since 2011 | Battle-tested since 2013 | Mature (used by Yarn) but stuck on RC | Newer; part of UnJS ecosystem |

**Why commander:** For a CLI with a single command, a required file path argument, and 3 optional flags, commander's fluent API is the cleanest fit:

```typescript
import { Command } from 'commander';

const program = new Command()
  .name('mw-import')
  .description('Import MediaWiki XML export into SQLite')
  .argument('<xml-file>', 'Path to MediaWiki XML export file')
  .option('-d, --database <path>', 'SQLite database path', './memory-alpha.db')
  .option('-n, --namespaces <ids>', 'Comma-separated namespace IDs to include')
  .option('-l, --log <path>', 'Log file path', './import.log')
  .action(async (xmlFile, options) => {
    // ...
  });

program.parse();
```

This is ~15 lines for the entire CLI definition. commander auto-generates `--help`, validates required arguments, and provides clear error messages for missing/unknown options.

**Why not yargs:** yargs is more powerful but also more verbose. Its TypeScript support requires a separate `@types` package and manual type assertions. For a single-command CLI, yargs' subcommand infrastructure is unnecessary weight.

**Why not clipanion:** The class-based API is elegant for large multi-command CLIs (like Yarn), but overkill for a single command. The latest published version is still a release candidate (4.0.0-rc.4) after 2 years.

**Why not citty:** citty is clean and modern (zero deps, built-in TS), but it's pre-1.0 (v0.2.1) and has a smaller ecosystem. It would be the second choice if commander were unavailable.

### Alternatives Considered

| Library | Verdict | Reason |
|---|---|---|
| `commander` (chosen) | ✅ Selected | Best balance of simplicity, TypeScript support, maintenance, and ecosystem. |
| `yargs` | Runner-up | More verbose than needed for a single-command CLI. |
| `clipanion` | Rejected | Stuck on RC for 2 years; class-based API is overkill. |
| `citty` | Honorable mention | Modern and clean but pre-1.0; would be the pick for a UnJS-based stack. |

---

## Topic 5: Idempotent Upserts in SQLite

### Decision

**`INSERT ... ON CONFLICT(...) DO UPDATE SET ...`** (SQLite UPSERT syntax) — the most performant and correct approach for idempotent imports.

### Rationale

#### Comparing the Three Approaches

| Approach | Correctness | Performance | Complexity |
|---|---|---|---|
| `INSERT OR REPLACE` | ⚠️ **Dangerous** — deletes and re-inserts the row, firing DELETE triggers and resetting any columns not in the INSERT | Fast (single statement) | Low |
| `INSERT ... ON CONFLICT ... DO UPDATE` | ✅ **Correct** — updates only specified columns; preserves unmentioned columns; no delete/re-insert | Fast (single statement) | Low |
| Check-then-insert (SELECT + INSERT/UPDATE) | ✅ Correct | ❌ **2x statements per row** — catastrophic at scale | High |

#### Why NOT `INSERT OR REPLACE`

`INSERT OR REPLACE` is semantically a DELETE followed by an INSERT. This means:
1. It fires DELETE triggers (if any exist)
2. It resets any columns with DEFAULT values that aren't explicitly set in the INSERT
3. It changes the rowid (unless explicitly set), which can break foreign key references
4. It removes the old row from FTS indexes and re-inserts it

For the pages table with a future FTS5 index, `INSERT OR REPLACE` would cause unnecessary FTS index churn on every re-import.

#### Recommended SQL Pattern

**Pages table:**
```sql
INSERT INTO pages (page_id, title, namespace_id)
VALUES (?, ?, ?)
ON CONFLICT(page_id) DO UPDATE SET
  title = excluded.title,
  namespace_id = excluded.namespace_id;
```

**Revisions table:**
```sql
INSERT INTO revisions (revision_id, page_id, parent_id, timestamp, contributor_name, contributor_id, content_model, content_format, text_content, sha1)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(revision_id) DO UPDATE SET
  page_id = excluded.page_id,
  parent_id = excluded.parent_id,
  timestamp = excluded.timestamp,
  contributor_name = excluded.contributor_name,
  contributor_id = excluded.contributor_id,
  content_model = excluded.content_model,
  content_format = excluded.content_format,
  text_content = excluded.text_content,
  sha1 = excluded.sha1;
```

**Categories (page_categories join table):**
```sql
INSERT INTO page_categories (page_id, category_id)
VALUES (?, ?)
ON CONFLICT(page_id, category_id) DO NOTHING;
```

The `excluded.` prefix refers to the values from the attempted INSERT, following PostgreSQL convention that SQLite adopted.

#### Performance Considerations for 223K+ Pages / Millions of Revisions

1. **Prepared statements are critical.** Parse the SQL once, bind values many times:
   ```typescript
   const upsertPage = db.prepare(`INSERT INTO pages ... ON CONFLICT ...`);
   const upsertRevision = db.prepare(`INSERT INTO revisions ... ON CONFLICT ...`);
   ```

2. **Batch transactions** (1000 pages per transaction per spec) reduce fsync overhead:
   ```typescript
   const importBatch = db.transaction((pages: PageData[]) => {
     for (const page of pages) {
       upsertPage.run({ ... });
       for (const rev of page.revisions) {
         upsertRevision.run({ ... });
       }
     }
   });
   ```

3. **WAL mode** (`PRAGMA journal_mode = WAL`) allows concurrent reads during writes and improves write throughput by ~5x for batch operations.

4. **Additional PRAGMAs** for import throughput:
   ```sql
   PRAGMA synchronous = NORMAL;    -- safe with WAL; reduces fsync frequency
   PRAGMA cache_size = -64000;     -- 64 MB page cache
   PRAGMA temp_store = MEMORY;     -- temp tables in memory
   ```

5. **Index timing:** Create indexes AFTER the initial bulk import if starting from an empty database. For re-imports (idempotent upserts), indexes must exist for the ON CONFLICT clause to work, so this optimization applies only to first run. Adding a "first run" detection (empty pages table) could defer index creation for a significant speedup on initial import.

### Alternatives Considered

| Approach | Verdict | Reason |
|---|---|---|
| `INSERT ... ON CONFLICT ... DO UPDATE` (chosen) | ✅ Selected | Single atomic statement; preserves unmentioned columns; no delete-trigger side effects; optimal performance. |
| `INSERT OR REPLACE` | Rejected | Deletes and re-inserts rows — resets defaults, fires DELETE triggers, causes FTS index churn. Semantically wrong for an "update" operation. |
| Check-then-insert (`SELECT` + conditional `INSERT`/`UPDATE`) | Rejected | 2x the number of SQL statements; slower; race-condition-prone (though not an issue with single-writer SQLite). No benefit over UPSERT. |

---

## Summary of Decisions

| Topic | Decision | Package/Approach |
|---|---|---|
| Streaming XML Parser | `saxes` | Pure JS, built-in TS types, constant memory, spec-compliant |
| SQLite Driver | `better-sqlite3` | Synchronous, fastest benchmarks, elegant transactions |
| Category Extraction | Regex with exclusion zones | Strip `<nowiki>`/comments/`<pre>`, then match `[[Category:...]]` |
| CLI Framework | `commander` | Simplest API for single-command CLI, 254M weekly downloads |
| Idempotent Upserts | `INSERT ... ON CONFLICT ... DO UPDATE` | Atomic, no delete side-effects, works with prepared statements |
