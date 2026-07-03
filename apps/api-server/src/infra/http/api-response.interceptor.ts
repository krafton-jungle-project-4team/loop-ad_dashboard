import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor
} from "@nestjs/common";
import { map, type Observable } from "rxjs";
import {
  createApiSuccess,
  ensureRequestId,
  setRequestIdHeader,
  type RequestWithRequestId,
  type ResponseWithRequestIdHeader
} from "./api-response.js";

@Injectable()
export class ApiResponseInterceptor<TData> implements NestInterceptor<
  TData,
  ReturnType<typeof createApiSuccess<TData>>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<TData>
  ): Observable<ReturnType<typeof createApiSuccess<TData>>> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithRequestId>();
    const response = http.getResponse<ResponseWithRequestIdHeader>();
    const requestId = ensureRequestId(request);

    setRequestIdHeader(response, requestId);

    if (isRedirectRoute(request)) {
      return next.handle() as Observable<ReturnType<typeof createApiSuccess<TData>>>;
    }

    return next.handle().pipe(map((data) => createApiSuccess(requestId, data)));
  }
}

function isRedirectRoute(request: RequestWithRequestId) {
  const routeRequest = request as RequestWithRequestId & {
    originalUrl?: string;
    url?: string;
  };
  const path = routeRequest.originalUrl ?? routeRequest.url;

  return typeof path === "string" && /^\/r\/[^/]+\/?$/.test(path);
}
