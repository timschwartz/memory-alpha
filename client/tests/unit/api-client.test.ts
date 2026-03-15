import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, ApiClientError } from '../../src/api/client';

describe('API Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('constructs correct URL with query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], meta: null, error: null }),
    });
    globalThis.fetch = mockFetch;

    await apiGet('/pages', { limit: 10, offset: 20, prefix: 'A' });

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe('/api/pages');
    expect(calledUrl.searchParams.get('limit')).toBe('10');
    expect(calledUrl.searchParams.get('offset')).toBe('20');
    expect(calledUrl.searchParams.get('prefix')).toBe('A');
  });

  it('omits undefined and empty query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], meta: null, error: null }),
    });
    globalThis.fetch = mockFetch;

    await apiGet('/pages', { limit: 10, prefix: undefined, namespace: '' });

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('limit')).toBe('10');
    expect(calledUrl.searchParams.has('prefix')).toBe(false);
    expect(calledUrl.searchParams.has('namespace')).toBe(false);
  });

  it('parses response envelope and extracts data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{ page_id: 1, title: 'Test' }],
        meta: { total: 1, limit: 20, offset: 0, hasMore: false },
        error: null,
      }),
    });

    const result = await apiGet('/pages');
    expect(result.data).toEqual([{ page_id: 1, title: 'Test' }]);
    expect(result.meta?.total).toBe(1);
  });

  it('throws ApiClientError for HTTP errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({
        data: null,
        meta: null,
        error: { code: 'NOT_FOUND', message: 'Page not found' },
      }),
    });

    try {
      await apiGet('/pages/nonexistent');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(404);
      expect((err as ApiClientError).code).toBe('NOT_FOUND');
      expect((err as ApiClientError).message).toBe('Page not found');
    }
  });

  it('handles network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await apiGet('/pages');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).code).toBe('NETWORK_ERROR');
    }
  });

  it('handles non-JSON error responses gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    try {
      await apiGet('/pages');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(500);
      expect((err as ApiClientError).message).toBe('HTTP 500');
    }
  });
});
