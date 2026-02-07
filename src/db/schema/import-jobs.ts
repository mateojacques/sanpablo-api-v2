import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.js';

// Import job statuses
export const importJobStatuses = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;
export type ImportJobStatus = (typeof importJobStatuses)[number];

// Import job types
export const importJobTypes = ['csv', 'bulk_images'] as const;
export type ImportJobType = (typeof importJobTypes)[number];

export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),

    // Job type
    type: varchar('type', { length: 20 }).notNull().default('csv'),

    // File info
    filename: varchar('filename', { length: 255 }).notNull(),
    fileKey: varchar('file_key', { length: 500 }).notNull(), // S3 key
    fileSize: integer('file_size').notNull(),

    // Status tracking
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    totalRows: integer('total_rows').default(0),
    processedRows: integer('processed_rows').default(0),
    successRows: integer('success_rows').default(0),
    errorRows: integer('error_rows').default(0),

    // Error details (JSON array of errors)
    errors: text('errors'), // JSON string: [{row: number, error: string}]

    // Timing
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_import_jobs_user_id').on(table.userId),
    index('idx_import_jobs_status').on(table.status),
    index('idx_import_jobs_created_at').on(table.createdAt),
    index('idx_import_jobs_type').on(table.type),
  ]
);

// Relations
export const importJobsRelations = relations(importJobs, ({ one }) => ({
  user: one(users, {
    fields: [importJobs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type ImportJob = typeof importJobs.$inferSelect;
export type NewImportJob = typeof importJobs.$inferInsert;
