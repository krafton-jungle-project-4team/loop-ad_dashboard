import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DashboardController } from "./controller/dashboard.controller.js";
import {
  DashboardCampaignReader,
  DashboardEntitySearchReader,
  DashboardFunnelReader,
  DashboardProjectExperimentsReader,
  DashboardSegmentQueryRepository
} from "./repository/index.js";
import { DashboardDecisionClient } from "./provider/index.js";
import {
  DashboardEntitySearchService,
  DashboardProjectExperimentsService,
  DashboardQueryService
} from "./service/index.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    DashboardEntitySearchService,
    DashboardProjectExperimentsService,
    DashboardDecisionClient,
    DashboardCampaignReader,
    DashboardEntitySearchReader,
    DashboardFunnelReader,
    DashboardProjectExperimentsReader,
    DashboardSegmentQueryRepository
  ]
})
export class DashboardModule {}
