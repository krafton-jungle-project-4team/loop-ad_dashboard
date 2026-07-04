import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DashboardController } from "./controller/dashboard.controller.js";
import {
  DashboardCampaignReader,
  DashboardFunnelReader,
  DashboardSegmentQueryRepository
} from "./repository/index.js";
import { DashboardQueryService } from "./service/index.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    DashboardCampaignReader,
    DashboardFunnelReader,
    DashboardSegmentQueryRepository
  ]
})
export class DashboardModule {}
