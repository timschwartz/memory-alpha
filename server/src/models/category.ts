import type Database from 'better-sqlite3';

export class CategoryModel {
  private insertCategoryStmt: Database.Statement;
  private getCategoryIdStmt: Database.Statement;
  private deletePageCategoriesStmt: Database.Statement;
  private insertPageCategoryStmt: Database.Statement;
  private countStmt: Database.Statement;
  private getByNameStmt: Database.Statement;
  private getCategoriesByPageIdStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.insertCategoryStmt = db.prepare(`
      INSERT OR IGNORE INTO categories (name) VALUES (?)
    `);

    this.getCategoryIdStmt = db.prepare(`
      SELECT category_id FROM categories WHERE name = ?
    `);

    this.deletePageCategoriesStmt = db.prepare(`
      DELETE FROM page_categories WHERE page_id = ?
    `);

    this.insertPageCategoryStmt = db.prepare(`
      INSERT OR IGNORE INTO page_categories (page_id, category_id) VALUES (?, ?)
    `);

    this.countStmt = db.prepare(`SELECT count(*) AS total FROM categories`);

    this.getByNameStmt = db.prepare(`
      SELECT c.category_id, c.name, count(pc.page_id) AS page_count
      FROM categories c
      LEFT JOIN page_categories pc ON pc.category_id = c.category_id
      WHERE c.name = ?
      GROUP BY c.category_id
    `);

    this.getCategoriesByPageIdStmt = db.prepare(`
      SELECT c.name
      FROM categories c
      JOIN page_categories pc ON pc.category_id = c.category_id
      WHERE pc.page_id = ?
      ORDER BY c.name
    `);
  }

  upsertCategories(pageId: number, categoryNames: string[]): void {
    this.deletePageCategoriesStmt.run(pageId);

    for (const name of categoryNames) {
      this.insertCategoryStmt.run(name);
      const row = this.getCategoryIdStmt.get(name) as { category_id: number };
      this.insertPageCategoryStmt.run(pageId, row.category_id);
    }
  }

  list(limit: number, offset: number, prefix?: string): Record<string, unknown>[] {
    let sql = `
      SELECT c.category_id, c.name, count(pc.page_id) AS page_count
      FROM categories c
      LEFT JOIN page_categories pc ON pc.category_id = c.category_id`;
    const params: unknown[] = [];

    if (prefix !== undefined) {
      sql += ' WHERE c.name LIKE ?';
      params.push(prefix + '%');
    }
    sql += ' GROUP BY c.category_id ORDER BY c.name LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(sql).all(...params) as Record<string, unknown>[];
  }

  count(prefix?: string): number {
    if (prefix === undefined) {
      return (this.countStmt.get() as { total: number }).total;
    }
    return (this.db.prepare('SELECT count(*) AS total FROM categories WHERE name LIKE ?')
      .get(prefix + '%') as { total: number }).total;
  }

  getByName(name: string): Record<string, unknown> | undefined {
    return this.getByNameStmt.get(name) as Record<string, unknown> | undefined;
  }

  getPagesByCategory(categoryId: number, limit: number, offset: number): Record<string, unknown>[] {
    return this.db.prepare(`
      SELECT p.page_id, p.title, p.namespace_id, n.name AS namespace_name
      FROM pages p
      JOIN page_categories pc ON pc.page_id = p.page_id
      JOIN namespaces n ON n.namespace_id = p.namespace_id
      WHERE pc.category_id = ?
      ORDER BY p.title
      LIMIT ? OFFSET ?
    `).all(categoryId, limit, offset) as Record<string, unknown>[];
  }

  getPageCountByCategory(categoryId: number): number {
    return (this.db.prepare('SELECT count(*) AS total FROM page_categories WHERE category_id = ?')
      .get(categoryId) as { total: number }).total;
  }

  getCategoriesByPageId(pageId: number): string[] {
    const rows = this.getCategoriesByPageIdStmt.all(pageId) as { name: string }[];
    return rows.map(r => r.name);
  }
}
