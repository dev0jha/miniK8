import { Worker } from "bullmq";
import Docker from "dockerode";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/index.ts";
import { jobsTable, jobStatusEnumValues } from "../db/schema.ts";

const isWindows = process.platform === "win32";
const docker = new Docker({
  socketPath: isWindows ? "//./pipe/docker_engine" : "/var/run/docker.sock",
});

function pullImage(image: any): Promise<void> {
  return new Promise(async (res) => {
    const stream = await docker.pull(image);
    docker.modem.followProgress(stream, () => {
      res();
    });
  });
}

export const jobDispatchWorker = new Worker(
  "job_dispatcher",
  async () => {
    console.log("[JobDispatcher]: Checking For New Submitted Jobs...");

    await db.transaction(async (tx) => {
      const stmt = sql`
        SELECT
            id
        FROM ${jobsTable}
        WHERE
             ${jobsTable.state}=${jobStatusEnumValues[0]}
        ORDER BY ${jobsTable.createdAt} ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 5
    `;
      const results = tx.execute(stmt);
      const jobIds = (await results).rows.map((e) => e.id as string);

      console.log(
        `[JobDispatcher]: Found ${jobIds.length} jobs in Submitted State`,
        jobIds
      );

      // Check the Job ready to compute {Submitted}
      if (jobIds.length > 0) {
        console.log(
          `[JobDispatcher]: Moving ${jobIds.length} jobs to Runnable State`
        );

        // there we go from{submitted} to {runnable} state
        await tx
          .update(jobsTable)
          .set({ state: "RUNNABLE" })
          .where(inArray(jobsTable.id, jobIds));
        console.log(`[JobDispatcher]: Jobs moved to Runnable State`);
      }
    });
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
    concurrency: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  }
);

export const jobCriWorker = new Worker(
  "job-cri",
  async () => {
    console.log("[jobCriWorker]: Checking For Runnable Jobs...");

    await db.transaction(async (tx) => {
      const stmt = sql`
        SELECT
            id
        FROM ${jobsTable}
        WHERE
             ${jobsTable.state}=${jobStatusEnumValues[1]}
        ORDER BY ${jobsTable.createdAt} ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    `;
      const results = tx.execute(stmt);
      const jobIds = (await results).rows.map((e) => e.id as string);

      console.log(
        `[jobCriWorker]: Found ${jobIds.length} jobs in Runnable State`,
        jobIds
      );

      for (const jobId of jobIds) {
        const [job] = await db
          .select()
          .from(jobsTable)
          .where(eq(jobsTable.id, jobId));

        try {
          const checkImageResult = await docker.listImages({
            filters: { reference: [`${job.image}:latest`] },
          });
          console.log(checkImageResult);
          if (!checkImageResult || checkImageResult.length <= 0) {
            console.log(`Pulling Image ${job.image}:latest`);
            await pullImage(`${job.image}:latest`);
            console.log(`Successfully pulled ${job.image}:latest`);
          }

          const container = await docker.createContainer({
            Image: `${job.image}:latest`,
            Tty: false,
            HostConfig: {
              AutoRemove: false,
            },
            Cmd: job.cmd ? JSON.parse(job.cmd) : undefined,
          });
          await container.start();
          console.log(`Container is UP and Running`);
          await tx
            .update(jobsTable)
            .set({ state: "RUNNING" })
            .where(eq(jobsTable.id, job.id));
          console.log(`[jobCriWorker]: Job ${job.id} state updated to RUNNING`);
        } catch (error) {
          console.error(
            `[jobCriWorker]: Failed to start container for job ${job.id}:`,
            error
          );
          await tx
            .update(jobsTable)
            .set({ state: "FAILED" })
            .where(eq(jobsTable.id, job.id));
        }
      }
    });
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
    concurrency: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  }
);
