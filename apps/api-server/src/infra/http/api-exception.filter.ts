import { Catch, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { errorResponse } from "./api-response.js";

type JsonResponse = {
  status(code: number): {
    json(body: unknown): void;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    response.status(500).json(errorResponse(error));
  }
}
