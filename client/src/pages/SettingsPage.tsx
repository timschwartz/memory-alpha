import { useState, useEffect, useCallback } from 'react';
import type { IndexingStatus } from '@memory-alpha/shared';
import { apiGet, apiPost } from '../api/client';

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const isInProgress = status?.state === 'in-progress';
  const isComplete = status?.state === 'complete';
  const hasIndex = (status?.indexedPages ?? 0) > 0;
  const percentage = status?.percentage ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Indexing</h2>

        {/* Status display */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                isInProgress
                  ? 'bg-blue-100 text-blue-700'
                  : isComplete
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {status?.state ?? 'unknown'}
            </span>
          </div>

          <p className="text-sm text-gray-600">
            {status?.indexedPages?.toLocaleString() ?? 0} / {status?.totalPages?.toLocaleString() ?? 0} pages indexed
          </p>

          {isComplete && status?.durationMs != null && (
            <p className="text-sm text-gray-500">
              Completed in {(status.durationMs / 1000).toFixed(1)}s
            </p>
          )}
        </div>

        {/* Progress bar */}
        {isInProgress && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {status?.durationMs != null && (
              <p className="mt-1 text-xs text-gray-500">
                Elapsed: {(status.durationMs / 1000).toFixed(1)}s
              </p>
            )}
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!isInProgress && (
            <>
              <button
                onClick={() => handleStart('continue')}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isInProgress}
              >
                {hasIndex ? 'Continue Indexing' : 'Build Index'}
              </button>
              {hasIndex && (
                <button
                  onClick={() => handleStart('rebuild')}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={isInProgress}
                >
                  Rebuild Index
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
