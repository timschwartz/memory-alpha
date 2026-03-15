import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './hooks/useTheme';

const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CategoryListPage = lazy(() => import('./pages/CategoryListPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function Layout() {
  return (
    <div className="min-h-screen bg-lcars-bg dark:bg-lcars-bg-d text-lcars-black dark:text-lcars-text-d">
      <Header />
      <div className="flex">
        {/* LCARS side bar - desktop only */}
        <aside className="hidden md:block w-4 shrink-0 ml-4 mt-2 mb-4">
          <div className="w-full h-full bg-lcars-violet dark:bg-lcars-violet-d rounded-b-full" />
        </aside>
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {/* LCARS bottom accent bar */}
      <div className="h-1 bg-lcars-amber dark:bg-lcars-amber-d mx-4 rounded-full" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/browse" replace />} />
            <Route path="/wiki/:title" element={<ArticlePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/categories" element={<CategoryListPage />} />
            <Route path="/categories/:name" element={<CategoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
