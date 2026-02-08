import { db } from '../../config/database.js';
import { categories } from '../../db/schema/categories.js';

export interface SeededCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export async function seedCategories(): Promise<SeededCategory[]> {
  console.log('  Seeding categories...');

  const createdCategories: SeededCategory[] = [];

  // Root categories
  const rootCategoriesData = [
    { name: 'Libros', slug: 'libros', sortOrder: 0 },
    { name: 'Arte', slug: 'arte', sortOrder: 1 },
    { name: 'Materiales', slug: 'materiales', sortOrder: 2 },
  ];

  const rootCategoryMap = new Map<string, string>();

  for (const catData of rootCategoriesData) {
    const [created] = await db
      .insert(categories)
      .values({
        name: catData.name,
        slug: catData.slug,
        sortOrder: catData.sortOrder,
        parentId: null,
      })
      .onConflictDoNothing({ target: categories.slug })
      .returning();

    if (created) {
      rootCategoryMap.set(catData.slug, created.id);
      createdCategories.push({
        id: created.id,
        name: created.name,
        slug: created.slug,
        parentId: created.parentId,
      });
      console.log(`    + Category: ${created.name}`);
    } else {
      // Fetch existing category to get its ID
      const existing = await db.query.categories.findFirst({
        where: (cat, { eq }) => eq(cat.slug, catData.slug),
      });
      if (existing) {
        rootCategoryMap.set(catData.slug, existing.id);
        console.log(`    ~ Category already exists: ${catData.name}`);
      }
    }
  }

  // Subcategories
  const subcategoriesData = [
    // Libros subcategories
    { name: 'Ficción', slug: 'ficcion', parentSlug: 'libros', sortOrder: 0 },
    { name: 'No Ficción', slug: 'no-ficcion', parentSlug: 'libros', sortOrder: 1 },
    { name: 'Infantil', slug: 'infantil', parentSlug: 'libros', sortOrder: 2 },
    // Arte subcategories
    { name: 'Pinturas', slug: 'pinturas', parentSlug: 'arte', sortOrder: 0 },
    { name: 'Fotografía', slug: 'fotografia', parentSlug: 'arte', sortOrder: 1 },
    // Materiales subcategories
    { name: 'Pinceles', slug: 'pinceles', parentSlug: 'materiales', sortOrder: 0 },
    { name: 'Lienzos', slug: 'lienzos', parentSlug: 'materiales', sortOrder: 1 },
  ];

  for (const subData of subcategoriesData) {
    const parentId = rootCategoryMap.get(subData.parentSlug);
    if (!parentId) {
      console.log(`    ! Parent not found for: ${subData.name}`);
      continue;
    }

    const [created] = await db
      .insert(categories)
      .values({
        name: subData.name,
        slug: subData.slug,
        sortOrder: subData.sortOrder,
        parentId,
      })
      .onConflictDoNothing({ target: categories.slug })
      .returning();

    if (created) {
      createdCategories.push({
        id: created.id,
        name: created.name,
        slug: created.slug,
        parentId: created.parentId,
      });
      console.log(`    + Subcategory: ${subData.parentSlug} > ${created.name}`);
    } else {
      console.log(`    ~ Subcategory already exists: ${subData.name}`);
    }
  }

  console.log(`  Categories seeded: ${createdCategories.length} created`);
  return createdCategories;
}

// Helper to get category ID by slug (for use by other seeders)
export async function getCategoryBySlug(slug: string): Promise<SeededCategory | null> {
  const category = await db.query.categories.findFirst({
    where: (cat, { eq }) => eq(cat.slug, slug),
  });

  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
  };
}
