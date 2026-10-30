import type { Request, Response, NextFunction } from 'express';
import { importsService } from './imports.service.js';
import { dbfToCsv } from './dbf/dbf-to-csv.js';
import type { AuthenticatedRequest } from '../../shared/types/index.js';
import type { DbfConvertQuery, ListImportsQuery } from './imports.schemas.js';

export const importsController = {
  /**
   * Create import job (upload CSV)
   * POST /api/imports
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'CSV file is required',
          },
        });
        return;
      }

      const job = await importsService.createImportJob(
        file.buffer,
        file.originalname,
        user!.id
      );

      res.status(201).json({ data: job });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create import job from a DBF upload
   * POST /api/imports/dbf
   */
  async createFromDbf(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'DBF file is required',
          },
        });
        return;
      }

      const job = await importsService.createDbfImportJob(
        file.buffer,
        file.originalname,
        user!.id
      );

      res.status(201).json({ data: job });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Convert a DBF upload to CSV and return it
   * POST /api/imports/dbf/csv
   */
  async convertDbf(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'DBF file is required',
          },
        });
        return;
      }

      const { format } = req.query as unknown as DbfConvertQuery;
      const { csv, rowCount } = dbfToCsv(file.buffer, format);

      res.attachment(file.originalname.replace(/\.dbf$/i, '.csv'));
      res.type('text/csv; charset=utf-8');
      res.setHeader('X-Row-Count', String(rowCount));
      res.send(csv);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download the file an import job imported
   * GET /api/imports/:id/file
   */
  async getFile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      const { id } = req.params;
      const file = await importsService.getJobFile(id as string, user?.id, isAdmin);

      res.attachment(file.filename);
      res.type(file.contentType);
      res.send(file.body);
    } catch (error) {
      next(error);
    }
  },

  /**
   * List import jobs
   * GET /api/imports
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      const query: ListImportsQuery = req.query as unknown as ListImportsQuery;
      const result = await importsService.list(query, user?.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get import job by ID
   * GET /api/imports/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      const { id } = req.params;
      const job = await importsService.getById(id as string, user?.id, isAdmin);
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cancel import job
   * POST /api/imports/:id/cancel
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      const { id } = req.params;
      const job = await importsService.cancel(id as string, user?.id, isAdmin);
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create bulk images import job
   * POST /api/imports/bulk-images
   */
  async bulkImages(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'JSON file is required',
          },
        });
        return;
      }

      const job = await importsService.createBulkImagesImportJob(
        file.buffer,
        file.originalname,
        user!.id
      );

      res.status(201).json({ data: job });
    } catch (error) {
      next(error);
    }
  },
};
