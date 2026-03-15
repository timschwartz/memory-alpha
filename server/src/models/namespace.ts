import type Database from 'better-sqlite3';
import type { NamespaceData } from '@memory-alpha/shared';

export class NamespaceModel {
  private upsertStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.upsertStmt = db.prepare(`
      INSERT INTO namespaces (namespace_id, name, case_setting)
      VALUES (@namespace_id, @name, @case_setting)
      ON CONFLICT(namespace_id) DO UPDATE SET
        name = excluded.name,
        case_setting = excluded.case_setting
    `);
  }

  upsert(ns: NamespaceData): void {
    this.upsertStmt.run(ns);
  }
}
