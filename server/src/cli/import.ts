#!/usr/bin/env node

import { Command } from 'commander';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { MediaWikiImporter } from '../lib/importer.js';

const program = new Command()
  .name('mw-import')
  .description('Import MediaWiki XML export into SQLite')
  .argument('<xml-file>', 'Path to MediaWiki XML export file')
  .option('-d, --database <path>', 'SQLite database path', './memory-alpha.db')
  .option('-n, --namespaces <ids>', 'Comma-separated namespace IDs to include')
  .option('-l, --log <path>', 'Log file path', './import.log')
  .action(async (xmlFile: string, options: { database: string; namespaces?: string; log: string }) => {
    const xmlFilePath = resolve(xmlFile);

    if (!existsSync(xmlFilePath)) {
      process.stderr.write(`Error: XML file not found: ${xmlFilePath}\n`);
      process.exit(2);
    }

    let namespaceFilter: number[] | undefined;
    if (options.namespaces) {
      namespaceFilter = options.namespaces.split(',').map((id) => {
        const num = parseInt(id.trim(), 10);
        if (isNaN(num)) {
          process.stderr.write(`Error: Invalid namespace ID: "${id.trim()}"\n`);
          process.exit(1);
        }
        return num;
      });
    }

    const databasePath = resolve(options.database);
    const logFilePath = resolve(options.log);

    const importer = new MediaWikiImporter({
      xmlFilePath,
      databasePath,
      logFilePath,
      namespaceFilter,
      onProgress: (stats) => {
        const elapsed = formatDuration(stats.elapsedMs);
        process.stderr.write(
          `\rImporting... ${stats.pagesProcessed.toLocaleString()} pages, ${stats.revisionsProcessed.toLocaleString()} revisions [${elapsed}]`,
        );
      },
    });

    try {
      const result = await importer.run();

      // Clear progress line
      process.stderr.write('\n');

      // Print summary to stdout
      process.stdout.write(
        `Import complete.\n` +
          `  Pages:      ${result.totalPages.toLocaleString()}\n` +
          `  Revisions:  ${result.totalRevisions.toLocaleString()}\n` +
          `  Categories: ${result.totalCategories.toLocaleString()}\n` +
          `  Skipped:    ${result.skippedPages}${result.skippedPages > 0 ? ` (see ${options.log})` : ''}\n` +
          `  Duration:   ${formatDuration(result.durationMs)}\n`,
      );
    } catch (error) {
      process.stderr.write(`\nError: Import failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(4);
    }
  });

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

program.parse();
