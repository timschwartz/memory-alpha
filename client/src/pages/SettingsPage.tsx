import { useState, useEffect, useCallback } from 'react';
import type { IndexingStatus } from '@memory-alpha/shared';
import { apiGet, apiPost } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';

export default function SettingsPage() {
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 2 seconds while in-progress
  useEffect(() => {
    if (status?.state !== 'in-progress') return;
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [status?.state, fetchStatus]);

  async function handleStart(mode: 'continue' | 'rebuild') {
    setActionError(null);
    try {
      await apiPost('/indexing/start', { mode });
      // Immediately fetch updated status
      await fetchStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start indexing');
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
  const percentage = status?.percentage ?? 0;

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
                disabled={isInProgress}
              >
                {hasIndex ? 'Continue Indexing' : 'Build Index'}
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
