import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse, SearchResult, PaginationMeta } from '@memory-alpha/shared';
import type { FTS5Indexer } from '../../lib/fts5-indexer.js';
import { parsePaginationParams } from '../middleware/validate.js';

export function createSearchRouter(fts5Indexer: FTS5Indexer): Router {
  const router = Router();

  // GET /api/search — full-text search
  router.get('/', (req: Request, res: Response) => {
    const q = req.query.q as string | undefined;
    if (!q || q.trim() === '') {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'BAD_REQUEST', message: 'q parameter is required' },
      };
      res.status(400).json(body);
      return;
    }

    if (!fts5Indexer.isIndexReady()) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'SEARCH_INDEX_NOT_BUILT', message: 'Search index has not been built yet' },
      };
      res.status(503).json(body);
      return;
    }

    const pagination = parsePaginationParams(req);
    if ('error' in pagination) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'BAD_REQUEST', message: pagination.error },
      };
      res.status(400).json(body);
      return;
    }

    const { limit, offset } = pagination;
    const total = fts5Indexer.searchCount(q);
    const results = fts5Indexer.search(q, limit, offset);

    const data: SearchResult[] = results.map(r => ({
      page_id: r.page_id as number,
      title: r.title as string,
      namespace_name: r.namespace_name as string,
      snippet: r.snippet as string,
      rank: r.rank as number,
    }));

    const meta: PaginationMeta = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };

    const body: ApiResponse<SearchResult[]> = { data, meta, error: null };
    res.json(body);
  });

  // POST /api/search/rebuild — rebuild FTS5 index
  router.post('/rebuild', (_req: Request, res: Response) => {
    if (fts5Indexer.isRebuilding()) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'REBUILD_IN_PROGRESS', message: 'A rebuild is already running' },
      };
      res.status(409).json(body);
      return;
    }

    fts5Indexer.setRebuilding(true);
    try {
      const result = fts5Indexer.build();
      const body: ApiResponse<{ indexedPages: number; durationMs: number }> = {
        data: result,
        meta: null,
        error: null,
      };
      res.json(body);
    } finally {
      fts5Indexer.setRebuilding(false);
    }
  });

  return router;
}
