import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsPage from '../../src/pages/SettingsPage';

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock('../../src/api/client', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}));

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApiGet.mockReset();
    mockApiPost.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading spinner initially', () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    renderSettings();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays idle state with Build Index button when no index exists', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        state: 'idle',
        indexedPages: 0,
        totalPages: 1000,
        percentage: 0,
        startedAt: null,
        completedAt: null,
        durationMs: null,
      },
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
    expect(screen.getByText(/0 \/ 1,000 pages indexed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /build index/i })).toBeInTheDocument();
  });

  it('displays idle state with Continue and Rebuild buttons when partial index exists', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        state: 'idle',
        indexedPages: 500,
        totalPages: 1000,
        percentage: 50,
        startedAt: null,
        completedAt: null,
        durationMs: null,
      },
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue indexing/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /rebuild index/i })).toBeInTheDocument();
  });

  it('displays in-progress state with progress bar', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        state: 'in-progress',
        indexedPages: 500,
        totalPages: 1000,
        percentage: 50,
        startedAt: '2026-03-15T10:00:00.000Z',
        completedAt: null,
        durationMs: 5000,
      },
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('in-progress')).toBeInTheDocument();
    });
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    // No action buttons while in-progress
    expect(screen.queryByRole('button', { name: /continue|build|rebuild/i })).not.toBeInTheDocument();
  });

  it('displays complete state with duration', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        state: 'complete',
        indexedPages: 1000,
        totalPages: 1000,
        percentage: 100,
        startedAt: '2026-03-15T10:00:00.000Z',
        completedAt: '2026-03-15T10:00:05.000Z',
        durationMs: 5000,
      },
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('complete')).toBeInTheDocument();
    });
    expect(screen.getByText(/completed in 5.0s/i)).toBeInTheDocument();
  });

  it('calls apiPost with continue mode when Continue Indexing clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockApiGet.mockResolvedValue({
      data: {
        state: 'idle',
        indexedPages: 500,
        totalPages: 1000,
        percentage: 50,
        startedAt: null,
        completedAt: null,
        durationMs: null,
      },
    });
    mockApiPost.mockResolvedValue({ data: { status: 'started', totalPages: 1000 } });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue indexing/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /continue indexing/i }));

    expect(mockApiPost).toHaveBeenCalledWith('/indexing/start', { mode: 'continue' });
  });

  it('calls apiPost with rebuild mode when Rebuild Index clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockApiGet.mockResolvedValue({
      data: {
        state: 'complete',
        indexedPages: 1000,
        totalPages: 1000,
        percentage: 100,
        startedAt: '2026-03-15T10:00:00.000Z',
        completedAt: '2026-03-15T10:00:05.000Z',
        durationMs: 5000,
      },
    });
    mockApiPost.mockResolvedValue({ data: { status: 'started', totalPages: 1000 } });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rebuild index/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /rebuild index/i }));

    expect(mockApiPost).toHaveBeenCalledWith('/indexing/start', { mode: 'rebuild' });
  });

  it('shows error message when start fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockApiGet.mockResolvedValue({
      data: {
        state: 'idle',
        indexedPages: 0,
        totalPages: 1000,
        percentage: 0,
        startedAt: null,
        completedAt: null,
        durationMs: null,
      },
    });
    mockApiPost.mockRejectedValue(new Error('Indexing is already in progress'));

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /build index/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /build index/i }));

    await waitFor(() => {
      expect(screen.getByText(/indexing is already in progress/i)).toBeInTheDocument();
    });
  });

  it('polls status every 2 seconds while in-progress', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        state: 'in-progress',
        indexedPages: 500,
        totalPages: 1000,
        percentage: 50,
        startedAt: '2026-03-15T10:00:00.000Z',
        completedAt: null,
        durationMs: 5000,
      },
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('in-progress')).toBeInTheDocument();
    });

    const initialCallCount = mockApiGet.mock.calls.length;

    // Advance 2 seconds — should trigger a poll
    await vi.advanceTimersByTimeAsync(2000);

    await waitFor(() => {
      expect(mockApiGet.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});
