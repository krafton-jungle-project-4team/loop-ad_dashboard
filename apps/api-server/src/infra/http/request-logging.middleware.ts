import { durationMs, log } from "../logger/index.js";
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
  const path = requestLogPath(request.originalUrl ?? request.url ?? "");

  setRequestIdHeader(response, requestId);

  log.assignContext({ requestId, method, path });
  response.on("finish", () => {
    const statusCode = response.statusCode;
    const level = statusCode >= 500 ? "error" : "info";
    const outcome = statusCode < 400 ? "success" : "error";

    log[level]("http_request_completed", {
      statusCode,
      outcome,
      durationMs: durationMs(startedAt)
    });
  });

  next();
}

function requestLogPath(value: string) {
  const path = value.split("?", 1)[0] ?? "";

  return path
    .replace(
      /^\/api\/public\/v1\/sdk\/connections\/[^/]+/,
      "/api/public/v1/sdk/connections/:sdkKey"
    )
    .replace(/^\/r\/[^/]+/, "/r/:redirectId");
}
