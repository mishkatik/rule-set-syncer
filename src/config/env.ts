import { z } from 'zod';

const envSchema = z.object({
  CRON_SCHEDULE: z.string().default('0 * * * *'),
  S3_KEY_PREFIX: z.string().default(''),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('us-east-1'),
});

export type Env = z.infer<typeof envSchema>;

/** Parsed and validated environment variables. Throws on startup if required vars are missing. */
export const env = envSchema.parse(Bun.env);
