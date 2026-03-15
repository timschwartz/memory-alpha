import type Database from 'better-sqlite3';
import type { PageData } from '@memory-alpha/shared';

export class PageModel {
  private upsertStmt: Database.Statement;
  private getByTitleStmt: Database.Statement;
  private getByIdStmt: Database.Statement;
  private countStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.upsertStmt = db.prepare(`
      INSERT INTO pages (page_id, title, namespace_id)
      VALUES (@page_id, @title, @namespace_id)
      ON CONFLICT(page_id) DO UPDATE SET
        title = excluded.title,
        namespace_id = excluded.namespace_id
    `);

    this.getByTitleStmt = db.prepare(`
      SELECT p.page_id, p.title, p.namespace_id, n.name AS namespace_name
      FROM pages p
      JOIN namespaces n ON n.namespace_id = p.namespace_id
      WHERE p.title = ? AND p.namespace_id = ?
    `);

    this.getByIdStmt = db.prepare(`
      SELECT p.page_id, p.title, p.namespace_id, n.name AS namespace_name
      FROM pages p
      JOIN namespaces n ON n.namespace_id = p.namespace_id
      WHERE p.page_id = ?
    `);

    this.countStmt = db.prepare(`SELECT count(*) AS total FROM pages`);
  }

  upsert(page: Pick<PageData, 'page_id' | 'title' | 'namespace_id'>): void {
    this.upsertStmt.run(page);
  }

  getByTitle(title: string, namespaceId: number): Record<string, unknown> | undefined {
    return this.getByTitleStmt.get(title, namespaceId) as Record<string, unknown> | undefined;
  }

  getById(pageId: number): Record<string, unknown> | undefined {
    return this.getByIdStmt.get(pageId) as Record<string, unknown> | undefined;
  }

  list(limit: number, offset: number, prefix?: string, namespaceId?: number): Record<string, unknown>[] {
    let sql = `
      SELECT p.page_id, p.title, p.namespace_id, n.name AS namespace_name
      FROM pages p
      JOIN namespaces n ON n.namespace_id = p.namespace_id`;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (prefix !== undefined) {
      conditions.push('p.title LIKE ?');
      params.push(prefix + '%');
    }
    if (namespaceId !== undefined) {
      conditions.push('p.namespace_id = ?');
      params.push(namespaceId);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY p.title LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(sql).all(...params) as Record<string, unknown>[];
  }

  count(prefix?: string, namespaceId?: number): number {
    if (prefix === undefined && namespaceId === undefined) {
      return (this.countStmt.get() as { total: number }).total;
    }
    let sql = 'SELECT count(*) AS total FROM pages';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (prefix !== undefined) {
      conditions.push('title LIKE ?');
      params.push(prefix + '%');
    }
    if (namespaceId !== undefined) {
      conditions.push('namespace_id = ?');
      params.push(namespaceId);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    return (this.db.prepare(sql).get(...params) as { total: number }).total;
  }
}
