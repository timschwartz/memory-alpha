import { useSearchParams, Link } from 'react-router-dom';
import type { SearchResult } from '@memory-alpha/shared';
import { apiGet } from '../api/client';
import { useApi } from '../hooks/useApi';
import { sanitizeSnippet } from '../lib/wikitext-parser';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const LIMIT = 20;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const offset = (page - 1) * LIMIT;

  const { data, loading } = useApi(
    async () => {
      if (!query.trim()) return { results: [] as SearchResult[], meta: null };
      const res = await apiGet<SearchResult[]>('/search', { q: query, limit: LIMIT, offset });
      return { results: res.data ?? [], meta: res.meta };
    },
    [query, offset],
  );

  function handlePageChange(newPage: number) {
    setSearchParams({ q: query, page: String(newPage) });
  }

  if (!query.trim()) {
    return <p className="text-center text-lcars-gray dark:text-lcars-gray-d">Enter a search query to find articles.</p>;
  }

  if (loading) return <LoadingSpinner text="Searching..." />;

  const results = data?.results ?? [];
  const meta = data?.meta;

  if (results.length === 0) {
    return (
      <div className="text-center">
        <p className="text-lcars-gray dark:text-lcars-gray-d">No results found for &quot;{query}&quot;.</p>
        <p className="mt-2 text-sm text-lcars-gray dark:text-lcars-gray-d">
          Try different keywords or <Link to="/browse" className="text-lcars-blue dark:text-lcars-blue-d hover:underline">browse articles</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-lcars-black dark:text-lcars-text-d">
        Search results for &quot;{query}&quot;
      </h1>
      <ul className="space-y-4">
        {results.map((result) => (
          <li key={result.page_id} className="rounded-lg bg-lcars-surface dark:bg-lcars-surface-d p-3">
            <Link
              to={`/wiki/${encodeURIComponent(result.title)}`}
              className="text-lg font-medium text-lcars-blue dark:text-lcars-blue-d hover:underline"
            >
              {result.title}
            </Link>
            {result.namespace_name && (
              <span className="ml-2 text-xs text-lcars-gray dark:text-lcars-gray-d">({result.namespace_name})</span>
            )}
            <p
              className="mt-1 text-sm text-lcars-gray dark:text-lcars-gray-d"
              dangerouslySetInnerHTML={{ __html: sanitizeSnippet(result.snippet) }}
            />
          </li>
        ))}
      </ul>
      {meta && <Pagination meta={meta} onPageChange={handlePageChange} />}
    </div>
  );
}
