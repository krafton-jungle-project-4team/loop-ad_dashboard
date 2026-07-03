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

export abstract class DispatchSender {
  abstract providerNameFor(channel: DispatchChannel): string;
  abstract send(input: DispatchSendInput): Promise<DispatchSendResult>;
}

export abstract class EmailSender {
  abstract readonly providerName: string;
  abstract sendEmail(input: EmailSendInput): Promise<DispatchSendResult>;
}

export abstract class SmsSender {
  abstract readonly providerName: string;
  abstract sendSms(input: SmsSendInput): Promise<DispatchSendResult>;
}

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

  providerNameFor(channel: DispatchChannel): string {
    return channel === "email" ? this.emailSender.providerName : this.smsSender.providerName;
  }

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

@Injectable()
export class MockEmailSender extends EmailSender {
  override readonly providerName = "mock";

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

@Injectable()
export class MockSmsSender extends SmsSender {
  override readonly providerName = "mock";

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

export class AwsSesEmailSender extends EmailSender {
  override readonly providerName = "aws-ses";
  private readonly client = new SESv2Client({ region: AWS_DISPATCH_REGION });

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
      providerMessageId: output.MessageId ?? `aws_ses_${randomUUID()}`
    };
  }
}

export class AwsSnsSmsSender extends SmsSender {
  override readonly providerName = "aws-sns";
  private readonly client = new SNSClient({ region: AWS_DISPATCH_REGION });

  async sendSms(input: SmsSendInput): Promise<DispatchSendResult> {
    const output = await this.client.send(
      new PublishCommand({
        PhoneNumber: input.recipient,
        Message: input.body
      })
    );

    return {
      provider: this.providerName,
      providerMessageId: output.MessageId ?? `aws_sns_${randomUUID()}`
    };
  }
}
