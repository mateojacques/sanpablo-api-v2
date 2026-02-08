import { db } from '../../config/database.js';
import { carousels, carouselItems } from '../../db/schema/carousels.js';
import { getCategoryBySlug } from './categories.seeder.js';
import { getProductBySku } from './products.seeder.js';

export interface SeededCarousel {
  id: string;
  name: string;
  slug: string;
  type: 'manual' | 'category';
}

export async function seedCarousels(): Promise<SeededCarousel[]> {
  console.log('  Seeding carousels...');

  const createdCarousels: SeededCarousel[] = [];

  // Carousel 1: Novedades (manual) - recent products from various categories
  const novedadesCarousel = await createCarousel({
    name: 'Novedades',
    slug: 'novedades',
    description: 'Los productos más recientes de nuestra tienda',
    type: 'manual',
    sortOrder: 0,
    isActive: true,
  });

  if (novedadesCarousel) {
    createdCarousels.push(novedadesCarousel);

    // Add 4 products manually to "Novedades"
    const novedadesSkus = ['LIBRO-001', 'ARTE-001', 'MAT-001', 'LIBRO-003'];
    await addProductsToCarousel(novedadesCarousel.id, novedadesSkus);
  }

  // Carousel 2: Libros Destacados (category-based)
  const librosCategory = await getCategoryBySlug('libros');
  if (librosCategory) {
    const librosCarousel = await createCarousel({
      name: 'Libros Destacados',
      slug: 'libros-destacados',
      description: 'Nuestra selección de los mejores libros',
      type: 'category',
      categoryId: librosCategory.id,
      sortOrder: 1,
      isActive: true,
    });

    if (librosCarousel) {
      createdCarousels.push(librosCarousel);
    }
  }

  // Carousel 3: Arte Seleccionado (manual)
  const arteCarousel = await createCarousel({
    name: 'Arte Seleccionado',
    slug: 'arte-seleccionado',
    description: 'Obras de arte cuidadosamente seleccionadas',
    type: 'manual',
    sortOrder: 2,
    isActive: true,
  });

  if (arteCarousel) {
    createdCarousels.push(arteCarousel);

    // Add art products
    const arteSkus = ['ARTE-001', 'ARTE-002', 'ARTE-003', 'ARTE-004'];
    await addProductsToCarousel(arteCarousel.id, arteSkus);
  }

  console.log(`  Carousels seeded: ${createdCarousels.length} created`);
  return createdCarousels;
}

async function createCarousel(data: {
  name: string;
  slug: string;
  description?: string;
  type: 'manual' | 'category';
  categoryId?: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<SeededCarousel | null> {
  const [created] = await db
    .insert(carousels)
    .values({
      name: data.name,
      slug: data.slug,
      description: data.description,
      type: data.type,
      categoryId: data.categoryId || null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    })
    .onConflictDoNothing({ target: carousels.slug })
    .returning();

  if (created) {
    console.log(`    + Carousel: ${created.name} (${created.type})`);
    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      type: created.type,
    };
  } else {
    console.log(`    ~ Carousel already exists: ${data.name}`);
    return null;
  }
}

async function addProductsToCarousel(carouselId: string, skus: string[]): Promise<void> {
  let sortOrder = 0;

  for (const sku of skus) {
    const product = await getProductBySku(sku);
    if (!product) {
      console.log(`      ! Product not found: ${sku}`);
      continue;
    }

    try {
      await db.insert(carouselItems).values({
        carouselId,
        productId: product.id,
        sortOrder,
      });
      console.log(`      + Added product: ${sku}`);
      sortOrder++;
    } catch {
      // Product might already be in carousel
      console.log(`      ~ Product already in carousel: ${sku}`);
    }
  }
}
