import type Database from 'better-sqlite3';
import type { NamespaceData } from '@memory-alpha/shared';

export class NamespaceModel {
  private upsertStmt: Database.Statement;
  private getAllStmt: Database.Statement;
  private getByNameStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.upsertStmt = db.prepare(`
      INSERT INTO namespaces (namespace_id, name, case_setting)
      VALUES (@namespace_id, @name, @case_setting)
      ON CONFLICT(namespace_id) DO UPDATE SET
        name = excluded.name,
        case_setting = excluded.case_setting
    `);

    this.getAllStmt = db.prepare(`
      SELECT namespace_id, name, case_setting FROM namespaces ORDER BY namespace_id
    `);

    this.getByNameStmt = db.prepare(`
      SELECT namespace_id, name, case_setting FROM namespaces WHERE name = ?
    `);
  }

  upsert(ns: NamespaceData): void {
    this.upsertStmt.run(ns);
  }

  getAll(): Record<string, unknown>[] {
    return this.getAllStmt.all() as Record<string, unknown>[];
  }

  getByName(name: string): Record<string, unknown> | undefined {
    return this.getByNameStmt.get(name) as Record<string, unknown> | undefined;
  }
}
