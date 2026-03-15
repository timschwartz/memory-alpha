import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticlePage from '../../src/pages/ArticlePage';

// Mock the API client
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

function renderArticlePage(title: string, state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/wiki/${title}`, state }]}>
      <Routes>
        <Route path="/wiki/:title" element={<ArticlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ArticlePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while fetching', () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    renderArticlePage('Test_Article');
    expect(screen.getByText(/loading article/i)).toBeInTheDocument();
  });

  it('renders article title and content on success', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        page_id: 1,
        title: 'USS Enterprise',
        namespace_id: 0,
        namespace_name: '',
        latest_revision: {
          revision_id: 1,
          text_content: "The '''USS Enterprise''' is a starship.",
          timestamp: '2024-01-01T00:00:00Z',
          contributor_name: 'admin',
        },
        categories: ['Starships', 'Federation'],
      },
      meta: null,
      error: null,
    });
    renderArticlePage('USS_Enterprise');
    const headings = await screen.findAllByText('USS Enterprise');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('Starships')).toBeInTheDocument();
    expect(await screen.findByText('Federation')).toBeInTheDocument();
  });

  it('displays error message for 404', async () => {
    const err = new (ApiClientError as unknown as new (m: string, s: number, c: string) => Error)(
      'Not found', 404, 'NOT_FOUND',
    );
    Object.assign(err, { status: 404, code: 'NOT_FOUND' });
    mockApiGet.mockRejectedValue(err);
    renderArticlePage('Nonexistent_Article');
    expect(await screen.findByText(/article not found/i)).toBeInTheDocument();
  });

  it('shows redirect notice when arriving via redirect', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        page_id: 2,
        title: 'Target Article',
        namespace_id: 0,
        namespace_name: '',
        latest_revision: {
          revision_id: 2,
          text_content: 'Target content',
          timestamp: '2024-01-01T00:00:00Z',
          contributor_name: 'admin',
        },
        categories: [],
      },
      meta: null,
      error: null,
    });
    renderArticlePage('Target_Article', { redirectedFrom: 'Original_Article' });
    expect(await screen.findByText(/redirected from/i)).toBeInTheDocument();
    expect(await screen.findByText(/Original Article/i)).toBeInTheDocument();
  });

  it('renders category links at bottom', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        page_id: 1,
        title: 'Test',
        namespace_id: 0,
        namespace_name: '',
        latest_revision: {
          revision_id: 1,
          text_content: 'Hello world',
          timestamp: '2024-01-01T00:00:00Z',
          contributor_name: 'admin',
        },
        categories: ['Planets'],
      },
      meta: null,
      error: null,
    });
    renderArticlePage('Test');
    const catLinks = await screen.findAllByText('Planets');
    const link = catLinks.find(el => el.closest('a')?.getAttribute('href')?.includes('/categories/'));
    expect(link).toBeTruthy();
    expect(link!.closest('a')).toHaveAttribute('href', '/categories/Planets');
  });
});
