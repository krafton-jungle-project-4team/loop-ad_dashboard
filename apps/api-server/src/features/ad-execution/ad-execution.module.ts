import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import {
  AwsEndUserMessagingSmsSender,
  AwsSesEmailSender,
  EmailSender,
  SmsSender
} from "./adapters/dispatch-sender.js";
import { FetchHtmlArtifactReader, HtmlArtifactReader } from "./adapters/artifact-reader.js";
import { AdExecutionController } from "./controller/ad-execution.controller.js";
import { OpenPixelController } from "./controller/open-pixel.controller.js";
import { RedirectController } from "./controller/redirect.controller.js";
import {
  AdExecutionReader,
  AdExecutionWriter,
  EnvDemoRecipientDirectory,
  RecipientDirectory
} from "./repository/index.js";
import {
  BannerResolveService,
  PromotionDispatchService,
  RedirectService
} from "./service/index.js";

export const AD_DISPATCH_AWS_REGION = "ap-northeast-2";
export const AD_DISPATCH_EMAIL_FROM_ADDRESS = "noreply@loop-ad.org";

/** 광고 실행 기능의 controller, service, adapter provider를 묶는 모듈입니다. */
@Module({
  imports: [DatabaseModule],
  controllers: [AdExecutionController, RedirectController, OpenPixelController],
  providers: [
    PromotionDispatchService,
    BannerResolveService,
    RedirectService,
    AdExecutionReader,
    AdExecutionWriter,
    {
      provide: RecipientDirectory,
      useClass: EnvDemoRecipientDirectory
    },
    {
      provide: EmailSender,
      useFactory: createEmailSender
    },
    {
      provide: SmsSender,
      useFactory: createSmsSender
    },
    {
      provide: HtmlArtifactReader,
      useClass: FetchHtmlArtifactReader
    }
  ],
  exports: [PromotionDispatchService]
})
export class AdExecutionModule {}

export function createEmailSender() {
  return new AwsSesEmailSender({
    region: AD_DISPATCH_AWS_REGION,
    fromAddress: AD_DISPATCH_EMAIL_FROM_ADDRESS
  });
}

export function createSmsSender() {
  return new AwsEndUserMessagingSmsSender({
    region: AD_DISPATCH_AWS_REGION
  });
}
