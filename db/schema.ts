import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status_enum", [
  "SUBMITTED",
  "RUNNABLE",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
]);

export const jobStatusEnumValues = jobStatusEnum.enumValues;    
export const jobsTable = pgTable("job", {
  id: uuid().primaryKey().defaultRandom(),
  image: text().notNull(),
  cmd: text(),
  state: jobStatusEnum().default("SUBMITTED").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
