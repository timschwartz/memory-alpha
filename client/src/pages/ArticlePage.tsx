import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import type { PageDetail } from '@memory-alpha/shared';
import { apiGet, ApiClientError } from '../api/client';
import { useApi } from '../hooks/useApi';
import { parseWikitext } from '../lib/wikitext-parser';
import WikiContent from '../components/WikiContent';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function ArticlePage() {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedFrom = (location.state as { redirectedFrom?: string } | null)?.redirectedFrom;

  const { data, loading, error, refetch } = useApi(
    async () => {
      const res = await apiGet<PageDetail>(`/pages/${encodeURIComponent(title ?? '')}`);
      return res.data!;
    },
    [title],
  );

  const parsed = useMemo(() => {
    if (!data?.latest_revision?.text_content) return null;
    return parseWikitext(data.latest_revision.text_content);
  }, [data]);

  // Handle redirects
  useEffect(() => {
    if (parsed?.isRedirect && parsed.redirectTarget && !redirectedFrom) {
      const target = parsed.redirectTarget.replace(/ /g, '_');
      navigate(`/wiki/${encodeURIComponent(target)}`, {
        replace: true,
        state: { redirectedFrom: title },
      });
    }
  }, [parsed, redirectedFrom, navigate, title]);

  if (loading) return <LoadingSpinner text="Loading article..." />;

  if (error) {
    const is404 = error instanceof ApiClientError && error.status === 404;
    return (
      <div>
        <ErrorMessage
          title={is404 ? 'Article not found' : 'Error'}
          message={is404
            ? `The article "${title?.replace(/_/g, ' ')}" does not exist.`
            : error.message
          }
          onRetry={is404 ? undefined : refetch}
        />
        {is404 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Try <Link to="/search" className="text-blue-600 hover:underline">searching</Link> or{' '}
            <Link to="/browse" className="text-blue-600 hover:underline">browsing</Link> for articles.
          </div>
        )}
      </div>
    );
  }

  if (!data || !parsed) return null;

  // If this is a redirect itself and we arrived via a redirect, just show the content
  const displayTitle = data.title.replace(/_/g, ' ');

  return (
    <article>
      {redirectedFrom && (
        <div className="mb-3 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Redirected from <em>{redirectedFrom.replace(/_/g, ' ')}</em>
        </div>
      )}
      <h1 className="mb-4 text-3xl font-bold">{displayTitle}</h1>
      <WikiContent html={parsed.html} />
      {data.categories.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((cat) => (
              <Link
                key={cat}
                to={`/categories/${encodeURIComponent(cat)}`}
                className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-700 hover:bg-gray-200"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
