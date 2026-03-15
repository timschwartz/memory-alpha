import Database from 'better-sqlite3';

const SCHEMA_VERSION = 2;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )`,

    `CREATE TABLE IF NOT EXISTS namespaces (
      namespace_id INTEGER PRIMARY KEY,
      name         TEXT NOT NULL,
      case_setting TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS pages (
      page_id      INTEGER PRIMARY KEY,
      title        TEXT NOT NULL,
      namespace_id INTEGER NOT NULL,
      FOREIGN KEY (namespace_id) REFERENCES namespaces(namespace_id)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_pages_title ON pages(title)`,
    `CREATE INDEX IF NOT EXISTS idx_pages_namespace_id ON pages(namespace_id)`,

    `CREATE TABLE IF NOT EXISTS revisions (
      revision_id      INTEGER PRIMARY KEY,
      page_id          INTEGER NOT NULL,
      parent_id        INTEGER,
      timestamp        TEXT NOT NULL,
      contributor_name TEXT,
      contributor_id   INTEGER,
      content_model    TEXT NOT NULL DEFAULT 'wikitext',
      content_format   TEXT,
      text_content     TEXT,
      sha1             TEXT,
      FOREIGN KEY (page_id) REFERENCES pages(page_id)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_revisions_page_id ON revisions(page_id)`,
    `CREATE INDEX IF NOT EXISTS idx_revisions_timestamp ON revisions(timestamp)`,

    `CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE
    )`,

    `CREATE TABLE IF NOT EXISTS page_categories (
      page_id     INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (page_id, category_id),
      FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
    )`,
  ],

  2: [
    `CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      title,
      text_content,
      content='',
      contentless_delete=1,
      tokenize='porter unicode61',
      prefix='2 3'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_pages_title_namespace
      ON pages(namespace_id, title)`,
  ],
};

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64 MB
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  runMigrations(db);

  return db;
}

function getCurrentVersion(db: Database.Database): number {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
    .get();

  if (!tableExists) {
    return 0;
  }

  const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as
    | { version: number | null }
    | undefined;
  return row?.version ?? 0;
}

function runMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);

  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  const migrate = db.transaction(() => {
    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      const statements = MIGRATIONS[v];
      if (!statements) {
        throw new Error(`Missing migration for version ${v}`);
      }
      for (const sql of statements) {
        db.exec(sql);
      }
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(v);
    }
  });

  migrate();
}
