import { Router } from 'express';
import { storefrontController } from './storefront.controller';
import { validateRequest } from '../../shared/middleware/validate-request';
import { requireAuth, requireAdmin } from '../auth/auth.middleware';
import { imageUpload } from '../../shared/middleware/upload';
import { uploadLimiter } from '../../shared/middleware/rate-limiter';
import {
  updateConfigBodySchema,
  updateBrandingBodySchema,
  updateColorsBodySchema,
  updateBannersBodySchema,
  updateFaqBodySchema,
  updateContactBodySchema,
  updateSeoBodySchema,
  updateLegalBodySchema,
} from './storefront.schemas';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Storefront
 *   description: Storefront configuration and customization
 */

/**
 * @swagger
 * /api/storefront/config:
 *   get:
 *     summary: Get storefront configuration
 *     description: Returns the current storefront configuration (public endpoint)
 *     tags: [Storefront]
 *     responses:
 *       200:
 *         description: Storefront configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/StorefrontConfig'
 */
router.get('/config', storefrontController.getConfig);

/**
 * @swagger
 * /api/storefront/config:
 *   put:
 *     summary: Update full storefront configuration
 *     description: Replace the entire storefront configuration. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StorefrontConfig'
 *     responses:
 *       200:
 *         description: Updated configuration
 *       403:
 *         description: Admin access required
 */
router.put(
  '/config',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateConfigBodySchema }),
  storefrontController.updateConfig
);

/**
 * @swagger
 * /api/storefront/config/branding:
 *   patch:
 *     summary: Update branding section
 *     description: Update only the branding section of the config. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *               tagline:
 *                 type: string
 *               headerLogoUrl:
 *                 type: string
 *               footerLogoUrl:
 *                 type: string
 *               faviconUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.patch(
  '/config/branding',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateBrandingBodySchema }),
  storefrontController.updateBranding
);

/**
 * @swagger
 * /api/storefront/config/colors:
 *   patch:
 *     summary: Update colors section
 *     description: Update the color scheme. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               primary:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               secondary:
 *                 type: string
 *               accent:
 *                 type: string
 *               background:
 *                 type: string
 *               text:
 *                 type: string
 *               textMuted:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.patch(
  '/config/colors',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateColorsBodySchema }),
  storefrontController.updateColors
);

/**
 * @swagger
 * /api/storefront/config/banners:
 *   patch:
 *     summary: Update banners section
 *     description: Update hero and slim banners. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hero:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                     mobileImageUrl:
 *                       type: string
 *                     title:
 *                       type: string
 *                     subtitle:
 *                       type: string
 *                     ctaText:
 *                       type: string
 *                     ctaLink:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *               slim:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                     link:
 *                       type: string
 *                     position:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.patch(
  '/config/banners',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateBannersBodySchema }),
  storefrontController.updateBanners
);

/**
 * @swagger
 * /api/storefront/config/faq:
 *   patch:
 *     summary: Update FAQ section
 *     description: Update FAQ items. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               faq:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     question:
 *                       type: string
 *                     answer:
 *                       type: string
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.patch(
  '/config/faq',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateFaqBodySchema }),
  storefrontController.updateFaq
);

/**
 * @swagger
 * /api/storefront/config/contact:
 *   patch:
 *     summary: Update contact section
 *     description: Update contact information. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               whatsappNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               socialLinks:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.patch(
  '/config/contact',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateContactBodySchema }),
  storefrontController.updateContact
);

/**
 * @swagger
 * /api/storefront/config/seo:
 *   patch:
 *     summary: Update SEO section
 *     description: Update SEO metadata. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metaTitle:
 *                 type: string
 *                 maxLength: 70
 *               metaDescription:
 *                 type: string
 *                 maxLength: 160
 *               ogImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.patch(
  '/config/seo',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateSeoBodySchema }),
  storefrontController.updateSeo
);

/**
 * @swagger
 * /api/storefront/config/legal:
 *   patch:
 *     summary: Update legal section
 *     description: Update terms & conditions markdown. Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               termsMarkdown:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.patch(
  '/config/legal',
  requireAuth,
  requireAdmin,
  validateRequest({ body: updateLegalBodySchema }),
  storefrontController.updateLegal
);

/**
 * @swagger
 * /api/storefront/upload:
 *   post:
 *     summary: Upload storefront asset
 *     description: Upload an image for use in storefront (logos, banners). Admin only.
 *     tags: [Storefront]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Asset uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     contentType:
 *                       type: string
 *       400:
 *         description: Invalid file type
 */
router.post(
  '/upload',
  requireAuth,
  requireAdmin,
  uploadLimiter,
  imageUpload.single('file'),
  storefrontController.uploadAsset
);

/**
 * @swagger
 * components:
 *   schemas:
 *     StorefrontConfig:
 *       type: object
 *       properties:
 *         version:
 *           type: string
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *         branding:
 *           type: object
 *           properties:
 *             storeName:
 *               type: string
 *             tagline:
 *               type: string
 *             headerLogoUrl:
 *               type: string
 *             footerLogoUrl:
 *               type: string
 *             faviconUrl:
 *               type: string
 *         colors:
 *           type: object
 *           properties:
 *             primary:
 *               type: string
 *             secondary:
 *               type: string
 *             accent:
 *               type: string
 *             background:
 *               type: string
 *             text:
 *               type: string
 *             textMuted:
 *               type: string
 *         banners:
 *           type: object
 *           properties:
 *             hero:
 *               type: array
 *               items:
 *                 type: object
 *             slim:
 *               type: array
 *               items:
 *                 type: object
 *         faq:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *         contact:
 *           type: object
 *           properties:
 *             whatsappNumber:
 *               type: string
 *             email:
 *               type: string
 *             phone:
 *               type: string
 *             address:
 *               type: string
 *             socialLinks:
 *               type: object
 *         seo:
 *           type: object
 *           properties:
 *             metaTitle:
 *               type: string
 *             metaDescription:
 *               type: string
 *             ogImage:
 *               type: string
 *         legal:
 *           type: object
 *           properties:
 *             termsMarkdown:
 *               type: string
 *             lastUpdated:
 *               type: string
 *               format: date-time
 */

export default router;
