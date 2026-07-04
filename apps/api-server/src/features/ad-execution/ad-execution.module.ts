import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { env, type AppEnv } from "../../infra/env/env.js";
import {
  AwsEndUserMessagingSmsSender,
  AwsSesEmailSender,
  EmailSender,
  SmsSender
} from "./adapters/dispatch-sender.js";
import { AdExecutionController } from "./controller/ad-execution.controller.js";
import { RedirectController } from "./controller/redirect.controller.js";
import {
  AdExecutionReader,
  AdExecutionWriter,
  HardcodedDemoRecipientDirectory,
  RecipientDirectory
} from "./repository/index.js";
import {
  BannerResolveService,
  PromotionDispatchService,
  RedirectService
} from "./service/index.js";

type AwsDispatchConfig = AppEnv["dispatch"]["aws"];
export const AD_DISPATCH_EMAIL_FROM_ADDRESS = "noreply@looapd.org";

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
      provide: RecipientDirectory,
      useClass: HardcodedDemoRecipientDirectory
    },
    {
      provide: EmailSender,
      useFactory: () => createEmailSender(env.dispatch.aws)
    },
    {
      provide: SmsSender,
      useFactory: () => createSmsSender(env.dispatch.aws)
    }
  ]
})
export class AdExecutionModule {}

export function createEmailSender(awsConfig: AwsDispatchConfig = env.dispatch.aws) {
  return new AwsSesEmailSender({
    region: awsConfig.region,
    fromAddress: AD_DISPATCH_EMAIL_FROM_ADDRESS,
    configurationSetName: awsConfig.sesConfigurationSet
  });
}

export function createSmsSender(awsConfig: AwsDispatchConfig = env.dispatch.aws) {
  return new AwsEndUserMessagingSmsSender({
    region: awsConfig.region,
    configurationSetName: awsConfig.smsConfigurationSet,
    originationIdentity: awsConfig.smsOriginationIdentity
  });
}
