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
import { DashboardAuthController } from "./auth/dashboard-auth.controller.js";
import { DashboardAuthService } from "./auth/dashboard-auth.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController, DashboardAuthController],
  providers: [
    DashboardAuthService,
    DashboardQueryService,
    DashboardDecisionClient,
    DashboardCampaignReader,
    DashboardFunnelReader,
    DashboardSegmentQueryRepository
  ],
  exports: [DashboardAuthService]
})
export class DashboardModule {}
