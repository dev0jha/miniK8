import express from "express";

import { db } from "./db/index.ts";
import { jobsTable } from "./db/schema.ts";

const app = express();
const PORT = 8000;

app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ message: "Server is up and running" });
});

app.post("/job", async (req, res) => {
  const { image, cmd = null } = req.body;
  const insertResult = await db
    .insert(jobsTable)
    .values({ image, cmd })
    .returning({
      id: jobsTable.id,
    });
  return res.json({ jobId: insertResult[0]?.id });
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
