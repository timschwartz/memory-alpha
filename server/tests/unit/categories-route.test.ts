import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../src/models/database.js';
import { createApp } from '../../src/api/app.js';

function seedDatabase(db: Database.Database) {
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(0, '', 'first-letter');
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(1, 'USS Enterprise', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(2, 'Warp drive', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(3, 'Phaser', 0);
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)`).run(
    100, 1, '2025-01-01T00:00:00Z', 'Enterprise text.',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)`).run(
    200, 2, '2025-01-01T00:00:00Z', 'Warp text.',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content) VALUES (?, ?, ?, ?)`).run(
    300, 3, '2025-01-01T00:00:00Z', 'Phaser text.',
  );
  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Federation starships');
  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Weapons');
  db.prepare('INSERT INTO page_categories (page_id, category_id) VALUES (?, ?)').run(1, 1);
  db.prepare('INSERT INTO page_categories (page_id, category_id) VALUES (?, ?)').run(2, 1);
  db.prepare('INSERT INTO page_categories (page_id, category_id) VALUES (?, ?)').run(3, 2);
}

describe('Categories routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const db = initializeDatabase(':memory:');
    seedDatabase(db);
    app = createApp(db);
  });

  describe('GET /api/categories', () => {
    it('returns category list with page counts', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const fed = res.body.data.find((c: any) => c.name === 'Federation starships');
      expect(fed.page_count).toBe(2);
    });

    it('supports prefix filter', async () => {
      const res = await request(app).get('/api/categories?prefix=Fed');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Federation starships');
    });

    it('returns 400 for invalid limit', async () => {
      const res = await request(app).get('/api/categories?limit=abc');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/categories/:name/pages', () => {
    it('returns pages in category', async () => {
      const res = await request(app).get('/api/categories/Federation%20starships/pages');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('returns 404 for unknown category', async () => {
      const res = await request(app).get('/api/categories/Unknown%20Category/pages');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
