import { startScheduler, syncAll } from '@core';
import { EXIT_SIGNALS, shutdown } from '@utils';

await syncAll();
const task = startScheduler();

for (const signal of EXIT_SIGNALS) {
  process.on(signal, () => shutdown(task, signal));
}
