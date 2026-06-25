import { Module } from "@nestjs/common";
import { DashboardController } from "./controller/dashboard.controller.js";
import { DashboardService } from "./service/dashboard.service.js";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
