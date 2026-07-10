import { z, ZodError } from "zod";
import { log } from "../../../infra/logger/index.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import { HtmlArtifactReader } from "../adapters/artifact-reader.js";
import {
  EmailSender,
  type DispatchSendResult,
  type EmailSendInput,
  SmsSender,
  type SmsSendInput
} from "../adapters/dispatch-sender.js";
import {
  creativeArtifact,
  type ActiveAdServingAssignmentEntity,
  type DispatchChannel
} from "../domain/index.js";

const requiredContentTextSchema = z.string().min(1);
const emailAddressSchema = z.string().trim().email();
const e164PhoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{1,14}$/);
const emailContentSchema = z.object({
  subject: requiredContentTextSchema,
  preheader: z.string().nullable(),
  body: requiredContentTextSchema,
  cta: z.string().nullable()
});
const smsContentSchema = z.object({ message: requiredContentTextSchema });

type DispatchFailureCode =
  | "ARTIFACT_FAILED"
  | "ARTIFACT_NOT_READY"
  | "CONTENT_INVALID"
  | "RECIPIENT_CONTACT_INVALID";

export class PromotionChannelExecutor {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly smsSender: SmsSender,
    private readonly artifactReader: HtmlArtifactReader
  ) {}

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

  async send(input: {
    assignment: ActiveAdServingAssignmentEntity;
    channel: DispatchChannel;
    contact: string;
    openPixelUrl: string;
    targetUrl: string;
  }): Promise<DispatchSendResult> {
    switch (input.channel) {
      case "email": {
        const sendInput = await this.toEmailSendInput(
          input.assignment,
          input.targetUrl,
          input.contact,
          input.openPixelUrl
        );
        log.info("send_input_prepared", {
          assignment: input.assignment,
          channel: input.channel,
          input: sendInput
        });
        return this.emailSender.sendEmail(sendInput);
      }
      case "sms": {
        const sendInput = toSmsSendInput(input.assignment, input.targetUrl, input.contact);
        log.info("send_input_prepared", {
          assignment: input.assignment,
          channel: input.channel,
          input: sendInput
        });
        return this.smsSender.sendSms(sendInput);
      }
      default:
        return throwUnsupportedDispatchChannel(input.assignment.promotionRunId, input.channel);
    }
  }

  private async toEmailSendInput(
    assignment: ActiveAdServingAssignmentEntity,
    targetUrl: string,
    recipient: string,
    openPixelUrl: string
  ): Promise<EmailSendInput> {
    const content = emailContentSchema.parse(assignment);
    const artifact = creativeArtifact(assignment);

    if (!artifact || artifact.creative_format !== "email_html") {
      return throwDispatchFailure("CONTENT_INVALID");
    }
    if (artifact.artifact_status === "pending") {
      return throwDispatchFailure("ARTIFACT_NOT_READY");
    }
    if (artifact.artifact_status === "failed") {
      return throwDispatchFailure("ARTIFACT_FAILED");
    }
    if (artifact.artifact_status !== "published" || !artifact.public_url) {
      return throwDispatchFailure("CONTENT_INVALID");
    }

    const template = await this.artifactReader.readHtml(artifact);
    const htmlBody = fillEmailPlaceholders(template, {
      openPixelUrl,
      redirectUrl: targetUrl
    });
    const textBody = [content.preheader, content.body, ctaLine(content.cta, targetUrl)]
      .filter(Boolean)
      .join("\n\n");

    return {
      recipient,
      subject: content.subject,
      htmlBody,
      textBody,
      redirectUrl: targetUrl,
      openPixelUrl
    };
  }
}

export function requireValidEmailContact(value: string): string {
  const result = emailAddressSchema.safeParse(value);
  return result.success ? result.data : throwDispatchFailure("RECIPIENT_CONTACT_INVALID");
}

export function requireValidSmsContact(value: string): string {
  const result = e164PhoneNumberSchema.safeParse(value);
  return result.success ? result.data : throwDispatchFailure("RECIPIENT_CONTACT_INVALID");
}

export function getDispatchErrorCode(error: unknown) {
  if (error instanceof DispatchFailureError) {
    return error.code;
  }
  return error instanceof ZodError ? "CONTENT_INVALID" : "PROVIDER_SEND_FAILED";
}

function toSmsSendInput(
  assignment: ActiveAdServingAssignmentEntity,
  targetUrl: string,
  recipient: string
): SmsSendInput {
  const content = smsContentSchema.parse(assignment);
  const body = content.message.includes("{{redirect_url}}")
    ? content.message.replaceAll("{{redirect_url}}", targetUrl)
    : [content.message, targetUrl].join(" ");
  return { recipient, body, redirectUrl: targetUrl };
}

function ctaLine(cta: string | null, targetUrl: string) {
  return cta ? `${cta}: ${targetUrl}` : targetUrl;
}

function fillEmailPlaceholders(
  template: string,
  replacements: { redirectUrl: string; openPixelUrl: string }
) {
  const htmlBody = template
    .replaceAll("{{redirect_url}}", replacements.redirectUrl)
    .replaceAll("{{open_pixel_url}}", replacements.openPixelUrl);

  if (htmlBody.includes("{{redirect_url}}") || htmlBody.includes("{{open_pixel_url}}")) {
    return throwDispatchFailure("CONTENT_INVALID");
  }
  return htmlBody;
}

function throwUnsupportedDispatchChannel(promotionRunId: string, channel: never): never {
  throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, String(channel));
}

function throwDispatchFailure(code: DispatchFailureCode): never {
  throw new DispatchFailureError(code);
}

class DispatchFailureError extends Error {
  override readonly name = "DispatchFailureError";

  constructor(readonly code: DispatchFailureCode) {
    super(code);
  }
}
