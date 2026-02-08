import { Router } from 'express';
import { importsController } from './imports.controller';
import { validateRequest } from '../../shared/middleware/validate-request';
import { csvUpload, jsonUpload } from '../../shared/middleware/upload';
import { importLimiter } from '../../shared/middleware/rate-limiter';
import { requireAuth, requireAdmin } from '../auth/auth.middleware';
import { listImportsQuerySchema, importIdParamSchema } from './imports.schemas';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Imports
 *   description: CSV product import endpoints
 */

/**
 * @swagger
 * /api/imports:
 *   post:
 *     summary: Create import job
 *     description: Upload a CSV file to create a product import job. Admin only.
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with product data
 *     responses:
 *       201:
 *         description: Import job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ImportJob'
 *       400:
 *         description: Invalid file or file missing
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post(
  '/',
  requireAuth,
  requireAdmin,
  // importLimiter,
  csvUpload.single('file'),
  importsController.create
);

/**
 * @swagger
 * /api/imports:
 *   get:
 *     summary: List import jobs
 *     description: List import jobs with pagination. Users see their own jobs, admins see all.
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Import jobs list with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ImportJob'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Authentication required
 */
router.get(
  '/',
  requireAuth,
  validateRequest({ query: listImportsQuerySchema }),
  importsController.list
);

/**
 * @swagger
 * /api/imports/template:
 *   get:
 *     summary: Get CSV template
 *     description: Download a sample CSV template for product imports
 *     tags: [Imports]
 *     responses:
 *       200:
 *         description: CSV template file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/template', (_req, res) => {
  const headers = [
    'sku',
    'name',
    'description',
    'regular_price',
    'sale_price',
    'special_price',
    'category_slug',
    'image_url',
    'video_url',
    'weight',
    'dimension_length',
    'dimension_width',
    'dimension_height',
    'is_active',
  ];

  const sampleRow = [
    'PROD-001',
    'Sample Product',
    'Product description',
    '99.99',
    '79.99',
    '',
    'art-books',
    'https://example.com/image.jpg',
    '',
    '0.5',
    '20',
    '15',
    '5',
    'true',
  ];

  const csv = [headers.join(','), sampleRow.join(',')].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="import-template.csv"');
  res.send(csv);
});

/**
 * @swagger
 * /api/imports/bulk-images:
 *   post:
 *     summary: Bulk update product images
 *     description: Upload a JSON file to update product images in bulk. Matches products by SKU. Admin only.
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JSON file with product SKUs and image URLs
 *     responses:
 *       201:
 *         description: Bulk images import job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ImportJob'
 *       400:
 *         description: Invalid file or file missing
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post(
  '/bulk-images',
  requireAuth,
  requireAdmin,
  importLimiter,
  jsonUpload.single('file'),
  importsController.bulkImages
);

/**
 * @swagger
 * /api/imports/{id}:
 *   get:
 *     summary: Get import job by ID
 *     description: Get import job details including errors. Users can only view their own jobs.
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Import job ID
 *     responses:
 *       200:
 *         description: Import job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ImportJob'
 *                     - type: object
 *                       properties:
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               row:
 *                                 type: integer
 *                               error:
 *                                 type: string
 *       403:
 *         description: Access denied
 *       404:
 *         description: Import job not found
 */
router.get(
  '/:id',
  requireAuth,
  validateRequest({ params: importIdParamSchema }),
  importsController.getById
);

/**
 * @swagger
 * /api/imports/{id}/cancel:
 *   post:
 *     summary: Cancel import job
 *     description: Cancel a pending import job. Only pending jobs can be cancelled.
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Import job ID
 *     responses:
 *       200:
 *         description: Import job cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ImportJob'
 *       400:
 *         description: Job cannot be cancelled (not in pending status)
 *       403:
 *         description: Access denied
 *       404:
 *         description: Import job not found
 */
/**
 * @swagger
 * /api/imports/{id}/cancel:
 *   post:
 *     summary: Cancel import job
 *     description: Cancel a pending import job. Only pending jobs can be cancelled.
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Import job ID
 *     responses:
 *       200:
 *         description: Import job cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ImportJob'
 *       400:
 *         description: Job cannot be cancelled (not in pending status)
 *       403:
 *         description: Access denied
 *       404:
 *         description: Import job not found
 */
router.post(
  '/:id/cancel',
  requireAuth,
  validateRequest({ params: importIdParamSchema }),
  importsController.cancel
);

/**
 * @swagger
 * components:
 *   schemas:
 *     ImportJob:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         filename:
 *           type: string
 *           example: products-import.csv
 *         fileKey:
 *           type: string
 *           description: S3 key for the uploaded file
 *         fileSize:
 *           type: integer
 *           description: File size in bytes
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *         totalRows:
 *           type: integer
 *           description: Total number of data rows in CSV
 *         processedRows:
 *           type: integer
 *           description: Number of rows processed
 *         successRows:
 *           type: integer
 *           description: Number of rows imported successfully
 *         errorRows:
 *           type: integer
 *           description: Number of rows with errors
 *         startedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export default router;
