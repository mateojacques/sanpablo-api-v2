import { Router } from 'express';
import { metricsController } from './metrics.controller.js';
import { validateRequest } from '../../shared/middleware/validate-request.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';
import { metricsQuerySchema } from './metrics.schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Metrics
 *   description: Business metrics and analytics
 */

/**
 * @swagger
 * /api/metrics/overview:
 *   get:
 *     summary: Get business overview metrics
 *     description: |
 *       Returns key business metrics including total products, categories, orders,
 *       and the date of the last successful import.
 *
 *       By default returns historical totals. Pass startDate and/or endDate
 *       to filter entities created within a specific time period.
 *
 *       Admin access required.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter entities created on or after this date (ISO 8601)
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter entities created on or before this date (ISO 8601)
 *         example: "2024-12-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Business metrics overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: integer
 *                       description: Total number of products (not deleted)
 *                       example: 150
 *                     totalCategories:
 *                       type: integer
 *                       description: Total number of categories (not deleted)
 *                       example: 12
 *                     totalOrders:
 *                       type: integer
 *                       description: Total number of orders (not deleted)
 *                       example: 45
 *                     lastSuccessfulImportAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Date of the last successful import job
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     dateRange:
 *                       type: object
 *                       description: The date range used for filtering (null if not provided)
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get(
  '/overview',
  requireAuth,
  requireAdmin,
  validateRequest({ query: metricsQuerySchema }),
  metricsController.getOverview
);

export default router;
