import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse, IndexingStatus, IndexingStartResponse } from '@memory-alpha/shared';
import type { FTS5Indexer } from '../../lib/fts5-indexer.js';

interface IndexingState {
  state: 'idle' | 'in-progress' | 'complete';
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export function createIndexingRouter(fts5Indexer: FTS5Indexer): Router {
  const router = Router();

  const indexingState: IndexingState = {
    state: 'idle',
    startedAt: null,
    completedAt: null,
    durationMs: null,
  };

  router.post('/start', (req: Request, res: Response) => {
    const { mode } = req.body as { mode?: string };

    if (mode !== 'continue' && mode !== 'rebuild') {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'INVALID_MODE', message: "Mode must be 'continue' or 'rebuild'" },
      };
      res.status(400).json(body);
      return;
    }

    if (indexingState.state === 'in-progress') {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'INDEXING_IN_PROGRESS', message: 'Indexing is already in progress' },
      };
      res.status(409).json(body);
      return;
    }

    if (mode === 'rebuild') {
      fts5Indexer.clearIndex();
    }

    const totalPages = fts5Indexer.getTotalIndexableCount();
    indexingState.state = 'in-progress';
    indexingState.startedAt = new Date().toISOString();
    indexingState.completedAt = null;
    indexingState.durationMs = null;

    const body: ApiResponse<IndexingStartResponse> = {
      data: { status: 'started', totalPages },
      meta: null,
      error: null,
    };
    res.status(202).json(body);

    // Run indexing in background with event loop yielding
    fts5Indexer.buildIncrementalAsync().then(({ durationMs }) => {
      indexingState.state = 'complete';
      indexingState.completedAt = new Date().toISOString();
      indexingState.durationMs = durationMs;
    }).catch(() => {
      indexingState.state = 'idle';
      indexingState.durationMs = null;
    });
  });

  router.get('/status', (_req: Request, res: Response) => {
    const indexedPages = fts5Indexer.getIndexedCount();
    const totalPages = fts5Indexer.getTotalIndexableCount();
    const percentage = totalPages > 0 ? Math.round((indexedPages / totalPages) * 1000) / 10 : 0;

    let durationMs = indexingState.durationMs;
    if (indexingState.state === 'in-progress' && indexingState.startedAt) {
      durationMs = Date.now() - new Date(indexingState.startedAt).getTime();
    }

    const data: IndexingStatus = {
      state: indexingState.state,
      indexedPages,
      totalPages,
      percentage,
      startedAt: indexingState.startedAt,
      completedAt: indexingState.completedAt,
      durationMs,
    };

    const body: ApiResponse<IndexingStatus> = { data, meta: null, error: null };
    res.json(body);
  });

  return router;
}
