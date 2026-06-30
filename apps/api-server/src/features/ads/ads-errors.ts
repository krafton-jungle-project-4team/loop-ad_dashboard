import { HttpStatus } from "@nestjs/common";
import { createDomainError } from "../../app-errors.js";

export const adsErrors = {
  projectNotFound: (projectId: string) =>
    createDomainError({
      statusCode: HttpStatus.NOT_FOUND,
      code: "ADS_PROJECT_NOT_FOUND",
      message: `Project '${projectId}' was not found.`
    })
};
