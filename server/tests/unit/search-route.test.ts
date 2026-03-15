import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../src/models/database.js';
import { createApp } from '../../src/api/app.js';
import { FTS5Indexer } from '../../src/lib/fts5-indexer.js';

function seedDatabase(db: Database.Database) {
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(0, '', 'first-letter');
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(1, 'Warp drive', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(2, 'USS Enterprise', 0);
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)`).run(
    100, 1, '2025-01-01T00:00:00Z', 'The warp drive is a propulsion system used in starships.',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)`).run(
    200, 2, '2025-01-01T00:00:00Z', 'The USS Enterprise is a famous starship.',
  );
}

describe('Search routes', () => {
  let app: ReturnType<typeof createApp>;
  let db: Database.Database;

  beforeEach(() => {
    db = initializeDatabase(':memory:');
    seedDatabase(db);
    app = createApp(db);
  });

  describe('GET /api/search', () => {
    it('returns 400 when q is missing', async () => {
      const indexer = new FTS5Indexer(db);
      indexer.build();

      const res = await request(app).get('/api/search');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 503 when index not built', async () => {
      const res = await request(app).get('/api/search?q=warp');
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SEARCH_INDEX_NOT_BUILT');
    });

    it('returns results for valid query', async () => {
      const indexer = new FTS5Indexer(db);
      indexer.build();

      const res = await request(app).get('/api/search?q=warp');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('returns empty results for no match', async () => {
      const indexer = new FTS5Indexer(db);
      indexer.build();

      const res = await request(app).get('/api/search?q=nonexistentxyz');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('POST /api/search/rebuild', () => {
    it('rebuilds the index', async () => {
      const res = await request(app).post('/api/search/rebuild');
      expect(res.status).toBe(200);
      expect(res.body.data.indexedPages).toBe(2);
      expect(res.body.data.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
