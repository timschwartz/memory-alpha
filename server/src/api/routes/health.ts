import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse, HealthStatus } from '@memory-alpha/shared';
import type { PageModel } from '../../models/page.js';
import type { CategoryModel } from '../../models/category.js';
import type { FTS5Indexer } from '../../lib/fts5-indexer.js';

export function createHealthRouter(
  pageModel: PageModel,
  categoryModel: CategoryModel,
  fts5Indexer: FTS5Indexer,
): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const totalPages = pageModel.count();
    const totalCategories = categoryModel.count();
    const searchIndexReady = fts5Indexer.isIndexReady();

    const body: ApiResponse<HealthStatus> = {
      data: {
        status: 'ok',
        database: 'connected',
        totalPages,
        totalCategories,
        searchIndexReady,
      },
      meta: null,
      error: null,
    };
    res.json(body);
  });

  return router;
}
