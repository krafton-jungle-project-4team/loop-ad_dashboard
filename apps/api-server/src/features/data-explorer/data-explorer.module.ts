import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DataExplorerController } from "./controller/data-explorer.controller.js";
import { OpenAiDataExplorerQueryPlannerProvider } from "./provider/openai-query-planner.provider.js";
import { ClickHouseEventsReader } from "./repository/clickhouse-events-reader.js";
import { PostgresContractReader } from "./repository/postgres-contract-reader.js";
import { DataExplorerService } from "./service/data-explorer.service.js";

/**
 * Wires the Data Explorer feature.
 *
 * The module keeps HTTP, use-case orchestration, source readers, and OpenAI
 * provider boundaries explicit so SQL IDE features do not leak across layers.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [DataExplorerController],
  providers: [
    DataExplorerService,
    PostgresContractReader,
    ClickHouseEventsReader,
    OpenAiDataExplorerQueryPlannerProvider
  ]
})
export class DataExplorerModule {}
