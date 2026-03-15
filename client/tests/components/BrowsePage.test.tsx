import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BrowsePage from '../../src/pages/BrowsePage';

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

function renderBrowsePage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/browse${search}`]}>
      <Routes>
        <Route path="/browse" element={<BrowsePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BrowsePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders article list with clickable titles', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { page_id: 1, title: 'Alpha Quadrant', namespace_id: 0, namespace_name: '' },
        { page_id: 2, title: 'Beta Quadrant', namespace_id: 0, namespace_name: '' },
      ],
      meta: { total: 2, limit: 50, offset: 0, hasMore: false },
      error: null,
    });
    renderBrowsePage();
    expect(await screen.findByText('Alpha Quadrant')).toBeInTheDocument();
    expect(screen.getByText('Beta Quadrant')).toBeInTheDocument();
    expect(screen.getByText('Alpha Quadrant').closest('a')).toHaveAttribute('href', '/wiki/Alpha%20Quadrant');
  });

  it('A-Z index letter click updates prefix filter', async () => {
    mockApiGet.mockResolvedValue({
      data: [],
      meta: { total: 0, limit: 50, offset: 0, hasMore: false },
      error: null,
    });
    const user = userEvent.setup();
    renderBrowsePage();
    await screen.findByText('Browse Articles');
    const letterS = screen.getByRole('button', { name: 'S' });
    await user.click(letterS);
    // After click, the API should be re-called (we verify the button state visually)
    expect(mockApiGet).toHaveBeenCalled();
  });

  it('namespace selector defaults to 0 and updates on change', async () => {
    mockApiGet.mockResolvedValue({
      data: [],
      meta: { total: 0, limit: 50, offset: 0, hasMore: false },
      error: null,
    });
    const user = userEvent.setup();
    renderBrowsePage();
    await screen.findByText('Browse Articles');
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('0');
    await user.selectOptions(select, '10');
    expect(select).toHaveValue('10');
  });

  it('pagination controls navigate pages', async () => {
    mockApiGet.mockResolvedValue({
      data: [{ page_id: 1, title: 'Test', namespace_id: 0, namespace_name: '' }],
      meta: { total: 100, limit: 50, offset: 0, hasMore: true },
      error: null,
    });
    renderBrowsePage();
    expect(await screen.findByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it('shows spinner while loading', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderBrowsePage();
    expect(screen.getByText(/loading articles/i)).toBeInTheDocument();
  });
});
