import { db } from '../../config/database';
import { products } from '../../db/schema/products';
import { getCategoryBySlug } from './categories.seeder';

export interface SeededProduct {
  id: string;
  sku: string;
  name: string;
  categorySlug: string;
}

export async function seedProducts(): Promise<SeededProduct[]> {
  console.log('  Seeding products...');

  const createdProducts: SeededProduct[] = [];

  // Product definitions with category slugs
  const productsData = [
    // Ficción books
    {
      sku: 'LIBRO-001',
      name: 'Cien Años de Soledad',
      description:
        'La obra maestra de Gabriel García Márquez que narra la historia de la familia Buendía.',
      regularPrice: '2500.00',
      categorySlug: 'ficcion',
    },
    {
      sku: 'LIBRO-002',
      name: 'El Aleph',
      description:
        'Colección de cuentos de Jorge Luis Borges, incluyendo el famoso relato que da nombre al libro.',
      regularPrice: '1800.00',
      salePrice: '1500.00',
      categorySlug: 'ficcion',
    },
    // No-Ficción books
    {
      sku: 'LIBRO-003',
      name: 'Sapiens: De Animales a Dioses',
      description:
        'Yuval Noah Harari explora la historia de la humanidad desde los primeros humanos hasta el presente.',
      regularPrice: '3200.00',
      categorySlug: 'no-ficcion',
    },
    {
      sku: 'LIBRO-004',
      name: 'El Arte de la Guerra',
      description: 'El clásico tratado militar de Sun Tzu con aplicaciones modernas.',
      regularPrice: '1200.00',
      categorySlug: 'no-ficcion',
    },
    // Infantil books
    {
      sku: 'LIBRO-005',
      name: 'El Principito',
      description:
        'La entrañable historia de Antoine de Saint-Exupéry sobre un pequeño príncipe de otro planeta.',
      regularPrice: '1500.00',
      salePrice: '1200.00',
      categorySlug: 'infantil',
    },
    // Pinturas
    {
      sku: 'ARTE-001',
      name: 'Paisaje Patagónico - Óleo sobre lienzo',
      description:
        'Obra original de artista local. Técnica: óleo sobre lienzo. Medidas: 60x80cm.',
      regularPrice: '15000.00',
      categorySlug: 'pinturas',
    },
    {
      sku: 'ARTE-002',
      name: 'Naturaleza Muerta - Acrílico',
      description:
        'Composición clásica de frutas y flores. Técnica: acrílico sobre lienzo. Medidas: 40x50cm.',
      regularPrice: '8500.00',
      salePrice: '7200.00',
      categorySlug: 'pinturas',
    },
    // Fotografía
    {
      sku: 'ARTE-003',
      name: 'Buenos Aires Nocturno - Fotografía Fine Art',
      description:
        'Impresión giclée en papel de algodón. Edición limitada 1/50. Medidas: 50x70cm.',
      regularPrice: '4500.00',
      categorySlug: 'fotografia',
    },
    {
      sku: 'ARTE-004',
      name: 'Retrato en Blanco y Negro',
      description: 'Fotografía artística impresa en papel baritado. Medidas: 30x40cm.',
      regularPrice: '3200.00',
      categorySlug: 'fotografia',
    },
    // Pinceles
    {
      sku: 'MAT-001',
      name: 'Set de Pinceles Profesionales x12',
      description:
        'Set de 12 pinceles de pelo sintético de alta calidad. Ideales para acrílico y óleo.',
      regularPrice: '2800.00',
      salePrice: '2400.00',
      categorySlug: 'pinceles',
    },
    {
      sku: 'MAT-002',
      name: 'Pincel Redondo #8 - Pelo de Marta',
      description: 'Pincel profesional de pelo natural. Excelente retención de pintura.',
      regularPrice: '850.00',
      categorySlug: 'pinceles',
    },
    {
      sku: 'MAT-003',
      name: 'Set de Pinceles para Acuarela x6',
      description: 'Pinceles especiales para técnica de acuarela. Puntas finas y medias.',
      regularPrice: '1600.00',
      categorySlug: 'pinceles',
    },
    // Lienzos
    {
      sku: 'MAT-004',
      name: 'Lienzo Bastidor 50x70cm',
      description:
        'Lienzo de algodón preimprimado sobre bastidor de madera. Listo para pintar.',
      regularPrice: '1200.00',
      categorySlug: 'lienzos',
    },
    {
      sku: 'MAT-005',
      name: 'Lienzo Bastidor 30x40cm x3',
      description: 'Pack de 3 lienzos pequeños. Ideales para estudios y bocetos.',
      regularPrice: '1800.00',
      salePrice: '1500.00',
      categorySlug: 'lienzos',
    },
    {
      sku: 'MAT-006',
      name: 'Lienzo Bastidor Premium 80x100cm',
      description:
        'Lienzo de lino belga de primera calidad. Triple imprimación. Para obras grandes.',
      regularPrice: '4500.00',
      categorySlug: 'lienzos',
    },
  ];

  for (const productData of productsData) {
    // Get category ID
    const category = await getCategoryBySlug(productData.categorySlug);
    if (!category) {
      console.log(`    ! Category not found: ${productData.categorySlug}`);
      continue;
    }

    const [created] = await db
      .insert(products)
      .values({
        sku: productData.sku,
        name: productData.name,
        description: productData.description,
        regularPrice: productData.regularPrice,
        salePrice: productData.salePrice || null,
        categoryId: category.id,
        isActive: true,
      })
      .onConflictDoNothing({ target: products.sku })
      .returning();

    if (created) {
      createdProducts.push({
        id: created.id,
        sku: created.sku,
        name: created.name,
        categorySlug: productData.categorySlug,
      });
      console.log(`    + Product: ${created.sku} - ${created.name}`);
    } else {
      console.log(`    ~ Product already exists: ${productData.sku}`);
    }
  }

  console.log(`  Products seeded: ${createdProducts.length} created`);
  return createdProducts;
}

// Helper to get products by category slug
export async function getProductsByCategorySlug(
  categorySlug: string
): Promise<SeededProduct[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];

  const result = await db.query.products.findMany({
    where: (prod, { eq, isNull, and }) =>
      and(eq(prod.categoryId, category.id), isNull(prod.deletedAt)),
  });

  return result.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    categorySlug,
  }));
}

// Helper to get product by SKU
export async function getProductBySku(sku: string): Promise<SeededProduct | null> {
  const product = await db.query.products.findFirst({
    where: (prod, { eq }) => eq(prod.sku, sku),
  });

  if (!product) return null;

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categorySlug: '', // Would need to fetch category to get slug
  };
}
