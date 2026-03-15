import type { ApiResponse } from '@memory-alpha/shared';

const BASE_URL = '/api';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<ApiResponse<T>> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new ApiClientError('Network error: unable to reach server', 0, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiResponse<T> | null;
    const code = body?.error?.code ?? 'HTTP_ERROR';
    const message = body?.error?.message ?? `HTTP ${response.status}`;
    throw new ApiClientError(message, response.status, code);
  }

  return (await response.json()) as ApiResponse<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError('Network error: unable to reach server', 0, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    const respBody = await response.json().catch(() => null) as ApiResponse<T> | null;
    const code = respBody?.error?.code ?? 'HTTP_ERROR';
    const message = respBody?.error?.message ?? `HTTP ${response.status}`;
    throw new ApiClientError(message, response.status, code);
  }

  return (await response.json()) as ApiResponse<T>;
}
