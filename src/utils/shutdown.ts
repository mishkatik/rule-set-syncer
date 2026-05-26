import type { ScheduledTask } from 'node-cron';
import { ts } from './format';

export async function shutdown(
  task: ScheduledTask,
  signal: string
): Promise<void> {
  console.log(`[${ts()}] [main] Received ${signal}, stopping scheduler...`);
  await task.stop();
  process.exit(0);
}
