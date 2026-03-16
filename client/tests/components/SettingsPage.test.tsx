import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsPage from '../../src/pages/SettingsPage';
import { ThemeProvider } from '../../src/hooks/useTheme';

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock('../../src/api/client', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}));

vi.mock('../../src/hooks/useSSE', () => ({
  useSSE: () => ({ connected: false, error: false }),
}));

// Mock matchMedia for ThemeProvider
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

const idleIndexingStatus = {
  data: {
    state: 'idle',
    indexedPages: 0,
    totalPages: 1000,
    percentage: 0,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  },
};

const idleDlStatus = {
  data: {
    state: 'idle',
    phase: null,
    percent: null,
    downloadedBytes: null,
    totalBytes: null,
    error: null,
    startedAt: null,
    completedAt: null,
  },
};

const emptyFiles = { data: [] };

function mockDefaultApiGet() {
  mockApiGet.mockImplementation((path: string) => {
    if (path === '/indexing/status') return Promise.resolve(idleIndexingStatus);
    if (path === '/database/status') return Promise.resolve(idleDlStatus);
    if (path === '/database/files') return Promise.resolve(emptyFiles);
    return Promise.resolve({ data: null });
  });
}

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
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
    mockDefaultApiGet();

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
    expect(screen.getByText(/0 \/ 1,000 pages indexed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /build index/i })).toBeInTheDocument();
  });

  it('displays idle state with Continue and Rebuild buttons when partial index exists', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/indexing/status') return Promise.resolve({ data: { state: 'idle', indexedPages: 500, totalPages: 1000, percentage: 50, startedAt: null, completedAt: null, durationMs: null } });
      if (path === '/database/status') return Promise.resolve(idleDlStatus);
      if (path === '/database/files') return Promise.resolve(emptyFiles);
      return Promise.resolve({ data: null });
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue indexing/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /rebuild index/i })).toBeInTheDocument();
  });

  it('displays in-progress state with progress bar', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/indexing/status') return Promise.resolve({ data: { state: 'in-progress', indexedPages: 500, totalPages: 1000, percentage: 50, startedAt: '2026-03-15T10:00:00.000Z', completedAt: null, durationMs: 5000 } });
      if (path === '/database/status') return Promise.resolve(idleDlStatus);
      if (path === '/database/files') return Promise.resolve(emptyFiles);
      return Promise.resolve({ data: null });
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
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/indexing/status') return Promise.resolve({ data: { state: 'complete', indexedPages: 1000, totalPages: 1000, percentage: 100, startedAt: '2026-03-15T10:00:00.000Z', completedAt: '2026-03-15T10:00:05.000Z', durationMs: 5000 } });
      if (path === '/database/status') return Promise.resolve(idleDlStatus);
      if (path === '/database/files') return Promise.resolve(emptyFiles);
      return Promise.resolve({ data: null });
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('complete')).toBeInTheDocument();
    });
    expect(screen.getByText(/completed in 5.0s/i)).toBeInTheDocument();
  });

  it('calls apiPost with continue mode when Continue Indexing clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockApiGet.mockImplementation((path: string) => {
      if (path === '/indexing/status') return Promise.resolve({ data: { state: 'idle', indexedPages: 500, totalPages: 1000, percentage: 50, startedAt: null, completedAt: null, durationMs: null } });
      if (path === '/database/status') return Promise.resolve(idleDlStatus);
      if (path === '/database/files') return Promise.resolve(emptyFiles);
      return Promise.resolve({ data: null });
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

    mockApiGet.mockImplementation((path: string) => {
      if (path === '/indexing/status') return Promise.resolve({ data: { state: 'complete', indexedPages: 1000, totalPages: 1000, percentage: 100, startedAt: '2026-03-15T10:00:00.000Z', completedAt: '2026-03-15T10:00:05.000Z', durationMs: 5000 } });
      if (path === '/database/status') return Promise.resolve(idleDlStatus);
      if (path === '/database/files') return Promise.resolve(emptyFiles);
      return Promise.resolve({ data: null });
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

    mockDefaultApiGet();
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

  it('renders Database section with Download button', async () => {
    mockDefaultApiGet();

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/database/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('displays XML file list when files exist', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/indexing/status') return Promise.resolve(idleIndexingStatus);
      if (path === '/database/status') return Promise.resolve(idleDlStatus);
      if (path === '/database/files') return Promise.resolve({ data: [{ filename: 'enmemoryalpha_pages_current.xml', sizeBytes: 1048576, modifiedAt: '2026-03-10T00:00:00.000Z' }] });
      return Promise.resolve({ data: null });
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('enmemoryalpha_pages_current.xml')).toBeInTheDocument();
    });
  });
});
