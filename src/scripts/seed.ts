/**
 * Database Seed Script
 *
 * Usage:
 *   npm run db:seed        # Seed database (skip existing records)
 *   npm run db:seed:clean  # Clean and seed database
 *
 * This script seeds the database with example data:
 * - Users (owner, admin, buyers, partner)
 * - Categories (tree structure)
 * - Products (books, art, materials)
 * - Carousels (manual and category-based)
 * - Storefront configuration (S3)
 */

import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../config/database';
import {
  seedUsers,
  seedCategories,
  seedProducts,
  seedCarousels,
  seedStorefront,
} from './seeders/index';

// Parse CLI arguments
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');

async function cleanDatabase(): Promise<void> {
  console.log('\n  Cleaning database...');

  // Order matters due to foreign key constraints
  const tables = [
    'carousel_items',
    'carousels',
    'cart_items',
    'carts',
    'order_items',
    'orders',
    'products',
    'categories',
    'import_jobs',
    'users',
  ];

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
      console.log(`    - Truncated: ${table}`);
    } catch {
      // Table might not exist yet
      console.log(`    ~ Skipped: ${table} (may not exist)`);
    }
  }

  console.log('  Database cleaned\n');
}

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('       SAN PABLO - DATABASE SEED');
  console.log('========================================\n');

  const startTime = Date.now();

  try {
    // Clean database if --clean flag is present
    if (shouldClean) {
      await cleanDatabase();
    }

    // Run seeders in order (respecting dependencies)
    console.log('Starting seed process...\n');

    // 1. Users (no dependencies)
    await seedUsers();
    console.log('');

    // 2. Categories (no dependencies)
    await seedCategories();
    console.log('');

    // 3. Products (depends on categories)
    await seedProducts();
    console.log('');

    // 4. Carousels (depends on categories and products)
    await seedCarousels();
    console.log('');

    // 5. Storefront config (S3, no DB dependencies)
    try {
      await seedStorefront();
    } catch {
      console.log('  ! Storefront seeding failed (S3 may not be configured)');
      console.log('    Run with S3 configured to seed storefront config\n');
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    console.log('           SEED COMPLETED');
    console.log('========================================');
    console.log(`  Time elapsed: ${elapsed}s`);
    console.log('');
    console.log('  Default credentials:');
    console.log('    Email: admin@sanpablo.com');
    console.log('    Password: Test123123!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('           SEED FAILED');
    console.error('========================================');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

// Run
main();
