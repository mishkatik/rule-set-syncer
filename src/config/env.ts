import { z } from 'zod';

/** Treat blank/whitespace-only env values (e.g. `TELEGRAM_TOPIC_ID=`) as unset. */
const blankToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const envSchema = z.object({
  CRON_SCHEDULE: z.string().default('0 * * * *'),
  S3_KEY_PREFIX: z.string().default(''),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('us-east-1'),

  // Telegram notifications — optional. Notifications are enabled only when both
  // the bot token and chat id are set; otherwise the syncer runs silently.
  TELEGRAM_BOT_TOKEN: z.preprocess(
    blankToUndefined,
    z.string().min(1).optional()
  ),
  TELEGRAM_CHAT_ID: z.preprocess(
    blankToUndefined,
    z.string().min(1).optional()
  ),
  /** Optional forum topic (message thread) id to post into. */
  TELEGRAM_TOPIC_ID: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().positive().optional()
  ),
});

export type Env = z.infer<typeof envSchema>;

/** Parsed and validated environment variables. Throws on startup if required vars are missing. */
export const env = envSchema.parse(Bun.env);
