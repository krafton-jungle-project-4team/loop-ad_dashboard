import { randomUUID } from "node:crypto";
import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
  type SendTextMessageCommandOutput
} from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { SendEmailCommand, SESv2Client, type SendEmailCommandOutput } from "@aws-sdk/client-sesv2";
import { Injectable } from "@nestjs/common";
import { logWithContext } from "../../../infra/logger/index.js";

export interface EmailSendInput {
  recipient: string;
  subject: string;
  body: string;
  redirectUrl: string;
}

export type SmsSendInput = Omit<EmailSendInput, "subject">;

export interface DispatchSendResult {
  provider: string;
  providerMessageId: string;
}

export interface AwsSesEmailSenderOptions {
  region: string;
  fromAddress: string;
  configurationSetName?: string;
  client?: AwsEmailClient;
}

export interface AwsEndUserMessagingSmsSenderOptions {
  region: string;
  configurationSetName?: string;
  originationIdentity?: string;
  client?: AwsSmsClient;
}

interface AwsEmailClient {
  send(command: SendEmailCommand): Promise<SendEmailCommandOutput>;
}

interface AwsSmsClient {
  send(command: SendTextMessageCommand): Promise<SendTextMessageCommandOutput>;
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

/** 로컬/현재 배포에서 사용하는 Mock Email sender입니다. */
@Injectable()
export class MockEmailSender extends EmailSender {
  override readonly providerName = "mock";

  /** 실패 없이 mock 전송 로그와 message id를 반환합니다. */
  async sendEmail(input: EmailSendInput): Promise<DispatchSendResult> {
    void input;
    logMockSend("email", this.providerName);

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

  /** 실패 없이 mock 전송 로그와 message id를 반환합니다. */
  async sendSms(input: SmsSendInput): Promise<DispatchSendResult> {
    void input;
    logMockSend("sms", this.providerName);

    return {
      provider: this.providerName,
      providerMessageId: `mock_sms_${randomUUID()}`
    };
  }
}

/** AWS SES v2로 Email을 발송하는 sender입니다. */
export class AwsSesEmailSender extends EmailSender {
  override readonly providerName = "aws-ses";
  private readonly client: AwsEmailClient;
  private readonly fromAddress: string;
  private readonly configurationSetName: string | undefined;

  constructor(options: AwsSesEmailSenderOptions) {
    super();
    this.client = options.client ?? (new SESv2Client({ region: options.region }) as AwsEmailClient);
    this.fromAddress = options.fromAddress;
    this.configurationSetName = options.configurationSetName;
  }

  /** SES SendEmail API로 Email을 발송합니다. */
  async sendEmail(input: EmailSendInput): Promise<DispatchSendResult> {
    const output = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.fromAddress,
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
        },
        ...optionalCommandField("ConfigurationSetName", this.configurationSetName)
      })
    );

    return {
      provider: this.providerName,
      providerMessageId: requiredProviderMessageId(output.MessageId, this.providerName)
    };
  }
}

/** AWS End User Messaging SMS Voice v2로 SMS를 발송하는 sender입니다. */
export class AwsEndUserMessagingSmsSender extends SmsSender {
  override readonly providerName = "aws-end-user-messaging-sms";
  private readonly client: AwsSmsClient;
  private readonly configurationSetName: string | undefined;
  private readonly originationIdentity: string | undefined;

  constructor(options: AwsEndUserMessagingSmsSenderOptions) {
    super();
    this.client =
      options.client ?? (new PinpointSMSVoiceV2Client({ region: options.region }) as AwsSmsClient);
    this.configurationSetName = options.configurationSetName;
    this.originationIdentity = options.originationIdentity;
  }

  /** SendTextMessage API로 SMS를 발송합니다. */
  async sendSms(input: SmsSendInput): Promise<DispatchSendResult> {
    const output = await this.client.send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: input.recipient,
        MessageBody: input.body,
        MessageType: "PROMOTIONAL",
        ...optionalCommandField("ConfigurationSetName", this.configurationSetName),
        ...optionalCommandField("OriginationIdentity", this.originationIdentity)
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

function optionalCommandField<TKey extends string>(
  key: TKey,
  value: string | undefined
): Partial<Record<TKey, string>> {
  return value ? ({ [key]: value } as Record<TKey, string>) : {};
}

function logMockSend(channel: "email" | "sms", provider: string) {
  logWithContext("info", "Mock ad dispatch sent", {
    channel,
    provider
  });
}
