import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { env, type AppEnv } from "../../infra/env/env.js";
import {
  AwsEndUserMessagingSmsSender,
  AwsSesEmailSender,
  EmailSender,
  MockEmailSender,
  MockSmsSender,
  SmsSender
} from "./adapters/dispatch-sender.js";
import { DemoDbRecipientDirectory, RecipientDirectory } from "./adapters/recipient-directory.js";
import { AdExecutionController } from "./controller/ad-execution.controller.js";
import { RedirectController } from "./controller/redirect.controller.js";
import { AdExecutionReader, AdExecutionWriter } from "./repository/index.js";
import {
  BannerResolveService,
  PromotionDispatchService,
  RedirectService
} from "./service/index.js";

type DispatchProviderName = AppEnv["dispatch"]["provider"];
type AwsDispatchConfig = AppEnv["dispatch"]["aws"];

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
      useClass: DemoDbRecipientDirectory
    },
    {
      provide: EmailSender,
      useFactory: () => createEmailSender(env.dispatch.provider, env.dispatch.aws)
    },
    {
      provide: SmsSender,
      useFactory: () => createSmsSender(env.dispatch.provider, env.dispatch.aws)
    }
  ]
})
export class AdExecutionModule {}

export function createEmailSender(
  provider: DispatchProviderName,
  awsConfig: AwsDispatchConfig = env.dispatch.aws
) {
  switch (provider) {
    case "mock":
      return new MockEmailSender();
    case "aws":
      return new AwsSesEmailSender({
        region: requireAwsDispatchConfig(awsConfig, "region"),
        fromAddress: requireAwsDispatchConfig(awsConfig, "emailFromAddress"),
        configurationSetName: awsConfig.sesConfigurationSet
      });
    default:
      return throwUnsupportedDispatchProvider(provider);
  }
}

export function createSmsSender(
  provider: DispatchProviderName,
  awsConfig: AwsDispatchConfig = env.dispatch.aws
) {
  switch (provider) {
    case "mock":
      return new MockSmsSender();
    case "aws":
      return new AwsEndUserMessagingSmsSender({
        region: requireAwsDispatchConfig(awsConfig, "region"),
        configurationSetName: awsConfig.smsConfigurationSet,
        originationIdentity: awsConfig.smsOriginationIdentity
      });
    default:
      return throwUnsupportedDispatchProvider(provider);
  }
}

function requireAwsDispatchConfig(config: AwsDispatchConfig, key: keyof AwsDispatchConfig) {
  const value = config[key];

  if (!value) {
    throw new Error(`AWS ad dispatch config '${key}' is required for provider 'aws'.`);
  }

  return value;
}

function throwUnsupportedDispatchProvider(provider: never): never {
  throw new Error(`Unsupported ad dispatch provider '${String(provider)}'.`);
}
