import { describe, it, expect } from 'vitest';
import { parsePaginationParams, parseIntParam } from '../../src/api/middleware/validate.js';

function mockReq(query: Record<string, string> = {}) {
  return { query } as any;
}

describe('parsePaginationParams', () => {
  it('returns defaults when no params', () => {
    const result = parsePaginationParams(mockReq());
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it('parses valid limit and offset', () => {
    const result = parsePaginationParams(mockReq({ limit: '50', offset: '10' }));
    expect(result).toEqual({ limit: 50, offset: 10 });
  });

  it('returns error for limit > 100', () => {
    const result = parsePaginationParams(mockReq({ limit: '200' }));
    expect(result).toEqual({ error: 'limit must be between 1 and 100' });
  });

  it('returns error for limit < 1', () => {
    const result = parsePaginationParams(mockReq({ limit: '0' }));
    expect(result).toEqual({ error: 'limit must be between 1 and 100' });
  });

  it('returns error for negative offset', () => {
    const result = parsePaginationParams(mockReq({ offset: '-1' }));
    expect(result).toEqual({ error: 'offset must be >= 0' });
  });

  it('returns error for non-integer limit', () => {
    const result = parsePaginationParams(mockReq({ limit: 'abc' }));
    expect(result).toHaveProperty('error');
  });
});

describe('parseIntParam', () => {
  it('returns default for undefined', () => {
    expect(parseIntParam(undefined, 42)).toBe(42);
  });

  it('returns default for empty string', () => {
    expect(parseIntParam('', 42)).toBe(42);
  });

  it('parses valid integer', () => {
    expect(parseIntParam('123', 0)).toBe(123);
  });

  it('returns error for non-integer', () => {
    expect(parseIntParam('abc', 0)).toBe('Invalid integer: abc');
  });

  it('returns error for float', () => {
    expect(parseIntParam('1.5', 0)).toBe('Invalid integer: 1.5');
  });
});
