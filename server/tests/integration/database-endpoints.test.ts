import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../src/models/database.js';
import { createApp } from '../../src/api/app.js';

describe('Database Route Integration', () => {
  let app: ReturnType<typeof createApp>;
  let db: Database.Database;

  beforeEach(() => {
    db = initializeDatabase(':memory:');
    app = createApp(db);
  });

  describe('GET /api/database/status', () => {
    it('returns idle status initially', async () => {
      const res = await request(app).get('/api/database/status');
      expect(res.status).toBe(200);
      expect(res.body.data.state).toBe('idle');
      expect(res.body.data.phase).toBeNull();
      expect(res.body.data.percent).toBeNull();
      expect(res.body.data.error).toBeNull();
    });
  });

  describe('GET /api/database/files', () => {
    it('returns file list (empty or with files)', async () => {
      const res = await request(app).get('/api/database/files');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/database/cancel', () => {
    it('returns 409 when no active download', async () => {
      const res = await request(app).post('/api/database/cancel');
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('NO_ACTIVE_DOWNLOAD');
    });
  });

  describe('POST /api/database/import', () => {
    it('returns 400 for missing filename', async () => {
      const res = await request(app)
        .post('/api/database/import')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILENAME');
    });

    it('returns 400 for non-xml filename', async () => {
      const res = await request(app)
        .post('/api/database/import')
        .send({ filename: 'test.txt' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILENAME');
    });

    it('returns 400 for path traversal attempt', async () => {
      const res = await request(app)
        .post('/api/database/import')
        .send({ filename: '../etc/passwd.xml' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILENAME');
    });

    it('returns 400 for filename with slashes', async () => {
      const res = await request(app)
        .post('/api/database/import')
        .send({ filename: 'path/to/file.xml' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILENAME');
    });

    it('returns 404 for non-existent file', async () => {
      const res = await request(app)
        .post('/api/database/import')
        .send({ filename: 'nonexistent.xml' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('GET /api/database/events', () => {
    it('returns SSE content type', async () => {
      const http = await import('node:http');
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const addr = server.address() as { port: number };

      try {
        const contentType = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 3000);
          const req = http.get(`http://127.0.0.1:${addr.port}/api/database/events`, (res) => {
            clearTimeout(timeout);
            resolve(res.headers['content-type'] ?? '');
            res.destroy();
          });
          req.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        expect(contentType).toMatch(/text\/event-stream/);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });
});
