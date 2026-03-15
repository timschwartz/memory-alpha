import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MediaWikiImporter } from '../../src/lib/importer.js';
import { resolve } from 'path';
import { unlinkSync, existsSync } from 'fs';
import Database from 'better-sqlite3';

const FIXTURE_PATH = resolve(import.meta.dirname, '../fixtures/sample-export.xml');
const TEST_DB_PATH = resolve(import.meta.dirname, '../fixtures/test-integration.db');
const TEST_LOG_PATH = resolve(import.meta.dirname, '../fixtures/test-integration.log');

function cleanup() {
  for (const f of [TEST_DB_PATH, TEST_LOG_PATH]) {
    if (existsSync(f)) unlinkSync(f);
  }
}

describe('Import Pipeline Integration', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it('should perform full end-to-end import and verify data integrity', async () => {
    const importer = new MediaWikiImporter({
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
    });

    const result = await importer.run();

    expect(result.totalPages).toBe(7);
    expect(result.totalRevisions).toBe(8);
    expect(result.skippedPages).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    const db = new Database(TEST_DB_PATH);

    // Verify namespaces
    const namespaces = db.prepare('SELECT * FROM namespaces ORDER BY namespace_id').all() as {
      namespace_id: number;
      name: string;
    }[];
    expect(namespaces).toHaveLength(3);
    expect(namespaces[0].namespace_id).toBe(0);
    expect(namespaces[1].name).toBe('Talk');
    expect(namespaces[2].name).toBe('Category');

    // Verify page counts per namespace
    const nsCounts = db
      .prepare('SELECT namespace_id, COUNT(*) as c FROM pages GROUP BY namespace_id ORDER BY namespace_id')
      .all() as { namespace_id: number; c: number }[];
    expect(nsCounts).toEqual([
      { namespace_id: 0, c: 5 },
      { namespace_id: 1, c: 1 },
      { namespace_id: 14, c: 1 },
    ]);

    // Verify revision content integrity
    const kirkLatest = db
      .prepare('SELECT text_content FROM revisions WHERE revision_id = 5002')
      .get() as { text_content: string };
    expect(kirkLatest.text_content).toContain('USS Enterprise (NCC-1701)');

    // Verify redirect page stored as-is
    const redirect = db
      .prepare('SELECT r.text_content FROM revisions r JOIN pages p ON r.page_id = p.page_id WHERE p.title = ?')
      .get('Redirect Page') as { text_content: string };
    expect(redirect.text_content).toContain('#REDIRECT');

    // Verify categories
    const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
    expect(catCount).toBeGreaterThan(0);

    // Verify page_categories join
    const kirkCats = db
      .prepare(
        `SELECT c.name FROM categories c
         JOIN page_categories pc ON c.category_id = pc.category_id
         WHERE pc.page_id = 1001
         ORDER BY c.name`,
      )
      .all() as { name: string }[];
    expect(kirkCats.map((c) => c.name)).toContain('Starfleet captains');

    db.close();
  });

  it('should be fully idempotent — re-import produces identical state', async () => {
    const opts = {
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
    };

    await new MediaWikiImporter(opts).run();

    const db1 = new Database(TEST_DB_PATH);
    const pages1 = (db1.prepare('SELECT COUNT(*) as c FROM pages').get() as { c: number }).c;
    const revs1 = (db1.prepare('SELECT COUNT(*) as c FROM revisions').get() as { c: number }).c;
    const cats1 = (db1.prepare('SELECT COUNT(*) as c FROM page_categories').get() as { c: number }).c;
    db1.close();

    // Re-import
    await new MediaWikiImporter(opts).run();

    const db2 = new Database(TEST_DB_PATH);
    const pages2 = (db2.prepare('SELECT COUNT(*) as c FROM pages').get() as { c: number }).c;
    const revs2 = (db2.prepare('SELECT COUNT(*) as c FROM revisions').get() as { c: number }).c;
    const cats2 = (db2.prepare('SELECT COUNT(*) as c FROM page_categories').get() as { c: number }).c;
    db2.close();

    expect(pages2).toBe(pages1);
    expect(revs2).toBe(revs1);
    expect(cats2).toBe(cats1);
  });

  it('should handle namespace filtering in full pipeline', async () => {
    const importer = new MediaWikiImporter({
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
      namespaceFilter: [0, 14],
    });

    const result = await importer.run();
    expect(result.totalPages).toBe(6);

    const db = new Database(TEST_DB_PATH);
    const nsIds = db
      .prepare('SELECT DISTINCT namespace_id FROM pages ORDER BY namespace_id')
      .all() as { namespace_id: number }[];
    db.close();

    expect(nsIds.map((r) => r.namespace_id)).toEqual([0, 14]);
  });
});
