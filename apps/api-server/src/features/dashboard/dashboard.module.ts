import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { AdExecutionModule } from "../ad-execution/index.js";
import { DashboardController } from "./controller/dashboard.controller.js";
import {
  DashboardCampaignReader,
  DashboardEntitySearchReader,
  DashboardFunnelReader,
  DashboardPromotionAutomationRepository,
  DashboardProjectExperimentsReader,
  DashboardSegmentQueryRepository
} from "./repository/index.js";
import { DashboardDecisionClient, DashboardSegmentAssistantAgent } from "./provider/index.js";
import {
  DashboardEntitySearchService,
  DashboardProjectExperimentsService,
  DashboardQueryService,
  PromotionAutomationService
} from "./service/index.js";

@Module({
  imports: [DatabaseModule, AdExecutionModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    DashboardEntitySearchService,
    DashboardProjectExperimentsService,
    DashboardDecisionClient,
    DashboardSegmentAssistantAgent,
    PromotionAutomationService,
    DashboardCampaignReader,
    DashboardEntitySearchReader,
    DashboardFunnelReader,
    DashboardPromotionAutomationRepository,
    DashboardProjectExperimentsReader,
    DashboardSegmentQueryRepository
  ]
})
export class DashboardModule {}
