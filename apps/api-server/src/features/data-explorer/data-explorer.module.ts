import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { ClickHouseEventsAdapter } from "./adapters/clickhouse-events.adapter.js";
import { PostgresContractAdapter } from "./adapters/postgres-contract.adapter.js";
import { OpenAiDataExplorerQueryPlanner } from "./chatkit/openai-query-planner.js";
import { DataExplorerController } from "./controller/data-explorer.controller.js";
import { DataExplorerQueryRunsRepository } from "./repositories/query-runs.repository.js";
import { DataExplorerService } from "./service/data-explorer.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DataExplorerController],
  providers: [
    DataExplorerService,
    PostgresContractAdapter,
    ClickHouseEventsAdapter,
    OpenAiDataExplorerQueryPlanner,
    DataExplorerQueryRunsRepository
  ]
})
export class DataExplorerModule {}
