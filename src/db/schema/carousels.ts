import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { categories } from './categories.js';
import { products } from './products.js';

// Carousel type: manual products selection or category-based
export const carouselTypeEnum = pgEnum('carousel_type', ['manual', 'category']);

export const carousels = pgTable(
  'carousels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'),
    type: carouselTypeEnum('type').notNull().default('manual'),
    // For category-based carousels, reference the category
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    // Display order in the storefront (lower = appears first)
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('idx_carousels_slug').on(table.slug),
    index('idx_carousels_sort_order').on(table.sortOrder),
    index('idx_carousels_active').on(table.isActive),
    index('idx_carousels_category').on(table.categoryId),
    index('idx_carousels_type').on(table.type),
  ]
);

// For manual carousels: junction table to store selected products
export const carouselItems = pgTable(
  'carousel_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    carouselId: uuid('carousel_id')
      .references(() => carousels.id, { onDelete: 'cascade' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    // Order within the carousel
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_carousel_items_carousel').on(table.carouselId),
    index('idx_carousel_items_product').on(table.productId),
    index('idx_carousel_items_sort_order').on(table.sortOrder),
  ]
);

// Relations
export const carouselsRelations = relations(carousels, ({ one, many }) => ({
  category: one(categories, {
    fields: [carousels.categoryId],
    references: [categories.id],
  }),
  items: many(carouselItems),
}));

export const carouselItemsRelations = relations(carouselItems, ({ one }) => ({
  carousel: one(carousels, {
    fields: [carouselItems.carouselId],
    references: [carousels.id],
  }),
  product: one(products, {
    fields: [carouselItems.productId],
    references: [products.id],
  }),
}));

// Type exports
export type Carousel = typeof carousels.$inferSelect;
export type NewCarousel = typeof carousels.$inferInsert;
export type CarouselItem = typeof carouselItems.$inferSelect;
export type NewCarouselItem = typeof carouselItems.$inferInsert;
