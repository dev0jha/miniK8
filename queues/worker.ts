import { Worker } from "bullmq";
import { sql } from "drizzle-orm";

import { db } from "../db/index.ts";
import { jobsTable, jobStatusEnumValues } from "../db/schema.ts";

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
      const jobIds = (await results).rows.map((e) => e.id);

      console.log(
        `[JobDispatcher]: Found ${jobIds.length} jobs in Submitted State`,jobIds
      );

      if (jobIds.length > 0) {
        console.log(
          `[JobDispatcher]: Moving ${jobIds.length} jobs to Runnable State`
        );
      }
    });
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
  }
);
