import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DashboardController } from "./controller/dashboard.controller.js";
import {
  DashboardCampaignReader,
  DashboardFunnelReader,
  DashboardSegmentQueryRepository
} from "./repository/index.js";
import { DashboardDecisionClient } from "./provider/index.js";
import { DashboardQueryService } from "./service/index.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    DashboardDecisionClient,
    DashboardCampaignReader,
    DashboardFunnelReader,
    DashboardSegmentQueryRepository
  ]
})
export class DashboardModule {}
