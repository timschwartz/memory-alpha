import { Command } from 'commander';
import { initializeDatabase } from '../models/database.js';
import { FTS5Indexer } from '../lib/fts5-indexer.js';

const program = new Command();

program
  .name('mw-index')
  .description('Build FTS5 full-text search index')
  .option('-d, --database <path>', 'Path to SQLite database', './memory-alpha.db')
  .action((options: { database: string }) => {
    const db = initializeDatabase(options.database);
    const indexer = new FTS5Indexer(db);

    console.log('Building FTS5 search index...');
    const { indexedPages, durationMs } = indexer.build();
    console.log(`Indexed ${indexedPages.toLocaleString()} pages in ${(durationMs / 1000).toFixed(1)}s`);

    db.close();
  });

program.parse();
