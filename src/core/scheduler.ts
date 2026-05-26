import { env, RULE_SOURCES } from '@config';
import { syncRule } from '@core/syncer';
import { ts } from '@utils';
import cron, { type ScheduledTask } from 'node-cron';

/** Runs all rule syncs in parallel and logs per-source results. */
export async function syncAll(): Promise<void> {
  console.log(
    `[${ts()}] [sync] Starting sync of ${RULE_SOURCES.length} sources...`
  );
  const start = Date.now();

  const results = await Promise.allSettled(RULE_SOURCES.map(syncRule));

  let ok = 0;
  let failed = 0;

  for (const [i, result] of results.entries()) {
    const name = RULE_SOURCES[i]!.name;
    if (result.status === 'fulfilled') {
      ok++;
    } else {
      const msg =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      console.error(`[${ts()}] [sync]  ✗ ${name}: ${msg}`);
      failed++;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[${ts()}] [sync] Done in ${elapsed}s — ${ok} ok, ${failed} failed.`
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
