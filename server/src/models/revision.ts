import type Database from 'better-sqlite3';
import type { RevisionData } from '@memory-alpha/shared';

export class RevisionModel {
  private upsertStmt: Database.Statement;
  private getLatestByPageIdStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.upsertStmt = db.prepare(`
      INSERT INTO revisions (revision_id, page_id, parent_id, timestamp,
        contributor_name, contributor_id, content_model, content_format,
        text_content, sha1)
      VALUES (@revision_id, @page_id, @parent_id, @timestamp,
        @contributor_name, @contributor_id, @content_model, @content_format,
        @text_content, @sha1)
      ON CONFLICT(revision_id) DO UPDATE SET
        page_id = excluded.page_id,
        parent_id = excluded.parent_id,
        timestamp = excluded.timestamp,
        contributor_name = excluded.contributor_name,
        contributor_id = excluded.contributor_id,
        content_model = excluded.content_model,
        content_format = excluded.content_format,
        text_content = excluded.text_content,
        sha1 = excluded.sha1
    `);

    this.getLatestByPageIdStmt = db.prepare(`
      SELECT revision_id, page_id, text_content, timestamp, contributor_name
      FROM revisions
      WHERE page_id = ?
      ORDER BY revision_id DESC
      LIMIT 1
    `);
  }

  upsert(revision: RevisionData): void {
    this.upsertStmt.run({
      ...revision,
      parent_id: revision.parent_id ?? null,
      contributor_name: revision.contributor_name ?? null,
      contributor_id: revision.contributor_id ?? null,
      content_format: revision.content_format ?? null,
      text_content: revision.text_content ?? null,
      sha1: revision.sha1 ?? null,
    });
  }

  getLatestByPageId(pageId: number): Record<string, unknown> | undefined {
    return this.getLatestByPageIdStmt.get(pageId) as Record<string, unknown> | undefined;
  }
}
