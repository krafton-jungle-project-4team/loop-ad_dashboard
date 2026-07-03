import { z } from "zod";
import type {
  EmailSendInput,
  SmsSendInput
} from "../adapters/dispatch-sender.js";
import type { ActiveAdServingAssignmentEntity } from "../domain/index.js";

const requiredContentTextSchema = z.string().min(1);
const emailContentSchema = z.object({
  subject: requiredContentTextSchema,
  preheader: z.string().nullable(),
  body: requiredContentTextSchema,
  cta: z.string().nullable()
});
const smsContentSchema = z.object({
  message: requiredContentTextSchema
});

/** assignment의 승인 Email 콘텐츠를 sender 요청으로 변환합니다. */
export function toEmailSendInput(
  assignment: ActiveAdServingAssignmentEntity,
  targetUrl: string
): EmailSendInput {
  const content = emailContentSchema.parse(assignment);

  return {
    recipient: assignment.userId,
    subject: content.subject,
    body: [content.preheader, content.body, ctaLine(content.cta, targetUrl)]
      .filter(Boolean)
      .join("\n\n"),
    redirectUrl: targetUrl
  };
}

/** assignment의 승인 SMS 콘텐츠를 sender 요청으로 변환합니다. */
export function toSmsSendInput(
  assignment: ActiveAdServingAssignmentEntity,
  targetUrl: string
): SmsSendInput {
  const content = smsContentSchema.parse(assignment);

  return {
    recipient: assignment.userId,
    body: [content.message, targetUrl].join(" "),
    redirectUrl: targetUrl
  };
}

function ctaLine(cta: string | null, targetUrl: string) {
  return cta ? `${cta}: ${targetUrl}` : targetUrl;
}
