import { Queue } from "bullmq";

// Schdulers for Jobs
export const jobDispatchScheduler = new Queue("job_dispatcher");
