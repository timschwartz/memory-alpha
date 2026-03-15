import { Link, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';

export default function Header() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link to="/" className="text-xl font-bold text-gray-900 whitespace-nowrap">
          Memory Alpha
        </Link>
        <form onSubmit={handleSearch} className="flex flex-1 max-w-md">
          <input
            type="search"
            placeholder="Search articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-l border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-r bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Search
          </button>
        </form>
        <nav className="flex gap-4">
          <Link to="/browse" className="text-sm text-gray-600 hover:text-gray-900">
            Browse
          </Link>
          <Link to="/categories" className="text-sm text-gray-600 hover:text-gray-900">
            Categories
          </Link>
          <Link to="/settings" className="text-sm text-gray-600 hover:text-gray-900">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
