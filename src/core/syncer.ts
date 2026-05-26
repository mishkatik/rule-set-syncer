import type { RuleSource } from '@config';
import { env } from '@config';
import { withRetry } from '@utils';
import { S3Client } from 'bun';
import ky, { HTTPError, TimeoutError } from 'ky';

export interface SyncResult {
  name: string;
  s3Key: string;
  bytes: number;
  elapsedMs: number;
}

/** Lazily initialised S3 client using env vars. */
const s3 = new S3Client({
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  bucket: env.S3_BUCKET,
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
});

/** HTTP client with retries, timeout, and retry-on-timeout. */
const http = ky.create({
  retry: {
    limit: 3,
    methods: ['get'],
    statusCodes: [429, 500, 502, 503, 504],
    retryOnTimeout: true,
  },
  timeout: 10_000,
});

/** Downloads a rule source from upstream and uploads it to S3. Returns metadata. */
export async function syncRule(source: RuleSource): Promise<SyncResult> {
  const start = Date.now();
  let buffer: ArrayBuffer;

  try {
    buffer = await http.get(source.url).arrayBuffer();
  } catch (err) {
    if (err instanceof HTTPError) {
      throw new Error(
        `HTTP ${err.response.status} fetching "${source.name}" from ${source.url}`
      );
    }
    if (err instanceof TimeoutError) {
      throw new Error(`Timeout fetching "${source.name}" from ${source.url}`);
    }
    throw new Error(`Network error fetching "${source.name}": ${String(err)}`);
  }

  const key = env.S3_KEY_PREFIX
    ? `${env.S3_KEY_PREFIX.replace(/\/$/, '')}/${source.s3Key}`
    : source.s3Key;

  try {
    const written = await withRetry(
      () => s3.write(key, buffer),
      `S3 upload "${source.name}"`
    );
    return {
      name: source.name,
      s3Key: key,
      bytes: written,
      elapsedMs: Date.now() - start,
    };
  } catch (err) {
    throw new Error(
      `S3 upload failed for "${source.name}" → ${key}: ${String(err)}`
    );
  }
}
