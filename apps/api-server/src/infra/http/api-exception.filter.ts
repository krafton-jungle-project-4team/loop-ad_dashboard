import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter
} from "@nestjs/common";
import { AppError } from "../../app-errors.js";
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
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(
        errorResponse({
          code: error.name,
          message: safeHttpMessage(error)
        })
      );
      return;
    }

    if (error instanceof AppError) {
      response.status(error.statusCode).json(
        errorResponse({
          code: error.code,
          message: error.message
        })
      );
      return;
    }

    console.error(error);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        code: "INTERNAL_SERVER_ERROR",
        message: "API request failed."
      })
    );
  }
}

function safeHttpMessage(error: HttpException): string {
  const response = error.getResponse();
  if (typeof response === "string") {
    return response;
  }
  if (response && typeof response === "object" && "message" in response) {
    const message = response.message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }
  return error.message;
}
