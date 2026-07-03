import { randomUUID } from "node:crypto";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { Inject, Injectable } from "@nestjs/common";
import { env } from "../../../infra/env/env.js";
import type { DispatchChannel } from "../domain/index.js";

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
  private readonly client = new SESv2Client({ region: requireAwsRegion() });

  async sendEmail(input: EmailSendInput): Promise<DispatchSendResult> {
    const output = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: requireEmailFromAddress(),
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
  private readonly client = new SNSClient({ region: requireAwsRegion() });

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

function requireAwsRegion() {
  if (!env.adDispatch.awsRegion) {
    throw new Error("AWS dispatch provider requires LOOPAD_AWS_REGION or AWS_REGION.");
  }

  return env.adDispatch.awsRegion;
}

function requireEmailFromAddress() {
  if (!env.adDispatch.emailFromAddress) {
    throw new Error("AWS SES email dispatch requires LOOPAD_EMAIL_FROM_ADDRESS.");
  }

  return env.adDispatch.emailFromAddress;
}
