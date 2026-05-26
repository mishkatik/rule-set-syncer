/** Returns current time as [HH:MM:SS] */
export const ts = () => new Date().toTimeString().slice(0, 8);

/** Formats a byte count into a human-readable string (B / KB / MB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Retries an async operation up to `limit` times, with exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  limit = 3,
  baseDelayMs = 300
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= limit; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < limit) {
        const delay = baseDelayMs * 2 ** (attempt - 1);
        console.warn(
          `[${ts()}] [retry] ${label} — attempt ${attempt}/${limit} failed: ${msg}. Retrying in ${delay}ms...`
        );
        await Bun.sleep(delay);
      }
    }
  }
  throw lastError;
}
