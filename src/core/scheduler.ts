import { env, RULE_SOURCES } from '@config';
import { type SyncFailure, type SyncResult, syncRule } from '@core/syncer';
import { notifySync } from '@notify';
import { formatBytes, ts } from '@utils';
import cron, { type ScheduledTask } from 'node-cron';

/**
 * Runs all rule syncs in parallel, logs results in source order, and sends a
 * single Telegram summary (when configured and there is something to report).
 */
export async function syncAll(): Promise<void> {
  console.log(
    `[${ts()}] [sync] Starting sync of ${RULE_SOURCES.length} sources...`
  );
  const start = Date.now();

  const results = await Promise.allSettled(RULE_SOURCES.map(syncRule));

  const uploaded: SyncResult[] = [];
  const unchanged: SyncResult[] = [];
  const failed: SyncFailure[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const { name, s3Key, bytes, elapsedMs, skipped } = result.value;
      const mark = skipped ? '=' : '✓';
      const suffix = skipped ? '  (unchanged)' : '';
      console.log(
        `[${ts()}] [s3]  ${mark}  ${name.padEnd(20)} ${formatBytes(bytes).padStart(9)}   ${elapsedMs}ms  →  ${s3Key}${suffix}`
      );
      if (skipped) unchanged.push(result.value);
      else uploaded.push(result.value);
    } else {
      const message =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      console.error(`[${ts()}] [s3]  ✗  ${message}`);
      failed.push({ name: RULE_SOURCES[i]?.name ?? 'unknown', message });
    }
  });

  const elapsedMs = Date.now() - start;
  console.log(
    `[${ts()}] [sync] Done in ${(elapsedMs / 1000).toFixed(1)}s — ${uploaded.length} uploaded, ${unchanged.length} unchanged, ${failed.length} failed.`
  );

  await notifySync({ uploaded, unchanged, failed, elapsedMs });
}

/** Starts the cron scheduler. Returns the task handle so it can be stopped. */
export function startScheduler(): ScheduledTask {
  const schedule = env.CRON_SCHEDULE;
  console.log(`[${ts()}] [scheduler] Starting with schedule: "${schedule}"`);

  const task = cron.schedule(schedule, () => {
    syncAll().catch(err =>
      console.error(
        `[${ts()}] [scheduler] Unexpected error:`,
        err instanceof Error ? err.message : err
      )
    );
  });

  return task;
}
