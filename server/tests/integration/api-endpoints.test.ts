import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../src/models/database.js';
import { createApp } from '../../src/api/app.js';
import { FTS5Indexer } from '../../src/lib/fts5-indexer.js';

function seedDatabase(db: Database.Database) {
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(0, '', 'first-letter');
  db.prepare('INSERT INTO namespaces (namespace_id, name, case_setting) VALUES (?, ?, ?)').run(14, 'Category', 'first-letter');

  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(1, 'USS Enterprise', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(2, 'Warp drive', 0);
  db.prepare('INSERT INTO pages (page_id, title, namespace_id) VALUES (?, ?, ?)').run(3, 'Starfleet', 0);

  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content, contributor_name) VALUES (?, ?, ?, ?, ?)`).run(
    100, 1, '2025-01-01T00:00:00Z', 'The USS Enterprise (NCC-1701) is a Constitution-class starship.', 'Admin',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content, contributor_name) VALUES (?, ?, ?, ?, ?)`).run(
    200, 2, '2025-01-01T00:00:00Z', 'Warp drive is a faster-than-light propulsion system.', 'Admin',
  );
  db.prepare(`INSERT INTO revisions (revision_id, page_id, timestamp, text_content, contributor_name) VALUES (?, ?, ?, ?, ?)`).run(
    300, 3, '2025-01-01T00:00:00Z', 'Starfleet is the exploratory and defense force of the Federation.', 'Admin',
  );

  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Federation starships');
  db.prepare('INSERT INTO categories (name) VALUES (?)').run('Technology');
  db.prepare('INSERT INTO page_categories (page_id, category_id) VALUES (?, ?)').run(1, 1);
  db.prepare('INSERT INTO page_categories (page_id, category_id) VALUES (?, ?)').run(2, 2);
}

describe('API Endpoints Integration', () => {
  let app: ReturnType<typeof createApp>;
  let db: Database.Database;

  beforeAll(() => {
    db = initializeDatabase(':memory:');
    seedDatabase(db);
    const indexer = new FTS5Indexer(db);
    indexer.build();
    app = createApp(db);
  });

  it('GET /api/health returns status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.totalPages).toBe(3);
    expect(res.body.data.totalCategories).toBe(2);
    expect(res.body.data.searchIndexReady).toBe(true);
  });

  it('GET /api/pages returns paginated list', async () => {
    const res = await request(app).get('/api/pages?limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.hasMore).toBe(true);
  });

  it('GET /api/pages/:title returns article detail', async () => {
    const res = await request(app).get('/api/pages/USS%20Enterprise');
    expect(res.status).toBe(200);
    expect(res.body.data.page_id).toBe(1);
    expect(res.body.data.latest_revision.text_content).toContain('Constitution-class');
    expect(res.body.data.categories).toContain('Federation starships');
  });

  it('GET /api/pages/by-id/:pageId returns article', async () => {
    const res = await request(app).get('/api/pages/by-id/2');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Warp drive');
  });

  it('GET /api/search returns search results', async () => {
    const res = await request(app).get('/api/search?q=starship');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('GET /api/categories returns categories with counts', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    const fed = res.body.data.find((c: any) => c.name === 'Federation starships');
    expect(fed.page_count).toBe(1);
  });

  it('GET /api/categories/:name/pages returns pages', async () => {
    const res = await request(app).get('/api/categories/Federation%20starships/pages');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('USS Enterprise');
  });

  it('POST /api/search/rebuild rebuilds index', async () => {
    const res = await request(app).post('/api/search/rebuild');
    expect(res.status).toBe(200);
    expect(res.body.data.indexedPages).toBe(3);
  });
});
