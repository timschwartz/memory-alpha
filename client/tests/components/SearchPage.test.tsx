import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchPage from '../../src/pages/SearchPage';

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

function renderSearchPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/search${search}`]}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows prompt when no query provided', () => {
    renderSearchPage();
    expect(screen.getByText(/enter a search query/i)).toBeInTheDocument();
  });

  it('renders results with title links and highlighted snippets', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { page_id: 1, title: 'Warp Drive', namespace_name: '', snippet: 'The <mark>warp</mark> <mark>drive</mark> is...', rank: 1 },
        { page_id: 2, title: 'Warp Core', namespace_name: '', snippet: 'A <mark>warp</mark> core powers...', rank: 2 },
      ],
      meta: { total: 2, limit: 20, offset: 0, hasMore: false },
      error: null,
    });
    renderSearchPage('?q=warp+drive');

    expect(await screen.findByText('Warp Drive')).toBeInTheDocument();
    expect(screen.getByText('Warp Core')).toBeInTheDocument();
    // Check title links
    expect(screen.getByText('Warp Drive').closest('a')).toHaveAttribute('href', '/wiki/Warp%20Drive');
  });

  it('sanitizes snippet HTML - only mark tags survive', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { page_id: 1, title: 'Test', namespace_name: '', snippet: '<b>bold</b> <mark>ok</mark> <script>bad</script>', rank: 1 },
      ],
      meta: { total: 1, limit: 20, offset: 0, hasMore: false },
      error: null,
    });
    renderSearchPage('?q=test');
    await screen.findByText('Test');
    // The mark tag should be present but bold/script should be stripped
    const snippetEl = document.querySelector('p[class*="text-gray-600"]');
    expect(snippetEl?.innerHTML).toContain('<mark>ok</mark>');
    expect(snippetEl?.innerHTML).not.toContain('<script>');
    expect(snippetEl?.innerHTML).not.toContain('<b>');
  });

  it('shows no results message for empty results', async () => {
    mockApiGet.mockResolvedValue({
      data: [],
      meta: { total: 0, limit: 20, offset: 0, hasMore: false },
      error: null,
    });
    renderSearchPage('?q=nonexistent');
    expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
  });

  it('shows pagination for multi-page results', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { page_id: 1, title: 'Result 1', namespace_name: '', snippet: '<mark>test</mark>', rank: 1 },
      ],
      meta: { total: 50, limit: 20, offset: 0, hasMore: true },
      error: null,
    });
    renderSearchPage('?q=test');
    expect(await screen.findByText('Result 1')).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });
});
