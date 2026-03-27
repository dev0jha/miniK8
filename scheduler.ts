import { jobCriScheduler, jobDispatchScheduler } from "./queues/queues.ts";
import { jobCriWorker, jobDispatchWorker } from "./queues/worker.ts";

async function init() {
  await Promise.all([
    jobDispatchScheduler.upsertJobScheduler("job_dispatcher-schedulers", {
      every: 2 * 1000,
    }),
    jobCriScheduler.upsertJobScheduler("job_cri_scheduler", {
      every: 5 * 1000,
    }),
  ]);
}

init().catch((error) => {
  console.error("[Scheduler]: Failed to initialize:", error);
  process.exit(1);
});
