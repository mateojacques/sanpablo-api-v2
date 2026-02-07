import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/db/schema/users.ts',
    './src/db/schema/categories.ts',
    './src/db/schema/products.ts',
    './src/db/schema/carts.ts',
    './src/db/schema/orders.ts',
    './src/db/schema/import-jobs.ts',
    './src/db/schema/carousels.ts',
  ],
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
