import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@memory-alpha/shared';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const message = (err as { code?: string }).code;

  // SQLite BUSY/LOCKED → 503  
  if (message === 'SQLITE_BUSY' || message === 'SQLITE_LOCKED') {
    const body: ApiResponse<null> = {
      data: null,
      meta: null,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is busy, please retry' },
    };
    res.set('Retry-After', '5');
    res.status(503).json(body);
    return;
  }

  console.error('Unhandled error:', err);

  const body: ApiResponse<null> = {
    data: null,
    meta: null,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  res.status(500).json(body);
}
