import type { Request, Response, NextFunction } from 'express';
import { metricsService } from './metrics.service';
import type { MetricsQuery } from './metrics.schemas';

export const metricsController = {
  /**
   * Get business overview metrics
   * GET /api/metrics/overview
   */
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const query: MetricsQuery = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const metrics = await metricsService.getOverview(query);
      res.json({ data: metrics });
    } catch (error) {
      next(error);
    }
  },
};
