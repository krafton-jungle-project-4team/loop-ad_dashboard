import { assignLoggerContext, logWithContext, runWithLoggerContext } from "../logger/index.js";
import {
  ensureRequestId,
  setRequestIdHeader,
  type RequestWithRequestId,
  type ResponseWithRequestIdHeader
} from "./api-response.js";

type HttpRequest = RequestWithRequestId & {
  method?: string;
  originalUrl?: string;
  url?: string;
};

type HttpResponse = ResponseWithRequestIdHeader & {
  statusCode: number;
  on: (event: "finish", listener: () => void) => void;
};

type NextFunction = () => void;

export function requestLoggingMiddleware(
  request: HttpRequest,
  response: HttpResponse,
  next: NextFunction
) {
  const startedAt = Date.now();
  const requestId = ensureRequestId(request);
  const method = request.method ?? "REQUEST";
  const path = request.originalUrl ?? request.url ?? "";

  setRequestIdHeader(response, requestId);

  runWithLoggerContext({ requestId, method, path }, () => {
    assignLoggerContext({ requestId, method, path });
    response.on("finish", () => {
      const statusCode = response.statusCode;
      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

      logWithContext(level, "HTTP request completed", {
        statusCode,
        durationMs: Date.now() - startedAt
      });
    });

    next();
  });
}
