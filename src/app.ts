import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { env, swaggerSpec } from './config/index.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { errorHandler, apiLimiter } from './shared/middleware/index.js';

// Import routes (will be added as modules are implemented)
import authRoutes from './modules/auth/auth.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import productsRoutes from './modules/products/products.routes';
import cartRoutes from './modules/cart/cart.routes';
import checkoutRoutes from './modules/checkout/checkout.routes';
import ordersRoutes from './modules/orders/orders.routes';
import storefrontRoutes from './modules/storefront/storefront.routes';
import importsRoutes from './modules/imports/imports.routes';
import carouselsRoutes from './modules/carousels/carousels.routes';
import metricsRoutes from './modules/metrics/metrics.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
app.use('/api', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// OpenAPI spec file (static JSON for frontend integration)
app.get('/api/openapi.json', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'openapi-spec.json'));
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/imports', importsRoutes);
app.use('/api/carousels', carouselsRoutes);
app.use('/api/metrics', metricsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Global error handler
app.use(errorHandler);

export default app;
