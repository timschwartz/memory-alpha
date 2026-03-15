import { useSearchParams, Link } from 'react-router-dom';
import type { PageSummary } from '@memory-alpha/shared';
import { apiGet } from '../api/client';
import { useApi } from '../hooks/useApi';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const LIMIT = 50;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = searchParams.get('prefix') ?? '';
  const namespace = parseInt(searchParams.get('namespace') ?? '0', 10);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const offset = (page - 1) * LIMIT;

  const { data, loading } = useApi(
    async () => {
      const res = await apiGet<PageSummary[]>('/pages', {
        limit: LIMIT,
        offset,
        prefix: prefix || undefined,
        namespace,
      });
      return { pages: res.data ?? [], meta: res.meta };
    },
    [prefix, namespace, offset],
  );

  function setParam(updates: Record<string, string>) {
    const params: Record<string, string> = {};
    if (prefix) params.prefix = prefix;
    params.namespace = String(namespace);
    params.page = '1';
    Object.assign(params, updates);
    if (!params.prefix) delete params.prefix;
    setSearchParams(params);
  }

  function handlePageChange(newPage: number) {
    setParam({ page: String(newPage) });
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-lcars-black dark:text-lcars-text-d">Browse Articles</h1>

      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm text-lcars-gray dark:text-lcars-gray-d">
          Namespace:
          <select
            value={namespace}
            onChange={(e) => setParam({ namespace: e.target.value, page: '1' })}
            className="ml-2 rounded border border-lcars-lilac dark:border-lcars-lilac-d bg-white dark:bg-lcars-surface-d px-2 py-1 text-sm text-lcars-black dark:text-lcars-text-d"
          >
            <option value="0">Main</option>
            <option value="1">Talk</option>
            <option value="2">User</option>
            <option value="4">Project</option>
            <option value="10">Template</option>
            <option value="14">Category</option>
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        <button
          onClick={() => setParam({ prefix: '', page: '1' })}
          className={`rounded px-2 py-1 text-sm font-medium transition-colors ${!prefix ? 'bg-lcars-violet dark:bg-lcars-violet-d text-white' : 'bg-lcars-surface dark:bg-lcars-surface-d text-lcars-violet dark:text-lcars-violet-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d'}`}
        >
          All
        </button>
        {LETTERS.map((letter) => (
          <button
            key={letter}
            onClick={() => setParam({ prefix: letter, page: '1' })}
            className={`rounded px-2 py-1 text-sm font-medium transition-colors ${prefix === letter ? 'bg-lcars-amber dark:bg-lcars-amber-d text-lcars-black' : 'bg-lcars-surface dark:bg-lcars-surface-d text-lcars-violet dark:text-lcars-violet-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d'}`}
          >
            {letter}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading articles..." />
      ) : (
        <div className="rounded-lg bg-lcars-surface dark:bg-lcars-surface-d p-4">
          <ul className="space-y-1">
            {(data?.pages ?? []).map((p) => (
              <li key={p.page_id}>
                <Link
                  to={`/wiki/${encodeURIComponent(p.title)}`}
                  className="text-lcars-blue dark:text-lcars-blue-d hover:underline"
                >
                  {p.title}
                </Link>
                {p.namespace_name && (
                  <span className="ml-2 text-xs text-lcars-gray dark:text-lcars-gray-d">({p.namespace_name})</span>
                )}
              </li>
            ))}
          </ul>
          {data?.meta && <Pagination meta={data.meta} onPageChange={handlePageChange} />}
        </div>
      )}
    </div>
  );
}
