import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryPage from '../../src/pages/CategoryPage';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.name = 'ApiClientError';
      this.status = status;
      this.code = code;
    }
  },
}));

import { apiGet, ApiClientError } from '../../src/api/client';
const mockApiGet = vi.mocked(apiGet);

function renderCategoryPage(name: string) {
  return render(
    <MemoryRouter initialEntries={[`/categories/${name}`]}>
      <Routes>
        <Route path="/categories/:name" element={<CategoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CategoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders article list with clickable titles', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { page_id: 1, title: 'USS Enterprise', namespace_id: 0, namespace_name: '' },
        { page_id: 2, title: 'USS Defiant', namespace_id: 0, namespace_name: '' },
      ],
      meta: { total: 2, limit: 50, offset: 0, hasMore: false },
      error: null,
    });
    renderCategoryPage('Starships');
    expect(await screen.findByText('USS Enterprise')).toBeInTheDocument();
    expect(screen.getByText('USS Defiant')).toBeInTheDocument();
    expect(screen.getByText('USS Enterprise').closest('a')).toHaveAttribute('href', '/wiki/USS%20Enterprise');
  });

  it('displays "Category not found" for 404', async () => {
    const err = new (ApiClientError as unknown as new (m: string, s: number, c: string) => Error)(
      'Not found', 404, 'NOT_FOUND',
    );
    Object.assign(err, { status: 404, code: 'NOT_FOUND' });
    mockApiGet.mockRejectedValue(err);
    renderCategoryPage('Nonexistent');
    expect(await screen.findByText(/category not found/i)).toBeInTheDocument();
  });

  it('pagination works', async () => {
    mockApiGet.mockResolvedValue({
      data: [{ page_id: 1, title: 'Test Ship', namespace_id: 0, namespace_name: '' }],
      meta: { total: 100, limit: 50, offset: 0, hasMore: true },
      error: null,
    });
    renderCategoryPage('Starships');
    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it('shows spinner while loading', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderCategoryPage('Starships');
    expect(screen.getByText(/loading category/i)).toBeInTheDocument();
  });
});
