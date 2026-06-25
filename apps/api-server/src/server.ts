import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { ensureClickHouse, ensurePostgres } from "./db/schema.js";
import { dashboardRoutes } from "./routes/dashboard-routes.js";
import { seedClickHouse } from "./seeds/seed-clickhouse.js";
import { errorResponse } from "./utils/http.js";

export async function startServer() {
  await ensurePostgres();
  await ensureClickHouse();
  await seedClickHouse();

  const app = express();
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());
  app.use("/api", dashboardRoutes());
  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      next: express.NextFunction
    ) => {
      void next;
      response.status(500).json(errorResponse(error));
    }
  );
  app.listen(env.port, () => console.log(`LoopAd API listening on ${env.port}`));
}
