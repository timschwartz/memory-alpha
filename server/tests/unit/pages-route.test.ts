import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../src/models/database.js';
import { createApp } from '../../src/api/app.js';

function seedDatabase(db: Database.Database) {
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(0, '', 'first-letter');
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(14, 'Category', 'first-letter');
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(1, 'USS Enterprise', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(2, 'Warp drive', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(3, 'Starships', 14);
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content, contributor_name) VALUES (?, ?, ?, ?, ?)`).run(
    100, 1, '2025-01-01T00:00:00Z', 'The USS Enterprise is a starship.', 'Admin',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content, contributor_name) VALUES (?, ?, ?, ?, ?)`).run(
    200, 2, '2025-01-01T00:00:00Z', 'Warp drive propulsion.', 'Admin',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content, contributor_name) VALUES (?, ?, ?, ?, ?)`).run(
    300, 3, '2025-01-01T00:00:00Z', 'Category page.', 'Admin',
  );
  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Federation starships');
  db.prepare('INSERT INTO page_categories (page_id, category_id) VALUES (?, ?)').run(1, 1);
}

describe('Pages routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const db = initializeDatabase(':memory:');
    seedDatabase(db);
    app = createApp(db);
  });

  describe('GET /api/pages/:title', () => {
    it('returns page by title', async () => {
      const res = await request(app).get('/api/pages/USS%20Enterprise');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('USS Enterprise');
      expect(res.body.data.latest_revision.text_content).toContain('starship');
      expect(res.body.data.categories).toContain('Federation starships');
    });

    it('resolves namespace prefix', async () => {
      const res = await request(app).get('/api/pages/Category:Starships');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Starships');
      expect(res.body.data.namespace_id).toBe(14);
    });

    it('returns 404 for unknown page', async () => {
      const res = await request(app).get('/api/pages/Unknown%20Page');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/pages/by-id/:pageId', () => {
    it('returns page by ID', async () => {
      const res = await request(app).get('/api/pages/by-id/1');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('USS Enterprise');
    });

    it('returns 404 for unknown ID', async () => {
      const res = await request(app).get('/api/pages/by-id/9999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 for non-integer ID', async () => {
      const res = await request(app).get('/api/pages/by-id/abc');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /api/pages (list)', () => {
    it('returns paginated list', async () => {
      const res = await request(app).get('/api/pages');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBe(3);
    });

    it('supports prefix filter', async () => {
      const res = await request(app).get('/api/pages?prefix=USS');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('USS Enterprise');
    });

    it('supports namespace filter', async () => {
      const res = await request(app).get('/api/pages?namespace=14');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Starships');
    });

    it('returns 400 for invalid limit', async () => {
      const res = await request(app).get('/api/pages?limit=abc');
      expect(res.status).toBe(400);
    });
  });
});
