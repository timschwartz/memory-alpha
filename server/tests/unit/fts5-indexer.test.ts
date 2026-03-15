import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../src/models/database.js';
import { FTS5Indexer } from '../../src/lib/fts5-indexer.js';

function seedDatabase(db: Database.Database) {
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(0, '', 'first-letter');
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(1, 'Warp drive', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(2, 'USS Enterprise', 0);
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)`).run(
    100, 1, '2025-01-01T00:00:00Z', 'The warp drive is a propulsion system.',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)`).run(
    200, 2, '2025-01-01T00:00:00Z', 'The USS Enterprise is a starship.',
  );
}

describe('FTS5Indexer', () => {
  let db: Database.Database;
  let indexer: FTS5Indexer;

  beforeEach(() => {
    db = initializeDatabase(':memory:');
    seedDatabase(db);
    indexer = new FTS5Indexer(db);
  });

  describe('isIndexReady', () => {
    it('returns false when index is empty', () => {
      expect(indexer.isIndexReady()).toBe(false);
    });

    it('returns true after build', () => {
      indexer.build();
      expect(indexer.isIndexReady()).toBe(true);
    });
  });

  describe('build', () => {
    it('indexes all pages', () => {
      const result = indexer.build();
      expect(result.indexedPages).toBe(2);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('can rebuild (idempotent)', () => {
      indexer.build();
      const result = indexer.build();
      expect(result.indexedPages).toBe(2);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      indexer.build();
    });

    it('finds pages by content', () => {
      const results = indexer.search('warp', 10, 0);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Warp drive');
    });

    it('returns empty for no match', () => {
      const results = indexer.search('nonexistentterm', 10, 0);
      expect(results).toEqual([]);
    });

    it('returns empty for empty query', () => {
      const results = indexer.search('', 10, 0);
      expect(results).toEqual([]);
    });
  });

  describe('searchCount', () => {
    beforeEach(() => {
      indexer.build();
    });

    it('returns count for matching query', () => {
      const count = indexer.searchCount('warp');
      expect(count).toBeGreaterThan(0);
    });

    it('returns 0 for no match', () => {
      expect(indexer.searchCount('nonexistentterm')).toBe(0);
    });
  });

  describe('sanitizeQuery', () => {
    it('strips special characters', () => {
      const result = indexer.sanitizeQuery('hello "world"');
      // The double quotes around "world" are stripped, then the word is re-quoted for FTS5
      expect(result).toBe('"hello"* "world"*');
    });

    it('returns empty for empty input', () => {
      expect(indexer.sanitizeQuery('')).toBe('');
    });

    it('returns empty for only special chars', () => {
      expect(indexer.sanitizeQuery('"+()-')).toBe('');
    });

    it('filters reserved words', () => {
      const result = indexer.sanitizeQuery('warp AND drive');
      expect(result).not.toContain('AND');
    });
  });

  describe('getIndexedCount', () => {
    it('returns 0 when index is empty', () => {
      expect(indexer.getIndexedCount()).toBe(0);
    });

    it('returns count after build', () => {
      indexer.build();
      expect(indexer.getIndexedCount()).toBe(2);
    });
  });

  describe('getTotalIndexableCount', () => {
    it('returns total page count', () => {
      expect(indexer.getTotalIndexableCount()).toBe(2);
    });
  });

  describe('clearIndex', () => {
    it('removes all entries from search index', () => {
      indexer.build();
      expect(indexer.getIndexedCount()).toBe(2);
      indexer.clearIndex();
      expect(indexer.getIndexedCount()).toBe(0);
    });
  });

  describe('buildIncremental', () => {
    it('indexes all pages when index is empty', () => {
      const result = indexer.buildIncremental();
      expect(result.indexedPages).toBe(2);
      expect(indexer.getIndexedCount()).toBe(2);
    });

    it('skips already-indexed pages', () => {
      indexer.buildIncremental();
      const result = indexer.buildIncremental();
      expect(result.indexedPages).toBe(0);
      expect(indexer.getIndexedCount()).toBe(2);
    });

    it('indexes only new pages after partial index', () => {
      // Index first batch
      indexer.buildIncremental(undefined, undefined, 1);
      expect(indexer.getIndexedCount()).toBeLessThanOrEqual(2);

      // Add a third page
      db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(3, 'Phaser', 0);
      db.prepare('INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)').run(
        300, 3, '2025-01-01T00:00:00Z', 'A phaser is a weapon.',
      );

      const result = indexer.buildIncremental();
      expect(indexer.getIndexedCount()).toBe(3);
      expect(result.indexedPages).toBeGreaterThan(0);
    });

    it('calls progress callback with correct data', () => {
      const progressCalls: { indexedPages: number; totalPages: number; percentage: number }[] = [];
      indexer.buildIncremental((progress) => {
        progressCalls.push({ ...progress });
      }, undefined, 1);

      expect(progressCalls.length).toBe(2);
      expect(progressCalls[0].totalPages).toBe(2);
      expect(progressCalls[1].indexedPages).toBe(2);
      expect(progressCalls[1].percentage).toBe(100);
    });

    it('respects shouldStop flag', () => {
      let callCount = 0;
      indexer.buildIncremental(undefined, () => {
        callCount++;
        return callCount > 1;
      }, 1);

      expect(indexer.getIndexedCount()).toBe(1);
    });

    it('works after clearIndex for rebuild', () => {
      indexer.buildIncremental();
      expect(indexer.getIndexedCount()).toBe(2);
      indexer.clearIndex();
      expect(indexer.getIndexedCount()).toBe(0);
      const result = indexer.buildIncremental();
      expect(result.indexedPages).toBe(2);
      expect(indexer.getIndexedCount()).toBe(2);
    });
  });
});
