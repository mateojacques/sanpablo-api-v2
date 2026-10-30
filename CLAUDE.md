# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` holds the coding conventions (naming, imports, controller pattern, error handling, response format, security rules). Follow it.

## Commands

```bash
npm run dev              # API with hot reload (tsx watch src/server.ts)
npm run dev:worker       # SQS import worker with hot reload
npm run typecheck        # tsc --noEmit
npm run lint             # eslint src --ext .ts
npm run format:check     # prettier
npm test                 # vitest run (no test files exist yet)
npx vitest run path/to/file.test.ts   # single test file
npx vitest run -t "pattern"           # tests by name

npm run db:generate      # migrations from src/db/schema
npm run db:generate:dist # build first, then generate from compiled dist/db/schema
npm run db:migrate
npm run db:seed          # seed example data (skips existing); db:seed:clean wipes first
```

Local infra: `docker compose -f docker/docker-compose.yml up` starts Postgres 16, Redis, LocalStack (S3/SQS/SES, set up by `docker/localstack-init.sh`) and the import worker. Copy `.env.example` to `.env`. `src/config/env.ts` validates env with Zod and calls `process.exit(1)` if anything is invalid, so SMTP_*, OWNER_EMAIL, OWNER_WHATSAPP and a JWT_SECRET of 32+ chars must be set even to run scripts.

## Gotchas

- **Imports**: every internal import is a relative path ending in `.js`. `tsconfig.json` still defines an `@/` alias, but don't use it: plain `tsc` doesn't rewrite it, so the compiled `dist/` breaks at runtime.
- **Email** is sent over SMTP with nodemailer (`src/config/email.ts`, `src/shared/utils/email.ts`). LocalStack runs SES, but the code never uses it.
- **API docs** are served at `/api/docs` (swagger-ui), with the generated spec at `/api/docs.json`. They are built from `@openapi` JSDoc blocks in `src/modules/**/*.routes.ts` and `*.schemas.ts`, so new endpoints need such a block. There's also a separate static `openapi-spec.json` at the repo root, served at `/api/openapi.json` for the frontend. No script regenerates it.

## Architecture

- `src/app.ts` builds the Express app (helmet, cors, global `apiLimiter` on `/api`, JSON body limit 10mb) and mounts each module's router at `/api/<module>`. `src/server.ts` starts the server and shuts it down gracefully (it closes the postgres-js pool).
- **Modules** (`src/modules/<name>/`): `*.routes.ts` wires `validateRequest({ body, query, params })`, auth middleware and the controller. `validateRequest` replaces `req.body/query/params` with the parsed Zod output, so controllers get coerced values with defaults applied. Services hold all DB/AWS logic and are exported as object literals (`productsService = { async list() {...} }`).
- **Auth** (`modules/auth/auth.middleware.ts`): `requireAuth`, `optionalAuth` (ignores invalid tokens), `requireRoles([...])`, `requireAdmin` (owner+admin), `requireOwner`. Roles: `owner | admin | buyer | partner`. Handlers read the user through a cast to `AuthenticatedRequest` (`src/shared/types`).
- **Errors**: throw `AppError` or the factories in `shared/utils/errors.ts` (`notFound`, `badRequest`, `conflict`, `forbidden`, …). `shared/middleware/error-handler.ts` turns them into `{ error: { code, message, details? } }`. Zod failures become `VALIDATION_ERROR` with `details`.
- **Database**: `db` (Drizzle over postgres-js, with the full schema loaded so `db.query.*` works) lives in `src/config/database.ts` and is re-exported from `src/db/index.ts`. **A new schema file must be added in two places**: `src/db/schema/index.ts` *and* the explicit file list in `drizzle.config.ts`. Otherwise drizzle-kit won't generate a migration for it. Checkout creates orders inside `db.transaction`.
- **Storefront config is not in Postgres**. It's a single JSON document at S3 key `storefront/config.json`, validated by `storefrontConfigSchema`, and the code falls back to `defaultStorefrontConfig` when it's missing. Changes to its shape (e.g. social links) go in `storefront.schemas.ts`, not in a migration.
- **Async imports**: `imports` uploads a CSV (or a JSON manifest for bulk images) to S3, inserts an `import_jobs` row and sends `{ jobId, fileKey, type }` to SQS. `src/workers/import-worker.ts` is a separate process. It long-polls SQS, looks up the job, and calls `importsService.processImportJob` or `processBulkImagesJob`, then deletes the message only on success (failures are retried after the 5-minute visibility timeout). It has its own Dockerfile (`docker/Dockerfile.worker`).
- `AWS_ENDPOINT_URL` points the S3/SQS clients (`src/config/aws.ts`) at LocalStack in development.
- **Customer DBF table**: `stock/stockWeb.DBF` (gitignored, never commit it) is the source of truth for the customer's Visual FoxPro product table. `src/scripts/import-products/STOCK_DBF.md` documents its fields, the mapping to the import CSV and known data quirks. Where older docs or code comments disagree with it, the DBF wins. The conversion to the import CSV (see `example.csv`) lives in `src/modules/imports/dbf/`; `npm run dbf:export` runs it locally.
