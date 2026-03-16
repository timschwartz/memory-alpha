import { useState, useEffect, useCallback } from 'react';
import type { IndexingStatus, DownloadStatus, XmlFileInfo, ImportProgressSSEEvent, ImportCompleteSSEEvent, ImportErrorSSEEvent } from '@memory-alpha/shared';
import { apiGet, apiPost } from '../api/client';
import { useSSE } from '../hooks/useSSE';
import ThemeToggle from '../components/ThemeToggle';

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return 'just now';
}

export default function SettingsPage() {
  // Indexing state
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Database state
  const [dlStatus, setDlStatus] = useState<DownloadStatus | null>(null);
  const [files, setFiles] = useState<XmlFileInfo[]>([]);
  const [dlError, setDlError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressSSEEvent | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiGet<IndexingStatus>('/indexing/status');
      setStatus(res.data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDlStatus = useCallback(async () => {
    try {
      const res = await apiGet<DownloadStatus>('/database/status');
      setDlStatus(res.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await apiGet<XmlFileInfo[]>('/database/files');
      setFiles(res.data ?? []);
    } catch {
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDlStatus();
    fetchFiles();
  }, [fetchStatus, fetchDlStatus, fetchFiles]);

  // SSE for indexing progress
  useSSE<Record<string, unknown>>({
    url: '/api/indexing/events',
    enabled: status?.state === 'in-progress',
    onEvent: (event, data) => {
      if (event === 'progress') {
        setStatus((prev) => prev ? {
          ...prev,
          state: 'in-progress',
          indexedPages: (data as { indexedPages: number }).indexedPages,
          totalPages: (data as { totalPages: number }).totalPages,
          percentage: (data as { percentage: number }).percentage,
          durationMs: (data as { durationMs: number }).durationMs,
        } : prev);
      } else if (event === 'complete' || event === 'error') {
        fetchStatus();
      }
    },
    onError: () => { fetchStatus(); },
  });

  // SSE for download and import progress
  const dlActive = dlStatus?.state === 'downloading' || dlStatus?.state === 'decompressing';
  const importing = importProgress !== null;
  useSSE<Record<string, unknown>>({
    url: '/api/database/events',
    enabled: dlActive || importing,
    onEvent: (event, data) => {
      if (event === 'progress') {
        const d = data as { state: string; phase: string; percent: number | null; downloadedBytes: number | null; totalBytes: number | null };
        setDlStatus((prev) => prev ? {
          ...prev,
          state: d.state as DownloadStatus['state'],
          phase: d.phase as DownloadStatus['phase'],
          percent: d.percent,
          downloadedBytes: d.downloadedBytes,
          totalBytes: d.totalBytes,
        } : prev);
      } else if (event === 'complete') {
        setDlStatus({ state: 'complete', phase: null, percent: null, downloadedBytes: null, totalBytes: null, error: null, startedAt: dlStatus?.startedAt ?? null, completedAt: new Date().toISOString() });
        setDlError(null);
        fetchFiles();
      } else if (event === 'error') {
        const d = data as { message: string };
        setDlStatus((prev) => prev ? { ...prev, state: 'failed', error: d.message } : prev);
        setDlError(d.message);
      } else if (event === 'cancelled') {
        setDlStatus((prev) => prev ? { ...prev, state: 'cancelled', phase: null } : prev);
      } else if (event === 'import-progress') {
        setImportProgress(data as unknown as ImportProgressSSEEvent);
        setImportError(null);
      } else if (event === 'import-complete') {
        const d = data as unknown as ImportCompleteSSEEvent;
        setImportProgress(null);
        setImportError(null);
        setDlError(null);
        fetchFiles();
        fetchStatus();
        // Show brief success in dlError slot (reuse for info messages)
        setDlError(`Import complete: ${d.totalPages.toLocaleString()} pages, ${d.totalRevisions.toLocaleString()} revisions in ${(d.durationMs / 1000).toFixed(1)}s`);
      } else if (event === 'import-error') {
        const d = data as unknown as ImportErrorSSEEvent;
        setImportProgress(null);
        setImportError(d.message);
      }
    },
    onError: () => { fetchDlStatus(); },
  });

  async function handleStart(mode: 'continue' | 'rebuild') {
    setActionError(null);
    try {
      await apiPost('/indexing/start', { mode });
      await fetchStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start indexing');
    }
  }

  async function handleDownload() {
    setDlError(null);
    try {
      await apiPost('/database/download', {});
      await fetchDlStatus();
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Failed to start download');
    }
  }

  async function handleCancel() {
    try {
      await apiPost('/database/cancel', {});
      await fetchDlStatus();
    } catch {
      // ignore
    }
  }

  async function handleImport(filename: string) {
    setDlError(null);
    setImportError(null);
    try {
      await apiPost('/database/import', { filename });
      // Set initial import progress so SSE listener activates
      setImportProgress({ filename, pagesProcessed: 0, revisionsProcessed: 0, pagesSkipped: 0, elapsedMs: 0 });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to start import');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-lcars-peach dark:border-lcars-peach-d border-t-lcars-amber dark:border-t-lcars-amber-d" />
      </div>
    );
  }

  const isInProgress = status?.state === 'in-progress';
  const isComplete = status?.state === 'complete';
  const hasIndex = (status?.indexedPages ?? 0) > 0;
  const isFullyIndexed = hasIndex && status!.indexedPages >= status!.totalPages;
  const percentage = status?.percentage ?? 0;

  const dlPercent = dlStatus?.percent ?? 0;
  const memoryAlphaFile = files.find((f) => f.isMemoryAlphaDump);
  const hasExistingFile = !!memoryAlphaFile;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-lcars-black dark:text-lcars-text-d">Settings</h1>

      {/* Appearance section */}
      <section className="flex gap-3 rounded-lg bg-lcars-surface dark:bg-lcars-surface-d p-6 mb-6">
        <div className="w-2 shrink-0 rounded-full bg-lcars-violet dark:bg-lcars-violet-d" />
        <div className="flex-1">
          <h2 className="mb-4 text-lg font-semibold text-lcars-black dark:text-lcars-text-d">Appearance</h2>
          <p className="mb-3 text-sm text-lcars-gray dark:text-lcars-gray-d">Choose your preferred color mode.</p>
          <ThemeToggle />
        </div>
      </section>

      {/* Database section */}
      <section className="flex gap-3 rounded-lg bg-lcars-surface dark:bg-lcars-surface-d p-6 mb-6">
        <div className="w-2 shrink-0 rounded-full bg-lcars-blue dark:bg-lcars-blue-d" />
        <div className="flex-1">
          <h2 className="mb-4 text-lg font-semibold text-lcars-black dark:text-lcars-text-d">Database</h2>

          {/* Freshness notice */}
          {hasExistingFile && memoryAlphaFile.isFresh && (
            <div className="mb-4 rounded border border-lcars-amber/30 dark:border-lcars-amber-d/30 bg-lcars-amber/10 dark:bg-lcars-amber-d/10 px-3 py-2 text-sm text-lcars-gray dark:text-lcars-gray-d">
              Last updated {formatAge(memoryAlphaFile.ageMs)} — an update may not be necessary.
            </div>
          )}

          {/* Download progress */}
          {dlActive && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-sm text-lcars-gray dark:text-lcars-gray-d">
                <span>{dlStatus.phase === 'download' ? 'Downloading' : 'Decompressing'}...</span>
                <span>{dlPercent != null ? `${dlPercent.toFixed(1)}%` : 'Processing...'}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-lcars-surface dark:bg-lcars-surface-d">
                {dlPercent != null ? (
                  <div
                    className="h-full rounded-full bg-lcars-blue dark:bg-lcars-blue-d transition-all duration-300"
                    style={{ width: `${dlPercent}%` }}
                  />
                ) : (
                  <div className="h-full w-full animate-pulse rounded-full bg-lcars-blue/50 dark:bg-lcars-blue-d/50" />
                )}
              </div>
            </div>
          )}

          {dlStatus?.state === 'complete' && (
            <div className="mb-4 rounded border border-lcars-peach/30 dark:border-lcars-peach-d/30 bg-lcars-peach/10 dark:bg-lcars-peach-d/10 px-3 py-2 text-sm text-lcars-violet dark:text-lcars-violet-d">
              Download and decompression complete.
            </div>
          )}

          {/* Error display */}
          {dlError && (
            <div className="mb-4 rounded border border-lcars-mars/30 dark:border-lcars-mars-d/30 bg-lcars-mars/10 dark:bg-lcars-mars-d/10 px-3 py-2 text-sm text-lcars-mars dark:text-lcars-mars-d">
              {dlError}
            </div>
          )}

          {/* Import progress */}
          {importing && importProgress && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-sm text-lcars-gray dark:text-lcars-gray-d">
                <span>Importing {importProgress.filename}...</span>
                <span>{importProgress.pagesProcessed.toLocaleString()} pages, {importProgress.revisionsProcessed.toLocaleString()} revisions</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-lcars-surface dark:bg-lcars-surface-d">
                <div className="h-full w-full animate-pulse rounded-full bg-lcars-amber/50 dark:bg-lcars-amber-d/50" />
              </div>
              <div className="mt-1 text-xs text-lcars-gray dark:text-lcars-gray-d">
                Elapsed: {(importProgress.elapsedMs / 1000).toFixed(0)}s
                {importProgress.pagesSkipped > 0 && ` · ${importProgress.pagesSkipped} skipped`}
              </div>
            </div>
          )}

          {/* Import error */}
          {importError && (
            <div className="mb-4 rounded border border-lcars-mars/30 dark:border-lcars-mars-d/30 bg-lcars-mars/10 dark:bg-lcars-mars-d/10 px-3 py-2 text-sm text-lcars-mars dark:text-lcars-mars-d">
              Import failed: {importError}
            </div>
          )}

          {/* Download / Cancel buttons */}
          <div className="mb-4 flex gap-3">
            {!dlActive && (
              <button
                onClick={handleDownload}
                className="rounded bg-lcars-blue dark:bg-lcars-blue-d px-4 py-2 text-sm font-medium text-lcars-black hover:bg-lcars-ice dark:hover:bg-lcars-ice-d disabled:opacity-50 transition-colors"
              >
                {hasExistingFile ? 'Re-download Memory Alpha Dump' : 'Download Memory Alpha Dump'}
              </button>
            )}
            {dlActive && (
              <button
                onClick={handleCancel}
                className="rounded border border-lcars-mars dark:border-lcars-mars-d bg-lcars-surface dark:bg-lcars-surface-d px-4 py-2 text-sm font-medium text-lcars-mars dark:text-lcars-mars-d hover:bg-lcars-mars/10 dark:hover:bg-lcars-mars-d/10 transition-colors"
              >
                Cancel
              </button>
            )}
            {dlStatus?.state === 'failed' && (
              <button
                onClick={handleDownload}
                className="rounded bg-lcars-blue dark:bg-lcars-blue-d px-4 py-2 text-sm font-medium text-lcars-black hover:bg-lcars-ice dark:hover:bg-lcars-ice-d transition-colors"
              >
                Retry Download
              </button>
            )}
          </div>

          {/* XML File list */}
          {files.length === 0 && !dlActive && (
            <p className="text-sm text-lcars-gray dark:text-lcars-gray-d">
              No XML files available — download one to get started.
            </p>
          )}

          {files.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-lcars-lilac/30 dark:border-lcars-lilac-d/30 text-left text-lcars-gray dark:text-lcars-gray-d">
                    <th className="pb-2 pr-4 font-medium">Filename</th>
                    <th className="pb-2 pr-4 font-medium">Size</th>
                    <th className="pb-2 pr-4 font-medium">Modified</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.filename} className="border-b border-lcars-lilac/10 dark:border-lcars-lilac-d/10">
                      <td className="py-2 pr-4 text-lcars-black dark:text-lcars-text-d">{file.filename}</td>
                      <td className="py-2 pr-4 text-lcars-gray dark:text-lcars-gray-d">{file.sizeHuman}</td>
                      <td className="py-2 pr-4 text-lcars-gray dark:text-lcars-gray-d">{formatAge(file.ageMs)}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleImport(file.filename)}
                          disabled={importing}
                          className="rounded bg-lcars-amber dark:bg-lcars-amber-d px-3 py-1 text-xs font-medium text-lcars-black hover:bg-lcars-sunset dark:hover:bg-lcars-sunset-d disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Import
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="flex gap-3 rounded-lg bg-lcars-surface dark:bg-lcars-surface-d p-6">
        {/* Left accent cap */}
        <div className="w-2 shrink-0 rounded-full bg-lcars-amber dark:bg-lcars-amber-d" />
        <div className="flex-1">
        <h2 className="mb-4 text-lg font-semibold text-lcars-black dark:text-lcars-text-d">Indexing</h2>

        {/* Status display */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-lcars-gray dark:text-lcars-gray-d">Status:</span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                isInProgress
                  ? 'bg-lcars-ice/30 dark:bg-lcars-ice-d/30 text-lcars-blue dark:text-lcars-blue-d'
                  : isComplete
                    ? 'bg-lcars-peach/30 dark:bg-lcars-peach-d/30 text-lcars-violet dark:text-lcars-violet-d'
                    : 'bg-lcars-surface dark:bg-lcars-surface-d text-lcars-gray dark:text-lcars-gray-d'
              }`}
            >
              {status?.state ?? 'unknown'}
            </span>
          </div>

          <p className="text-sm text-lcars-gray dark:text-lcars-gray-d">
            {status?.indexedPages?.toLocaleString() ?? 0} / {status?.totalPages?.toLocaleString() ?? 0} pages indexed
          </p>

          {isComplete && status?.durationMs != null && (
            <p className="text-sm text-lcars-gray dark:text-lcars-gray-d">
              Completed in {(status.durationMs / 1000).toFixed(1)}s
            </p>
          )}
        </div>

        {/* Progress bar */}
        {isInProgress && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm text-lcars-gray dark:text-lcars-gray-d">
              <span>Progress</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-lcars-surface dark:bg-lcars-surface-d">
              <div
                className="h-full rounded-full bg-lcars-amber dark:bg-lcars-amber-d transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {status?.durationMs != null && (
              <p className="mt-1 text-xs text-lcars-gray dark:text-lcars-gray-d">
                Elapsed: {(status.durationMs / 1000).toFixed(1)}s
              </p>
            )}
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mb-4 rounded border border-lcars-mars/30 dark:border-lcars-mars-d/30 bg-lcars-mars/10 dark:bg-lcars-mars-d/10 px-3 py-2 text-sm text-lcars-mars dark:text-lcars-mars-d">
            {actionError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!isInProgress && (
            <>
              <button
                onClick={() => handleStart('continue')}
                className="rounded bg-lcars-amber dark:bg-lcars-amber-d px-4 py-2 text-sm font-medium text-lcars-black hover:bg-lcars-sunset dark:hover:bg-lcars-sunset-d disabled:opacity-50 transition-colors"
                disabled={isInProgress || isFullyIndexed}
              >
                {isFullyIndexed ? 'Fully Indexed' : hasIndex ? 'Continue Indexing' : 'Build Index'}
              </button>
              {hasIndex && (
                <button
                  onClick={() => handleStart('rebuild')}
                  className="rounded border border-lcars-lilac dark:border-lcars-lilac-d bg-lcars-surface dark:bg-lcars-surface-d px-4 py-2 text-sm font-medium text-lcars-gray dark:text-lcars-gray-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d disabled:opacity-50 transition-colors"
                  disabled={isInProgress}
                >
                  Rebuild Index
                </button>
              )}
            </>
          )}
        </div>
        </div>
      </section>
    </div>
  );
}
