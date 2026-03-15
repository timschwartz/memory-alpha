import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, type FormEvent } from 'react';

export default function Header() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setMenuOpen(false);
    }
  }

  // Close menu on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const navLinks = [
    { to: '/browse', label: 'Browse' },
    { to: '/categories', label: 'Categories' },
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <header>
      {/* Main header row */}
      <div className="flex items-center gap-0">
        {/* End cap */}
        <div className="h-12 w-16 shrink-0 rounded-l-full bg-lcars-violet dark:bg-lcars-violet-d ml-2" />

        {/* Title */}
        <div className="flex items-center h-12 bg-lcars-surface dark:bg-lcars-surface-d px-4">
          <Link to="/" className="text-xl font-bold text-lcars-amber dark:text-lcars-amber-d whitespace-nowrap tracking-wide uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d rounded">
            Memory Alpha
          </Link>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center h-12 bg-lcars-surface dark:bg-lcars-surface-d gap-1 px-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded px-3 py-1.5 text-sm font-medium text-lcars-blue dark:text-lcars-blue-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d hover:text-lcars-black dark:hover:text-lcars-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search */}
        <div className="hidden md:flex items-center h-12 bg-lcars-surface dark:bg-lcars-surface-d flex-1 justify-end pr-4">
          <form onSubmit={handleSearch} className="flex max-w-md w-full">
            <input
              type="search"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-l border border-lcars-lilac dark:border-lcars-lilac-d bg-white dark:bg-lcars-bg-d px-3 py-1.5 text-sm text-lcars-black dark:text-lcars-text-d placeholder:text-lcars-gray dark:placeholder:text-lcars-gray-d focus:border-lcars-blue dark:focus:border-lcars-blue-d focus:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
            />
            <button
              type="submit"
              className="rounded-r bg-lcars-amber dark:bg-lcars-amber-d px-4 py-1.5 text-sm font-medium text-lcars-black hover:bg-lcars-sunset dark:hover:bg-lcars-sunset-d transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
            >
              Search
            </button>
          </form>
        </div>

        {/* Mobile: spacer + hamburger */}
        <div className="flex md:hidden items-center h-12 bg-lcars-surface dark:bg-lcars-surface-d flex-1 justify-end pr-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 text-lcars-violet dark:text-lcars-violet-d focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d rounded"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Right end cap */}
        <div className="h-12 w-8 shrink-0 rounded-r-full bg-lcars-sunset dark:bg-lcars-sunset-d mr-2" />
      </div>

      {/* Horizontal bar */}
      <div className="h-2 bg-lcars-amber dark:bg-lcars-amber-d mx-2 mt-1 rounded-full" />

      {/* Mobile search (always visible on mobile) */}
      <div className="md:hidden px-4 mt-2">
        <form onSubmit={handleSearch} className="flex">
          <input
            type="search"
            placeholder="Search articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-l border border-lcars-lilac dark:border-lcars-lilac-d bg-white dark:bg-lcars-bg-d px-3 py-1.5 text-sm text-lcars-black dark:text-lcars-text-d placeholder:text-lcars-gray dark:placeholder:text-lcars-gray-d focus:border-lcars-blue dark:focus:border-lcars-blue-d focus:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
          />
          <button
            type="submit"
            className="rounded-r bg-lcars-amber dark:bg-lcars-amber-d px-4 py-1.5 text-sm font-medium text-lcars-black hover:bg-lcars-sunset dark:hover:bg-lcars-sunset-d transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
          >
            Search
          </button>
        </form>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div
          id="mobile-nav"
          ref={menuRef}
          className="md:hidden mx-4 mt-2 rounded-lg bg-lcars-surface dark:bg-lcars-surface-d border border-lcars-lilac/30 dark:border-lcars-lilac-d/30 overflow-hidden transition-all motion-reduce:transition-none"
        >
          <nav className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-sm font-medium text-lcars-blue dark:text-lcars-blue-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d hover:text-lcars-black dark:hover:text-lcars-black border-b border-lcars-lilac/20 dark:border-lcars-lilac-d/20 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
