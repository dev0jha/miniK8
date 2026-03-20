import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const jobsTable = pgTable("job", {
  id: uuid().primaryKey().defaultRandom(),
  image: text().notNull(),
  cmd: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
