import { useParams, useSearchParams, Link } from 'react-router-dom';
import type { PageSummary } from '@memory-alpha/shared';
import { apiGet, ApiClientError } from '../api/client';
import { useApi } from '../hooks/useApi';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const LIMIT = 50;

export default function CategoryPage() {
  const { name } = useParams<{ name: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const offset = (page - 1) * LIMIT;

  const { data, loading, error, refetch } = useApi(
    async () => {
      const res = await apiGet<PageSummary[]>(
        `/categories/${encodeURIComponent(name ?? '')}/pages`,
        { limit: LIMIT, offset },
      );
      return { pages: res.data ?? [], meta: res.meta };
    },
    [name, offset],
  );

  function handlePageChange(newPage: number) {
    setSearchParams({ page: String(newPage) });
  }

  if (loading) return <LoadingSpinner text="Loading category..." />;

  if (error) {
    const is404 = error instanceof ApiClientError && error.status === 404;
    return (
      <ErrorMessage
        title={is404 ? 'Category not found' : 'Error'}
        message={is404
          ? `The category "${name}" does not exist.`
          : error.message
        }
        onRetry={is404 ? undefined : refetch}
      />
    );
  }

  const displayName = name?.replace(/_/g, ' ') ?? '';

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Category: {displayName}</h1>
      <ul className="space-y-1">
        {(data?.pages ?? []).map((p) => (
          <li key={p.page_id}>
            <Link
              to={`/wiki/${encodeURIComponent(p.title)}`}
              className="text-blue-600 hover:underline"
            >
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
      {data?.meta && <Pagination meta={data.meta} onPageChange={handlePageChange} />}
    </div>
  );
}
