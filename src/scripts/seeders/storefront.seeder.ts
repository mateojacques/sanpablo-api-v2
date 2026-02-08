import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { s3Client } from '../../config/aws';
import { env } from '../../config/env';
import type { StorefrontConfig } from '../../modules/storefront/storefront.schemas';

const CONFIG_KEY = 'storefront/config.json';

export async function seedStorefront(): Promise<void> {
  console.log('  Seeding storefront configuration...');

  const config: StorefrontConfig = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),

    branding: {
      storeName: 'San Pablo',
      tagline: 'Arte y Libros desde 1950',
      // Logo URLs would be set after uploading actual assets
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
      hero: [
        {
          id: uuidv4(),
          imageUrl:
            'https://placehold.co/1920x600/4a90d9/ffffff?text=Bienvenidos+a+San+Pablo',
          mobileImageUrl: 'https://placehold.co/800x600/4a90d9/ffffff?text=San+Pablo',
          title: 'Bienvenidos a San Pablo',
          subtitle: 'Descubrí nuestra colección de arte y libros',
          ctaText: 'Ver catálogo',
          ctaLink: '/productos',
          isActive: true,
          sortOrder: 0,
        },
      ],
      slim: [],
    },

    faq: [
      {
        id: uuidv4(),
        question: '¿Cuáles son los métodos de pago disponibles?',
        answer:
          'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), transferencia bancaria y efectivo en nuestro local.',
        sortOrder: 0,
      },
      {
        id: uuidv4(),
        question: '¿Hacen envíos a todo el país?',
        answer:
          'Sí, realizamos envíos a todo el territorio argentino a través de correo y servicios de mensajería. Los tiempos de entrega varían según la localidad.',
        sortOrder: 1,
      },
      {
        id: uuidv4(),
        question: '¿Puedo devolver un producto?',
        answer:
          'Sí, aceptamos devoluciones dentro de los 30 días de la compra, siempre que el producto esté en su estado original y con el embalaje sin abrir (para libros) o sin usar (para materiales).',
        sortOrder: 2,
      },
    ],

    contact: {
      whatsappNumber: '+5491112345678',
      email: 'contacto@sanpablo.com',
      phone: '+54 11 4567-8900',
      address: 'Av. Corrientes 1234, CABA, Argentina',
      socialLinks: {
        instagram: 'https://instagram.com/sanpablo',
        facebook: 'https://facebook.com/sanpablo',
      },
    },

    seo: {
      metaTitle: 'San Pablo - Arte y Libros',
      metaDescription:
        'Tu tienda de arte y libros favorita. Encontrá libros, pinturas, fotografías y materiales para artistas. Envíos a todo el país.',
    },

    legal: {
      termsMarkdown: '',
      lastUpdated: new Date().toISOString(),
    },
  };

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: CONFIG_KEY,
        Body: JSON.stringify(config, null, 2),
        ContentType: 'application/json',
      })
    );

    console.log(`    + Storefront config uploaded to S3: ${CONFIG_KEY}`);
    console.log(`      - Store name: ${config.branding.storeName}`);
    console.log(`      - Hero banners: ${config.banners.hero.length}`);
    console.log(`      - FAQ items: ${config.faq.length}`);
  } catch (error) {
    console.error('    ! Failed to upload storefront config to S3');
    console.error('      Make sure S3 is configured and accessible');
    throw error;
  }

  console.log('  Storefront configuration seeded');
}
