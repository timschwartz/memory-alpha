import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../src/models/database.js';
import { createApp } from '../../src/api/app.js';

function seedDatabase(db: Database.Database) {
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(0, '', 'first-letter');
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(1, 'Warp drive', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(2, 'USS Enterprise', 0);
  db.prepare('INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)').run(
    100, 1, '2025-01-01T00:00:00Z', 'The warp drive is a propulsion system.',
  );
  db.prepare('INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)').run(
    200, 2, '2025-01-01T00:00:00Z', 'The USS Enterprise is a starship.',
  );
}

describe('Indexing Route Integration', () => {
  let app: ReturnType<typeof createApp>;
  let db: Database.Database;

  beforeEach(() => {
    db = initializeDatabase(':memory:');
    seedDatabase(db);
    app = createApp(db);
  });

  describe('GET /api/indexing/status', () => {
    it('returns idle state when no indexing has run', async () => {
      const res = await request(app).get('/api/indexing/status');
      expect(res.status).toBe(200);
      expect(res.body.data.state).toBe('idle');
      expect(res.body.data.indexedPages).toBe(0);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.percentage).toBe(0);
    });
  });

  describe('POST /api/indexing/start', () => {
    it('returns 400 for invalid mode', async () => {
      const res = await request(app)
        .post('/api/indexing/start')
        .send({ mode: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MODE');
    });

    it('returns 400 when mode is missing', async () => {
      const res = await request(app)
        .post('/api/indexing/start')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MODE');
    });

    it('returns 202 and starts indexing with continue mode', async () => {
      const res = await request(app)
        .post('/api/indexing/start')
        .send({ mode: 'continue' });
      expect(res.status).toBe(202);
      expect(res.body.data.status).toBe('started');
      expect(res.body.data.totalPages).toBe(2);
    });

    it('returns 202 and starts indexing with rebuild mode', async () => {
      const res = await request(app)
        .post('/api/indexing/start')
        .send({ mode: 'rebuild' });
      expect(res.status).toBe(202);
      expect(res.body.data.status).toBe('started');
    });

    it('returns 409 when indexing is already in progress', async () => {
      // Seed many pages so indexing takes long enough for concurrent request check
      for (let i = 10; i <= 1500; i++) {
        db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(i, `Page ${i}`, 0);
        db.prepare('INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)').run(
          i * 100, i, '2025-01-01T00:00:00Z', `Content for page ${i}`,
        );
      }
      const largeApp = createApp(db);

      // Send both requests concurrently — the second should arrive while indexing is in-progress
      const [res1, res2] = await Promise.all([
        request(largeApp).post('/api/indexing/start').send({ mode: 'continue' }),
        request(largeApp).post('/api/indexing/start').send({ mode: 'continue' }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([202, 409]);
    });

    it('completes indexing and status shows complete', async () => {
      await request(app)
        .post('/api/indexing/start')
        .send({ mode: 'continue' });

      // Wait for async indexing to finish
      await new Promise((resolve) => setTimeout(resolve, 200));

      const res = await request(app).get('/api/indexing/status');
      expect(res.status).toBe(200);
      expect(res.body.data.state).toBe('complete');
      expect(res.body.data.indexedPages).toBe(2);
      expect(res.body.data.percentage).toBe(100);
      expect(res.body.data.completedAt).toBeTruthy();
      expect(res.body.data.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('rebuild clears index and re-indexes', async () => {
      // First, build the index
      await request(app)
        .post('/api/indexing/start')
        .send({ mode: 'continue' });
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Then rebuild
      const res = await request(app)
        .post('/api/indexing/start')
        .send({ mode: 'rebuild' });
      expect(res.status).toBe(202);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const statusRes = await request(app).get('/api/indexing/status');
      expect(statusRes.body.data.state).toBe('complete');
      expect(statusRes.body.data.indexedPages).toBe(2);
    });
  });
});
