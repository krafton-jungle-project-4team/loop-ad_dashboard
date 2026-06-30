import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { env } from "./infra/env/env.js";
import { ApiExceptionFilter } from "./infra/http/api-exception.filter.js";

const DASHBOARD_WEB_ORIGIN = "https://dashboard.dev.loop-ad.org";

await bootstrap();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: DASHBOARD_WEB_ORIGIN, credentials: true });
  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }]
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(env.port, "0.0.0.0");
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      service: env.serviceId,
      message: "LoopAd API listening",
      port: env.port
    })
  );
}
