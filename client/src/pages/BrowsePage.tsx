import { useSearchParams, Link } from 'react-router-dom';
import type { PageSummary, PaginationMeta } from '@memory-alpha/shared';
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
      <h1 className="mb-4 text-xl font-semibold">Browse Articles</h1>

      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm text-gray-600">
          Namespace:
          <select
            value={namespace}
            onChange={(e) => setParam({ namespace: e.target.value, page: '1' })}
            className="ml-2 rounded border px-2 py-1 text-sm"
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
          className={`rounded px-2 py-1 text-sm ${!prefix ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All
        </button>
        {LETTERS.map((letter) => (
          <button
            key={letter}
            onClick={() => setParam({ prefix: letter, page: '1' })}
            className={`rounded px-2 py-1 text-sm ${prefix === letter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {letter}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading articles..." />
      ) : (
        <>
          <ul className="space-y-1">
            {(data?.pages ?? []).map((p) => (
              <li key={p.page_id}>
                <Link
                  to={`/wiki/${encodeURIComponent(p.title)}`}
                  className="text-blue-600 hover:underline"
                >
                  {p.title}
                </Link>
                {p.namespace_name && (
                  <span className="ml-2 text-xs text-gray-400">({p.namespace_name})</span>
                )}
              </li>
            ))}
          </ul>
          {data?.meta && <Pagination meta={data.meta} onPageChange={handlePageChange} />}
        </>
      )}
    </div>
  );
}
