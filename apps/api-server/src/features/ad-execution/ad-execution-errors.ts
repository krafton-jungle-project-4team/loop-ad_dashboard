import { HttpStatus } from "@nestjs/common";
import { createDomainError } from "../../app-errors.js";

export const adExecutionErrors = {
  promotionRunNotFound: (promotionRunId: string) =>
    createDomainError({
      statusCode: HttpStatus.NOT_FOUND,
      code: "PROMOTION_RUN_NOT_FOUND",
      message: `Promotion run '${promotionRunId}' was not found.`
    }),
  activeAssignmentNotFound: (promotionRunId: string) =>
    createDomainError({
      statusCode: HttpStatus.NOT_FOUND,
      code: "ACTIVE_ASSIGNMENT_NOT_FOUND",
      message: `No active assignments were found for promotion_run_id '${promotionRunId}'.`
    }),
  bannerAssignmentNotFound: (promotionRunId: string, userId: string) =>
    createDomainError({
      statusCode: HttpStatus.NOT_FOUND,
      code: "BANNER_ASSIGNMENT_NOT_FOUND",
      message: `No active onsite banner assignment was found for promotion_run_id '${promotionRunId}' and user_id '${userId}'.`
    }),
  unsupportedDispatchChannel: (promotionRunId: string, channel: string) =>
    createDomainError({
      statusCode: HttpStatus.CONFLICT,
      code: "UNSUPPORTED_DISPATCH_CHANNEL",
      message: `Promotion run '${promotionRunId}' uses channel '${channel}', but dispatch only supports email or sms.`
    }),
  inconsistentAssignment: (message: string) =>
    createDomainError({
      statusCode: HttpStatus.CONFLICT,
      code: "INCONSISTENT_AD_EXECUTION_ASSIGNMENT",
      message
    }),
  redirectNotFound: (redirectId: string) =>
    createDomainError({
      statusCode: HttpStatus.NOT_FOUND,
      code: "REDIRECT_LINK_NOT_FOUND",
      message: `Redirect link '${redirectId}' was not found.`
    }),
  redirectExpired: (redirectId: string) =>
    createDomainError({
      statusCode: HttpStatus.GONE,
      code: "REDIRECT_LINK_EXPIRED",
      message: `Redirect link '${redirectId}' has expired.`
    }),
  eventCollectorNotConfigured: () =>
    createDomainError({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "EVENT_COLLECTOR_NOT_CONFIGURED",
      message: "Event Collector URL is not configured."
    }),
  eventCollectorRejected: (statusCode: number) =>
    createDomainError({
      statusCode: HttpStatus.BAD_GATEWAY,
      code: "EVENT_COLLECTOR_REJECTED_EVENT",
      message: `Event Collector rejected the redirect click event with status ${statusCode}.`
    })
};
