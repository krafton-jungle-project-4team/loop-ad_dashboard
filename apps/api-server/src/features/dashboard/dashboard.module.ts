import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DashboardController } from "./controller/dashboard.controller.js";
import {
  DashboardEventQuery,
  DashboardExperimentReader,
  DashboardRecommendationReader
} from "./repository/index.js";
import { DashboardCommandService, DashboardQueryService } from "./service/index.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardQueryService,
    DashboardCommandService,
    DashboardEventQuery,
    DashboardRecommendationReader,
    DashboardExperimentReader
  ]
})
export class DashboardModule {}
