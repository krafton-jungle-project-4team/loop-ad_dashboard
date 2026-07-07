import { dms, log } from "../logger/index.js";
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

  log.assignContext({ requestId, method, path });
  response.on("finish", () => {
    const statusCode = response.statusCode;
    const level = statusCode >= 500 ? "error" : "info";
    const outcome = statusCode < 400 ? "success" : "error";
    const durationMs = dms(startedAt);

    log[level]("http_request_completed", { statusCode, outcome, durationMs });
  });

  next();
}
