import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';

const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CategoryListPage = lazy(() => import('./pages/CategoryListPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
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
  );
}
