import type { Request, Response, NextFunction } from 'express';
import { storefrontService } from './storefront.service.js';
import type { StorefrontConfig } from './storefront.schemas.js';

export const storefrontController = {
  /**
   * Get storefront configuration
   * GET /api/storefront/config
   */
  async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await storefrontService.getConfig();
      res.json({ data: config });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update full storefront configuration
   * PUT /api/storefront/config
   */
  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config: StorefrontConfig = req.body;
      const updated = await storefrontService.updateConfig(config);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update branding section
   * PATCH /api/storefront/config/branding
   */
  async updateBranding(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await storefrontService.updateSection('branding', req.body);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update colors section
   * PATCH /api/storefront/config/colors
   */
  async updateColors(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await storefrontService.updateSection('colors', req.body);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update banners section
   * PATCH /api/storefront/config/banners
   */
  async updateBanners(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await storefrontService.updateSection('banners', req.body);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update FAQ section
   * PATCH /api/storefront/config/faq
   */
  async updateFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await storefrontService.updateSection('faq', req.body.faq);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update contact section
   * PATCH /api/storefront/config/contact
   */
  async updateContact(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await storefrontService.updateSection('contact', req.body);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update SEO section
   * PATCH /api/storefront/config/seo
   */
  async updateSeo(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await storefrontService.updateSection('seo', req.body);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update legal section
   * PATCH /api/storefront/config/legal
   */
  async updateLegal(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await storefrontService.updateSection('legal', {
        termsMarkdown: req.body.termsMarkdown,
      });
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload storefront asset
   * POST /api/storefront/upload
   */
  async uploadAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'File is required',
          },
        });
      }

      const url = await storefrontService.uploadAsset(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      res.status(201).json({
        data: {
          url,
          filename: file.originalname,
          size: file.size,
          contentType: file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
