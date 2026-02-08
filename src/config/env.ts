import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables
config();

const envSchema = z
  .object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_ENDPOINT_URL: z.string().url().optional(),

  // S3
  S3_BUCKET: z.string().min(1),

  // SQS
  SQS_IMPORT_QUEUE_URL: z.string().optional(),

  // SMTP (Google Workspace)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z
    .string()
    .min(1)
    .transform((val) => {
      const trimmed = val.trim();
      // Google App Passwords are often copied in 4x4 groups separated by spaces.
      if (/^([a-z0-9]{4}\s){3}[a-z0-9]{4}$/i.test(trimmed)) {
        return trimmed.replace(/\s+/g, '');
      }
      return trimmed;
    }),
  SMTP_FROM_EMAIL: z.string().email(),

  // Store
  OWNER_EMAIL: z.string().email(),
  OWNER_WHATSAPP: z.string().min(1),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // Port 465 expects implicit TLS (secure=true). Port 587 typically uses STARTTLS (secure=false).
    if (val.SMTP_PORT === 465 && !val.SMTP_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMTP_SECURE'],
        message: 'SMTP_SECURE must be true when SMTP_PORT is 465 (implicit TLS). Use port 587 with SMTP_SECURE=false for STARTTLS.',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
