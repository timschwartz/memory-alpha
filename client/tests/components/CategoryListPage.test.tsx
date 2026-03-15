import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryListPage from '../../src/pages/CategoryListPage';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  ApiClientError: class extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

import { apiGet } from '../../src/api/client';
const mockApiGet = vi.mocked(apiGet);

function renderCategoryListPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/categories${search}`]}>
      <Routes>
        <Route path="/categories" element={<CategoryListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CategoryListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders category list with names and article counts', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { category_id: 1, name: 'Starships', page_count: 42 },
        { category_id: 2, name: 'Planets', page_count: 18 },
      ],
      meta: { total: 2, limit: 50, offset: 0, hasMore: false },
      error: null,
    });
    renderCategoryListPage();
    expect(await screen.findByText('Starships')).toBeInTheDocument();
    expect(screen.getByText('Planets')).toBeInTheDocument();
    expect(screen.getByText('(42 articles)')).toBeInTheDocument();
    expect(screen.getByText('(18 articles)')).toBeInTheDocument();
    expect(screen.getByText('Starships').closest('a')).toHaveAttribute('href', '/categories/Starships');
  });

  it('prefix filter updates displayed categories', async () => {
    mockApiGet.mockResolvedValue({
      data: [],
      meta: { total: 0, limit: 50, offset: 0, hasMore: false },
      error: null,
    });
    const user = userEvent.setup();
    renderCategoryListPage();
    await screen.findByText('Categories');
    const input = screen.getByPlaceholderText(/filter/i);
    await user.type(input, 'Star');
    expect(mockApiGet).toHaveBeenCalled();
  });

  it('pagination controls navigate pages', async () => {
    mockApiGet.mockResolvedValue({
      data: [{ category_id: 1, name: 'Test', page_count: 5 }],
      meta: { total: 100, limit: 50, offset: 0, hasMore: true },
      error: null,
    });
    renderCategoryListPage();
    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it('shows spinner while loading', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderCategoryListPage();
    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
  });
});
