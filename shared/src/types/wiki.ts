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

// Database Download Management Types

export type DownloadState = 'idle' | 'downloading' | 'decompressing' | 'complete' | 'failed' | 'cancelled';

export interface DownloadStatus {
  state: DownloadState;
  phase: 'download' | 'decompress' | null;
  percent: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface XmlFileInfo {
  filename: string;
  sizeBytes: number;
  sizeHuman: string;
  modifiedAt: string;
  ageMs: number;
  isMemoryAlphaDump: boolean;
  isFresh: boolean;
}

// SSE Event Payloads

export interface DownloadProgressEvent {
  state: 'downloading' | 'decompressing';
  phase: 'download' | 'decompress';
  percent: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
}

export interface DownloadCompleteEvent {
  filename: string;
  sizeBytes: number;
  sizeHuman: string;
}

export interface DownloadErrorEvent {
  message: string;
}

export interface IndexingProgressEvent {
  state: 'in-progress';
  indexedPages: number;
  totalPages: number;
  percentage: number;
  durationMs: number;
}

export interface IndexingCompleteEvent {
  indexedPages: number;
  totalPages: number;
  durationMs: number;
}

export interface IndexingErrorEvent {
  message: string;
}

export interface ImportProgressSSEEvent {
  filename: string;
  pagesProcessed: number;
  revisionsProcessed: number;
  pagesSkipped: number;
  elapsedMs: number;
}

export interface ImportCompleteSSEEvent {
  filename: string;
  totalPages: number;
  totalRevisions: number;
  totalCategories: number;
  skippedPages: number;
  durationMs: number;
}

export interface ImportErrorSSEEvent {
  filename: string;
  message: string;
}

export type ApiErrorCode =
  | 'DOWNLOAD_IN_PROGRESS'
  | 'NO_ACTIVE_DOWNLOAD'
  | 'IMPORT_IN_PROGRESS'
  | 'IMPORT_FAILED'
  | 'INVALID_FILENAME'
  | 'FILE_NOT_FOUND'
  | 'IMPORT_FAILED'
  | 'INDEXING_IN_PROGRESS'
  | 'INVALID_MODE'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR';
