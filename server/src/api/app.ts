import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { createHealthRouter } from './routes/health.js';
import { createPagesRouter } from './routes/pages.js';
import { createSearchRouter } from './routes/search.js';
import { createCategoriesRouter } from './routes/categories.js';
import { createIndexingRouter } from './routes/indexing.js';
import { PageModel } from '../models/page.js';
import { RevisionModel } from '../models/revision.js';
import { NamespaceModel } from '../models/namespace.js';
import { CategoryModel } from '../models/category.js';
import { FTS5Indexer } from '../lib/fts5-indexer.js';

export interface AppOptions {
  corsOrigin?: string;
  staticDir?: string;
}

export interface AppModels {
  pageModel: PageModel;
  revisionModel: RevisionModel;
  namespaceModel: NamespaceModel;
  categoryModel: CategoryModel;
  fts5Indexer: FTS5Indexer;
}

export function createApp(db: Database.Database, options: AppOptions = {}): express.Express {
  const app = express();
  const models = createModels(db);

  // Middleware
  app.use(requestLogger);
  app.use(express.json());

  // CORS — enabled only when static dir does not exist (dev mode)
  const hasStaticDir = options.staticDir ? fs.existsSync(options.staticDir) : false;
  if (!hasStaticDir && options.corsOrigin) {
    app.use(cors({ origin: options.corsOrigin }));
  }

  // API routes
  app.use('/api/health', createHealthRouter(models.pageModel, models.categoryModel, models.fts5Indexer));
  app.use('/api/pages', createPagesRouter(models.pageModel, models.revisionModel, models.namespaceModel, models.categoryModel));
  app.use('/api/search', createSearchRouter(models.fts5Indexer));
  app.use('/api/categories', createCategoriesRouter(models.categoryModel, models.namespaceModel));
  app.use('/api/indexing', createIndexingRouter(models.fts5Indexer));

  // Static file serving + SPA fallback (production)
  if (hasStaticDir && options.staticDir) {
    const resolvedDir = path.resolve(options.staticDir);
    app.use(express.static(resolvedDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(resolvedDir, 'index.html'));
    });
  }

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

export function createModels(db: Database.Database): AppModels {
  return {
    pageModel: new PageModel(db),
    revisionModel: new RevisionModel(db),
    namespaceModel: new NamespaceModel(db),
    categoryModel: new CategoryModel(db),
    fts5Indexer: new FTS5Indexer(db),
  };
}
