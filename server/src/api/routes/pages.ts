import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse, PageDetail, PageSummary, PaginationMeta } from '@memory-alpha/shared';
import type { PageModel } from '../../models/page.js';
import type { RevisionModel } from '../../models/revision.js';
import type { NamespaceModel } from '../../models/namespace.js';
import type { CategoryModel } from '../../models/category.js';
import { parsePaginationParams, parseIntParam } from '../middleware/validate.js';

function resolveNamespace(
  title: string,
  namespaceModel: NamespaceModel,
): { title: string; namespaceId: number } {
  const colonIndex = title.indexOf(':');
  if (colonIndex > 0) {
    const prefix = title.substring(0, colonIndex);
    const ns = namespaceModel.getByName(prefix);
    if (ns) {
      return {
        title: title.substring(colonIndex + 1),
        namespaceId: ns.namespace_id as number,
      };
    }
  }
  return { title, namespaceId: 0 };
}

function buildPageDetail(
  page: Record<string, unknown>,
  revisionModel: RevisionModel,
  categoryModel: CategoryModel,
): PageDetail {
  const revision = revisionModel.getLatestByPageId(page.page_id as number);
  const categories = categoryModel.getCategoriesByPageId(page.page_id as number);

  return {
    page_id: page.page_id as number,
    title: page.title as string,
    namespace_id: page.namespace_id as number,
    namespace_name: page.namespace_name as string,
    latest_revision: revision
      ? {
          revision_id: revision.revision_id as number,
          text_content: revision.text_content as string | null,
          timestamp: revision.timestamp as string,
          contributor_name: revision.contributor_name as string | null,
        }
      : { revision_id: 0, text_content: null, timestamp: '', contributor_name: null },
    categories,
  };
}

export function createPagesRouter(
  pageModel: PageModel,
  revisionModel: RevisionModel,
  namespaceModel: NamespaceModel,
  categoryModel: CategoryModel,
): Router {
  const router = Router();

  // GET /api/pages — list/browse with pagination
  router.get('/', (req: Request, res: Response) => {
    const pagination = parsePaginationParams(req);
    if ('error' in pagination) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'BAD_REQUEST', message: pagination.error },
      };
      res.status(400).json(body);
      return;
    }

    const prefix = req.query.prefix as string | undefined;
    const namespaceParam = parseIntParam(req.query.namespace as string | undefined, undefined as unknown as number);
    if (typeof namespaceParam === 'string') {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'BAD_REQUEST', message: namespaceParam },
      };
      res.status(400).json(body);
      return;
    }

    const namespaceId = namespaceParam as number | undefined;
    const { limit, offset } = pagination;
    const total = pageModel.count(prefix, namespaceId === undefined ? undefined : namespaceId);
    const pages = pageModel.list(limit, offset, prefix, namespaceId === undefined ? undefined : namespaceId);

    const data: PageSummary[] = pages.map(p => ({
      page_id: p.page_id as number,
      title: p.title as string,
      namespace_id: p.namespace_id as number,
      namespace_name: p.namespace_name as string,
    }));

    const meta: PaginationMeta = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };

    const body: ApiResponse<PageSummary[]> = { data, meta, error: null };
    res.json(body);
  });

  // GET /api/pages/by-id/:pageId — single article by ID
  router.get('/by-id/:pageId', (req: Request, res: Response) => {
    const pageIdParam = parseIntParam(req.params.pageId as string, NaN);
    if (typeof pageIdParam === 'string' || isNaN(pageIdParam)) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'BAD_REQUEST', message: 'pageId must be a valid integer' },
      };
      res.status(400).json(body);
      return;
    }

    const page = pageModel.getById(pageIdParam);
    if (!page) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'NOT_FOUND', message: 'Page not found' },
      };
      res.status(404).json(body);
      return;
    }

    const detail = buildPageDetail(page, revisionModel, categoryModel);
    const body: ApiResponse<PageDetail> = { data: detail, meta: null, error: null };
    res.json(body);
  });

  // GET /api/pages/:title — single article by title with namespace resolution
  router.get('/:title', (req: Request, res: Response) => {
    const { title, namespaceId } = resolveNamespace(req.params.title as string, namespaceModel);

    const page = pageModel.getByTitle(title, namespaceId);
    if (!page) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'NOT_FOUND', message: 'Page not found' },
      };
      res.status(404).json(body);
      return;
    }

    const detail = buildPageDetail(page, revisionModel, categoryModel);
    const body: ApiResponse<PageDetail> = { data: detail, meta: null, error: null };
    res.json(body);
  });

  return router;
}
