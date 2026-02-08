import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const USE_DIST_SCHEMA = process.env.DRIZZLE_SCHEMA === 'dist';
const schemaBase = USE_DIST_SCHEMA ? './dist/db/schema' : './src/db/schema';
const schemaExt = USE_DIST_SCHEMA ? 'js' : 'ts';

export default defineConfig({
  schema: [
    `${schemaBase}/users.${schemaExt}`,
    `${schemaBase}/categories.${schemaExt}`,
    `${schemaBase}/products.${schemaExt}`,
    `${schemaBase}/carts.${schemaExt}`,
    `${schemaBase}/orders.${schemaExt}`,
    `${schemaBase}/import-jobs.${schemaExt}`,
    `${schemaBase}/carousels.${schemaExt}`,
  ],
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production',
  },
  verbose: true,
  strict: true,
});
