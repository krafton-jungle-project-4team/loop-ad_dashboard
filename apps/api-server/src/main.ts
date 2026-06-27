import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { env } from "./infra/env/env.js";
import { ApiExceptionFilter } from "./infra/http/api-exception.filter.js";

await bootstrap();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: env.webOrigins, credentials: true });
  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }]
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(env.port, "0.0.0.0");
  console.log(`LoopAd API listening on 0.0.0.0:${env.port}`);
}
