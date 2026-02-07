import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { categories } from './categories.js';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: varchar('sku', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'), // Rich text / HTML
    regularPrice: decimal('regular_price', { precision: 12, scale: 2 }).notNull(),
    salePrice: decimal('sale_price', { precision: 12, scale: 2 }),
    specialPrice: decimal('special_price', { precision: 12, scale: 2 }), // For partners
    imageUrl: varchar('image_url', { length: 500 }),
    thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
    videoUrl: varchar('video_url', { length: 500 }),
    weight: decimal('weight', { precision: 10, scale: 3 }),
    dimensionLength: decimal('dimension_length', { precision: 10, scale: 2 }),
    dimensionWidth: decimal('dimension_width', { precision: 10, scale: 2 }),
    dimensionHeight: decimal('dimension_height', { precision: 10, scale: 2 }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('idx_products_category').on(table.categoryId),
    index('idx_products_sku').on(table.sku),
    index('idx_products_active').on(table.isActive),
    index('idx_products_name').on(table.name),
  ]
);

// Relations
export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

// Type exports
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
