import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DashboardController } from "./controller/dashboard.controller.js";
import {
  DashboardCampaignReader,
  DashboardEventQuery,
  DashboardRecommendationReader,
  DashboardSegmentMetricsReader
} from "./repository/index.js";
import { DashboardQueryService } from "./service/index.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    DashboardCampaignReader,
    DashboardEventQuery,
    DashboardRecommendationReader,
    DashboardSegmentMetricsReader
  ]
})
export class DashboardModule {}
