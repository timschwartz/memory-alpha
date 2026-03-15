import { Command } from 'commander';
import { initializeDatabase } from '../models/database.js';
import { FTS5Indexer } from '../lib/fts5-indexer.js';

const program = new Command();

program
  .name('mw-index')
  .description('Build FTS5 full-text search index')
  .option('-d, --database <path>', 'Path to SQLite database', './memory-alpha.db')
  .option('--rebuild', 'Wipe existing index and re-index all pages from scratch')
  .action((options: { database: string; rebuild?: boolean }) => {
    const db = initializeDatabase(options.database);
    const indexer = new FTS5Indexer(db);

    // Up-to-date detection
    const indexedCount = indexer.getIndexedCount();
    const totalCount = indexer.getTotalIndexableCount();

    if (!options.rebuild && indexedCount >= totalCount && totalCount > 0) {
      console.log(`Index is already up to date (${indexedCount.toLocaleString()} pages).`);
      db.close();
      return;
    }

    if (options.rebuild) {
      process.stderr.write('Clearing existing index for full rebuild...\n');
      indexer.clearIndex();
    }

    // SIGINT handler for graceful interrupt
    let stopRequested = false;
    const sigintHandler = () => {
      stopRequested = true;
      process.stderr.write('\nInterrupt received, finishing current batch...\n');
    };
    process.on('SIGINT', sigintHandler);

    console.log('Building FTS5 search index...');
    const { indexedPages, durationMs } = indexer.buildIncremental(
      (progress) => {
        process.stderr.write(
          `\rIndexing: ${progress.percentage.toFixed(1)}% (${progress.indexedPages.toLocaleString()}/${progress.totalPages.toLocaleString()} pages) [${(progress.elapsedMs / 1000).toFixed(1)}s]`,
        );
      },
      () => stopRequested,
    );

    process.removeListener('SIGINT', sigintHandler);
    process.stderr.write('\n');

    if (stopRequested) {
      console.log(`Indexing interrupted. ${indexedPages.toLocaleString()} pages indexed in this run (${(durationMs / 1000).toFixed(1)}s). Resume by running again.`);
    } else {
      console.log(`Indexed ${indexedPages.toLocaleString()} pages in ${(durationMs / 1000).toFixed(1)}s`);
    }

    db.close();
  });

program.parse();
