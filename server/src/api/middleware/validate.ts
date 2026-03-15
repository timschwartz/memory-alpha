import type { Request } from 'express';

export function parsePaginationParams(req: Request): { limit: number; offset: number } | { error: string } {
  const limit = parseIntParam(req.query.limit as string | undefined, 20);
  const offset = parseIntParam(req.query.offset as string | undefined, 0);

  if (typeof limit === 'string') return { error: limit };
  if (typeof offset === 'string') return { error: offset };
  if (limit < 1 || limit > 100) return { error: 'limit must be between 1 and 100' };
  if (offset < 0) return { error: 'offset must be >= 0' };

  return { limit, offset };
}

export function parseIntParam(value: string | undefined, defaultValue: number): number | string {
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return `Invalid integer: ${value}`;
  return parsed;
}
