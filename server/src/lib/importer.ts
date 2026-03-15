import { createWriteStream, type WriteStream } from 'fs';
import type { ImportOptions, ImportProgress, ImportResult, NamespaceData, RevisionData } from '@memory-alpha/shared';
import { initializeDatabase } from '../models/database.js';
import { NamespaceModel } from '../models/namespace.js';
import { PageModel } from '../models/page.js';
import { RevisionModel } from '../models/revision.js';
import { CategoryModel } from '../models/category.js';
import { extractCategories } from './category-extractor.js';
import { parseMediaWikiXml, type PageMeta } from './xml-parser.js';
import type Database from 'better-sqlite3';

export class MediaWikiImporter {
  private options: Required<Pick<ImportOptions, 'batchSize'>> & ImportOptions;
  private logStream: WriteStream | null = null;

  constructor(options: ImportOptions) {
    this.options = {
      ...options,
      batchSize: options.batchSize ?? 100,
    };
  }

  async run(): Promise<ImportResult> {
    const startTime = Date.now();

    if (this.options.logFilePath) {
      this.logStream = createWriteStream(this.options.logFilePath, { flags: 'a' });
    }

    const db = initializeDatabase(this.options.databasePath);

    try {
      const result = await this.importData(db, startTime);
      return result;
    } finally {
      db.close();
      if (this.logStream) {
        this.logStream.end();
      }
    }
  }

  private async importData(db: Database.Database, startTime: number): Promise<ImportResult> {
    const namespaceModel = new NamespaceModel(db);
    const pageModel = new PageModel(db);
    const revisionModel = new RevisionModel(db);
    const categoryModel = new CategoryModel(db);

    const namespaceFilter = this.options.namespaceFilter
      ? new Set(this.options.namespaceFilter)
      : null;

    let totalPages = 0;
    let totalRevisions = 0;
    let totalCategories = 0;
    let skippedPages = 0;

    // Track current page state for streaming
    let currentPageId: number | null = null;
    let skipCurrentPage = false;
    // Track latest revision per page for category extraction (only keep text of the latest)
    let latestRevisionId = -1;
    let latestRevisionText: string | null = null;

    // Use explicit BEGIN/COMMIT for transaction batching by revision count.
    // This avoids holding revision objects in closures.
    const REVISION_BATCH_SIZE = 500;
    let revisionsInTransaction = 0;
    let inTransaction = false;

    const beginTxn = () => {
      if (!inTransaction) {
        db.exec('BEGIN');
        inTransaction = true;
        revisionsInTransaction = 0;
      }
    };

    const commitTxn = () => {
      if (inTransaction) {
        db.exec('COMMIT');
        inTransaction = false;
        revisionsInTransaction = 0;
      }
    };

    // Insert namespaces in a transaction
    const insertNamespaces = db.transaction((nsList: NamespaceData[]) => {
      for (const ns of nsList) {
        namespaceModel.upsert(ns);
      }
    });

    await parseMediaWikiXml(this.options.xmlFilePath, {
      onSiteInfo: (namespaces) => {
        insertNamespaces(namespaces);
      },

      onPage: (page: PageMeta) => {
        // Apply namespace filter
        if (namespaceFilter && !namespaceFilter.has(page.namespace_id)) {
          skippedPages++;
          skipCurrentPage = true;
          currentPageId = null;
          return;
        }

        skipCurrentPage = false;
        currentPageId = page.page_id;
        latestRevisionId = -1;
        latestRevisionText = null;

        // Write page immediately
        beginTxn();
        pageModel.upsert({
          page_id: page.page_id,
          title: page.title,
          namespace_id: page.namespace_id,
        });
      },

      onRevision: (revision: RevisionData) => {
        if (skipCurrentPage) return;

        // Write revision immediately — no closure capture
        beginTxn();
        revisionModel.upsert(revision);

        // Track latest revision for category extraction
        if (revision.revision_id > latestRevisionId) {
          latestRevisionId = revision.revision_id;
          latestRevisionText = revision.text_content;
        }

        totalRevisions++;
        revisionsInTransaction++;

        // Periodically commit to avoid huge transactions
        if (revisionsInTransaction >= REVISION_BATCH_SIZE) {
          commitTxn();
        }
      },

      onPageEnd: (_pageId: number) => {
        if (skipCurrentPage) return;

        // Extract and store categories from the latest revision
        if (latestRevisionText) {
          const categories = extractCategories(latestRevisionText);
          if (categories.length > 0) {
            beginTxn();
            categoryModel.upsertCategories(currentPageId!, categories);
            totalCategories += categories.length;
          }
        }

        totalPages++;
        // Release text reference
        latestRevisionText = null;

        // Report progress periodically
        if (totalPages % this.options.batchSize === 0 && this.options.onProgress) {
          this.options.onProgress({
            pagesProcessed: totalPages,
            revisionsProcessed: totalRevisions,
            pagesSkipped: skippedPages,
            elapsedMs: Date.now() - startTime,
          });
        }
      },

      onError: (error, context) => {
        skippedPages++;
        const timestamp = new Date().toISOString();
        const msg = `[${timestamp}] WARN: ${context}: ${error.message}`;
        process.stderr.write(msg + '\n');
        if (this.logStream) {
          this.logStream.write(msg + '\n');
        }
      },
    });

    // Commit any remaining transaction
    commitTxn();

    // Final progress report
    if (this.options.onProgress) {
      this.options.onProgress({
        pagesProcessed: totalPages,
        revisionsProcessed: totalRevisions,
        pagesSkipped: skippedPages,
        elapsedMs: Date.now() - startTime,
      });
    }

    // Count unique categories in DB
    const catCountRow = db
      .prepare('SELECT COUNT(*) as count FROM categories')
      .get() as { count: number };

    return {
      totalPages,
      totalRevisions,
      totalCategories: catCountRow.count,
      skippedPages,
      durationMs: Date.now() - startTime,
    };
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] ${level}: ${message}`;
    if (this.logStream) {
      this.logStream.write(msg + '\n');
    }
  }
}
