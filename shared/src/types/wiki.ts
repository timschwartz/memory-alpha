export interface NamespaceData {
  namespace_id: number;
  name: string;
  case_setting: string;
}

export interface PageData {
  page_id: number;
  title: string;
  namespace_id: number;
  revisions: RevisionData[];
}

export interface RevisionData {
  revision_id: number;
  page_id: number;
  parent_id: number | null;
  timestamp: string;
  contributor_name: string | null;
  contributor_id: number | null;
  content_model: string;
  content_format: string | null;
  text_content: string | null;
  sha1: string | null;
}

export interface ImportOptions {
  xmlFilePath: string;
  databasePath: string;
  logFilePath?: string;
  namespaceFilter?: number[];
  batchSize?: number;
  onProgress?: (stats: ImportProgress) => void;
}

export interface ImportProgress {
  pagesProcessed: number;
  revisionsProcessed: number;
  pagesSkipped: number;
  elapsedMs: number;
}

export interface ImportResult {
  totalPages: number;
  totalRevisions: number;
  totalCategories: number;
  skippedPages: number;
  durationMs: number;
}

// API Response Types

export interface ApiResponse<T> {
  data: T | null;
  meta: PaginationMeta | null;
  error: ApiError | null;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface PageSummary {
  page_id: number;
  title: string;
  namespace_id: number;
  namespace_name: string;
}

export interface PageDetail {
  page_id: number;
  title: string;
  namespace_id: number;
  namespace_name: string;
  latest_revision: {
    revision_id: number;
    text_content: string | null;
    timestamp: string;
    contributor_name: string | null;
  };
  categories: string[];
}

export interface SearchResult {
  page_id: number;
  title: string;
  namespace_name: string;
  snippet: string;
  rank: number;
}

export interface CategorySummary {
  category_id: number;
  name: string;
  page_count: number;
}

export interface HealthStatus {
  status: string;
  database: string;
  totalPages: number;
  totalCategories: number;
  searchIndexReady: boolean;
}

export interface IndexingStatus {
  state: 'idle' | 'in-progress' | 'complete';
  indexedPages: number;
  totalPages: number;
  percentage: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface IndexingStartRequest {
  mode: 'continue' | 'rebuild';
}

export interface IndexingStartResponse {
  status: 'started';
  totalPages: number;
}
