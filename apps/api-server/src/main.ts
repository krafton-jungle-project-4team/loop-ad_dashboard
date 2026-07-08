import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { env } from "./infra/env/env.js";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./infra/http/api-exception.filter.js";
import { ApiResponseInterceptor } from "./infra/http/api-response.interceptor.js";
import { createCorsOriginResolver } from "./infra/http/cors-origin.js";
import { RequestContextInterceptor } from "./infra/http/request-context.interceptor.js";
import { requestLoggingMiddleware } from "./infra/http/request-logging.middleware.js";
import { log } from "./infra/logger/index.js";

await bootstrap();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(requestLoggingMiddleware);
  app.enableCors({ credentials: true, origin: createCorsOriginResolver() });
  app.setGlobalPrefix("api", {
    exclude: [
      { path: "health", method: RequestMethod.GET },
      { path: "r/:redirectId", method: RequestMethod.GET }
    ]
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new RequestContextInterceptor(), new ApiResponseInterceptor());
  await app.listen(env.port, "0.0.0.0");
  log.info("api_listening", { port: env.port });
}
