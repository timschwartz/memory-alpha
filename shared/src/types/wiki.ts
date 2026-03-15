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
