import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DataExplorerController } from "./controller/data-explorer.controller.js";
import { ClickHouseEventsReader } from "./repository/clickhouse-events-reader.js";
import { PostgresContractReader } from "./repository/postgres-contract-reader.js";
import { DataExplorerService } from "./service/data-explorer.service.js";

/**
 * Wires the Data Explorer schema inspection feature.
 *
 * The module registers source readers only; query execution and AI planning are
 * outside this feature boundary.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [DataExplorerController],
  providers: [DataExplorerService, PostgresContractReader, ClickHouseEventsReader]
})
export class DataExplorerModule {}
