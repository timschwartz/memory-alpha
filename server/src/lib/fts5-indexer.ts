import type Database from 'better-sqlite3';

export class FTS5Indexer {
  private rebuilding = false;

  constructor(private db: Database.Database) {}

  isIndexReady(): boolean {
    const row = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='search_index'")
      .get();
    if (!row) return false;

    const countRow = this.db.prepare('SELECT count(*) AS cnt FROM search_index').get() as { cnt: number };
    return countRow.cnt > 0;
  }

  build(): { indexedPages: number; durationMs: number } {
    const start = Date.now();

    const buildTx = this.db.transaction(() => {
      this.db.exec('DELETE FROM search_index');

      const insertStmt = this.db.prepare(`
        INSERT INTO search_index(rowid, title, text_content)
        SELECT p.page_id, p.title, r.text_content
        FROM pages p
        JOIN revisions r ON r.page_id = p.page_id
        WHERE r.revision_id = (
          SELECT MAX(r2.revision_id) FROM revisions r2 WHERE r2.page_id = p.page_id
        )
      `);

      const result = insertStmt.run();
      return result.changes;
    });

    const indexedPages = buildTx();
    const durationMs = Date.now() - start;

    return { indexedPages, durationMs };
  }

  isRebuilding(): boolean {
    return this.rebuilding;
  }

  setRebuilding(value: boolean): void {
    this.rebuilding = value;
  }

  search(query: string, limit: number, offset: number): Record<string, unknown>[] {
    const sanitized = this.sanitizeQuery(query);
    if (!sanitized) return [];

    return this.db.prepare(`
      SELECT
        p.page_id,
        p.title,
        n.name AS namespace_name,
        snippet(search_index, 1, '<mark>', '</mark>', '...', 32) AS snippet,
        rank
      FROM search_index
      JOIN pages p ON p.page_id = search_index.rowid
      JOIN namespaces n ON n.namespace_id = p.namespace_id
      WHERE search_index MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `).all(sanitized, limit, offset) as Record<string, unknown>[];
  }

  searchCount(query: string): number {
    const sanitized = this.sanitizeQuery(query);
    if (!sanitized) return 0;

    return (this.db.prepare(`
      SELECT count(*) AS total
      FROM search_index
      WHERE search_index MATCH ?
    `).get(sanitized) as { total: number }).total;
  }

  sanitizeQuery(query: string): string {
    // Strip FTS5 special characters
    let cleaned = query.replace(/[":(){}^+\-*\\]/g, ' ');
    // Collapse whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';

    // Split words, quote each and add prefix matching
    const words = cleaned.split(' ').filter(w => w.length > 0);
    // Remove FTS5 reserved words when standalone
    const reserved = new Set(['AND', 'OR', 'NOT', 'NEAR']);
    const quoted = words
      .filter(w => !reserved.has(w.toUpperCase()))
      .map(w => `"${w}"*`);

    return quoted.join(' ');
  }
}
