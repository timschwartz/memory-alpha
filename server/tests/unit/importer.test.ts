import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MediaWikiImporter } from '../../src/lib/importer.js';
import { resolve } from 'path';
import { unlinkSync, existsSync } from 'fs';
import Database from 'better-sqlite3';
import type { ImportProgress } from '@memory-alpha/shared';

const FIXTURE_PATH = resolve(import.meta.dirname, '../fixtures/sample-export.xml');
const TEST_DB_PATH = resolve(import.meta.dirname, '../fixtures/test-importer.db');
const TEST_LOG_PATH = resolve(import.meta.dirname, '../fixtures/test-importer.log');

function cleanup() {
  for (const f of [TEST_DB_PATH, TEST_LOG_PATH]) {
    if (existsSync(f)) unlinkSync(f);
  }
}

describe('MediaWikiImporter', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it('should import all pages and revisions', async () => {
    const importer = new MediaWikiImporter({
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
    });

    const result = await importer.run();

    expect(result.totalPages).toBe(7);
    expect(result.totalRevisions).toBe(8);
    expect(result.skippedPages).toBe(0);
    expect(result.totalCategories).toBeGreaterThan(0);
  });

  it('should be idempotent on re-import', async () => {
    const opts = {
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
    };

    const first = await new MediaWikiImporter(opts).run();
    const second = await new MediaWikiImporter(opts).run();

    expect(second.totalPages).toBe(first.totalPages);
    expect(second.totalRevisions).toBe(first.totalRevisions);

    // Verify no duplicate rows
    const db = new Database(TEST_DB_PATH);
    const pageCount = (db.prepare('SELECT COUNT(*) as c FROM pages').get() as { c: number }).c;
    const revCount = (db.prepare('SELECT COUNT(*) as c FROM revisions').get() as { c: number }).c;
    db.close();

    expect(pageCount).toBe(7);
    expect(revCount).toBe(8);
  });

  it('should invoke progress callback', async () => {
    const progressCalls: ImportProgress[] = [];

    const importer = new MediaWikiImporter({
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
      onProgress: (stats) => progressCalls.push({ ...stats }),
    });

    await importer.run();

    // At least one progress call (the final one after flushing)
    expect(progressCalls.length).toBeGreaterThanOrEqual(1);
    const last = progressCalls[progressCalls.length - 1];
    expect(last.pagesProcessed).toBe(7);
    expect(last.revisionsProcessed).toBe(8);
  });

  it('should filter by namespace when namespaceFilter is set', async () => {
    const importer = new MediaWikiImporter({
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
      namespaceFilter: [0],
    });

    const result = await importer.run();

    // 5 pages in ns=0, 1 in ns=1 (Talk), 1 in ns=14 (Category) → only 5 imported
    expect(result.totalPages).toBe(5);

    const db = new Database(TEST_DB_PATH);
    const nsGroups = db
      .prepare('SELECT namespace_id, COUNT(*) as c FROM pages GROUP BY namespace_id')
      .all() as { namespace_id: number; c: number }[];
    db.close();

    expect(nsGroups).toHaveLength(1);
    expect(nsGroups[0].namespace_id).toBe(0);
  });

  it('should extract categories from the latest revision only', async () => {
    const importer = new MediaWikiImporter({
      xmlFilePath: FIXTURE_PATH,
      databasePath: TEST_DB_PATH,
      logFilePath: TEST_LOG_PATH,
    });

    await importer.run();

    const db = new Database(TEST_DB_PATH);
    // Kirk has 2 revisions. Latest (5002) has 3 categories including "USS Enterprise (NCC-1701) personnel"
    const kirkCats = db
      .prepare(
        `SELECT c.name FROM categories c
         JOIN page_categories pc ON c.category_id = pc.category_id
         WHERE pc.page_id = 1001
         ORDER BY c.name`,
      )
      .all() as { name: string }[];
    db.close();

    expect(kirkCats.map((c) => c.name)).toEqual([
      'Humans',
      'Starfleet captains',
      'USS Enterprise (NCC-1701) personnel',
    ]);
  });
});
