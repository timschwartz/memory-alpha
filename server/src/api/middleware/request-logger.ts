import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
    };
    process.stdout.write(JSON.stringify(log) + '\n');
  });

  next();
}
