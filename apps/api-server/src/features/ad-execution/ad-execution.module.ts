import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import {
  AwsSesEmailSender,
  AwsSnsSmsSender,
  ChannelDispatchSender,
  DispatchSender,
  EmailSender,
  MockEmailSender,
  MockSmsSender,
  SmsSender
} from "./adapters/dispatch-sender.js";
import { MockRecipientResolver, RecipientResolver } from "./adapters/recipient-resolver.js";
import { AdExecutionController } from "./controller/ad-execution.controller.js";
import { RedirectController } from "./controller/redirect.controller.js";
import { AdExecutionReader, AdExecutionWriter } from "./repository/index.js";
import { AdExecutionService } from "./service/index.js";

type DispatchProviderName = "mock" | "aws";

const DISPATCH_PROVIDER: DispatchProviderName = "mock";

@Module({
  imports: [DatabaseModule],
  controllers: [AdExecutionController, RedirectController],
  providers: [
    AdExecutionService,
    AdExecutionReader,
    AdExecutionWriter,
    { provide: RecipientResolver, useClass: MockRecipientResolver },
    {
      provide: EmailSender,
      useFactory: () => createEmailSender(DISPATCH_PROVIDER)
    },
    {
      provide: SmsSender,
      useFactory: () => createSmsSender(DISPATCH_PROVIDER)
    },
    { provide: DispatchSender, useClass: ChannelDispatchSender }
  ]
})
export class AdExecutionModule {}

function createEmailSender(provider: DispatchProviderName) {
  return provider === "aws" ? new AwsSesEmailSender() : new MockEmailSender();
}

function createSmsSender(provider: DispatchProviderName) {
  return provider === "aws" ? new AwsSnsSmsSender() : new MockSmsSender();
}
