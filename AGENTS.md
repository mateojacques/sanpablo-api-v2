# AGENTS.md - Coding Agent Instructions

## Project Overview

API backend for an art store/bookstore built with Node.js, Express, TypeScript, Drizzle ORM, and AWS services (S3, SQS). Email is sent over SMTP.

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **Auth**: JWT (simple with expiration)
- **Storage**: AWS S3
- **Queue**: AWS SQS
- **Email**: SMTP via nodemailer (Google Workspace / Gmail by default)
- **Docs**: Swagger/OpenAPI

## Build/Run Commands

```bash
npm install              # Install dependencies
npm run dev              # Development server with hot reload
npm run build            # Build for production
npm start                # Start production server
npm run typecheck        # Type checking
npm run lint             # Linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run format:check     # Check formatting
npm run db:generate      # Generate migrations from schema
npm run db:migrate       # Run pending migrations
npm run db:push          # Push schema directly (dev only)
npm run db:studio        # Open Drizzle Studio
npm test                           # Run all tests
npm test -- path/to/file.test.ts   # Run single test file
npm test -- -t "pattern"           # Run tests whose name matches pattern
npm run test:watch                 # Run tests in watch mode
```

## Project Structure

```
src/
├── config/           # App configuration (env, database, aws, email, swagger)
├── db/schema/        # Drizzle table definitions
├── db/migrations/    # Auto-generated migrations
├── modules/[name]/   # Feature modules with controller, service, routes, schemas
├── shared/middleware/  # Express middleware
├── shared/utils/     # Utility functions
├── shared/types/     # Shared TypeScript types
├── workers/          # SQS worker processes
├── app.ts            # Express app setup
└── server.ts         # Entry point
```

## Code Style Guidelines

### Naming Conventions
- Files: kebab-case (`auth.controller.ts`, `csv-import.worker.ts`)
- Variables/functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case`
- Test files: `*.test.ts` or `*.spec.ts`

### Imports Order
1. Node.js built-in modules
2. External dependencies
3. Internal modules (relative paths ending in `.js`, e.g. `'../../config/env.js'` — the project is ESM compiled by plain `tsc`, which doesn't rewrite `@/` aliases, so they break in `dist/`)
4. Types (use `type` imports)

### TypeScript
- Strict mode enabled, avoid `any` - use `unknown` and type guards
- Prefer interfaces for objects, types for unions/primitives
- Export inferred types from Zod schemas: `type X = z.infer<typeof xSchema>`

### Controllers Pattern
```typescript
export const productController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productService.list(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
```

### Error Handling
- Use custom `AppError` class: `throw new AppError(404, 'PRODUCT_NOT_FOUND', 'msg')`
- Error codes should be `UPPER_SNAKE_CASE`
- Let unexpected errors bubble up to global handler
- Never swallow errors silently

### Database (Drizzle)
- Define schemas in `src/db/schema/`
- Use UUID for primary keys
- Include `createdAt`, `updatedAt` on all tables
- Use `deletedAt` for soft deletes
- Use transactions for multi-table operations

```typescript
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
```

### Validation (Zod)
- Define schemas in `[module].schemas.ts`
- Use middleware for request validation
- Coerce types for query params: `z.coerce.number().int().positive().default(1)`

### API Response Format
```typescript
{ "data": { ... } }                                    // Single item
{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }  // List
{ "error": { "code": "ERROR_CODE", "message": "..." } }  // Error
```

### Security Rules
- Never log sensitive data (passwords, tokens)
- Sanitize HTML input with allowlist
- Validate file uploads (type, size)
- Use parameterized queries (Drizzle handles this)
- Rate limit auth endpoints aggressively

### Comments
- Avoid obvious comments, document "why" not "what"
- Use JSDoc for public service functions

## Environment Variables

Required env vars validated at startup with Zod in `src/config/env.ts`. See `.env.example`.

## Common Patterns

### Soft Delete
```typescript
db.select().from(products).where(isNull(products.deletedAt));
```

### Pagination
```typescript
const offset = (page - 1) * limit;
const items = await db.select().from(products).limit(limit).offset(offset);
```

### Auth Middleware
```typescript
router.get('/me', requireAuth, controller.getProfile);
router.post('/products', requireAuth, requireRoles(['owner', 'admin']), controller.create);
```

### DBF Imports
The customer's Visual FoxPro stock table is parsed only here, in `src/modules/imports/dbf/` (`dbf-reader.ts` reads the file, `stock-mapping.ts` maps it to the import CSV, `dbf-to-csv.ts` writes the CSV). Read text with `decodeCp1252` (`cp1252.ts`), not `TextDecoder('windows-1252')`: Node 20 decodes bytes 0x80–0x9F wrong.

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/imports/dbf` | admin | Upload a `.dbf` (multipart `file`, max 100MB). Converts it to the import CSV and creates a regular CSV job → `201 { data: ImportJob }` |
| `POST /api/imports/dbf/csv?format=api\|raw` | admin | Convert without importing. Returns `text/csv` with `Content-Disposition` and `X-Row-Count` |
| `GET /api/imports/:id/file` | owner of the job or admin | Download the file a job imported (the generated CSV, or the bulk-images JSON) |

Errors: `400` `FILE_REQUIRED`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `INVALID_DBF`, `UNSUPPORTED_CODE_PAGE`, `DBF_MISSING_FIELDS` (with `details.missing`); `404 IMPORT_JOB_NOT_FOUND`.
