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
      <h1 className="mb-4 text-xl font-semibold text-lcars-black dark:text-lcars-text-d">Categories</h1>

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
          className="rounded border border-lcars-lilac dark:border-lcars-lilac-d bg-white dark:bg-lcars-surface-d px-3 py-1.5 text-sm text-lcars-black dark:text-lcars-text-d placeholder:text-lcars-gray dark:placeholder:text-lcars-gray-d focus:border-lcars-blue dark:focus:border-lcars-blue-d focus:outline-none"
        />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading categories..." />
      ) : (
        <div className="rounded-lg bg-lcars-surface dark:bg-lcars-surface-d p-4">
          <ul className="space-y-2">
            {(data?.categories ?? []).map((cat) => (
              <li key={cat.category_id} className="flex items-center gap-2">
                <Link
                  to={`/categories/${encodeURIComponent(cat.name)}`}
                  className="text-lcars-blue dark:text-lcars-blue-d hover:underline"
                >
                  {cat.name}
                </Link>
                <span className="text-sm text-lcars-gray dark:text-lcars-gray-d">({cat.page_count} articles)</span>
              </li>
            ))}
          </ul>
          {data?.meta && <Pagination meta={data.meta} onPageChange={handlePageChange} />}
        </div>
      )}
    </div>
  );
}
