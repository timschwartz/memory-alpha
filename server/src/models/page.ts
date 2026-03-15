import type Database from 'better-sqlite3';
import type { PageData } from '@memory-alpha/shared';

export class PageModel {
  private upsertStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.upsertStmt = db.prepare(`
      INSERT INTO pages (page_id, title, namespace_id)
      VALUES (@page_id, @title, @namespace_id)
      ON CONFLICT(page_id) DO UPDATE SET
        title = excluded.title,
        namespace_id = excluded.namespace_id
    `);
  }

  upsert(page: Pick<PageData, 'page_id' | 'title' | 'namespace_id'>): void {
    this.upsertStmt.run(page);
  }
}
