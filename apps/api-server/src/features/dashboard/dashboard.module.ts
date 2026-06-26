import { Module } from "@nestjs/common";
import { DashboardController } from "./controller/dashboard.controller.js";
import { ClickHouseDashboardDataSource } from "./data-sources/clickhouse-dashboard.data-source.js";
import { DecisionServerDataSource } from "./data-sources/decision-server.data-source.js";
import { PostgresDashboardDataSource } from "./data-sources/postgres-dashboard.data-source.js";
import { DashboardService } from "./service/dashboard.service.js";

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    ClickHouseDashboardDataSource,
    PostgresDashboardDataSource,
    DecisionServerDataSource
  ]
})
export class DashboardModule {}
