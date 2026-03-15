import type Database from 'better-sqlite3';

export class CategoryModel {
  private insertCategoryStmt: Database.Statement;
  private getCategoryIdStmt: Database.Statement;
  private deletePageCategoriesStmt: Database.Statement;
  private insertPageCategoryStmt: Database.Statement;

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
  }

  upsertCategories(pageId: number, categoryNames: string[]): void {
    this.deletePageCategoriesStmt.run(pageId);

    for (const name of categoryNames) {
      this.insertCategoryStmt.run(name);
      const row = this.getCategoryIdStmt.get(name) as { category_id: number };
      this.insertPageCategoryStmt.run(pageId, row.category_id);
    }
  }
}
