import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DispatchSender, MockDispatchSender } from "./adapters/dispatch-sender.js";
import {
  HttpPromotionEventCollector,
  PromotionEventCollector
} from "./adapters/event-collector-client.js";
import { MockRecipientResolver, RecipientResolver } from "./adapters/recipient-resolver.js";
import { AdExecutionController } from "./controller/ad-execution.controller.js";
import { RedirectController } from "./controller/redirect.controller.js";
import { AdExecutionReader, AdExecutionWriter } from "./repository/index.js";
import { AdExecutionService } from "./service/index.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AdExecutionController, RedirectController],
  providers: [
    AdExecutionService,
    AdExecutionReader,
    AdExecutionWriter,
    { provide: RecipientResolver, useClass: MockRecipientResolver },
    { provide: DispatchSender, useClass: MockDispatchSender },
    { provide: PromotionEventCollector, useClass: HttpPromotionEventCollector }
  ]
})
export class AdExecutionModule {}
