import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse, CategorySummary, PageSummary, PaginationMeta } from '@memory-alpha/shared';
import type { CategoryModel } from '../../models/category.js';
import type { NamespaceModel } from '../../models/namespace.js';
import { parsePaginationParams } from '../middleware/validate.js';

export function createCategoriesRouter(
  categoryModel: CategoryModel,
  namespaceModel: NamespaceModel,
): Router {
  const router = Router();

  // GET /api/categories — list categories
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
    const { limit, offset } = pagination;
    const total = categoryModel.count(prefix);
    const categories = categoryModel.list(limit, offset, prefix);

    const data: CategorySummary[] = categories.map(c => ({
      category_id: c.category_id as number,
      name: c.name as string,
      page_count: c.page_count as number,
    }));

    const meta: PaginationMeta = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };

    const body: ApiResponse<CategorySummary[]> = { data, meta, error: null };
    res.json(body);
  });

  // GET /api/categories/:name/pages — pages in a category
  router.get('/:name/pages', (req: Request, res: Response) => {
    const category = categoryModel.getByName(req.params.name as string);
    if (!category) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      };
      res.status(404).json(body);
      return;
    }

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

    const categoryId = category.category_id as number;
    const { limit, offset } = pagination;
    const total = categoryModel.getPageCountByCategory(categoryId);
    const pages = categoryModel.getPagesByCategory(categoryId, limit, offset);

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

  return router;
}
