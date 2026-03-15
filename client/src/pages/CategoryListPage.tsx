import { useSearchParams, Link } from 'react-router-dom';
import type { CategorySummary } from '@memory-alpha/shared';
import { apiGet } from '../api/client';
import { useApi } from '../hooks/useApi';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const LIMIT = 50;

export default function CategoryListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = searchParams.get('prefix') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const offset = (page - 1) * LIMIT;

  const { data, loading } = useApi(
    async () => {
      const res = await apiGet<CategorySummary[]>('/categories', {
        limit: LIMIT,
        offset,
        prefix: prefix || undefined,
      });
      return { categories: res.data ?? [], meta: res.meta };
    },
    [prefix, offset],
  );

  function handlePageChange(newPage: number) {
    const params: Record<string, string> = { page: String(newPage) };
    if (prefix) params.prefix = prefix;
    setSearchParams(params);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Categories</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter categories..."
          value={prefix}
          onChange={(e) => {
            const params: Record<string, string> = { page: '1' };
            if (e.target.value) params.prefix = e.target.value;
            setSearchParams(params);
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading categories..." />
      ) : (
        <>
          <ul className="space-y-2">
            {(data?.categories ?? []).map((cat) => (
              <li key={cat.category_id} className="flex items-center gap-2">
                <Link
                  to={`/categories/${encodeURIComponent(cat.name)}`}
                  className="text-blue-600 hover:underline"
                >
                  {cat.name}
                </Link>
                <span className="text-sm text-gray-400">({cat.page_count} articles)</span>
              </li>
            ))}
          </ul>
          {data?.meta && <Pagination meta={data.meta} onPageChange={handlePageChange} />}
        </>
      )}
    </div>
  );
}
