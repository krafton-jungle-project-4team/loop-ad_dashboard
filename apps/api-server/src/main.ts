import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { seedClickHouse } from "./features/dashboard/seed/seed-clickhouse.js";
import { ensureClickHouse, ensurePostgres } from "./infra/database/schema.js";
import { env } from "./infra/env/env.js";
import { ApiExceptionFilter } from "./infra/http/api-exception.filter.js";

await bootstrap();

async function bootstrap() {
  await ensurePostgres();
  await ensureClickHouse();
  await seedClickHouse();

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: env.webOrigin, credentials: true });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(env.port);
  console.log(`LoopAd API listening on ${env.port}`);
}
