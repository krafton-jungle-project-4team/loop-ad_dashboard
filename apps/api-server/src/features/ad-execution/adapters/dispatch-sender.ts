import { randomUUID } from "node:crypto";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { Inject, Injectable } from "@nestjs/common";
import type { DispatchChannel } from "../domain/index.js";

const AWS_DISPATCH_REGION = "ap-northeast-2";
const AWS_EMAIL_FROM_ADDRESS = "noreply@example.com";

export interface DispatchSendInput {
  channel: DispatchChannel;
  recipient: string;
  subject: string;
  body: string;
  redirectUrl: string;
}

export interface DispatchSendResult {
  provider: string;
  providerMessageId: string;
}

export type EmailSendInput = Omit<DispatchSendInput, "channel">;
export type SmsSendInput = Omit<DispatchSendInput, "channel" | "subject">;

/** 채널별 발송 provider 선택과 발송 호출을 담당하는 인터페이스입니다. */
export abstract class DispatchSender {
  /** 채널에 사용할 provider 이름을 반환합니다. */
  abstract providerNameFor(channel: DispatchChannel): string;
  /** Email/SMS 발송 요청을 실행합니다. */
  abstract send(input: DispatchSendInput): Promise<DispatchSendResult>;
}

/** Email 발송 provider가 구현해야 하는 인터페이스입니다. */
export abstract class EmailSender {
  abstract readonly providerName: string;
  /** Email 발송을 실행합니다. */
  abstract sendEmail(input: EmailSendInput): Promise<DispatchSendResult>;
}

/** SMS 발송 provider가 구현해야 하는 인터페이스입니다. */
export abstract class SmsSender {
  abstract readonly providerName: string;
  /** SMS 발송을 실행합니다. */
  abstract sendSms(input: SmsSendInput): Promise<DispatchSendResult>;
}

/** 채널에 따라 Email/SMS sender로 발송을 위임합니다. */
@Injectable()
export class ChannelDispatchSender extends DispatchSender {
  constructor(
    @Inject(EmailSender)
    private readonly emailSender: EmailSender,
    @Inject(SmsSender)
    private readonly smsSender: SmsSender
  ) {
    super();
  }

  /** 채널에 연결된 sender의 provider 이름을 반환합니다. */
  providerNameFor(channel: DispatchChannel): string {
    return channel === "email" ? this.emailSender.providerName : this.smsSender.providerName;
  }

  /** 채널 값에 맞는 sender를 호출합니다. */
  async send(input: DispatchSendInput): Promise<DispatchSendResult> {
    if (input.channel === "email") {
      return this.emailSender.sendEmail({
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
        redirectUrl: input.redirectUrl
      });
    }

    return this.smsSender.sendSms({
      recipient: input.recipient,
      body: input.body,
      redirectUrl: input.redirectUrl
    });
  }
}

/** 로컬/현재 배포에서 사용하는 Mock Email sender입니다. */
@Injectable()
export class MockEmailSender extends EmailSender {
  override readonly providerName = "mock";

  /** 실제 외부 전송 없이 mock message id를 반환합니다. */
  async sendEmail(input: EmailSendInput): Promise<DispatchSendResult> {
    if (!input.recipient.trim()) {
      throw new Error("Recipient is empty.");
    }

    return {
      provider: this.providerName,
      providerMessageId: `mock_email_${randomUUID()}`
    };
  }
}

/** 로컬/현재 배포에서 사용하는 Mock SMS sender입니다. */
@Injectable()
export class MockSmsSender extends SmsSender {
  override readonly providerName = "mock";

  /** 실제 외부 전송 없이 mock message id를 반환합니다. */
  async sendSms(input: SmsSendInput): Promise<DispatchSendResult> {
    if (!input.recipient.trim()) {
      throw new Error("Recipient is empty.");
    }

    return {
      provider: this.providerName,
      providerMessageId: `mock_sms_${randomUUID()}`
    };
  }
}

/** AWS SES v2로 Email을 발송하는 sender입니다. */
export class AwsSesEmailSender extends EmailSender {
  override readonly providerName = "aws-ses";
  private readonly client = new SESv2Client({ region: AWS_DISPATCH_REGION });

  /** SES SendEmail API로 Email을 발송합니다. */
  async sendEmail(input: EmailSendInput): Promise<DispatchSendResult> {
    const output = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: AWS_EMAIL_FROM_ADDRESS,
        Destination: {
          ToAddresses: [input.recipient]
        },
        Content: {
          Simple: {
            Subject: {
              Data: input.subject,
              Charset: "UTF-8"
            },
            Body: {
              Text: {
                Data: input.body,
                Charset: "UTF-8"
              }
            }
          }
        }
      })
    );

    return {
      provider: this.providerName,
      providerMessageId: requiredProviderMessageId(output.MessageId, this.providerName)
    };
  }
}

/** AWS SNS Publish로 SMS를 발송하는 sender입니다. */
export class AwsSnsSmsSender extends SmsSender {
  override readonly providerName = "aws-sns";
  private readonly client = new SNSClient({ region: AWS_DISPATCH_REGION });

  /** SNS Publish API로 SMS를 발송합니다. */
  async sendSms(input: SmsSendInput): Promise<DispatchSendResult> {
    const output = await this.client.send(
      new PublishCommand({
        PhoneNumber: input.recipient,
        Message: input.body
      })
    );

    return {
      provider: this.providerName,
      providerMessageId: requiredProviderMessageId(output.MessageId, this.providerName)
    };
  }
}

function requiredProviderMessageId(value: string | undefined, providerName: string) {
  if (!value) {
    throw new Error(`${providerName} did not return a message id.`);
  }

  return value;
}
