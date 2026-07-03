import { Inject, Injectable } from "@nestjs/common";
import { ZodError } from "zod";
import { logWithContext } from "../../../infra/logger/index.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import {
  EmailSender,
  type DispatchSendResult,
  SmsSender
} from "../adapters/dispatch-sender.js";
import type {
  ActiveAdServingAssignmentEntity,
  DispatchAttemptSnapshot,
  DispatchChannel
} from "../domain/index.js";
import { toEmailSendInput, toSmsSendInput } from "./dispatch-message.js";

interface AssignmentDispatchInput {
  channel: DispatchChannel;
  assignment: ActiveAdServingAssignmentEntity;
  redirectId: string;
  targetUrl: string;
}

/** assignment 1건의 Email/SMS 발송 실행을 담당합니다. */
@Injectable()
export class AssignmentDispatcher {
  constructor(
    @Inject(EmailSender)
    private readonly emailSender: EmailSender,
    @Inject(SmsSender)
    private readonly smsSender: SmsSender
  ) {}

  /** channel에 해당하는 sender provider 이름을 반환합니다. */
  providerNameFor(channel: DispatchChannel, promotionRunId: string) {
    switch (channel) {
      case "email":
        return this.emailSender.providerName;
      case "sms":
        return this.smsSender.providerName;
      default:
        return throwUnsupportedDispatchChannel(promotionRunId, channel);
    }
  }

  /** assignment 1건을 발송하고 성공/실패 attempt를 반환합니다. */
  async dispatch(input: AssignmentDispatchInput): Promise<DispatchAttemptSnapshot> {
    const { channel, assignment, redirectId } = input;
    const provider = this.providerNameFor(channel, assignment.promotionRunId);

    logDispatchAttempt(channel, provider, assignment, redirectId);

    try {
      const sendResult = await this.send(input);
      const attempt = toSentAttempt(assignment.userId, redirectId, sendResult);

      logDispatchResult(channel, sendResult.provider, assignment, attempt);

      return attempt;
    } catch (error) {
      const attempt = toFailedAttempt(assignment.userId, redirectId, getDispatchErrorCode(error));

      logDispatchResult(channel, provider, assignment, attempt, getErrorName(error));

      return attempt;
    }
  }

  private async send(input: AssignmentDispatchInput): Promise<DispatchSendResult> {
    const { channel, assignment, targetUrl } = input;

    switch (channel) {
      case "email":
        return this.emailSender.sendEmail(toEmailSendInput(assignment, targetUrl));
      case "sms":
        return this.smsSender.sendSms(toSmsSendInput(assignment, targetUrl));
      default:
        return throwUnsupportedDispatchChannel(assignment.promotionRunId, channel);
    }
  }
}

function toSentAttempt(
  userId: string,
  redirectId: string,
  sendResult: DispatchSendResult
): DispatchAttemptSnapshot {
  return {
    userId,
    redirectId,
    status: "sent",
    providerMessageId: sendResult.providerMessageId
  };
}

function toFailedAttempt(
  userId: string,
  redirectId: string,
  errorCode: string
): DispatchAttemptSnapshot {
  return {
    userId,
    redirectId,
    status: "failed",
    errorCode
  };
}

function logDispatchAttempt(
  channel: DispatchChannel,
  provider: string,
  assignment: ActiveAdServingAssignmentEntity,
  redirectId: string
) {
  logWithContext("info", "Ad dispatch send attempt", {
    channel,
    provider,
    ...dispatchLogContext(assignment),
    redirectId
  });
}

function logDispatchResult(
  channel: DispatchChannel,
  provider: string,
  assignment: ActiveAdServingAssignmentEntity,
  attempt: DispatchAttemptSnapshot,
  errorName?: string
) {
  logWithContext(attempt.status === "sent" ? "info" : "warn", "Ad dispatch send result", {
    channel,
    provider,
    ...dispatchLogContext(assignment),
    redirectId: attempt.redirectId,
    status: attempt.status,
    errorCode: attempt.errorCode,
    providerMessageId: attempt.providerMessageId,
    errorName
  });
}

function dispatchLogContext(assignment: ActiveAdServingAssignmentEntity) {
  return {
    projectId: assignment.projectId,
    campaignId: assignment.campaignId,
    promotionId: assignment.promotionId,
    promotionRunId: assignment.promotionRunId,
    adExperimentId: assignment.adExperimentId,
    segmentId: assignment.segmentId,
    contentId: assignment.contentId,
    contentOptionId: assignment.contentOptionId,
    userId: assignment.userId
  };
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function getDispatchErrorCode(error: unknown) {
  return error instanceof ZodError ? "CONTENT_INVALID" : "PROVIDER_SEND_FAILED";
}

function throwUnsupportedDispatchChannel(
  promotionRunId: string,
  channel: never
): never {
  throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, String(channel));
}
