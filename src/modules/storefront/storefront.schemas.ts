import { z } from 'zod';

// ============ Storefront Config Schema ============

// Banner schema
const heroBannerSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  mobileImageUrl: z.string().url().optional(),
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  ctaText: z.string().max(50).optional(),
  ctaLink: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const slimBannerSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  link: z.string().max(500).optional(),
  position: z.enum(['top', 'bottom', 'sidebar']).default('top'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// FAQ schema
const faqItemSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(2000),
  sortOrder: z.number().int().default(0),
});

// Social links schema
const socialLinksSchema = z.object({
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
});

// Complete storefront config schema
export const storefrontConfigSchema = z.object({
  version: z.string().default('1.0'),
  lastUpdated: z.string().datetime().optional(),

  branding: z.object({
    storeName: z.string().min(1).max(100),
    tagline: z.string().max(200).optional(),
    headerLogoUrl: z.string().url().optional(),
    footerLogoUrl: z.string().url().optional(),
    faviconUrl: z.string().url().optional(),
  }),

  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
    textMuted: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
  }),

  banners: z.object({
    hero: z.array(heroBannerSchema).default([]),
    slim: z.array(slimBannerSchema).default([]),
  }),

  faq: z.array(faqItemSchema).default([]),

  contact: z.object({
    whatsappNumber: z.string().min(8).max(20),
    email: z.string().email(),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    socialLinks: socialLinksSchema.optional(),
  }),

  seo: z
    .object({
      metaTitle: z.string().max(70).optional(),
      metaDescription: z.string().max(160).optional(),
      ogImage: z.string().url().optional(),
    })
    .optional(),
});

// ============ Request Schemas ============

// Update full config
export const updateConfigBodySchema = storefrontConfigSchema;

// Update section (partial)
export const updateSectionParamSchema = z.object({
  section: z.enum(['branding', 'colors', 'banners', 'faq', 'contact', 'seo']),
});

// Branding section update
export const updateBrandingBodySchema = storefrontConfigSchema.shape.branding;

// Colors section update
export const updateColorsBodySchema = storefrontConfigSchema.shape.colors;

// Banners section update
export const updateBannersBodySchema = storefrontConfigSchema.shape.banners;

// FAQ section update
export const updateFaqBodySchema = z.object({
  faq: z.array(faqItemSchema),
});

// Contact section update
export const updateContactBodySchema = storefrontConfigSchema.shape.contact;

// SEO section update
export const updateSeoBodySchema = storefrontConfigSchema.shape.seo.unwrap();

// ============ Type Exports ============

export type StorefrontConfig = z.infer<typeof storefrontConfigSchema>;
export type HeroBanner = z.infer<typeof heroBannerSchema>;
export type SlimBanner = z.infer<typeof slimBannerSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type SocialLinks = z.infer<typeof socialLinksSchema>;

// ============ Default Config ============

export const defaultStorefrontConfig: StorefrontConfig = {
  version: '1.0',
  lastUpdated: new Date().toISOString(),
  branding: {
    storeName: 'San Pablo',
    tagline: 'Arte y Libros',
  },
  colors: {
    primary: '#4a90d9',
    secondary: '#2c5282',
    accent: '#ed8936',
    background: '#ffffff',
    text: '#1a202c',
    textMuted: '#718096',
  },
  banners: {
    hero: [],
    slim: [],
  },
  faq: [],
  contact: {
    whatsappNumber: '+5491100000000',
    email: 'contacto@sanpablo.com',
  },
  seo: {
    metaTitle: 'San Pablo - Arte y Libros',
    metaDescription: 'Tu tienda de arte y libros favorita',
  },
};
