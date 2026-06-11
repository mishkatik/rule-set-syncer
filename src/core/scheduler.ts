import { env, RULE_SOURCES } from '@config';
import { syncRule } from '@core/syncer';
import { formatBytes, ts } from '@utils';
import cron, { type ScheduledTask } from 'node-cron';

/** Runs all rule syncs in parallel, then logs results in source order. */
export async function syncAll(): Promise<void> {
  console.log(
    `[${ts()}] [sync] Starting sync of ${RULE_SOURCES.length} sources...`
  );
  const start = Date.now();

  const results = await Promise.allSettled(RULE_SOURCES.map(syncRule));

  let ok = 0;
  let unchanged = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { name, s3Key, bytes, elapsedMs, skipped } = result.value;
      const mark = skipped ? '=' : '✓';
      const suffix = skipped ? '  (unchanged)' : '';
      console.log(
        `[${ts()}] [s3]  ${mark}  ${name.padEnd(20)} ${formatBytes(bytes).padStart(9)}   ${elapsedMs}ms  →  ${s3Key}${suffix}`
      );
      if (skipped) unchanged++;
      else ok++;
    } else {
      const msg =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      console.error(`[${ts()}] [s3]  ✗  ${msg}`);
      failed++;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[${ts()}] [sync] Done in ${elapsed}s — ${ok} uploaded, ${unchanged} unchanged, ${failed} failed.`
  );
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
