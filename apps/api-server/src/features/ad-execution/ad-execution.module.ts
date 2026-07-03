import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import {
  AwsSesEmailSender,
  AwsSnsSmsSender,
  EmailSender,
  MockEmailSender,
  MockSmsSender,
  SmsSender
} from "./adapters/dispatch-sender.js";
import { AdExecutionController } from "./controller/ad-execution.controller.js";
import { RedirectController } from "./controller/redirect.controller.js";
import { AdExecutionReader, AdExecutionWriter } from "./repository/index.js";
import {
  BannerResolveService,
  PromotionDispatchService,
  RedirectService
} from "./service/index.js";

type DispatchProviderName = "mock" | "aws";

const DISPATCH_PROVIDER: DispatchProviderName = "mock";

/** 광고 실행 기능의 controller, service, adapter provider를 묶는 모듈입니다. */
@Module({
  imports: [DatabaseModule],
  controllers: [AdExecutionController, RedirectController],
  providers: [
    PromotionDispatchService,
    BannerResolveService,
    RedirectService,
    AdExecutionReader,
    AdExecutionWriter,
    {
      provide: EmailSender,
      useFactory: () => createEmailSender(DISPATCH_PROVIDER)
    },
    {
      provide: SmsSender,
      useFactory: () => createSmsSender(DISPATCH_PROVIDER)
    }
  ]
})
export class AdExecutionModule {}

function createEmailSender(provider: DispatchProviderName) {
  return provider === "aws" ? new AwsSesEmailSender() : new MockEmailSender();
}

function createSmsSender(provider: DispatchProviderName) {
  return provider === "aws" ? new AwsSnsSmsSender() : new MockSmsSender();
}
