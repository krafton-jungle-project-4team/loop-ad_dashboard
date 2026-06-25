import { Module } from "@nestjs/common";
import { DashboardModule } from "./features/dashboard/index.js";
import { HealthModule } from "./features/health/index.js";

@Module({
  imports: [DashboardModule, HealthModule]
})
export class AppModule {}
